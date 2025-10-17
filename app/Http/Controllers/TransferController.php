<?php

namespace App\Http\Controllers;

use App\Models\InventoryMove;
use App\Models\InventoryStock;
use App\Models\Location;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function create()
    {
        $user = auth()->user();
        $isAdmin = method_exists($user, 'hasRole') ? $user->hasRole('admin') || $user->hasRole('super-admin') : false;

        $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');

        // Todas las que sirven para transferencias (principal + dealers/secundarias)
        $locations = Location::query()
            ->whereIn('type', ['principal', 'main', 'dealer', 'secondary', 'dealer_secondary'])
            ->with('user:id,name')
            ->get(['id', 'name', 'user_id', 'type']);

        $history = Transfer::query()
            ->select('id', 'from_location_id', 'to_location_id', 'created_by', 'note', 'status', 'created_at')
            ->with(['from:id,name', 'to:id,name', 'creator:id,name'])
            ->withCount(['items as lines_count'])
            ->withSum('items as qty_sum', 'quantity')
            ->latest()->paginate(10)->withQueryString();

        return Inertia::render('Transfers/Create', [
            'isAdmin' => $isAdmin,
            'principalId' => (int) $principalId,
            'locations' => $locations,
            'history' => $history,
        ]);
    }


    // Ejecuta transferencia: principal -> dealer
    public function store(Request $r)
    {
        $user = auth()->user();
        $isAdmin = method_exists($user, 'hasRole') ? $user->hasRole('admin') || $user->hasRole('super-admin') : false;

        // Validación base: cantidad numérica y al menos 0.5 (el ajuste fino lo hacemos abajo)
        $baseRules = [
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_id' => ['required', 'exists:inventories,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.5'],
            'note' => ['nullable', 'string', 'max:200'],
        ];

        if ($isAdmin && $r->filled('from_location_id') && $r->filled('to_location_id')) {
            $data = $r->validate($baseRules + [
                'from_location_id' => ['required', 'exists:locations,id'],
                'to_location_id' => ['required', 'exists:locations,id', 'different:from_location_id'],
            ]);
            $fromId = (int) $data['from_location_id'];
            $toId = (int) $data['to_location_id'];
        } else {
            // Flujo principal -> dealer
            $data = $r->validate($baseRules + [
                'dealer_location_id' => ['required', 'exists:locations,id'],
            ]);

            $fromId = (int) Location::whereIn('type', ['principal', 'main'])->value('id');
            if (!$fromId) {
                return back()->with('error', 'No existe ubicación principal');
            }
            $toId = (int) $data['dealer_location_id'];

            if ($fromId === $toId) {
                return back()->with('error', 'El origen y el destino no pueden ser iguales');
            }
        }

        // ===== Normalización por unidad =====
        // - Si la unidad es 'gr': forzar múltiplos de 0.5 (0.5, 1.0, 1.5, …) y mínimo 0.5
        // - En otras unidades: forzar entero >= 1
        // Para eso necesitamos saber la unidad de cada inventario.
        $invUnits = \App\Models\Inventory::whereIn('id', collect($data['items'])->pluck('inventory_id'))
            ->pluck('unit', 'id'); // [id => 'gr'|'ud'|...]

        $normalizedItems = [];
        foreach ($data['items'] as $line) {
            $invId = (int) $line['inventory_id'];
            $unit = strtolower((string) ($invUnits[$invId] ?? ''));
            $qty = (float) $line['quantity'];

            if ($unit === 'gr') {
                // múltiplos de 0.5
                $qty = round($qty / 0.5) * 0.5;
                if ($qty > 0 && $qty < 0.5)
                    $qty = 0.5;
            } else {
                // entero
                $qty = (int) floor($qty);
                if ($qty < 1)
                    $qty = 1;
            }

            $normalizedItems[] = [
                'inventory_id' => $invId,
                'quantity' => $qty,
            ];
        }

        // Sustituimos los ítems normalizados
        $data['items'] = $normalizedItems;

        try {
            DB::transaction(function () use ($data, $fromId, $toId) {
                $transfer = Transfer::create([
                    'from_location_id' => $fromId,
                    'to_location_id' => $toId,
                    'created_by' => auth()->id(),
                    'note' => $data['note'] ?? null,
                    'status' => 'done',
                ]);

                foreach ($data['items'] as $line) {
                    $invId = (int) $line['inventory_id'];
                    $qty = (float) $line['quantity']; // puede ser 0.5, 1.0, 1.5, ...

                    // Bloqueo de stock origen
                    $src = InventoryStock::where([
                        'inventory_id' => $invId,
                        'location_id' => $fromId,
                    ])->lockForUpdate()->first();

                    if (!$src || $src->on_hand < $qty) {
                        throw new \RuntimeException("Stock insuficiente en origen para inventario #{$invId}");
                    }

                    // Destino (crea si no existe)
                    $dst = InventoryStock::where([
                        'inventory_id' => $invId,
                        'location_id' => $toId,
                    ])->lockForUpdate()->first();

                    if (!$dst) {
                        $dst = InventoryStock::create([
                            'inventory_id' => $invId,
                            'location_id' => $toId,
                            'on_hand' => 0,
                            'reserved' => 0,
                            'min_stock' => 0,
                        ]);
                    }

                    // Movimiento de stock (acepta floats)
                    $src->decrement('on_hand', $qty);
                    $dst->increment('on_hand', $qty);

                    // Auditoría
                    InventoryMove::create([
                        'inventory_id' => $invId,
                        'location_id' => $fromId,
                        'direction' => 'out',
                        'quantity' => $qty,
                        'reason' => 'TRANSFER',
                        'created_by' => auth()->id(),
                    ]);
                    InventoryMove::create([
                        'inventory_id' => $invId,
                        'location_id' => $toId,
                        'direction' => 'in',
                        'quantity' => $qty,
                        'reason' => 'TRANSFER',
                        'created_by' => auth()->id(),
                    ]);

                    // Detalle
                    TransferItem::create([
                        'transfer_id' => $transfer->id,
                        'inventory_id' => $invId,
                        'quantity' => $qty,
                    ]);
                }
            });
        } catch (\Throwable $e) {
            // Devuelve error al front (tu toast lo muestra)
            return back()->with('error', $e->getMessage() ?: 'No se pudo registrar la transferencia');
        }

        return redirect()->route('stock.index')->with('success', 'Transferencia realizada');
    }



    public function lines(Transfer $transfer)
    {
        $transfer->load([
            'from:id,name',
            'to:id,name',
            'creator:id,name',
            'lines:id,transfer_id,inventory_id,quantity',
            'lines.inventory:id,name,unit',
        ]);

        return response()->json([
            'id' => $transfer->id,
            'status' => $transfer->status,
            'created_at' => $transfer->created_at,
            'from' => $transfer->from?->name,
            'to' => $transfer->to?->name,
            'note' => $transfer->note,
            'lines_count' => $transfer->lines->count(),
            'qty_sum' => (float) $transfer->lines->sum('quantity'),
            'items' => $transfer->lines->map(fn($l) => [
                'inventory_id' => $l->inventory_id,
                'name' => $l->inventory->name ?? ("#" . $l->inventory_id),
                'unit' => $l->inventory->unit ?? null,
                'quantity' => (float) $l->quantity,
            ])->values(),
        ]);
    }

    public function items(Transfer $transfer)
    {
        $transfer->load([
            'from:id,name',
            'to:id,name',
            'creator:id,name',
            // << usa items() del modelo Transfer
            'items:id,transfer_id,inventory_id,quantity',
            'items.inventory:id,name,unit',
        ]);

        return response()->json([
            'id' => $transfer->id,
            'status' => $transfer->status,
            'created_at' => $transfer->created_at,
            'from' => $transfer->from?->name,
            'to' => $transfer->to?->name,
            'note' => $transfer->note,
            'lines_count' => $transfer->items->count(),
            'qty_sum' => (float) $transfer->items->sum('quantity'),
            'items' => $transfer->items->map(fn($it) => [
                'inventory_id' => $it->inventory_id,
                'name' => $it->inventory->name ?? ('#' . $it->inventory_id),
                'unit' => $it->inventory->unit ?? null,
                'quantity' => (float) $it->quantity,
            ])->values(),
        ]);
    }
}
