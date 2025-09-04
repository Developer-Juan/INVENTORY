<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'customer_id',
        'subtotal',
        'discount',
        'tax',
        'total',
        'paid',
        'balance',
        'status',
        'delivery_id',
        'km',
        'delivery_pay',
        'delivery_paid_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'km' => 'decimal:2',
        'delivery_pay' => 'decimal:2',
        'delivery_paid_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    // Relación con los pagos
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function delivery()
    {
        return $this->belongsTo(User::class, 'delivery_id');

    }

    public function recalcTotals(): void
    {
        $subtotal = $this->items()->sum('total'); // Sumar totales de los items
        $total = max(0, $subtotal - $this->discount + $this->tax);
        $paid = $this->payments()->sum('amount');  // Sumar pagos realizados
        $balance = round($total - $paid, 2);

        $status = $balance <= 0 ? 'pagado' : ($paid > 0 ? 'parcial' : 'debe');

        $this->forceFill([
            'subtotal' => $subtotal,
            'total' => $total,
            'paid' => $paid,
            'balance' => $balance,
            'status' => $status,
        ])->save();
    }
}
