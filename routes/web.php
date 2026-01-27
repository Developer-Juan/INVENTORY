<?php

use App\Http\Controllers\BalanceController;
use App\Http\Controllers\CashController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GiftController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\ServiceQualityController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DemoRequestController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SuperAdminBroadcastController;
use App\Http\Controllers\SuperAdminSubscriptionController;
use App\Http\Controllers\TelegramWebhookController;
use App\Models\SubscriptionPlan;
use App\Models\CustomerPoint;
use App\Models\InventoryStock;
use App\Models\PointsTransaction;
use App\Models\Sale;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    $plans = SubscriptionPlan::where('is_active', true)
        ->orderByDesc('is_demo')
        ->orderBy('duration_days')
        ->get(['id', 'name', 'duration_days', 'price', 'badge_color', 'is_demo']);
    $inventoryAgg = DB::query()
        ->fromSub(
            InventoryStock::query()
                ->selectRaw('inventory_id, SUM(on_hand - reserved) as available, MAX(min_stock) as min_stock')
                ->groupBy('inventory_id'),
            'stock_totals'
        )
        ->selectRaw('SUM(CASE WHEN available > 0 THEN 1 ELSE 0 END) as active_skus')
        ->selectRaw('SUM(CASE WHEN min_stock > 0 AND available <= min_stock THEN 1 ELSE 0 END) as low_stock')
        ->first();

    $fromDate = now()->subDays(14)->startOfDay();
    $salesPeriodQuery = Sale::query()
        ->where('created_at', '>=', $fromDate)
        ->where('status', '!=', 'anulada');
    $salesPeriodSum = (float) $salesPeriodQuery->sum('total');
    $salesPeriodCount = (int) $salesPeriodQuery->count();
    $salesPeriodLast = $salesPeriodQuery->max('created_at');

    $redeemCount = (int) PointsTransaction::where('type', 'redeem')->count();
    $pointsCustomers = (int) CustomerPoint::where('points_balance', '>', 0)->count();

    $activeSkus = (int) ($inventoryAgg->active_skus ?? 0);
    $lowStock = (int) ($inventoryAgg->low_stock ?? 0);
    $healthyPct = $activeSkus > 0
        ? (int) round((($activeSkus - $lowStock) / $activeSkus) * 100)
        : 0;

    return Inertia::render('Welcome', [
        'appName' => config('app.name'),
        'appUrl' => config('app.url'),
        'appVersion' => config('app.version'),
        'landingStats' => [
            'inventory' => [
                'active_skus' => $activeSkus,
                'low_stock' => $lowStock,
                'healthy_pct' => max(0, min(100, $healthyPct)),
            ],
            'salesPeriod' => [
                'sum' => $salesPeriodSum,
                'count' => $salesPeriodCount,
                'last_at' => $salesPeriodLast,
                'days' => 15,
            ],
            'points' => [
                'redeems' => $redeemCount,
                'customers' => $pointsCustomers,
            ],
        ],
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
        'plans' => $plans,
    ]);
});


Route::post('/telegram/webhook/{secret}', [TelegramWebhookController::class, 'handle']);


