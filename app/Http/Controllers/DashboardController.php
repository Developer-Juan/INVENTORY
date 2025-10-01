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

        $from = $fromStr ? Carbon::parse($fromStr)->startOfDay()
            : now()->subDays(29)->startOfDay();
        $to = $toStr ? Carbon::parse($toStr)->endOfDay()
            : now()->endOfDay();

        // Usamos strings exactos para evitar issues de TZ en MySQL
        $fromDB = $from->format('Y-m-d H:i:s');
        $toDB = $to->format('Y-m-d H:i:s');

        // ============================================================
        // Base: ventas PAGADAS cuyo created_at cae en el rango
        // (NO exigimos location_id para no descartar tus datos)
        // ============================================================
        $paidSalesIdsSub = DB::table('sales as s')
            ->where('s.status', 'pagado')
            ->whereBetween('s.created_at', [$fromDB, $toDB])
            ->select('s.id');

        // ---------------- KPIs ----------------
        $kpiSalesSum = (float) DB::table('sales as s')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->sum('s.total');

        $kpiSalesCount = (int) DB::table('sales as s')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->count();

        // Pagos del período (por paid_at) ligados a ventas pagadas
        $kpiPaySum = (float) DB::table('payments as p')
            ->join('sales as s', 's.id', '=', 'p.sale_id')
            ->where('s.status', 'pagado')
            ->whereBetween('p.paid_at', [$fromDB, $toDB])
            ->sum('p.amount');

        $kpiTicket = $kpiSalesCount > 0 ? round($kpiSalesSum / $kpiSalesCount, 2) : 0.0;

        // ---------------- Series por día: Ventas ----------------
        $salesByDay = DB::table('sales as s')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->selectRaw('DATE(s.created_at) as d, SUM(s.total) as sales_total, COUNT(*) as sales_count')
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        // ---------------- Series por día: Pagos ----------------
        $paymentsByDay = DB::table('payments as p')
            ->join('sales as s', 's.id', '=', 'p.sale_id')
            ->where('s.status', 'pagado')
            ->whereBetween('p.paid_at', [$fromDB, $toDB])
            ->selectRaw('DATE(p.paid_at) as d, SUM(p.amount) as paid_total')
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        // Llenamos todos los días del rango (sin huecos)
        $salesMap = $salesByDay->keyBy('d');
        $payMap = $paymentsByDay->keyBy('d');

        $seriesDays = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $d = $cursor->toDateString();
            $seriesDays[] = [
                'date' => $d,
                'sales' => (float) ($salesMap[$d]->sales_total ?? 0),
                'payments' => (float) ($payMap[$d]->paid_total ?? 0),
            ];
            $cursor->addDay();
        }

        // ---------------- Top productos (por cantidad) ----------------
        $topProducts = DB::table('sale_items as si')
            ->join('sales as s', 's.id', '=', 'si.sale_id')
            ->join('inventories as i', 'i.id', '=', 'si.inventory_id')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->groupBy('si.inventory_id', 'i.name')
            ->orderByDesc(DB::raw('SUM(si.quantity)'))
            ->limit(10)
            ->get([
                'i.name as name',
                DB::raw('SUM(si.quantity) as qty'),
                DB::raw('SUM(si.total) as amount'),
            ])
            ->map(function ($r) {
                $r->qty = (float) $r->qty;
                $r->amount = (float) $r->amount;
                return $r;
            });

        // ---------------- Top ubicaciones (por monto) ----------------
        // Usa ubicación efectiva (si es NULL, se etiqueta "Sin ubicación")
        $topLocations = DB::table('sale_items as si')
            ->join('sales as s', 's.id', '=', 'si.sale_id')
            ->whereIn('s.id', $paidSalesIdsSub)
            ->selectRaw('COALESCE(si.location_id, s.location_id) as loc_id, SUM(si.total) as amount')
            ->groupBy('loc_id')
            ->orderByDesc('amount')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $name = $row->loc_id
                    ? DB::table('locations')->where('id', $row->loc_id)->value('name')
                    : null;
                $row->name = $name ?: 'Sin ubicación';
                $row->amount = (float) $row->amount;
                return $row;
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
                DB::raw('SUM(p.amount) as amount'),
            ])
            ->map(function ($r) {
                $r->amount = (float) $r->amount;
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
