<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'inventory_id',
        'quantity',
        'unit_price',
        'discount',
        'total',
    ];

    protected $casts = [
        'quantity' => 'float',      // en vez de 'decimal:3'
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }

    // Calcula total si no viene (qty*price - discount) y evita negativos
    protected static function booted()
    {
        static::saving(function (SaleItem $item) {
            $qty = (int) ($item->quantity ?? 0);
            $price = (float) ($item->unit_price ?? 0);
            $disc = (float) ($item->discount ?? 0);

            if (is_null($item->total)) {
                $item->total = max(0, ($qty * $price) - $disc);
            }
        });
    }
}
