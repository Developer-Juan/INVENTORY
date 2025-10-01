<?php

namespace App\Http\Controllers;

use App\Models\CashMove;
use App\Models\Location;
use App\Models\LocationCash;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CashController extends Controller
{
    //
    public function index(Request $request)
    {
        $user = auth()->user();
        $isAdmin = method_exists($user, 'hasRole')
            ? ($user->hasRole('admin') || $user->hasRole('super-admin'))
            : false;

        // === Ubicaciones con saldo de caja ===
        $locQuery = Location::query()
            ->leftJoin('location_cashes as lc', 'lc.location_id', '=', 'locations.id')
            ->select([
                'locations.id',
                'locations.name',
                DB::raw('COALESCE(lc.on_hand, 0) as cash_on_hand'),
            ])
            ->orderBy('locations.name');

        // (Opcional) Si no es admin, podrías limitar a sus ubicaciones.
        // if (!$isAdmin) {
        //     $locQuery->where('locations.user_id', $user->id);
        // }

        $locations = $locQuery->get();

        // === Movimientos recientes de caja (incluye SALE_PAYMENT) ===
        $movesQuery = CashMove::query()
            ->with(['location:id,name', 'creator:id,name'])
            ->latest('id')
            ->select('id', 'location_id', 'direction', 'amount', 'reason', 'note', 'created_by', 'created_at')
            ->limit(50);

        // (Opcional) limitar movimientos a las ubicaciones visibles para no-admin
        // if (!$isAdmin) {
        //     $movesQuery->whereIn('location_id', $locations->pluck('id'));
        // }

        $moves = $movesQuery->get();

        $totalCash = round((float) $locations->sum('cash_on_hand'), 2);

        return Inertia::render('Cash/Index', [
            'locations' => $locations,
            'moves' => $moves,     // verás SALE, SALE_PAYMENT, SALE_CANCEL, etc.
            'totalCash' => $totalCash,
            'isAdmin' => $isAdmin,   // para mostrar botones de transferir/recoger sólo a admin
        ]);
    }

    public function transfer(Request $request)
    {
        $actor = auth()->user();
        if (!(method_exists($actor, 'hasRole') && ($actor->hasRole('admin') || $actor->hasRole('super-admin')))) {
            abort(403);
        }

        $data = $request->validate([
            'from_location_id' => ['required', 'exists:locations,id', 'different:to_location_id'],
            'to_location_id' => ['required', 'exists:locations,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:191'],
        ], [
            'from_location_id.different' => 'Las ubicaciones no pueden ser iguales.',
        ]);

        DB::transaction(function () use ($data, $actor) {
            $amount = round((float) $data['amount'], 2);
            $fromId = (int) $data['from_location_id'];
            $toId = (int) $data['to_location_id'];

            // Bloquear SIEMPRE en el mismo orden
            $ids = [$fromId, $toId];
            sort($ids);

            $cashes = LocationCash::whereIn('location_id', $ids)
                ->lockForUpdate()
                ->get()
                ->keyBy('location_id');

            // Asegurar filas de caja
            foreach ($ids as $lid) {
                if (!isset($cashes[$lid])) {
                    $cashes[$lid] = LocationCash::create([
                        'location_id' => $lid,
                        'on_hand' => 0,
                    ]);
                }
            }

            // Saldos antes
            $fromBefore = round((float) $cashes[$fromId]->on_hand, 2);
            $toBefore = round((float) $cashes[$toId]->on_hand, 2);

            if ($fromBefore + 1e-9 < $amount) {
                throw ValidationException::withMessages([
                    'amount' => 'Saldo insuficiente en la ubicación de origen.',
                ]);
            }

            // Saldos después
            $fromAfter = round($fromBefore - $amount, 2);
            $toAfter = round($toBefore + $amount, 2);

            // Aplicar
            $cashes[$fromId]->on_hand = $fromAfter;
            $cashes[$fromId]->save();

            $cashes[$toId]->on_hand = $toAfter;
            $cashes[$toId]->save();

            // Nombres de ubicaciones para el motivo
            $names = Location::whereIn('id', [$fromId, $toId])->pluck('name', 'id');
            $fromName = $names[$fromId] ?? ('#' . $fromId);
            $toName = $names[$toId] ?? ('#' . $toId);

            // Sufijo sólo si el ORIGEN quedó en 0
            $originEmptySuffix = ($fromAfter <= 0.00) ? ' · se quedó sin efectivo' : '';
            $baseNote = trim((string) ($data['note'] ?? ''));

            // Movimientos espejo
            CashMove::create([
                'location_id' => $fromId,
                'sale_id' => null,
                'direction' => 'out',
                'amount' => $amount,
                'reason' => 'CASH_TRANSFER',
                'created_by' => $actor->id,
                'note' => 'Transferencia a ' . $toName
                    . ($baseNote ? ' · ' . $baseNote : '')
                    . $originEmptySuffix,
            ]);

            CashMove::create([
                'location_id' => $toId,
                'sale_id' => null,
                'direction' => 'in',
                'amount' => $amount,
                'reason' => 'CASH_TRANSFER',
                'created_by' => $actor->id,
                'note' => 'Transferencia desde ' . $fromName
                    . ($baseNote ? ' · ' . $baseNote : '')
                    . $originEmptySuffix,
            ]);
        });

        return redirect()->route('cash.index')->with('success', 'Transferencia realizada.');
    }


    public function pickup(Request $request)
    {
        $actor = auth()->user();
        if (!(method_exists($actor, 'hasRole') && ($actor->hasRole('admin') || $actor->hasRole('super-admin')))) {
            abort(403);
        }

        $data = $request->validate([
            'location_id' => ['required', 'exists:locations,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:191'],
        ]);

        DB::transaction(function () use ($data, $actor) {
            $amount = round((float) $data['amount'], 2);
            $locId = (int) $data['location_id'];

            $cash = LocationCash::where('location_id', $locId)
                ->lockForUpdate()
                ->first();

            if (!$cash) {
                $cash = LocationCash::create(['location_id' => $locId, 'on_hand' => 0]);
            }

            $before = round((float) $cash->on_hand, 2);
            if ($before + 1e-9 < $amount) {
                throw ValidationException::withMessages(['amount' => 'Saldo insuficiente en la ubicación.']);
            }

            $after = round($before - $amount, 2);
            $cash->on_hand = $after;
            $cash->save();

            $locName = Location::whereKey($locId)->value('name') ?? ('#' . $locId);
            $suffix = ($after <= 0.00) ? ' · se quedó sin efectivo' : '';
            $baseNote = trim((string) ($data['note'] ?? 'Recogida de efectivo'));

            CashMove::create([
                'location_id' => $locId,
                'sale_id' => null,
                'direction' => 'out',
                'amount' => $amount,
                'reason' => 'CASH_PICKUP',
                'created_by' => $actor->id,
                'note' => $baseNote . $suffix,
            ]);
        });

        return redirect()->route('cash.index')->with('success', 'Recogida registrada.');
    }

}
