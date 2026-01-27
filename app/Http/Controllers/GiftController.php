<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryMove;
use App\Models\InventoryStock;
use App\Models\Location;
use App\Models\PointsReward;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceQualityToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;

class GiftController extends Controller
{
    private function resolvePointsAdminId(User $actor): ?int
    {
        $roles = method_exists($actor, 'getRoleNames') ? $actor->getRoleNames() : collect();
        if ($roles->contains('admin') || $roles->contains('super-admin')) {
            return $actor->id;
        }
        if ($roles->contains('dealer') && !empty($actor->created_by)) {
            return (int) $actor->created_by;
        }
        return $actor->id;
    }

    public function index()
    {
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');
        $dealerIds = collect();
        if ($isAdmin && !$isSuperAdmin) {
            $dealerIds = User::role('dealer')->where('created_by', $user->id)->pluck('id');
        }

        $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');
        $userLocId = Location::where('user_id', $user->id)->value('id');
        $locationId = $principalId ?: $userLocId ?: Location::min('id');

        $items = Inventory::query()
            ->leftJoin('inventory_stocks as s', function ($j) use ($locationId) {
                $j->on('s.inventory_id', '=', 'inventories.id')
                    ->where('s.location_id', $locationId);
            })
            ->orderBy('inventories.name')
            ->get([
                'inventories.id',
                'inventories.name',
                'inventories.unit',
                DB::raw('(COALESCE(s.on_hand,0) - COALESCE(s.reserved,0)) as quantity'),
            ]);

        $dealerLocations = Location::query()
            ->where('type', 'dealer')
            ->whereNotNull('user_id')
            ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->whereIn('user_id', $dealerIds))
            ->with('user:id,name')
            ->select('id', 'name', 'user_id')
            ->orderBy('name')
            ->get();

        $adminId = $user ? $this->resolvePointsAdminId($user) : null;
        $rewards = PointsReward::query()
            ->where('admin_id', $adminId)
            ->where('is_active', true)
            ->orderBy('points_required')
            ->get(['id', 'name', 'points_required', 'description', 'is_active']);

