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
        // 1) Actualiza datos del producto (sin tocar stock)
        $data = $req->validated();
        $inventory->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'unit' => $data['unit'],
            'purchase_price' => (float) ($data['purchase_price'] ?? 0),
            'sale_price' => (float) ($data['sale_price'] ?? 0),
        ]);

        // 2) Si vienen campos de stock, los procesamos
        //    Espera: stock_op ∈ {'none','set','inc'}, stock_value (num), location_id (opcional)
        $stockOp = $req->input('stock_op');        // none|set|inc
        $stockValue = $req->input('stock_value');     // número (puede ser negativo si inc)
        $locIdIn = $req->input('location_id');     // opcional

        if ($stockOp && $stockOp !== 'none' && $stockValue !== null && $stockValue !== '') {
            // Ubicación por defecto: Principal
            $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');
            $locationId = (int) ($locIdIn ?: $principalId);

            DB::transaction(function () use ($inventory, $locationId, $stockOp, $stockValue) {
                // Fila de stock por producto+ubicación
                /** @var \App\Models\InventoryStock $row */
                $row = InventoryStock::firstOrCreate(
                    ['inventory_id' => $inventory->id, 'location_id' => $locationId],
                    ['on_hand' => 0, 'reserved' => 0, 'min_stock' => 0]
                );

                $val = (int) $stockValue;

                if ($stockOp === 'set') {
                    $row->on_hand = max(0, $val);
                } elseif ($stockOp === 'inc') {
                    // Ajuste relativo (acepta negativos). No baja de 0.
                    $row->on_hand = max(0, (int) $row->on_hand + $val);
                }

                $row->save();
            });
        }

        return redirect()->route('inventories.index')->with('success', 'Producto actualizado');
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

        // --- Origen para calcular stock ---
        // 1) Si viene ?location_id desde el front, úsalo.
        // 2) Si no, respalda con ?scope=(principal|user) o por defecto: loc del usuario -> principal.
        $locationIdParam = (int) $r->query('location_id', 0);

        // Resuelvo ids comunes una sola vez
        $principalId = (int) Location::whereIn('type', ['principal', 'main'])->value('id');
        $userLocId = (int) Location::where('user_id', auth()->id())->value('id');

        $scope = $r->query('scope'); // opcional
        $scopedId = match ($scope) {
            'principal' => $principalId,
            'user' => $userLocId,
            default => $userLocId ?: $principalId,
        };

        $originId = $locationIdParam > 0 ? $locationIdParam : $scopedId;

        // Seguridad: si no hay origen resolvible, devolvemos vacío
        if (!$originId) {
            return response()->json([]);
        }

        // Límite opcional
        $limit = max(1, (int) $r->query('limit', 20));

        $rows = Inventory::query()
            ->leftJoin('inventory_stocks as s', function ($j) use ($originId) {
                $j->on('s.inventory_id', '=', 'inventories.id')
                    ->where('s.location_id', $originId);
            })
            ->where(function ($q) use ($term) {
                $q->where('inventories.name', 'like', "%{$term}%");
                // Si el término es numérico, también permite buscar por ID exacto
                if (ctype_digit($term)) {
                    $q->orWhere('inventories.id', (int) $term);
                }
            })
            ->orderBy('inventories.name')
            ->limit($limit)
            ->get([
                'inventories.id',
                'inventories.name',
                'inventories.unit',
                'inventories.sale_price',
                // Stock en el ORIGEN solicitado
                DB::raw('COALESCE(s.on_hand - s.reserved, 0) as stock_origin'),
            ])
            // compat: agrega "stock" con el mismo valor de stock_origin
            ->map(function ($row) {
                $row->stock = $row->stock_origin;
                return $row;
            })
            ->values();

        return response()->json($rows);
    }


}
