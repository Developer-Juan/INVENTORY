<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Models\Inventory;
use App\Models\InventoryMove;
use App\Models\InventoryStock;
use App\Models\Location;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Services\DeliveryFare;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function __construct(private DeliveryFare $fare)
    {
    }

    public function index()
    {
        $user = auth()->user();

        $sales = Sale::query()
            ->with([
                'user:id,name',
                'items' => fn($q) => $q->select('id', 'sale_id', 'inventory_id', 'quantity')
                    ->with(['inventory:id,name']),
            ])
            ->withCount('items')
            ->select('id', 'user_id', 'customer_id', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance', 'status', 'created_at')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        // ==== Resolver la ubicación base para MOSTRAR stock en el carrito ====
        $principalId = Location::whereIn('type', ['principal', 'main'])->value('id');
        $userLocId = Location::where('user_id', $user->id)->value('id');
        $dealerLocId = Location::where('type', 'dealer')->where('user_id', $user->id)->value('id');

        if (method_exists($user, 'hasRole') && $user->hasRole('dealer')) {
            // Dealer: su propia ubicación dealer (fallbacks por si falta)
            $myLocationId = $dealerLocId ?: $userLocId ?: $principalId ?: Location::min('id');
        } elseif (method_exists($user, 'hasRole') && ($user->hasRole('admin') || $user->hasRole('super-admin'))) {
            // Admin: SIEMPRE prioriza el principal
            $myLocationId = $principalId ?: $userLocId ?: Location::min('id');
        } else {
            // Otros roles: la ubicación asociada al usuario; si no, principal
            $myLocationId = $userLocId ?: $principalId ?: Location::min('id');
        }

        // Ítems con disponible (on_hand - reserved) en ESA ubicación
        $items = Inventory::query()
            ->leftJoin('inventory_stocks as s', function ($j) use ($myLocationId) {
                $j->on('s.inventory_id', '=', 'inventories.id')
                    ->where('s.location_id', $myLocationId);
            })
            ->orderBy('inventories.name')
            ->get([
                'inventories.id',
                'inventories.name',
                'inventories.sale_price',
                DB::raw('(COALESCE(s.on_hand,0) - COALESCE(s.reserved,0)) as quantity'),
            ]);

        $paymentMethods = PaymentMethod::select('id', 'code', 'name')->orderBy('name')->get();

        // Solo dealers que tengan ubicación dealer creada
        $deliverers = User::role('dealer')
            ->whereIn('id', Location::where('type', 'dealer')->pluck('user_id'))
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'items' => $items,
            'paymentMethods' => $paymentMethods,
            'deliverers' => $deliverers,
            'current_location_id' => $myLocationId,
        ]);
    }


    public function show(Sale $sale)
    {
        $sale->load([
            'user:id,name',
            'delivery:id,name',
            'items.inventory:id,name,unit',
            'payments.method:id,code,name',
        ]);

        return Inertia::render('Sales/Show', ['sale' => $sale]);
    }

    public function store(StoreSaleRequest $request)
    {
        $data = $request->validated();

        // helpers
        $q3 = fn($v) => round((float) $v, 3); // cantidades
        $m2 = fn($v) => round((float) $v, 2); // dinero
        $isMultiple = function (float $value, float $step = 0.5): bool {
            $eps = 1e-9;
            $mod = fmod($value, $step);
            return (abs($mod) < $eps) || (abs($mod - $step) < $eps);
        };

        try {
            $sale = DB::transaction(function () use ($data, $q3, $m2, $isMultiple) {

                $actor = auth()->user();

                // customer_id a 4 dígitos
                $customerId = isset($data['customer_id']) && $data['customer_id'] !== null
                    ? str_pad((string) $data['customer_id'], 4, '0', STR_PAD_LEFT)
                    : null;

                $hasDealer = !empty($data['delivery_id']);
                $kmVal = isset($data['km']) ? (float) $data['km'] : 0.0;

                // === Resolver location_id (DENTRO del closure) ===
                if ($hasDealer) {
                    $locationId = Location::where('type', 'dealer')
                        ->where('user_id', (int) $data['delivery_id'])
                        ->value('id');

                    if (!$locationId) {
                        throw ValidationException::withMessages([
                            'delivery_id' => 'El dealer seleccionado no tiene una ubicación tipo dealer asignada.',
                        ]);
                    }
                } else {
                    if (method_exists($actor, 'hasRole') && $actor->hasRole('dealer')) {
                        $locationId = Location::where('type', 'dealer')
                            ->where('user_id', $actor->id)
                            ->value('id');

                        if (!$locationId) {
                            throw ValidationException::withMessages([
                                'location' => 'Tu usuario dealer no tiene ubicación dealer asignada.',
                            ]);
                        }
                    } else {
                        $locationId = Location::where('user_id', $actor->id)->value('id')
                            ?? Location::whereIn('type', ['principal', 'main'])->value('id');

                        if (!$locationId) {
                            throw ValidationException::withMessages([
                                'location' => 'No hay ubicación asociada al usuario ni existe una Principal.',
                            ]);
                        }
                    }
                }

                // === NO agrupar líneas (no mezclar overrides por línea)
                $lines = collect($data['items'] ?? [])
                    ->map(function ($it) use ($q3) {
                        return [
                            'inventory_id' => (int) ($it['inventory_id'] ?? 0),
                            'quantity' => $q3($it['quantity'] ?? 0),
                            'total_price' => isset($it['total_price']) ? (float) $it['total_price'] : null,
                            'unit_price' => isset($it['unit_price']) ? (float) $it['unit_price'] : null, // compat
                            'discount' => isset($it['discount']) ? (float) $it['discount'] : 0.0,
                        ];
                    })
                    ->filter(fn($it) => $it['inventory_id'] > 0 && $it['quantity'] > 0)
                    ->values();

                if ($lines->isEmpty()) {
                    throw ValidationException::withMessages(['items' => 'No hay ítems válidos en la venta.']);
                }

                // === Cabecera (cero) con location_id resuelto
                $sale = Sale::create([
                    'user_id' => $actor->id,
                    'customer_id' => $customerId,
                    'delivery_id' => $hasDealer ? (int) $data['delivery_id'] : null,
                    'location_id' => $locationId,
                    'km' => $hasDealer ? $kmVal : 0,
                    'discount' => 0,
                    'tax' => 0,
                    'subtotal' => 0,
                    'total' => 0,
                    'paid' => 0,
                    'balance' => 0,
                    'status' => 'debe',
                ]);

                // === Líneas (total por línea = baseTotal - discount) SIN multiplicar qty × price cuando hay total_price
                $subtotal = 0.0;

                foreach ($lines as $it) {
                    $invId = (int) $it['inventory_id'];
                    $qty = $q3($it['quantity']);

                    // Validación por unidad del inventario
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

                    // Stock en la ubicación
                    $stock = InventoryStock::where('inventory_id', $invId)
                        ->where('location_id', $locationId)
                        ->lockForUpdate()
                        ->first();

                    if (!$stock) {
                        throw ValidationException::withMessages([
                            'items' => "No hay stock configurado para el producto #{$invId} en la ubicación seleccionada.",
                        ]);
                    }

                    $available = $q3(($stock->on_hand ?? 0) - ($stock->reserved ?? 0));
                    if ($available + 1e-9 < $qty) {
                        throw ValidationException::withMessages([
                            'items' => "Stock insuficiente del producto #{$invId} en la ubicación seleccionada. Disponible: {$available}",
                        ]);
                    }

                    // === Precio de la línea
                    $disc = $m2($it['discount']);

                    if ($it['total_price'] !== null) {
                        // Flujo nuevo: total fijo por línea
                        $lineTotal = max(0, $m2($it['total_price']) - $disc);
                    } elseif ($it['unit_price'] !== null) {
                        // Compatibilidad: si no llega total_price, calcula total como unit_price * qty
                        // OJO: esto puede redondear distinto si el front prorratea. Ideal: enviar total_price.
                        $lineTotal = max(0, $m2($it['unit_price'] * $qty) - $disc);
                    } else {
                        throw ValidationException::withMessages([
                            'items' => "Falta total_price (o unit_price) en la línea del producto #{$invId}.",
                        ]);
                    }

                    // unit_price efectivo solo informativo
                    $unitPriceEffective = $qty > 0 ? $m2($lineTotal / $qty) : $m2(0);

                    $subtotal += $lineTotal;

                    // Descontar stock físico
                    $stock->on_hand = $q3($stock->on_hand - $qty);
                    $stock->save();

                    // Crear línea
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'inventory_id' => $invId,
                        'quantity' => $q3($qty),
                        'unit_price' => $unitPriceEffective, // informativo
                        'discount' => $m2($disc),
                        'total' => $m2($lineTotal),
                    ]);

                    if (class_exists(InventoryMove::class)) {
                        InventoryMove::create([
                            'inventory_id' => $invId,
                            'location_id' => $locationId,
                            'direction' => 'out',
                            'quantity' => $q3($qty),
                            'reason' => 'SALE',
                            'created_by' => $actor->id,
                        ]);
                    }
                }

                // Totales cabecera
                $headerDiscount = $m2($data['discount'] ?? 0);
                $headerTax = $m2($data['tax'] ?? 0);
                $total = $m2(max(0, $subtotal - $headerDiscount + $headerTax));

                // Pagos
                $paid = 0.0;
                foreach (($data['payments'] ?? []) as $p) {
                    $amt = $m2($p['amount'] ?? 0);
                    if ($amt <= 0) {
                        throw ValidationException::withMessages(['payments' => 'El monto del pago debe ser mayor a 0.']);
                    }
                    $paid = $m2($paid + $amt);
                }

                // Comparación robusta a 2 decimales
                if (function_exists('bccomp')) {
                    if (bccomp((string) $paid, (string) $total, 2) === 1) {
                        throw ValidationException::withMessages(['payments' => 'La suma de pagos excede el total.']);
                    }
                } else {
                    if (($paid - $total) > 0.009) {
                        throw ValidationException::withMessages(['payments' => 'La suma de pagos excede el total.']);
                    }
                }

                foreach (($data['payments'] ?? []) as $p) {
                    Payment::create([
                        'sale_id' => $sale->id,
                        'payment_method_id' => (int) $p['payment_method_id'],
                        'amount' => $m2($p['amount'] ?? 0),
                        'reference' => $p['reference'] ?? null,
                        'paid_at' => now(),
                    ]);
                }

                $balance = $m2($total - $paid);
                $status = $balance <= 0 ? 'pagado' : ($paid > 0 ? 'parcial' : 'debe');

                // Actualiza cabecera
                $sale->update([
                    'subtotal' => $m2($subtotal),
                    'discount' => $headerDiscount,
                    'tax' => $headerTax,
                    'total' => $total,
                    'paid' => $m2($paid),
                    'balance' => $balance,
                    'status' => $status,
                ]);

                return $sale;
            });

            return redirect()->route('sales.show', $sale)->with('success', 'Venta creada #' . $sale->id);

        } catch (ValidationException $ve) {
            throw $ve;
        } catch (\Throwable $e) {
            Log::error('Error creando venta', [
                'msg' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw ValidationException::withMessages([
                'general' => 'Ocurrió un error al crear la venta.' .
                    (config('app.debug') ? ' ' . $e->getMessage() : ''),
            ]);
        }
    }





    public function storePayment(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'payment_method_id' => ['required', 'exists:payment_methods,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reference' => ['nullable', 'string', 'max:191'],
        ]);

        DB::transaction(function () use ($sale, $data) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->first();

            if ($sale->balance <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'Esta venta ya está pagada.',
                ]);
            }

            $amount = round((float) $data['amount'], 2);
            $balance = round((float) $sale->balance, 2);
            if ($amount > $balance) {
                throw ValidationException::withMessages([
                    'amount' => 'El monto excede el saldo pendiente.',
                ]);
            }

            Payment::create([
                'sale_id' => $sale->id,
                'payment_method_id' => $data['payment_method_id'],
                'amount' => $amount,
                'reference' => $data['reference'] ?? null,
                'paid_at' => now(),
            ]);

            $paid = round($sale->paid + $amount, 2);
            $balance = round($sale->total - $paid, 2);
            $status = $balance <= 0 ? 'pagado' : 'parcial';

            $sale->update([
                'paid' => $paid,
                'balance' => $balance,
                'status' => $status,
            ]);
        });

        return back()->with('success', 'Pago registrado.');
    }

    public function settleDelivery(Sale $sale)
    {
        if (!$sale->delivery_id || $sale->delivery_pay <= 0) {
            return back()->with('error', 'Esta venta no tiene delivery o la tarifa es 0.');
        }
        if ($sale->delivery_settled_at) {
            return back()->with('info', 'Esta entrega ya estaba liquidada.');
        }

        $sale->forceFill([
            'delivery_settled_at' => now(),
        ])->save();

        return back()->with('success', 'Pago al delivery marcado como liquidado.');
    }

}
