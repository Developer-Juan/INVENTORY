<?php

namespace App\Http\Controllers;

use App\Models\InventoryMove;
use App\Models\Location;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BalanceController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');
        $dealerUserIds = collect();
        if ($isAdmin && !$isSuperAdmin) {
            $dealerUserIds = User::role('dealer')->where('created_by', $user->id)->pluck('id');
        }

        $dealerId = $request->query('dealer_id');   // location_id del dealer
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        // Traemos todos los puntos tipo dealer
        $dealerLocations = Location::query()
            ->whereIn('type', ['dealer', 'secondary', 'dealer_secondary'])
            ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->whereIn('user_id', $dealerUserIds))
            ->with('user:id,name')
            ->get(['id', 'name', 'user_id', 'type']);
        $dealerLocationIds = $dealerLocations->pluck('id');

        if (!empty($dealerId) && $isAdmin && !$isSuperAdmin) {
            if (!$dealerLocationIds->contains((int) $dealerId)) {
                abort(403);
            }
        }

        // ============================================================
        // MODO GLOBAL (sin dealer_id): resumen por dealer
        // ============================================================
        if (empty($dealerId)) {

            // ----------------- Filtros comunes por fecha -----------------
            $bindingsBase = [Sale::ST_ANULADA]; // s.status != ?
            $dateFiltersSql = '';
            if ($fromDate) {
                $dateFiltersSql .= "AND DATE(s.created_at) >= ? ";
                $bindingsBase[] = $fromDate;
            }
            if ($toDate) {
                $dateFiltersSql .= "AND DATE(s.created_at) <= ? ";
                $bindingsBase[] = $toDate;
            }

            // ----- Subquery ALL (todas las ventas por dealer) -----
            $subSqlAll = "
            SELECT
                im.location_id        AS location_id,
                s.id                  AS sale_id,
                s.total               AS sale_total,
                SUM(im.quantity)      AS qty_sold
            FROM inventory_moves im
            JOIN sales s ON s.id = im.sale_id
            WHERE
                im.direction = 'out'
                AND im.reason IN ('SALE','SALE_OUT')
                AND s.status != ?
                $dateFiltersSql
            GROUP BY im.location_id, s.id, s.total
        ";

            $byDealerAll = DB::table(DB::raw("($subSqlAll) AS sale_rows"))
                ->mergeBindings(DB::table('inventory_moves')->selectRaw('1'))
                ->addBinding($bindingsBase, 'where')
                ->select([
                    'location_id',
                    DB::raw('COUNT(sale_id)   AS sales_count_all'),
                    DB::raw('SUM(qty_sold)    AS total_qty_all'),
                    DB::raw('SUM(sale_total)  AS total_sold_all'),
                ])
                ->groupBy('location_id')
                ->get()
                ->keyBy('location_id');

            // ----- Subquery PENDING (ventas con pago a domicilio PENDIENTE) -----
            $subSqlPending = "
            SELECT
                im.location_id        AS location_id,
                s.id                  AS sale_id,
                s.total               AS sale_total,
                s.delivery_pay        AS delivery_pay,
                SUM(im.quantity)      AS qty_sold
            FROM inventory_moves im
            JOIN sales s ON s.id = im.sale_id
            WHERE
                im.direction = 'out'
                AND im.reason IN ('SALE','SALE_OUT')
                AND s.status != ?
                AND s.delivery_id IS NOT NULL
                AND s.delivery_pay > 0
                AND s.delivery_settled_at IS NULL
                $dateFiltersSql
            GROUP BY im.location_id, s.id, s.total, s.delivery_pay
        ";

            $byDealerPending = DB::table(DB::raw("($subSqlPending) AS sale_rows"))
                ->mergeBindings(DB::table('inventory_moves')->selectRaw('1'))
                ->addBinding($bindingsBase, 'where')
                ->select([
                    'location_id',
                    DB::raw('COUNT(sale_id)        AS sales_count_pending'),
                    DB::raw('SUM(qty_sold)         AS total_qty_pending'),
                    DB::raw('SUM(sale_total)       AS total_sold_pending'),
                    DB::raw('SUM(delivery_pay)     AS payout_pending'),
                ])
                ->groupBy('location_id')
                ->get()
                ->keyBy('location_id');

            // ---- Armar filas por dealer combinando ALL y PENDING ----
            $dealersSummary = $dealerLocations
                ->map(function ($loc) use ($byDealerAll, $byDealerPending) {
                    $all = $byDealerAll->get($loc->id);
                    $pending = $byDealerPending->get($loc->id);

                    $sales_count_all = (int) ($all->sales_count_all ?? 0);
                    $total_qty_all = (float) ($all->total_qty_all ?? 0);
                    $total_sold_all = (float) ($all->total_sold_all ?? 0);

                    $sales_count_pending = (int) ($pending->sales_count_pending ?? 0);
                    $total_qty_pending = (float) ($pending->total_qty_pending ?? 0);
                    $total_sold_pending = (float) ($pending->total_sold_pending ?? 0);
                    $payout_pending = (float) ($pending->payout_pending ?? 0);

                    return [
                        'dealer_location_id' => $loc->id,
                        'dealer_name' => ($loc->user->name ?? 'Usuario') . ' — ' . $loc->name,

                        // Lo que mostrará la tabla global por defecto (TOTALES reales)
                        'sales_count' => $sales_count_all,
                        'total_qty' => $total_qty_all,
                        'total_sold' => $total_sold_all,

                        // Lo pendiente (por si lo quieres usar en la UI)
                        'sales_count_pending' => $sales_count_pending,
                        'total_qty_pending' => $total_qty_pending,
                        'total_sold_pending' => $total_sold_pending,
                        'payout_pending' => $payout_pending,
                    ];
                })
                // si quieres ocultar dealers sin ventas en el rango:
                ->filter(fn($row) => $row['sales_count'] > 0)
                ->values();

            return Inertia::render('Balances/Index', [
                'dealerLocations' => $dealerLocations,
                'filters' => [
                    'dealer_id' => '',
                    'from_date' => $fromDate ?: '',
                    'to_date' => $toDate ?: '',
                ],
                'summary' => [
                    'mode' => 'all',
                    'dealers' => $dealersSummary,
                ],
                'dealerBreakdown' => null,
                'salesList' => null, // no aplica en modo global
            ]);
        }

        // ============================================================
        // MODO DETALLE (dealer_id seleccionado)
        // Queremos:
        //  A) payout_pending -> SOLO ventas PENDIENTES de pago al dealer
        //  B) salesList      -> TODAS las ventas del dealer en el rango
        // ============================================================

        // -------- A) Pending payout summary solo de ventas no liquidadas --------
        $bindingsA = [Sale::ST_ANULADA, (int) $dealerId];
        $dateFiltersSqlA = '';
        if ($fromDate) {
            $dateFiltersSqlA .= "AND DATE(s.created_at) >= ? ";
            $bindingsA[] = $fromDate;
        }
        if ($toDate) {
            $dateFiltersSqlA .= "AND DATE(s.created_at) <= ? ";
            $bindingsA[] = $toDate;
        }

        $subSqlPending = "
        SELECT
            im.location_id        AS location_id,
            s.id                  AS sale_id,
            s.total               AS sale_total,
            s.delivery_pay        AS delivery_pay,
            SUM(im.quantity)      AS qty_sold
        FROM inventory_moves im
        JOIN sales s ON s.id = im.sale_id
        WHERE
            im.direction = 'out'
            AND im.reason IN ('SALE','SALE_OUT')
            AND s.status != ?
            AND s.delivery_id IS NOT NULL
            AND s.delivery_pay > 0
            AND s.delivery_settled_at IS NULL
            AND im.location_id = ?
            $dateFiltersSqlA
        GROUP BY im.location_id, s.id, s.total, s.delivery_pay
    ";

        $pendingAgg = DB::table(DB::raw("($subSqlPending) AS sale_rows"))
            ->mergeBindings(DB::table('inventory_moves')->selectRaw('1'))
            ->addBinding($bindingsA, 'where')
            ->selectRaw('
            COUNT(sale_id)        AS sales_count,
            SUM(qty_sold)         AS total_qty,
            SUM(sale_total)       AS total_sold,
            SUM(delivery_pay)     AS payout_pending
        ')
            ->first();

        // -------- B) Listado de TODAS las ventas del dealer --------
        $bindingsB = [Sale::ST_ANULADA, (int) $dealerId];
        $dateFiltersSqlB = '';
        if ($fromDate) {
            $dateFiltersSqlB .= "AND DATE(s.created_at) >= ? ";
            $bindingsB[] = $fromDate;
        }
        if ($toDate) {
            $dateFiltersSqlB .= "AND DATE(s.created_at) <= ? ";
            $bindingsB[] = $toDate;
        }

        $subSqlSalesList = "
        SELECT
            s.id                    AS sale_id,
            s.created_at            AS created_at,
            s.total                 AS total,
            s.delivery_pay          AS delivery_pay,
            s.delivery_settled_at   AS delivery_settled_at,
            s.delivery_id           AS delivery_id,
            s.status                AS status,
            SUM(im.quantity)        AS qty_sold
        FROM inventory_moves im
        JOIN sales s ON s.id = im.sale_id
        WHERE
            im.direction = 'out'
            AND im.reason IN ('SALE','SALE_OUT')
            AND s.status != ?
            AND im.location_id = ?
            $dateFiltersSqlB
        GROUP BY
            s.id,
            s.created_at,
            s.total,
            s.delivery_pay,
            s.delivery_settled_at,
            s.delivery_id,
            s.status
        ORDER BY s.created_at DESC
    ";

        $salesList = DB::table(DB::raw("($subSqlSalesList) AS dealer_sales"))
            ->mergeBindings(DB::table('inventory_moves')->selectRaw('1'))
            ->addBinding($bindingsB, 'where')
            ->get()
            ->map(function ($row) {
                return [
                    'id' => $row->sale_id,
                    'created_at' => $row->created_at,
                    'total' => (float) $row->total,
                    'qty_sold' => (float) $row->qty_sold,
                    'delivery_pay' => (float) $row->delivery_pay,
                    'delivery_settled_at' => $row->delivery_settled_at,
                    'delivery_pending' => (
                        $row->delivery_id
                        && $row->delivery_pay > 0
                        && $row->delivery_settled_at === null
                    ),
                    'status' => $row->status,
                ];
            })
            ->values();

        // --- Totales de TODAS las ventas (para cabecera) ---
        $allSalesCount = $salesList->count();
        $allTotalQty = (float) $salesList->sum('qty_sold');
        $allTotalSold = (float) $salesList->sum('total');

        // -------- Breakdown por producto (solo pendientes de pago) --------
        $itemsBreakdown = DB::table('inventory_moves AS im')
            ->join('sales AS s', 's.id', '=', 'im.sale_id')
            ->leftJoin('inventories AS inv', 'inv.id', '=', 'im.inventory_id')
            ->where('im.direction', 'out')
            ->whereIn('im.reason', ['SALE', 'SALE_OUT'])
            ->where('im.location_id', (int) $dealerId)
            ->where('s.status', '!=', Sale::ST_ANULADA)
            ->whereNotNull('s.delivery_id')
            ->where('s.delivery_pay', '>', 0)
            ->whereNull('s.delivery_settled_at')
            ->when($fromDate, fn($q) => $q->whereDate('s.created_at', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->whereDate('s.created_at', '<=', $toDate))
            ->groupBy('im.inventory_id', 'inv.name', 'inv.unit')
            ->selectRaw('
            im.inventory_id,
            COALESCE(inv.name, CONCAT("#", im.inventory_id)) AS name,
            COALESCE(inv.unit, "") AS unit,
            SUM(im.quantity) AS total_qty,
            SUM(s.total)     AS total_line_amount
        ')
            ->orderByDesc('total_line_amount')
            ->get();

        $dealerInfo = $dealerLocations->firstWhere('id', (int) $dealerId);
        $dealerName = $dealerInfo
            ? (($dealerInfo->user->name ?? 'Usuario') . ' — ' . $dealerInfo->name)
            : 'Dealer #' . $dealerId;

        return Inertia::render('Balances/Index', [
            'dealerLocations' => $dealerLocations,
            'filters' => [
                'dealer_id' => (int) $dealerId,
                'from_date' => $fromDate ?: '',
                'to_date' => $toDate ?: '',
            ],
            'summary' => [
                'mode' => 'single',
                'dealer_id' => (int) $dealerId,
                'dealer_name' => $dealerName,

                // ------------ TOTALES (todas las ventas del dealer en el rango) ------------
                // Para mostrar en la cabecera
                'sales_count_all' => (int) $allSalesCount,
                'total_qty_all' => (float) $allTotalQty,
                'total_sold_all' => (float) $allTotalSold,

                // Mantengo estos alias por compatibilidad si ya los lees así en el front:
                'sales_count' => (int) $allSalesCount,
                'total_qty' => (float) $allTotalQty,
                'total_sold' => (float) $allTotalSold,

                // ------------ PENDIENTES (lo que falta pagar al domicilio) ------------
                'sales_count_pending' => (int) ($pendingAgg->sales_count ?? 0),
                'total_qty_pending' => (float) ($pendingAgg->total_qty ?? 0),
                'total_sold_pending' => (float) ($pendingAgg->total_sold ?? 0),
                'payout_pending' => (float) ($pendingAgg->payout_pending ?? 0),
            ],
            'dealerBreakdown' => $itemsBreakdown, // productos pendientes
            'salesList' => $salesList,      // todas las ventas (pagadas o no)
        ]);
    }


    /**
     * Marca todas las ventas de un dealer como pagadas.
     */
    public function settleDealer(Request $request, int $dealerLocationId)
    {
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');
        if ($isAdmin && !$isSuperAdmin) {
            $dealerUserIds = User::role('dealer')->where('created_by', $user->id)->pluck('id');
            $allowedLocation = Location::whereIn('type', ['dealer', 'secondary', 'dealer_secondary'])
                ->where('id', $dealerLocationId)
                ->whereIn('user_id', $dealerUserIds)
                ->exists();
            if (!$allowedLocation) {
                abort(403);
            }
        }

        // 1. Buscar la location
        $location = Location::whereIn('type', ['dealer', 'secondary', 'dealer_secondary'])
            ->where('id', $dealerLocationId)
            ->firstOrFail();

        // 2. De ahí saco el user_id del dealer
        $dealerUserId = $location->user_id;

        if (!$dealerUserId) {
            return back()->with('error', 'Este dealer/punto no tiene usuario asignado.');
        }

        $dealer = User::findOrFail($dealerUserId);

        // OJO: en el front tú mandas from_date / to_date en el body POST,
        // NO en querystring, así que acá hay que leerlos de $request->input(...)
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $q = Sale::query()
            ->where('delivery_id', $dealerUserId)        // es ese repartidor
            ->whereNull('delivery_settled_at')           // no pagada aún
            ->where('delivery_pay', '>', 0)              // hay plata
            ->where('status', '!=', Sale::ST_ANULADA);   // no anulada

        if ($fromDate) {
            $q->whereDate('created_at', '>=', $fromDate);
        }
        if ($toDate) {
            $q->whereDate('created_at', '<=', $toDate);
        }

        $ventas = $q->get(['id', 'delivery_settled_at']);

        if ($ventas->isEmpty()) {
            return back()->with('info', "No hay pagos pendientes para {$dealer->name} en este rango.");
        }

        DB::transaction(function () use ($ventas) {
            $now = now();
            foreach ($ventas as $venta) {
                $venta->forceFill([
                    'delivery_settled_at' => $now,
                ])->save();
            }
        });

        return back()->with(
            'success',
            "Se marcaron como pagadas " . $ventas->count() . " ventas de {$dealer->name}."
        );
    }

}
