<?php

use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', fn() => Inertia::render('Dashboard'))
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware(['auth'])->group(function () {
    // Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Inventario + búsqueda para el carrito
    Route::get('inventories/search', [InventoryController::class, 'search'])
        ->name('inventories.search');
    Route::resource('inventories', InventoryController::class);

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

    Route::get('/stock', [StockController::class, 'index'])->name('stock.index');
    Route::get('/stock/summary', [StockController::class, 'summary'])->name('stock.summary');

    Route::patch('/inventories/{inventory}/min-stock', [InventoryController::class, 'updateMinStock'])
        ->name('inventories.min_stock');

    // routes/web.php (dentro del middleware auth)
    Route::get('/transfers/create', [TransferController::class, 'create'])
        ->name('transfers.create');

    Route::post('/transfers', [TransferController::class, 'store'])
        ->name('transfers.store');

    // Administración de usuarios (solo admin con Spatie)
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    });



});

require __DIR__ . '/auth.php';
