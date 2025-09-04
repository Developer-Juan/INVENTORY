<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;

    // Campos que son asignables de forma masiva
    protected $fillable = [
        'name',
        'description',
        'quantity',
        'unit',
        'purchase_price',
        'sale_price',
    ];

    // Configuración para los precios y cantidades
    protected $casts = [
        'quantity' => 'integer',  // Asegura que se maneje como entero
        'purchase_price' => 'decimal:2', // Precio de compra con 2 decimales
        'sale_price' => 'decimal:2', // Precio de venta con 2 decimales
    ];

    // Enum de unidades (puedes usar esto para garantizar que siempre sea 'pcs' o 'gr')
    protected $attributes = [
        'unit' => 'pcs',  // Valor por defecto si no se define
    ];

    // Relación con SaleItem para obtener los productos vendidos de este inventario
    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stocks()
    {
        return $this->hasMany(InventoryStock::class);
    }


    // Si deseas agregar validaciones adicionales o manipular los precios antes de que se guarden
    protected static function booted()
    {
        static::saving(function (Inventory $inventory) {
            // Se asegura que no haya cantidades negativas
            $inventory->quantity = max(0, $inventory->quantity);
        });
    }
}
