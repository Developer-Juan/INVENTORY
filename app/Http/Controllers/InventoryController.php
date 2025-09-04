<?php

namespace App\Http\Controllers;

use App\Http\Requests\InventoryRequest;
use App\Models\Inventory;
use App\Models\InventoryStock;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $r)
    {
        // id de la ubicación principal (principal/main)
        $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');

        $items = Inventory::query()
            // unir todas las filas de stock (sin filtrar por ubicación)
            ->leftJoin('inventory_stocks as s', 's.inventory_id', '=', 'inventories.id')
            ->select([
                'inventories.id',
                'inventories.name',
                'inventories.unit',
                'inventories.purchase_price',
                'inventories.sale_price',
                // disponible total = SUM(on_hand - reserved) en TODAS las ubicaciones
                DB::raw('COALESCE(SUM(s.on_hand - s.reserved), 0) as available_total'),
                // min del principal (si no existe, 0)
                DB::raw('COALESCE(MAX(CASE WHEN s.location_id = ' . ((int) $principalId) . ' THEN s.min_stock END), 0) as principal_min_stock'),
            ])
            ->groupBy('inventories.id', 'inventories.name', 'inventories.unit', 'inventories.purchase_price', 'inventories.sale_price')
            ->orderBy('inventories.name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Inventories/Index', [
            'items' => $items,
            'principalId' => $principalId, // tu componente lo usa al guardar el mínimo
        ]);
    }

    public function create()
    {
        return Inertia::render('Inventories/Create');
    }

    public function store(InventoryRequest $req)
    {
        $data = $req->validated();

        $purchase = (float) ($data['purchase_price'] ?? 0);
        $sale = (float) ($data['sale_price'] ?? 0);

        // Stock inicial (solo en creación)
        $initialQty = (int) ($data['quantity'] ?? 0);
        $minStock = (int) ($data['min_stock'] ?? 0);

        // Asegura la ubicación principal (la crea si falta)
        $principal = Location::firstOrCreate(
            ['type' => 'principal'],
            ['name' => 'Principal'] // puedes ajustar el nombre
        );

        DB::transaction(function () use ($data, $purchase, $sale, $initialQty, $minStock, $principal) {
            // Crea el producto (NO uses 'quantity' aquí si ya migraste a inventory_stock)
            $item = Inventory::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'unit' => $data['unit'],
                'purchase_price' => $purchase,
                'sale_price' => $sale,
                // 'quantity'     => 0, // solo si tu tabla inventories todavía tiene esa columna
            ]);

            // Stock inicial en la ubicación principal
            InventoryStock::create([
                'inventory_id' => $item->id,
                'location_id' => $principal->id,
                'on_hand' => $initialQty,
                'reserved' => 0,
                'min_stock' => $minStock,
            ]);
        });

        return redirect()
            ->route('inventories.index')
            ->with('success', 'Producto creado y stock cargado en Principal.');
    }

    public function show(Inventory $inventory)
    {
        return Inertia::render('Inventories/Show', ['item' => $inventory]);
    }

    public function edit(Inventory $inventory)
    {
        return Inertia::render('Inventories/Edit', ['item' => $inventory]);
    }

    public function update(InventoryRequest $req, Inventory $inventory)
    {
        $data = $req->validated();
        $data['purchase_price'] = $data['purchase_price'] ?? 0;
        $data['sale_price'] = $data['sale_price'] ?? 0;
        $data['quantity'] = $data['quantity'] ?? 0;

        $inventory->update($data);

        return redirect()->route('inventories.index')->with('success', 'Producto actualizado');
    }

    public function destroy(Inventory $inventory)
    {
        $inventory->delete();
        return redirect()->route('inventories.index')->with('success', 'Producto eliminado');
    }

    // Autocomplete para carrito de ventas
    public function search(Request $r)
    {
        $term = trim((string) $r->query('term', ''));
        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }

        // ¿Desde qué ubicación quieres ver stock?
        // por defecto: la del usuario; si no tiene, Principal.
        // puedes forzar principal con ?scope=principal
        $scope = $r->query('scope');
        $locationId = match ($scope) {
            'principal' => Location::where('type', 'principal')->value('id'),
            'user' => Location::where('user_id', auth()->id())->value('id'),
            default => Location::where('user_id', auth()->id())->value('id')
            ?? Location::where('type', 'principal')->value('id'),
        };

        $rows = Inventory::query()
            ->leftJoin('inventory_stocks as s', function ($j) use ($locationId) {
                $j->on('s.inventory_id', '=', 'inventories.id')
                    ->where('s.location_id', $locationId);
            })
            ->where(function ($q) use ($term) {
                $q->where('inventories.name', 'like', "%{$term}%")
                    ->orWhere('inventories.id', $term);
            })
            ->orderBy('inventories.name')
            ->limit(20)
            ->get([
                'inventories.id',
                'inventories.name',
                'inventories.unit',
                'inventories.sale_price',
                DB::raw('COALESCE(s.on_hand - s.reserved, 0) as stock'),
            ]);

        return response()->json($rows);
    }

    public function updateMinStock(Request $r, Inventory $inventory)
    {
        $data = $r->validate([
            'location_id' => ['required', 'exists:locations,id'],
            'min_stock' => ['required', 'integer', 'min:0'],
        ]);

        $row = InventoryStock::firstOrCreate(
            ['inventory_id' => $inventory->id, 'location_id' => (int) $data['location_id']],
            ['on_hand' => 0, 'reserved' => 0, 'min_stock' => 0]
        );

        $row->update(['min_stock' => (int) $data['min_stock']]);

        return back()->with('success', 'Mínimo actualizado.');
    }
}
