<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $r)
    {
        // Normaliza inputs
        $locationId = $r->filled('location_id') ? (int) $r->query('location_id') : null;
        $q = trim((string) $r->query('q', ''));
        $belowMin = (bool) $r->query('below_min', false);
        $perPage = max(1, min((int) $r->query('per_page', 30), 200));

        $page = InventoryStock::query()
            ->with(['inventory:id,name,unit', 'location:id,name,type'])
            ->when($locationId, fn($qq) => $qq->where('location_id', $locationId))
            ->whereHas('inventory', function ($qq) use ($q) {
                if ($q !== '') {
                    $qq->where('name', 'like', "%{$q}%");
                }
            })
            ->select([
                'id',
                'inventory_id',
                'location_id',
                'on_hand',
                'reserved',
                'min_stock',
                DB::raw('(on_hand - reserved) as available'),
            ])
            // Más portable que HAVING con alias:
            ->when($belowMin, fn($qq) => $qq->whereRaw('(on_hand - reserved) < min_stock'))
            ->orderByRaw('(on_hand - reserved) asc, on_hand asc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Stock/Index', [
            'page' => $page,   // paginator: data, links, meta
            'filters' => [
                'location_id' => $locationId,
                'q' => $q,
                'below_min' => $belowMin,
                'per_page' => $perPage,
            ],
            // Para el <select> de ubicaciones en el frontend
            'locations' => Location::select('id', 'name', 'type')
                ->orderBy('type')
                ->orderBy('name')
                ->get(),
        ]);
    }

    // RESUMEN por SKU (sumando todas las ubicaciones)
    public function summary(Request $r)
    {
        $q = (string) $r->query('q', '');
        $belowMin = $r->boolean('below_min');
        $perPage = (int) $r->query('per_page', 30);

        $builder = DB::table('inventory_stocks as s')
            ->join('inventories as i', 'i.id', '=', 's.inventory_id')
            ->select([
                's.inventory_id',
                'i.name',
                'i.unit',
                DB::raw('SUM(s.on_hand)   as on_hand_total'),
                DB::raw('SUM(s.reserved)  as reserved_total'),
                DB::raw('SUM(s.min_stock) as min_stock_total'),
                DB::raw('SUM(s.on_hand) - SUM(s.reserved) as available_total'),
            ])
            ->when($q !== '', fn($qq) => $qq->where('i.name', 'like', "%{$q}%"))
            ->groupBy('s.inventory_id', 'i.name', 'i.unit')
            ->orderBy('i.name');

        if ($belowMin) {
            $builder->havingRaw('SUM(s.on_hand) - SUM(s.reserved) < SUM(s.min_stock)');
        }

        $page = $builder->paginate($perPage)->withQueryString();

        return Inertia::render('Stock/Summary', [
            'page' => $page, // paginator: data, links, meta
            'filters' => [
                'q' => $q,
                'below_min' => $belowMin,
                'per_page' => $perPage,
            ],
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
