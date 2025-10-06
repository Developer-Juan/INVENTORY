<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        // ====== Rango de fechas (por defecto últimos 30 días) ======
        $fromStr = $request->query('from');
        $toStr = $request->query('to');

        $from = $fromStr
            ? Carbon::parse($fromStr)->startOfDay()
            : now()->subDays(29)->startOfDay();

        $to = $toStr
            ? Carbon::parse($toStr)->endOfDay()
            : now()->endOfDay();

        // Strings exactos para evitar issues de TZ en MySQL
        $fromDB = $from->format('Y-m-d H:i:s');
        $toDB = $to->format('Y-m-d H:i:s');

        // ============================================================
        // Base: ventas PAGADAS cuyo created_at cae en el rango
        // (NO exigimos location_id para no descartar datos)
        // ============================================================
        $paidSalesIdsSub = DB::table('sales as s')
            ->where('s.status', 'pagado')
            ->whereBetween('s.created_at', [$fromDB, $toDB])
            ->select('s.id');

        // ---------------- KPIs ----------------
        $kpiSalesSum = (float) (DB::table('sales as s')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->sum('s.total') ?? 0);

        $kpiSalesCount = (int) (DB::table('sales as s')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->count() ?? 0);

        // Pagos del período (por paid_at) ligados a ventas pagadas
        $kpiPaySum = (float) (DB::table('payments as p')
            ->join('sales as s', 's.id', '=', 'p.sale_id')
            ->where('s.status', 'pagado')
            ->whereBetween('p.paid_at', [$fromDB, $toDB])
            ->sum('p.amount') ?? 0);

        $kpiTicket = $kpiSalesCount > 0 ? round($kpiSalesSum / $kpiSalesCount, 2) : 0.0;

        // ---------------- Series por día: Ventas ----------------
        $salesByDay = DB::table('sales as s')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->selectRaw('DATE(s.created_at) as d,
                         COALESCE(SUM(s.total),0) as sales_total,
                         COUNT(*) as sales_count')
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        // ---------------- Series por día: Pagos ----------------
        $paymentsByDay = DB::table('payments as p')
            ->join('sales as s', 's.id', '=', 'p.sale_id')
            ->where('s.status', 'pagado')
            ->whereBetween('p.paid_at', [$fromDB, $toDB])
            ->selectRaw('DATE(p.paid_at) as d, COALESCE(SUM(p.amount),0) as paid_total')
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        // Llenamos todos los días del rango (sin huecos) evitando nulls
        $salesMap = $salesByDay->keyBy('d');
        $payMap = $paymentsByDay->keyBy('d');

        $seriesDays = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $d = $cursor->toDateString();
            $salesRow = $salesMap->get($d);
            $payRow = $payMap->get($d);

            $seriesDays[] = [
                'date' => $d,
                'sales' => (float) ($salesRow->sales_total ?? 0),
                'payments' => (float) ($payRow->paid_total ?? 0),
            ];
            $cursor->addDay();
        }

        // ---------------- Top productos (por cantidad) ----------------
        $topProducts = DB::table('sale_items as si')
            ->join('sales as s', 's.id', '=', 'si.sale_id')
            ->join('inventories as i', 'i.id', '=', 'si.inventory_id')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->groupBy('si.inventory_id', 'i.name')
            ->orderByDesc(DB::raw('SUM(COALESCE(si.quantity,0))'))
            ->limit(10)
            ->get([
                'i.name as name',
                DB::raw('COALESCE(SUM(si.quantity),0) as qty'),
                DB::raw('COALESCE(SUM(si.total),0)    as amount'),
            ])
            ->map(function ($r) {
                $r->qty = (float) ($r->qty ?? 0);
                $r->amount = (float) ($r->amount ?? 0);
                return $r;
            });

        // ---------------- Top ubicaciones (por monto) ----------------
        // Ubicación efectiva = COALESCE(si.location_id, s.location_id)
        // Evita N+1 resolviendo el nombre con LEFT JOIN
        $topLocations = DB::table('sale_items as si')
            ->join('sales as s', 's.id', '=', 'si.sale_id')
            ->leftJoin('locations as l_si', 'l_si.id', '=', 'si.location_id')
            ->leftJoin('locations as l_s', 'l_s.id', '=', 's.location_id')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->groupBy('loc_id', 'name')
            ->orderByDesc('amount')
            ->limit(10)
            ->get([
                DB::raw('COALESCE(si.location_id, s.location_id) as loc_id'),
                DB::raw("COALESCE(l_si.name, l_s.name, 'Sin ubicación') as name"),
                DB::raw('COALESCE(SUM(si.total),0) as amount'),
            ])
            ->map(function ($r) {
                $r->amount = (float) ($r->amount ?? 0);
                return $r;
            });

        // ---------------- Métodos de pago (pie) ----------------
        $payByMethod = DB::table('payments as p')
            ->join('payment_methods as pm', 'pm.id', '=', 'p.payment_method_id')
            ->join('sales as s', 's.id', '=', 'p.sale_id')
            ->where('s.status', 'pagado')
            ->whereBetween('p.paid_at', [$fromDB, $toDB])
            ->groupBy('pm.id', 'pm.name')
            ->orderByDesc(DB::raw('SUM(p.amount)'))
            ->get([
                'pm.name as name',
                DB::raw('COALESCE(SUM(p.amount),0) as amount'),
            ])
            ->map(function ($r) {
                $r->amount = (float) ($r->amount ?? 0);
                return $r;
            });

        return Inertia::render('Dashboard', [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'kpi' => [
                'salesSum' => round($kpiSalesSum, 2),
                'paymentsSum' => round($kpiPaySum, 2),
                'ticketAvg' => round($kpiTicket, 2),
            ],
            'seriesDays' => $seriesDays,
            'topProducts' => $topProducts,
            'topLocations' => $topLocations,
            'payByMethod' => $payByMethod,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
