<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Models\CashMove;
use App\Models\Inventory;
use App\Models\InventoryMove;
use App\Models\InventoryStock;
use App\Models\Location;
use App\Models\LocationCash;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleVoid;
use App\Models\User;
use App\Services\DeliveryFare;
use Illuminate\Database\QueryException;
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

                // === NO agrupar líneas (permito override por línea con location_id si lo envías)
                $lines = collect($data['items'] ?? [])
                    ->map(function ($it) use ($q3) {
                        return [
                            'inventory_id' => (int) ($it['inventory_id'] ?? 0),
                            'quantity' => $q3($it['quantity'] ?? 0),
                            'total_price' => isset($it['total_price']) ? (float) $it['total_price'] : null,
                            'unit_price' => isset($it['unit_price']) ? (float) $it['unit_price'] : null,
                            'discount' => isset($it['discount']) ? (float) $it['discount'] : 0.0,
                            'location_id' => isset($it['location_id']) ? (int) $it['location_id'] : null,
                        ];
                    })
                    ->filter(fn($it) => $it['inventory_id'] > 0 && $it['quantity'] > 0)
                    ->values();

                if ($lines->isEmpty()) {
                    throw ValidationException::withMessages(['items' => 'No hay ítems válidos en la venta.']);
                }

                // === Cabecera
                $sale = Sale::create([
                    'user_id' => $actor->id,
                    'customer_id' => $customerId,
                    'delivery_id' => $hasDealer ? (int) $data['delivery_id'] : null,
                    'location_id' => $locationId,
                    'km' => $hasDealer ? $kmVal : 0,
                    'delivery_rate' => 0,   // se setean abajo
                    'delivery_pay' => 0,
                    'discount' => 0,
                    'tax' => 0,
                    'subtotal' => 0,
                    'total' => 0,
                    'paid' => 0,
                    'balance' => 0,
                    'status' => 'debe',
                ]);

                $subtotal = 0.0;
                $totalsByLoc = []; // para distribución de caja por ubicación

                foreach ($lines as $it) {
                    $invId = (int) $it['inventory_id'];
                    $qty = $q3($it['quantity']);

                    // Ubicación efectiva del ítem (override o cabecera)
                    $lineLocationId = (int) ($it['location_id'] ?? $locationId);
                    if ($lineLocationId <= 0) {
                        throw ValidationException::withMessages([
                            'items' => "Ítem #{$invId} sin ubicación.",
                        ]);
                    }

                    // Validación por unidad
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

                    // Stock en la ubicación efectiva
                    $stock = InventoryStock::where('inventory_id', $invId)
                        ->where('location_id', $lineLocationId)
                        ->lockForUpdate()
                        ->first();

                    if (!$stock) {
                        throw ValidationException::withMessages([
                            'items' => "No hay stock configurado para el producto #{$invId} en la ubicación {$lineLocationId}.",
                        ]);
                    }

                    $available = $q3(($stock->on_hand ?? 0) - ($stock->reserved ?? 0));
                    if ($available + 1e-9 < $qty) {
                        throw ValidationException::withMessages([
                            'items' => "Stock insuficiente del producto #{$invId} en la ubicación {$lineLocationId}. Disponible: {$available}",
                        ]);
                    }

                    // Precio de la línea
                    $disc = $m2($it['discount']);
                    if ($it['total_price'] !== null) {
                        $lineTotal = max(0, $m2($it['total_price']) - $disc);
                    } elseif ($it['unit_price'] !== null) {
                        $lineTotal = max(0, $m2($it['unit_price'] * $qty) - $disc);
                    } else {
                        throw ValidationException::withMessages([
                            'items' => "Falta total_price (o unit_price) en la línea del producto #{$invId}.",
                        ]);
                    }

                    $unitPriceEffective = $qty > 0 ? $m2($lineTotal / $qty) : $m2(0);
                    $subtotal += $lineTotal;

                    // Descontar stock
                    $stock->on_hand = $q3($stock->on_hand - $qty);
                    $stock->save();

                    // Guardar línea (⚠️ SIN location_id: Opción 2, NO existe la columna)
                    $saleItem = SaleItem::create([
                        'sale_id' => $sale->id,
                        'inventory_id' => $invId,
                        'quantity' => $q3($qty),
                        'unit_price' => $unitPriceEffective,
                        'discount' => $m2($disc),
                        'total' => $m2($lineTotal),
                    ]);

                    // Movimiento OUT (aquí sí registramos la ubicación)
                    if (class_exists(InventoryMove::class)) {
                        InventoryMove::create([
                            'inventory_id' => $invId,
                            'location_id' => $lineLocationId,
                            'sale_id' => $sale->id,
                            'sale_item_id' => $saleItem->id,
                            'direction' => 'out',
                            'quantity' => $q3($qty),
                            'reason' => 'SALE',
                            'created_by' => $actor->id,
                        ]);
                    }

                    // Caja proporcional por ubicación (para luego prorratear pagos en efectivo)
                    $totalsByLoc[$lineLocationId] = ($totalsByLoc[$lineLocationId] ?? 0) + $lineTotal;
                }

                // ===== Delivery: calcular pero NO sumarlo al total =====
                $deliveryRate = 0.0; // cobro al cliente (no se suma al total de la venta aquí)
                $deliveryPay = 0.0; // pago al dealer

                if ($hasDealer && $kmVal > 0) {
                    if (method_exists($this->fare, 'rate')) {
                        $deliveryRate = $m2((float) $this->fare->rate($kmVal));
                    } elseif (method_exists($this->fare, 'rateForKm')) {
                        $deliveryRate = $m2((float) $this->fare->rateForKm($kmVal));
                    } elseif (method_exists($this->fare, 'computeRate')) {
                        $deliveryRate = $m2((float) $this->fare->computeRate($kmVal));
                    } else {
                        $deliveryRate = $m2($this->computeDeliveryRateFromEnv($kmVal));
                    }

                    if (method_exists($this->fare, 'pay')) {
                        $deliveryPay = $m2((float) $this->fare->pay($kmVal, $deliveryRate));
                    } elseif (method_exists($this->fare, 'payForKm')) {
                        $deliveryPay = $m2((float) $this->fare->payForKm($kmVal, $deliveryRate));
                    } elseif (method_exists($this->fare, 'computePay')) {
                        $deliveryPay = $m2((float) $this->fare->computePay($kmVal, $deliveryRate));
                    } else {
                        $percent = (float) env('DELIVERY_PAY_PERCENT', 1.0); // 100% por defecto
                        $fixed = (float) env('DELIVERY_PAY_FIXED', 0);
                        $minPay = (float) env('DELIVERY_PAY_MIN', 0);
                        $maxPay = (float) env('DELIVERY_PAY_MAX', 0);
                        $tmp = $fixed + ($deliveryRate * $percent);
                        if ($minPay > 0)
                            $tmp = max($minPay, $tmp);
                        if ($maxPay > 0)
                            $tmp = min($maxPay, $tmp);
                        $deliveryPay = $m2($tmp);
                    }
                    // NO lo metas en $totalsByLoc, no entra al total de la venta.
                }

                // === Totales cabecera (SIN delivery_rate)
                $headerDiscount = $m2($data['discount'] ?? 0);
                $headerTax = $m2($data['tax'] ?? 0);
                $total = $m2(max(0, $subtotal - $headerDiscount + $headerTax)); // SIN delivery

                // Pagos
                $paid = 0.0;
                foreach (($data['payments'] ?? []) as $p) {
                    $amt = $m2($p['amount'] ?? 0);
                    if ($amt <= 0) {
                        throw ValidationException::withMessages(['payments' => 'El monto del pago debe ser mayor a 0.']);
                    }
                    $paid = $m2($paid + $amt);
                }

                // Validación pagos <= total (sin delivery)
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

                // Guardar cabecera (con delivery_rate y delivery_pay pero sin tocar total)
                $sale->update([
                    'subtotal' => $m2($subtotal),
                    'discount' => $headerDiscount,
                    'tax' => $headerTax,
                    'delivery_rate' => $deliveryRate,
                    'delivery_pay' => $deliveryPay,
                    'total' => $total,   // SIN delivery
                    'paid' => $m2($paid),
                    'balance' => $balance,
                    'status' => $status,
                ]);

                // ================== CAJA (solo efectivo) ==================
                // Cargamos solo los métodos usados y aplicamos fallback por nombre/código.
                $pmIds = collect($data['payments'] ?? [])->pluck('payment_method_id')->filter()->unique()->values();
                $methods = PaymentMethod::whereIn('id', $pmIds)->get()->keyBy('id');

                $cashIn = 0.0;
                foreach (($data['payments'] ?? []) as $p) {
                    $mid = (int) ($p['payment_method_id'] ?? 0);
                    $amt = $m2($p['amount'] ?? 0);
                    $pm = $methods->get($mid);

                    $isCash = false;
                    if ($pm) {
                        $code = strtolower((string) ($pm->code ?? ''));
                        $name = strtolower((string) ($pm->name ?? ''));
                        $isCash = (bool) ($pm->is_cash ?? false)
                            || str_contains($code, 'cash')
                            || str_contains($name, 'efectivo');
                    }

                    if ($amt > 0 && $isCash) {
                        $cashIn = $m2($cashIn + $amt);
                    }
                }

                if ($cashIn > 0) {
                    $sumTotals = (float) array_sum($totalsByLoc);

                    $dist = [];
                    if ($sumTotals > 0) {
                        // Proporcional por ubicación según totales de líneas (sin delivery)
                        $acc = 0.0;
                        $keys = array_keys($totalsByLoc);
                        $lastK = end($keys);
                        foreach ($keys as $k) {
                            if ($k !== $lastK) {
                                $part = $m2($cashIn * ($totalsByLoc[$k] / $sumTotals));
                                $dist[$k] = $part;
                                $acc = $m2($acc + $part);
                            } else {
                                // Última ubicación: resto por redondeo
                                $dist[$k] = $m2($cashIn - $acc);
                            }
                        }
                    } else {
                        // Fallback: todo a la ubicación de cabecera
                        if ((int) $locationId <= 0) {
                            throw ValidationException::withMessages([
                                'cash' => 'No se pudo determinar una ubicación válida para registrar caja (location_id).',
                            ]);
                        }
                        $dist[(int) $locationId] = $m2($cashIn);
                    }

                    // Aplica movimientos de caja
                    foreach ($dist as $locId => $amt) {
                        if ($amt <= 0)
                            continue;

                        $this->adjustLocationCash(
                            (int) $locId,
                            (float) $amt,
                            'in',            // entrada de efectivo
                            'SALE',          // razón
                            $sale->id,
                            $actor->id,
                            'Efectivo venta' // nota
                        );
                    }
                }
                // ==========================================================

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
            $actor = auth()->user();

            // Bloquea la venta y trae ítems con lo necesario para prorratear
            $sale = Sale::with([
                'items:id,sale_id,location_id,total,quantity,unit_price,discount',
            ])
                ->whereKey($sale->id)
                ->lockForUpdate()
                ->firstOrFail();

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

            // 1) Registrar pago
            Payment::create([
                'sale_id' => $sale->id,
                'payment_method_id' => (int) $data['payment_method_id'],
                'amount' => $amount,
                'reference' => $data['reference'] ?? null,
                'paid_at' => now(),
            ]);

            // 2) Actualizar totales de la venta
            $paid = round($sale->paid + $amount, 2);
            $balance = round($sale->total - $paid, 2);
            $status = $balance <= 0 ? 'pagado' : 'parcial';

            $sale->update([
                'paid' => $paid,
                'balance' => $balance,
                'status' => $status,
            ]);

            // 3) Si el método es efectivo, mover caja en las ubicaciones
            $isCash = (bool) PaymentMethod::whereKey((int) $data['payment_method_id'])->value('is_cash');

            if ($isCash && $amount > 0) {
                // ===== LÓGICA DE STORE: totales por ubicación =====
                $byLoc = [];
                foreach ($sale->items as $it) {
                    // total del ítem (usa el guardado; si no, lo recalcula)
                    $lineTotal = $it->total !== null
                        ? (float) $it->total
                        : round(((float) $it->unit_price * (float) $it->quantity) - (float) $it->discount, 2);

                    if ($lineTotal <= 0)
                        continue;

                    $loc = (int) ($it->location_id ?: $sale->location_id);
                    if ($loc > 0) {
                        $byLoc[$loc] = ($byLoc[$loc] ?? 0) + $lineTotal;
                    }
                }

                $dist = [];
                $sum = array_sum($byLoc);

                if ($sum > 0) {
                    // Reparto proporcional con ajuste al último para evitar desfase por redondeo
                    $acc = 0.0;
                    $keys = array_keys($byLoc);
                    $last = end($keys);
                    foreach ($keys as $k) {
                        if ($k !== $last) {
                            $part = round($amount * ($byLoc[$k] / $sum), 2);
                            $dist[$k] = $part;
                            $acc = round($acc + $part, 2);
                        } else {
                            $dist[$k] = round($amount - $acc, 2);
                        }
                    }
                    // limpia ceros
                    $dist = array_filter($dist, fn($v) => round($v, 2) > 0);
                }

                // ===== Fallbacks robustos (igual criterio que en cancel/store) =====
                if (empty($dist)) {
                    $fallbackLoc = (int) ($sale->location_id ?? 0);

                    if (!$fallbackLoc) {
                        $fallbackLoc = (int) optional(
                            $sale->items->firstWhere('location_id', '!=', null)
                        )->location_id;
                    }

                    if (!$fallbackLoc && class_exists(\App\Models\InventoryMove::class)) {
                        $fallbackLoc = (int) \App\Models\InventoryMove::where('sale_id', $sale->id)
                            ->whereNotNull('location_id')
                            ->orderByDesc('id')
                            ->value('location_id');
                    }

                    if (!$fallbackLoc) {
                        $fallbackLoc = (int) \App\Models\Location::whereIn('type', ['principal', 'main'])->value('id')
                            ?: (int) \App\Models\Location::min('id');
                    }

                    if ($fallbackLoc > 0) {
                        $dist[$fallbackLoc] = $amount;
                    }
                }

                // Registrar movimientos de caja
                foreach ($dist as $locId => $amt) {
                    $this->adjustLocationCash(
                        (int) $locId,
                        (float) $amt,
                        'in',                 // entra efectivo
                        'SALE_PAYMENT',       // motivo: abono/saldo
                        $sale->id,
                        $actor->id,
                        'Pago efectivo (abono/saldo)'
                    );
                }
            }
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


    public function cancel(Request $request, \App\Models\Sale $sale)
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:191'],
        ]);

        $actor = auth()->user();

        try {
            DB::transaction(function () use ($sale, $actor, $data) {
                // 1) Venta + líneas + movimientos (NO pedimos sale_items.location_id real)
                $sale = \App\Models\Sale::with([
                    'items:id,sale_id,inventory_id,quantity,total',
                    'items.moves:id,sale_item_id,location_id,direction,reason',
                ])
                    ->whereKey($sale->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                // 2) Doble anulación
                if ($sale->status === 'anulada' || \App\Models\SaleVoid::where('sale_id', $sale->id)->exists()) {
                    throw ValidationException::withMessages(['sale' => 'La venta ya estaba anulada.']);
                }

                // 3) Si falta ubicación global, inferir desde movimientos
                if ((int) ($sale->location_id ?? 0) <= 0 && class_exists(\App\Models\InventoryMove::class)) {
                    $firstMoveLoc = \App\Models\InventoryMove::query()
                        ->where('sale_id', $sale->id)
                        ->where('direction', 'out')
                        ->whereIn('reason', ['SALE', 'SALE_OUT'])
                        ->orderByDesc('id')
                        ->value('location_id');
                    if ((int) ($firstMoveLoc ?? 0) > 0) {
                        $sale->location_id = (int) $firstMoveLoc; // virtual
                    }
                }

                // 4) Debe existir al menos una ubicación válida
                $hayUbic = (int) ($sale->location_id ?? 0) > 0
                    || $sale->items->contains(fn($it) => (int) ($it->location_id ?? 0) > 0);

                if (!$hayUbic) {
                    throw ValidationException::withMessages([
                        'sale' => 'La venta no tiene ubicación asociada (ni por ítem); no es posible revertir stock/caja.',
                    ]);
                }

                // 5) Caja: calcular efectivo realmente pagado (con fallback por code/name)
                $sale->loadMissing([
                    'payments:id,sale_id,payment_method_id,amount',
                    'payments.method:id,code,name,is_cash',
                ]);

                $cashPaid = 0.0;
                foreach ($sale->payments as $pay) {
                    if ((float) $pay->amount <= 0)
                        continue;

                    $m = $pay->method;
                    $isCash = false;
                    if ($m) {
                        $code = strtolower((string) ($m->code ?? ''));
                        $name = strtolower((string) ($m->name ?? ''));
                        $isCash = (bool) ($m->is_cash ?? false)
                            || str_contains($code, 'cash')
                            || str_contains($name, 'efectivo');
                    }
                    if ($isCash) {
                        $cashPaid = round($cashPaid + (float) $pay->amount, 2);
                    }
                }

                // 6) Revertir stock por ítem a su ubicación (virtual o global)
                foreach ($sale->items as $line) {
                    $qty = round((float) $line->quantity, 3);
                    if ($qty <= 0)
                        continue;

                    $invId = (int) $line->inventory_id;
                    $locId = (int) (($line->location_id ?? null) ?: $sale->location_id);

                    if ($locId <= 0) {
                        throw ValidationException::withMessages([
                            'sale' => "Ítem {$line->id} sin ubicación; no se puede revertir stock.",
                        ]);
                    }

                    $stock = \App\Models\InventoryStock::where('inventory_id', $invId)
                        ->where('location_id', $locId)
                        ->lockForUpdate()
                        ->first();

                    if (!$stock) {
                        $stock = \App\Models\InventoryStock::create([
                            'inventory_id' => $invId,
                            'location_id' => $locId,
                            'on_hand' => 0,
                            'reserved' => 0,
                            'min_stock' => 0,
                        ]);
                    }

                    $stock->on_hand = round(($stock->on_hand ?? 0) + $qty, 3);
                    $stock->save();

                    if (class_exists(\App\Models\InventoryMove::class)) {
                        \App\Models\InventoryMove::create([
                            'inventory_id' => $invId,
                            'location_id' => $locId,
                            'sale_id' => $sale->id,
                            'sale_item_id' => $line->id ?? null,
                            'direction' => 'in',
                            'quantity' => $qty,
                            'reason' => 'SALE_CANCEL',
                            'created_by' => $actor->id,
                        ]);
                    }
                }

                // 7) Caja: prorratear y RESTAR efectivo por ubicación
                if ($cashPaid > 0) {
                    // totales por loc, usando atributo virtual o global
                    $totalsByLoc = [];
                    $totalLinesSum = 0.0;

                    foreach ($sale->items as $line) {
                        $lineTotal = round((float) ($line->total ?? 0), 2);
                        $totalLinesSum = round($totalLinesSum + $lineTotal, 2);

                        $locId = (int) (($line->location_id ?? null) ?: $sale->location_id);
                        if ($locId <= 0)
                            continue;

                        $totalsByLoc[$locId] = round(($totalsByLoc[$locId] ?? 0) + $lineTotal, 2);
                    }

                    $dist = [];
                    if ($totalLinesSum > 0) {
                        // Proporcional a los totales de líneas (tal como se hizo al ingresar la caja)
                        $acc = 0.0;
                        $keys = array_keys($totalsByLoc);
                        $last = end($keys);
                        foreach ($keys as $k) {
                            if ($k !== $last) {
                                $part = round($cashPaid * ($totalsByLoc[$k] / $totalLinesSum), 2);
                                $dist[$k] = $part;
                                $acc = round($acc + $part, 2);
                            } else {
                                // Resto por redondeo
                                $dist[$k] = round($cashPaid - $acc, 2);
                            }
                        }
                    } else {
                        // Fallback: todo a la ubicación global si existe
                        if ((int) ($sale->location_id ?? 0) > 0) {
                            $dist[(int) $sale->location_id] = $cashPaid;
                        }
                    }

                    foreach ($dist as $locId => $amt) {
                        if ($amt <= 0)
                            continue;

                        // salida de caja por anulación
                        $this->adjustLocationCash(
                            (int) $locId,
                            (float) $amt,
                            'out',            // salida
                            'SALE_CANCEL',    // razón
                            $sale->id,
                            $actor->id,
                            'Reverso efectivo por anulación'
                        );
                    }
                }

                // 8) Marcar venta y auditar
                $prevStatus = $sale->status;

                $sale->update([
                    'status' => defined('App\\Models\\Sale::ST_ANULADA')
                        ? \App\Models\Sale::ST_ANULADA
                        : 'anulada'
                ]);

                \App\Models\SaleVoid::create([
                    'sale_id' => $sale->id,
                    'canceled_by' => $actor->id,
                    'reason' => $data['reason'] ?? null,
                    'snapshot' => [
                        'totals' => [
                            'subtotal' => $sale->subtotal,
                            'discount' => $sale->discount,
                            'tax' => $sale->tax,
                            'total' => $sale->total,
                            'paid' => $sale->paid,
                            'balance' => $sale->balance,
                            'status' => $prevStatus,
                        ],
                        'sale_location_id' => $sale->location_id,
                        'items' => $sale->items->map(fn($i) => [
                            'sale_item_id' => $i->id ?? null,
                            'inventory_id' => $i->inventory_id,
                            'quantity' => $i->quantity,
                            // siempre presente (virtual o global)
                            'location_id' => (int) (($i->location_id ?? null) ?: $sale->location_id),
                            'total' => $i->total ?? null,
                        ])->values(),
                    ],
                ]);
            });
        } catch (\Illuminate\Database\QueryException $qe) {
            if ($qe->getCode() === '23000') { // unique('sale_id') en sale_voids
                throw ValidationException::withMessages(['sale' => 'La venta ya estaba anulada.']);
            }
            throw $qe;
        }

        return redirect()
            ->route('sales.index')
            ->with('success', "Venta #{$sale->id} anulada, stock y caja revertidos.");
    }


    private function adjustLocationCash(int $locationId, float $amount, string $direction, string $reason, ?int $saleId, int $actorId, ?string $note = null): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0)
            return;

        if ($locationId <= 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'cash' => 'No hay ubicación válida para registrar caja (location_id vacío).',
            ]);
        }

        $cash = \App\Models\LocationCash::where('location_id', $locationId)->lockForUpdate()->first();
        if (!$cash) {
            $cash = \App\Models\LocationCash::create([
                'location_id' => $locationId,
                'on_hand' => 0,
            ]);
        }

        $cash->on_hand = $direction === 'in'
            ? round($cash->on_hand + $amount, 2)
            : round($cash->on_hand - $amount, 2);
        $cash->save();

        \App\Models\CashMove::create([
            'location_id' => $locationId,
            'sale_id' => $saleId,
            'direction' => $direction,  // 'in' | 'out'
            'amount' => $amount,
            'reason' => $reason,
            'created_by' => $actorId,
            'note' => $note,
        ]);
    }


    /**
     * Distribuye un monto (efectivo de la venta) entre ubicaciones según el total de líneas por ubicación.
     * Si no hay totales por ítem, cae al location_id de la venta.
     * Retorna: [location_id => amount]
     */
    private function distributeCashByLocation(\App\Models\Sale $sale, float $cashAmount): array
    {
        $cashAmount = round($cashAmount, 2);
        if ($cashAmount <= 0)
            return [];

        $byLoc = [];
        foreach ($sale->items as $it) {
            $loc = (int) ($it->location_id ?: $sale->location_id);
            if ($loc > 0) {
                $byLoc[$loc] = ($byLoc[$loc] ?? 0) + (float) ($it->total ?? 0);
            }
        }

        // si todos los loc eran inválidos, intenta con la cabecera
        if (empty($byLoc)) {
            $loc = (int) $sale->location_id;
            return $loc > 0 ? [$loc => $cashAmount] : [];
        }

        $sum = array_sum($byLoc);
        if ($sum <= 0) {
            $loc = (int) $sale->location_id;
            return $loc > 0 ? [$loc => $cashAmount] : [];
        }

        // Proporcional con ajuste final
        $dist = [];
        $acc = 0;
        $keys = array_keys($byLoc);
        $last = end($keys);
        foreach ($keys as $k) {
            if ($k !== $last) {
                $part = round($cashAmount * ($byLoc[$k] / $sum), 2);
                if ($part > 0) {
                    $dist[$k] = $part;
                    $acc += $part;
                }
            } else {
                $rest = round($cashAmount - $acc, 2);
                if ($rest > 0)
                    $dist[$k] = $rest;
            }
        }
        return $dist;
    }


    private function computeDeliveryRateFromEnv(float $km): float
    {
        // Lee tramos desde .env (ej: DELIVERY_DISTANCE_TIERS_JSON='[{"min":0,"max":2.5,"price":6}, ... ]')
        $json = env('DELIVERY_DISTANCE_TIERS_JSON', '[]');
        $tiers = json_decode($json, true) ?: [];

        // Ordena por "min" asc
        usort($tiers, fn($a, $b) => (float) ($a['min'] ?? 0) <=> (float) ($b['min'] ?? 0));

        $price = 0.0;
        foreach ($tiers as $t) {
            $min = (float) ($t['min'] ?? 0);
            $max = array_key_exists('max', $t) ? (float) $t['max'] : INF;
            if ($km >= $min && $km <= $max) {
                $price = (float) ($t['price'] ?? 0);
                break;
            }
        }

        // Si no encaja en ningún tramo, usa el último precio definido
        if ($price === 0.0 && !empty($tiers)) {
            $last = end($tiers);
            $price = (float) ($last['price'] ?? 0);
        }

        $base = (float) env('DELIVERY_BASE_FEE', 0);

        // Si tus "price" del JSON están en miles (6 => $6.000), descomenta:
        // $price *= 1000;

        return round($base + $price, 2);
    }



}