        return Inertia::render('Gifts/Index', [
            'items' => $items,
            'dealerLocations' => $dealerLocations,
            'current_location_id' => $locationId,
            'rewards' => $rewards,
        ]);
    }

    public function lookupCustomer(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\d{7,15}$/'],
        ]);

        $role = Role::firstOrCreate(['name' => 'customer']);
        $user = User::role($role->name)->where('phone', $data['phone'])->first();
        if (!$user) {
            return response()->json(['found' => false]);
        }

        $actor = auth()->user();
        $adminId = $actor ? $this->resolvePointsAdminId($actor) : null;
        $hasPurchased = Sale::where('customer_user_id', $user->id)->exists();
        $pointsRow = \App\Models\CustomerPoint::firstOrCreate(
            ['user_id' => $user->id, 'admin_id' => $adminId],
            ['points_balance' => 0]
        );

        return response()->json([
            'found' => true,
            'eligible' => $hasPurchased,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'points_balance' => (int) $pointsRow->points_balance,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'recipient_type' => ['required', 'in:customer,dealer'],
            'customer_phone' => ['required_if:recipient_type,customer', 'string', 'regex:/^\d{7,15}$/'],
            'dealer_location_id' => ['nullable', 'integer', 'required_if:recipient_type,dealer'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);

        $actor = auth()->user();
        $roles = $actor ? $actor->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');
        $dealerIds = collect();
        if ($isAdmin && !$isSuperAdmin) {
            $dealerIds = User::role('dealer')->where('created_by', $actor->id)->pluck('id');
        }

        return DB::transaction(function () use ($data, $actor) {
            $m2 = fn($n) => round((float) $n, 2);
            $q3 = fn($n) => round((float) $n, 3);
            $isMultiple = function ($value, $step) {
                $step = (float) $step;
                if ($step <= 0) return false;
                $r = fmod((float) $value, $step);
                return $r < 1e-6 || ($step - $r) < 1e-6;
            };

            $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');
            $userLocId = Location::where('user_id', $actor->id)->value('id');
            $locationId = $principalId ?: $userLocId ?: Location::min('id');
            if (!$locationId) {
                throw ValidationException::withMessages([
                    'location' => 'No hay ubicación disponible para registrar el regalo.',
                ]);
            }

            $customerUser = null;
            $deliveryId = null;

            if ($data['recipient_type'] === 'customer') {
                $role = Role::firstOrCreate(['name' => 'customer']);
                $customerUser = User::role($role->name)->where('phone', $data['customer_phone'])->first();
                if (!$customerUser) {
                    throw ValidationException::withMessages([
                        'customer_phone' => 'El cliente no existe.',
                    ]);
                }
                $hasPurchased = Sale::where('customer_user_id', $customerUser->id)->exists();
                if (!$hasPurchased) {
                    throw ValidationException::withMessages([
                        'customer_phone' => 'El cliente aún no tiene compras registradas.',
                    ]);
                }
            } else {
                $dealerLocation = Location::query()
                    ->where('type', 'dealer')
                    ->whereNotNull('user_id')
                    ->where('id', (int) $data['dealer_location_id'])
                    ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->whereIn('user_id', $dealerIds))
                    ->first();

                if (!$dealerLocation) {
                    throw ValidationException::withMessages([
                        'dealer_location_id' => 'El dealer seleccionado no es válido.',
                    ]);
                }
                $deliveryId = (int) $dealerLocation->user_id;
            }

            $lines = collect($data['items'] ?? [])
                ->map(function ($it) use ($q3) {
                    return [
                        'inventory_id' => (int) ($it['inventory_id'] ?? 0),
                        'quantity' => $q3($it['quantity'] ?? 0),
                    ];
                })
                ->filter(fn($it) => $it['inventory_id'] > 0 && $it['quantity'] > 0)
                ->values();

            if ($lines->isEmpty()) {
                throw ValidationException::withMessages(['items' => 'No hay ítems válidos para regalar.']);
            }

            $sale = Sale::create([
                'user_id' => $actor->id,
                'customer_id' => null,
                'customer_user_id' => $customerUser?->id,
                'delivery_id' => $deliveryId,
                'location_id' => $locationId,
                'km' => 0,
                'delivery_rate' => 0,
                'delivery_pay' => 0,
                'discount' => 0,
                'tax' => 0,
                'subtotal' => 0,
                'total' => 0,
                'paid' => 0,
                'balance' => 0,
                'status' => 'gift',
            ]);

            foreach ($lines as $it) {
                $invId = (int) $it['inventory_id'];
                $qty = $q3($it['quantity']);

                $unitStr = (string) DB::table('inventories')->where('id', $invId)->value('unit');
                $isPieces = in_array(strtolower($unitStr), ['pcs', 'pieza', 'piezas', 'unidad', 'unidades']);
                $step = $isPieces ? 1.0 : 0.5;

                if ($isPieces) {
                    if (abs($qty - round($qty)) > 1e-9) {
                        throw ValidationException::withMessages([
                            'items' => "Cantidad inválida para producto #{$invId}. Debe ser entera (pcs).",
                        ]);
                    }
                } else {
                    if ($qty < $step || !$isMultiple($qty, $step)) {
                        throw ValidationException::withMessages([
                            'items' => "Cantidad inválida para producto #{$invId}. Debe ser múltiplo de {$step} y al menos {$step}.",
                        ]);
                    }
                }

                $stock = InventoryStock::where('inventory_id', $invId)
                    ->where('location_id', $locationId)
                    ->lockForUpdate()
                    ->first();

                if (!$stock) {
                    throw ValidationException::withMessages([
                        'items' => "No hay stock configurado para el producto #{$invId} en la ubicación {$locationId}.",
                    ]);
                }

                $available = $q3(($stock->on_hand ?? 0) - ($stock->reserved ?? 0));
                if ($available + 1e-9 < $qty) {
                    throw ValidationException::withMessages([
                        'items' => "Stock insuficiente del producto #{$invId}. Disponible: {$available}",
                    ]);
                }

                $stock->on_hand = $q3($stock->on_hand - $qty);
                $stock->save();

                $saleItem = SaleItem::create([
                    'sale_id' => $sale->id,
                    'inventory_id' => $invId,
                    'quantity' => $q3($qty),
                    'unit_price' => $m2(0),
                    'discount' => $m2(0),
                    'total' => $m2(0),
                ]);

                if (class_exists(InventoryMove::class)) {
                    InventoryMove::create([
                        'inventory_id' => $invId,
                        'location_id' => $locationId,
                        'sale_id' => $sale->id,
                        'sale_item_id' => $saleItem->id,
                        'direction' => 'out',
                        'quantity' => $q3($qty),
                        'reason' => 'GIFT',
                        'created_by' => $actor->id,
                    ]);
                }
            }

            if (!empty($sale->delivery_id)) {
                ServiceQualityToken::create([
                    'sale_id' => $sale->id,
                    'dealer_user_id' => (int) $sale->delivery_id,
                    'token' => Str::random(40),
                    'expires_at' => now()->addHour(),
                    'created_by' => $actor->id,
                ]);
            }

            return redirect()->route('gifts.index')->with('success', 'Regalo registrado.');
        });
    }
}
