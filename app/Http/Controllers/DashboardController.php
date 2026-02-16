<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Sale;
use App\Models\Location;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
        $user = auth()->user();
        if ($user && method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
            $adminScoped = User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['admin', 'super-admin']);
            });
            $totalUsers = (clone $adminScoped)->count();
            $pendingUsers = (clone $adminScoped)
                ->whereIn('status', [User::STATUS_PENDING, User::STATUS_PENDING_DEMO])
                ->count();
            $activeDemo = (clone $adminScoped)->where('status', User::STATUS_ACTIVE_DEMO)->count();
            $activeWorking = (clone $adminScoped)->where('status', User::STATUS_ACTIVE_WORKING)->count();
            $onlineUsers = (clone $adminScoped)
                ->where('last_seen_at', '>=', now()->subMinutes(5))
                ->count();

            return Inertia::render('SuperAdmin/Dashboard', [
                'stats' => [
                    'total' => $totalUsers,
                    'pending' => $pendingUsers,
                    'active_demo' => $activeDemo,
                    'active_working' => $activeWorking,
                    'online' => $onlineUsers,
                ],
            ]);
        }

        $isDealer = $user && method_exists($user, 'hasRole') && $user->hasRole('dealer');
        $isAdmin = $user && method_exists($user, 'hasRole') && $user->hasRole('admin');
        $dealerLocId = $isDealer
            ? Location::where('type', 'dealer')->where('user_id', $user->id)->value('id')
            : null;
        $adminScopedUserIds = $isAdmin
            ? User::where('created_by', $user->id)->pluck('id')
            : collect();
        $adminScopedUserIds = $adminScopedUserIds->push($user->id)->unique()->values();

        // ====== Rango de fechas (por defecto últimos 30 días) ======
        $fromStr = $request->query('from');
        $toStr = $request->query('to');

        $from = $fromStr ? Carbon::parse($fromStr)->startOfDay() : now()->subDays(29)->startOfDay();
        $to = $toStr ? Carbon::parse($toStr)->endOfDay() : now()->endOfDay();

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
            ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                $q->where(function ($qq) use ($user, $dealerLocId) {
                    $qq->where('s.delivery_id', $user->id);
                    if ($dealerLocId) {
                        $qq->orWhere('s.location_id', $dealerLocId);
                    }
                });
            })
            ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                $q->where(function ($qq) use ($adminScopedUserIds) {
                    $qq->whereIn('s.user_id', $adminScopedUserIds)
                        ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                });
            })
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
            ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                $q->where(function ($qq) use ($user, $dealerLocId) {
                    $qq->where('s.delivery_id', $user->id);
                    if ($dealerLocId) {
                        $qq->orWhere('s.location_id', $dealerLocId);
                    }
                });
            })
            ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                $q->where(function ($qq) use ($adminScopedUserIds) {
                    $qq->whereIn('s.user_id', $adminScopedUserIds)
                        ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                });
            })
            ->sum('p.amount') ?? 0);

        $kpiTicket = $kpiSalesCount > 0 ? round($kpiSalesSum / $kpiSalesCount, 2) : 0.0;

        // ---------------- Series por día: Ventas ----------------
        $salesByDay = DB::table('sales as s')
            ->where('s.status', 'pagado')
            ->whereBetween('s.created_at', [$fromDB, $toDB])
            ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                $q->where(function ($qq) use ($user, $dealerLocId) {
                    $qq->where('s.delivery_id', $user->id);
                    if ($dealerLocId) {
                        $qq->orWhere('s.location_id', $dealerLocId);
                    }
                });
            })
            ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                $q->where(function ($qq) use ($adminScopedUserIds) {
                    $qq->whereIn('s.user_id', $adminScopedUserIds)
                        ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                });
            })
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
            ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                $q->where(function ($qq) use ($user, $dealerLocId) {
                    $qq->where('s.delivery_id', $user->id);
                    if ($dealerLocId) {
                        $qq->orWhere('s.location_id', $dealerLocId);
                    }
                });
            })
            ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                $q->where(function ($qq) use ($adminScopedUserIds) {
                    $qq->whereIn('s.user_id', $adminScopedUserIds)
                        ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                });
            })
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
            ->where('s.status', 'pagado')
            ->whereBetween('s.created_at', [$fromDB, $toDB])
            ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                $q->where(function ($qq) use ($user, $dealerLocId) {
                    $qq->where('s.delivery_id', $user->id);
                    if ($dealerLocId) {
                        $qq->orWhere('s.location_id', $dealerLocId);
                    }
                });
            })
            ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                $q->where(function ($qq) use ($adminScopedUserIds) {
                    $qq->whereIn('s.user_id', $adminScopedUserIds)
                        ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                });
            })
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

        // ---------------- Ventas por ubicación (monto) ----------------
        if (Schema::hasTable('inventory_moves')) {
            // Usa movimientos para ubicar la venta por línea
            $topLocations = DB::table('inventory_moves as im')
                ->join('sale_items as si', 'si.id', '=', 'im.sale_item_id')
                ->join('sales as s', 's.id', '=', 'si.sale_id')
                ->leftJoin('locations as l', 'l.id', '=', 'im.location_id')
                ->where('s.status', 'pagado')
                ->whereBetween('s.created_at', [$fromDB, $toDB])
                ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                    $q->where(function ($qq) use ($user, $dealerLocId) {
                        $qq->where('s.delivery_id', $user->id);
                        if ($dealerLocId) {
                            $qq->orWhere('s.location_id', $dealerLocId);
                        }
                    });
                })
                ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                    $q->where(function ($qq) use ($adminScopedUserIds) {
                        $qq->whereIn('s.user_id', $adminScopedUserIds)
                            ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                    });
                })
                ->where('im.reason', 'SALE')
                ->groupBy('loc_id', 'name')
                ->orderByDesc('amount')
                ->limit(10)
                ->get([
                    DB::raw('im.location_id as loc_id'),
                    DB::raw("COALESCE(l.name, 'Sin ubicación') as name"),
                    DB::raw('COALESCE(SUM(si.total),0) as amount'),
                ])
                ->map(function ($r) {
                    $r->amount = (float) ($r->amount ?? 0);
                    return $r;
                });
        } else {
            // Fallback: usa location_id de la venta
            $topLocations = DB::table('sales as s')
                ->leftJoin('locations as l', 'l.id', '=', 's.location_id')
                ->where('s.status', 'pagado')
                ->whereBetween('s.created_at', [$fromDB, $toDB])
                ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                    $q->where(function ($qq) use ($user, $dealerLocId) {
                        $qq->where('s.delivery_id', $user->id);
                        if ($dealerLocId) {
                            $qq->orWhere('s.location_id', $dealerLocId);
                        }
                    });
                })
                ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                    $q->where(function ($qq) use ($adminScopedUserIds) {
                        $qq->whereIn('s.user_id', $adminScopedUserIds)
                            ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                    });
                })
                ->groupBy('loc_id', 'name')
                ->orderByDesc('amount')
                ->limit(10)
                ->get([
                    DB::raw('s.location_id as loc_id'),
                    DB::raw("COALESCE(l.name, 'Sin ubicación') as name"),
                    DB::raw('COALESCE(SUM(s.total),0) as amount'),
                ])
                ->map(function ($r) {
                    $r->amount = (float) ($r->amount ?? 0);
                    return $r;
                });
        }

        // ---------------- Métodos de pago (pie) ----------------
        $payByMethod = DB::table('payments as p')
            ->join('payment_methods as pm', 'pm.id', '=', 'p.payment_method_id')
            ->join('sales as s', 's.id', '=', 'p.sale_id')
            ->where('s.status', 'pagado')
            ->whereBetween('p.paid_at', [$fromDB, $toDB])
            ->when($isDealer, function ($q) use ($user, $dealerLocId) {
                $q->where(function ($qq) use ($user, $dealerLocId) {
                    $qq->where('s.delivery_id', $user->id);
                    if ($dealerLocId) {
                        $qq->orWhere('s.location_id', $dealerLocId);
                    }
                });
            })
            ->when($isAdmin, function ($q) use ($adminScopedUserIds) {
                $q->where(function ($qq) use ($adminScopedUserIds) {
                    $qq->whereIn('s.user_id', $adminScopedUserIds)
                        ->orWhereIn('s.delivery_id', $adminScopedUserIds);
                });
            })
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
