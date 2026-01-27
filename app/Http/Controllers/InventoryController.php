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
    /**
     * Forzamos cantidades tipo 1, 1.5, 2, 2.5...
     */
    private function normalizeHalfStep($value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        $num = (float) $value;
        $num = round($num, 2);

        if (fmod($num * 2, 1) !== 0.0) {
            abort(422, 'La cantidad debe ser en pasos de 0.5');
        }

        return $num;
    }

    public function index(Request $r)
    {
        $user = $r->user();
        $roles = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');
        // id de la ubicaciÃ³n principal (principal/main)
        $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');

        $items = Inventory::query()
            ->leftJoin('inventory_stocks as s', 's.inventory_id', '=', 'inventories.id')
            ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->where('inventories.created_by', $user->id))
            ->select([
                'inventories.id',
                'inventories.name',
                'inventories.unit',
                'inventories.purchase_price',
                'inventories.sale_price',

                // DECIMAL: SUM(...) ya devuelve decimal, COALESCE(...,0) lo deja como numÃ©rico
                DB::raw('COALESCE(SUM(s.on_hand - s.reserved), 0) as available_total'),

                // mÃ­nimo de la sede principal (puede ser decimal tambiÃ©n, ej 0.5)
                DB::raw('COALESCE(MAX(CASE WHEN s.location_id = ' . ((int) $principalId) . ' THEN s.min_stock END), 0) as principal_min_stock'),
            ])
            ->groupBy(
                'inventories.id',
                'inventories.name',
                'inventories.unit',
                'inventories.purchase_price',
                'inventories.sale_price'
            )
            ->orderBy('inventories.name')
            ->paginate(20)
            ->withQueryString();

        // OJO:
        // available_total y principal_min_stock salen como string numÃ©rica en MySQL.
        // El front debe tratarlos como nÃºmero o parseFloat.
        // Si quieres castearlos en PHP antes de mandarlos al front:
        $items->getCollection()->transform(function ($row) {
            $row->available_total = (float) $row->available_total;
            $row->principal_min_stock = (float) $row->principal_min_stock;
            return $row;
        });

        return Inertia::render('Inventories/Index', [
            'items' => $items,
            'principalId' => $principalId,
        ]);
    }

    public function create()
    {
        return Inertia::render('Inventories/Create');
    }

    public function store(InventoryRequest $req)
    {
        $data = $req->validated();
        $user = $req->user();

        $purchase = (float) ($data['purchase_price'] ?? 0);
        $sale = (float) ($data['sale_price'] ?? 0);

        // DECIMAL: stock inicial puede ser fraccionario tipo 1.5
        $initialQty = $this->normalizeHalfStep($data['quantity'] ?? 0);

        // mÃ­nimo permitido en principal (tambiÃ©n lo hago decimal por consistencia)
        $minStock = $this->normalizeHalfStep($data['min_stock'] ?? 0);

        // UbicaciÃ³n principal garantizada
        $principal = Location::firstOrCreate(
            ['type' => 'principal'],
            ['name' => 'Principal']
        );

        DB::transaction(function () use ($data, $purchase, $sale, $initialQty, $minStock, $principal, $user) {
            // Crear el producto
            $item = Inventory::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'unit' => $data['unit'],
                'purchase_price' => $purchase,
                'sale_price' => $sale,
                // Si mantienes columna quantity en inventories y ahora es DECIMAL:
                'quantity' => $initialQty,
                'created_by' => $user?->id,
            ]);

            // Crear el stock inicial en la ubicaciÃ³n principal
            InventoryStock::create([
                'inventory_id' => $item->id,
                'location_id' => $principal->id,
                // DECIMAL:
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
        // IMPORTANTE:
        // Eager load el stock con decimales si quieres mostrar cantidades
        $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');

        $stockRows = InventoryStock::where('inventory_id', $inventory->id)
            ->get(['location_id', 'on_hand', 'reserved', 'min_stock'])
            ->map(function ($row) {
                $row->on_hand = (float) $row->on_hand;
                $row->reserved = (float) $row->reserved;
                $row->min_stock = (float) $row->min_stock;
                return $row;
            });

        // total disponible global = SUM(on_hand - reserved)
        $availableTotal = (float) InventoryStock::where('inventory_id', $inventory->id)
            ->select(DB::raw('COALESCE(SUM(on_hand - reserved),0) as total'))
            ->value('total');

        // mÃ­nimo en principal
        $principalMin = (float) InventoryStock::where('inventory_id', $inventory->id)
            ->where('location_id', $principalId)
            ->value('min_stock') ?? 0.0;

        return Inertia::render('Inventories/Show', [
            'item' => [
                'id' => $inventory->id,
                'name' => $inventory->name,
                'description' => $inventory->description,
                'unit' => $inventory->unit,
                'purchase_price' => (float) $inventory->purchase_price,
                'sale_price' => (float) $inventory->sale_price,
                'quantity' => (float) $inventory->quantity, // DECIMAL
            ],
            'stocks' => $stockRows,
            'available_total' => $availableTotal,
            'principal_min_stock' => $principalMin,
        ]);
    }

    public function edit(Inventory $inventory)
    {
        // mandamos los decimales casteados a float para que el front no los reciba como string
        $inventory->purchase_price = (float) $inventory->purchase_price;
        $inventory->sale_price = (float) $inventory->sale_price;
        $inventory->quantity = (float) $inventory->quantity;

        return Inertia::render('Inventories/Edit', [
            'item' => $inventory,
        ]);
    }

    public function update(InventoryRequest $req, Inventory $inventory)
    {
        $data = $req->validated();

        $purchasePrice = (float) ($data['purchase_price'] ?? 0);
        $salePrice = (float) ($data['sale_price'] ?? 0);

        // 1) Actualizar datos base del producto
        $inventory->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'unit' => $data['unit'],
            'purchase_price' => $purchasePrice,
            'sale_price' => $salePrice,
            // OJO: normalmente quantity en inventories ya no se toca directo
            // porque el stock real vive en inventory_stocks, PERO
            // si sigues usando ese campo como "stock global" lo podemos actualizar tambiÃ©n:
            // sÃ³lo si viene explÃ­cito en la request.
            'quantity' => $req->has('quantity')
                ? $this->normalizeHalfStep($req->input('quantity'))
                : $inventory->quantity,
        ]);

        // 2) Manejo de stock por ubicaciÃ³n (opcional en el form)
        // Espera:
        //   stock_op   = none | set | inc
        //   stock_value = "1.5", "-0.5", etc
        //   location_id = id ubicaciÃ³n
        $stockOp = $req->input('stock_op');       // none|set|inc
        $stockValueR = $req->input('stock_value');    // string/num
        $locIdIn = $req->input('location_id');    // opcional

        if ($stockOp && $stockOp !== 'none' && $stockValueR !== null && $stockValueR !== '') {
            $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');
            $locationId = (int) ($locIdIn ?: $principalId);

            // normalizamos a paso de 0.5
            $deltaOrSetValue = $this->normalizeHalfStep($stockValueR);

            DB::transaction(function () use ($inventory, $locationId, $stockOp, $deltaOrSetValue) {
                /** @var \App\Models\InventoryStock $row */
                $row = InventoryStock::firstOrCreate(
                    ['inventory_id' => $inventory->id, 'location_id' => $locationId],
                    ['on_hand' => 0, 'reserved' => 0, 'min_stock' => 0]
                );

                // casteo actual a float
                $current = (float) $row->on_hand;

                if ($stockOp === 'set') {
                    // set absoluto
                    $row->on_hand = max(0, $deltaOrSetValue);
                } elseif ($stockOp === 'inc') {
                    // ajuste relativo (puede ser negativo si quieres descargar)
                    $row->on_hand = max(0, round($current + $deltaOrSetValue, 2));
                }

                $row->save();
            });
        }

        return redirect()
            ->route('inventories.index')
            ->with('success', 'Producto actualizado');
    }

    public function updateMinStock(Request $r, Inventory $inventory)
    {
        $data = $r->validate([
            'location_id' => ['required', 'exists:locations,id'],
            // ahora permitimos .5
            'min_stock' => ['required', 'numeric', 'regex:/^\d+(\.0|\.5)?$/'],
        ]);

        $row = InventoryStock::firstOrCreate(
            [
                'inventory_id' => $inventory->id,
                'location_id' => (int) $data['location_id'],
            ],
            ['on_hand' => 0, 'reserved' => 0, 'min_stock' => 0]
        );

        $row->update([
            'min_stock' => $this->normalizeHalfStep($data['min_stock']),
        ]);

        return back()->with('success', 'MÃ­nimo actualizado.');
    }

    public function destroy(Inventory $inventory)
    {
        $inventory->delete();
        return redirect()
            ->route('inventories.index')
            ->with('success', 'Producto eliminado');
    }

    // Autocomplete para carrito / ventas
    public function search(Request $r)
    {
        $term = trim((string) $r->query('term', ''));
        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }

        $user = $r->user();
        $roles = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');

        $locationIdParam = (int) $r->query('location_id', 0);

        $principalId = (int) Location::whereIn('type', ['principal', 'main'])->value('id');
        $userLocId = (int) Location::where('user_id', auth()->id())->value('id');

        $scope = $r->query('scope');
        $scopedId = match ($scope) {
            'principal' => $principalId,
            'user' => $userLocId,
            default => $userLocId ?: $principalId,
        };

        $originId = $locationIdParam > 0 ? $locationIdParam : $scopedId;

        if (!$originId) {
            return response()->json([]);
        }

        $limit = max(1, (int) $r->query('limit', 20));

        $rows = Inventory::query()
            ->leftJoin('inventory_stocks as s', function ($j) use ($originId) {
                $j->on('s.inventory_id', '=', 'inventories.id')
                    ->where('s.location_id', $originId);
            })
            ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->where('inventories.created_by', $user->id))
            ->where(function ($q) use ($term) {
                $q->where('inventories.name', 'like', "%{$term}%");
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
                DB::raw('COALESCE(s.on_hand - s.reserved, 0) as stock_origin'),
            ])
            ->map(function ($row) {
                // casteo decimal a float para el front
                $row->sale_price = (float) $row->sale_price;
                $row->stock_origin = (float) $row->stock_origin;
                $row->stock = (float) $row->stock_origin; // compat
                return $row;
            })
            ->values();

        return response()->json($rows);
    }
}
