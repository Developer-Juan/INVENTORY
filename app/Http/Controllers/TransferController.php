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
        $dealers = Location::query()
            ->whereIn('type', ['dealer', 'secondary', 'dealer_secondary']) // <-- ajusta tus valores reales
            ->with('user:id,name')
            ->get(['id', 'name', 'user_id', 'type']);

        $history = Transfer::query()
            ->select('id', 'from_location_id', 'to_location_id', 'created_by', 'note', 'status', 'created_at')
            ->with(['from:id,name', 'to:id,name', 'creator:id,name'])
            ->withCount(['items as lines_count'])
            ->withSum('items as qty_sum', 'quantity')
            ->latest()->paginate(10)->withQueryString();

        return Inertia::render('Transfers/Create', [
            'dealers' => $dealers,
            'history' => $history,
        ]);
    }


    // Ejecuta transferencia: principal -> dealer
    public function store(Request $r)
    {
        $data = $r->validate([
            'dealer_location_id' => ['required', 'exists:locations,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_id' => ['required', 'exists:inventories,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:200'],
        ]);

        $fromId = (int) Location::where('type', 'principal')->value('id');
        if (!$fromId)
            return back()->with('error', 'No existe ubicación principal');

        $toId = (int) $data['dealer_location_id'];

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
                $qty = (int) $line['quantity'];

                // Bloquea filas de stock
                $src = InventoryStock::where([
                    'inventory_id' => $invId,
                    'location_id' => $fromId,
                ])->lockForUpdate()->first();

                if (!$src || $src->on_hand < $qty) {
                    throw new \RuntimeException("Stock insuficiente en Principal para inventario #$invId");
                }

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

                // Mueve stock
                $src->decrement('on_hand', $qty);
                $dst->increment('on_hand', $qty);

                // Movimientos (auditoría)
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

                // Detalle de la transferencia
                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'inventory_id' => $invId,
                    'quantity' => $qty,
                ]);
            }
        });

        return redirect()->route('stock.index')->with('success', 'Transferencia realizada');
    }
}