Route::get('/docs', function () {
    return Inertia::render('Docs', [
        'appName' => config('app.name'),
        'appUrl' => config('app.url'),
        'appVersion' => config('app.version'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
        'plans' => SubscriptionPlan::where('is_active', true)
            ->orderByDesc('is_demo')
            ->orderBy('duration_days')
            ->get(['id', 'name', 'duration_days', 'price', 'badge_color', 'is_demo']),
    ]);
})->name('docs');

Route::post('/demo-requests', [DemoRequestController::class, 'store'])
    ->name('demo-requests.store');

// Consulta pública de puntos (sin login)
Route::get('/points/consulta', function () {
    return Inertia::render('Points/PublicLookup', [
        'appName' => config('app.name'),
        'appUrl' => config('app.url'),
        'appVersion' => config('app.version'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('points.public');
Route::get('/points/consulta/lookup', [PointsController::class, 'publicLookup'])
    ->name('points.public.lookup');

// Calidad de servicio (público)
Route::get('/calidad/{token}', [ServiceQualityController::class, 'publicShow'])
    ->name('quality.public');
Route::post('/calidad/{token}', [ServiceQualityController::class, 'publicSubmit'])
    ->name('quality.public.submit');

Route::get('/dashboard', DashboardController::class . '@index')
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware(['auth'])->group(function () {
    // Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/notifications', [ProfileController::class, 'updateNotifications'])
        ->name('profile.notifications');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Inventario + búsqueda para el carrito
    Route::get('inventories/search', [InventoryController::class, 'search'])
        ->name('inventories.search');
    Route::resource('inventories', InventoryController::class);

    // Ventas: items por ubicación (debe ir antes del resource para evitar colisión con {sale})
    Route::get('sales/items-by-location', [SaleController::class, 'itemsByLocation'])
        ->name('sales.items.by-location');

    // Ventas: crear con carrito + ver detalle
    Route::resource('sales', SaleController::class)
        ->only(['index', 'create', 'store', 'show']);

    // Pagos (split) sobre una venta
    Route::post('/sales/{sale}/payments', [SaleController::class, 'storePayment'])
        ->name('sales.payments.store');
    Route::delete('/sales/{sale}/payments/{payment}', [SaleController::class, 'destroyPayment'])
        ->name('sales.payments.destroy');

    Route::post('/sales/{sale}/delivery/settle', [SaleController::class, 'settleDelivery'])
        ->name('sales.delivery.settle');

    // Clientes (rol customer)
    Route::get('/customers/lookup', [CustomerController::class, 'lookup'])
        ->name('customers.lookup');
    Route::post('/customers', [CustomerController::class, 'store'])
        ->name('customers.store');

    // Soporte (dealer/admin)
    Route::get('/support', [SupportController::class, 'index'])->name('support.index');
    Route::post('/support', [SupportController::class, 'storeTicket'])->name('support.store');
    Route::post('/support/{ticket}/messages', [SupportController::class, 'storeMessage'])
        ->name('support.messages.store');
    Route::post('/support/{ticket}/close', [SupportController::class, 'closeTicket'])
        ->name('support.close');

    // Documentación interna
    Route::get('/docs/internal', function () {
        return Inertia::render('Docs/Internal', [
            'plans' => SubscriptionPlan::where('is_active', true)
                ->orderByDesc('is_demo')
                ->orderBy('duration_days')
                ->get(['id', 'name', 'duration_days', 'price', 'badge_color', 'is_demo']),
        ]);
    })->name('docs.internal');

    Route::get('/docs/internal/previews/404', function () {
        return response()->view('errors.404', [], 200);
    })->name('docs.internal.previews.404');
    Route::get('/docs/internal/previews/419', function () {
        return response()->view('errors.419', [], 200);
    })->name('docs.internal.previews.419');
    Route::get('/docs/internal/previews/429', function () {
        return response()->view('errors.429', [], 200);
    })->name('docs.internal.previews.429');
    Route::get('/docs/internal/previews/500', function () {
        return response()->view('errors.500', [], 200);
    })->name('docs.internal.previews.500');

    // Notificaciones
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');
    Route::post('/notifications/dealers', [NotificationController::class, 'storeDealerNotice'])
        ->middleware(['role:admin'])
        ->name('notifications.dealers.store');

    // Calidad de servicio (panel admin/dealer)
    Route::get('/calidad', [ServiceQualityController::class, 'index'])
        ->name('quality.index');
    Route::post('/calidad/{sale}/token', [ServiceQualityController::class, 'createToken'])
        ->name('quality.token.create');

    Route::get('/stock', [StockController::class, 'index'])->name('stock.index');
    Route::get('/stock/summary', [StockController::class, 'summary'])->name('stock.summary');

    Route::patch('/inventories/{inventory}/min-stock', [InventoryController::class, 'updateMinStock'])
        ->name('inventories.min_stock');

    // routes/web.php (dentro del middleware auth)
    Route::get('/transfers/create', [TransferController::class, 'create'])
        ->name('transfers.create');

    Route::post('/transfers', [TransferController::class, 'store'])
        ->name('transfers.store');


    Route::get('/transfers/{transfer}/lines', [TransferController::class, 'lines'])
        ->name('transfers.lines');

    Route::get('/transfers/{transfer}/items', [TransferController::class, 'items'])
        ->name('transfers.items');



    // Administración de usuarios (solo admin con Spatie)
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        // routes/web.php
        Route::post('/sales/{sale}/cancel', [SaleController::class, 'cancel'])
            ->name('sales.cancel');

        //Administracion de cash controller
        Route::get('/cash', [CashController::class, 'index'])->name('cash.index');
        Route::post('/cash/transfer', [CashController::class, 'transfer'])->name('cash.transfer');
        Route::post('/cash/pickup', [CashController::class, 'pickup'])->name('cash.pickup');

        //Balances
        Route::get('/balances', [BalanceController::class, 'index'])
            ->name('balances.index');

        Route::post('/balances/{dealerLocationId}/settle', [BalanceController::class, 'settleDealer'])
            ->name('balances.settle');

        // Reportes de ventas
        Route::get('/reports/sales', [ReportsController::class, 'salesPage'])
            ->name('reports.sales');
        Route::get('/reports/sales/excel', [ReportsController::class, 'salesExcel'])
            ->name('reports.sales.excel');
        Route::get('/reports/sales/pdf', [ReportsController::class, 'salesPdf'])
            ->name('reports.sales.pdf');

        // Puntos (config y redenciones)
        Route::get('/points', [PointsController::class, 'index'])->name('points.index');
        Route::post('/points/settings', [PointsController::class, 'updateSettings'])
            ->name('points.settings.update');
        Route::post('/points/rewards', [PointsController::class, 'storeReward'])
            ->name('points.rewards.store');
        Route::put('/points/rewards/{reward}', [PointsController::class, 'updateReward'])
            ->name('points.rewards.update');
        Route::delete('/points/rewards/{reward}', [PointsController::class, 'destroyReward'])
            ->name('points.rewards.destroy');

        // Regalos
        Route::get('/gifts', [GiftController::class, 'index'])->name('gifts.index');
        Route::get('/gifts/lookup', [GiftController::class, 'lookupCustomer'])
            ->name('gifts.customer.lookup');
        Route::post('/gifts', [GiftController::class, 'store'])->name('gifts.store');


    });

    // Super Admin
    Route::middleware(['role:super-admin'])->group(function () {
        Route::get('/super-admin', [SuperAdminController::class, 'dashboard'])->name('super-admin.dashboard');
        Route::get('/super-admin/users', [SuperAdminController::class, 'users'])
            ->name('super-admin.users.index');
        Route::put('/super-admin/users/{user}', [SuperAdminController::class, 'updateUser'])
            ->name('super-admin.users.update');
        Route::get('/super-admin/broadcasts', [SuperAdminBroadcastController::class, 'index'])
            ->name('super-admin.broadcasts');
        Route::post('/super-admin/broadcasts', [SuperAdminBroadcastController::class, 'send'])
            ->name('super-admin.broadcasts.send');
        Route::get('/super-admin/subscriptions', [SuperAdminSubscriptionController::class, 'index'])
            ->name('super-admin.subscriptions');
        Route::post('/super-admin/subscriptions/plans', [SuperAdminSubscriptionController::class, 'storePlan'])
            ->name('super-admin.subscriptions.plans.store');
        Route::put('/super-admin/subscriptions/plans/{plan}', [SuperAdminSubscriptionController::class, 'updatePlan'])
            ->name('super-admin.subscriptions.plans.update');
        Route::post('/super-admin/subscriptions/assign', [SuperAdminSubscriptionController::class, 'assign'])
            ->name('super-admin.subscriptions.assign');
        Route::put('/super-admin/subscriptions/{subscription}/cancel', [SuperAdminSubscriptionController::class, 'cancel'])
            ->name('super-admin.subscriptions.cancel');
    });

    // Aprobaciones (admin y super-admin)
    Route::middleware(['role:admin|super-admin'])->group(function () {
        Route::get('/super-admin/approvals', [SuperAdminController::class, 'approvals'])->name('super-admin.approvals');
        Route::put('/super-admin/users/{user}/status', [SuperAdminController::class, 'updateStatus'])
            ->name('super-admin.users.status');
    });



});

require __DIR__ . '/auth.php';
