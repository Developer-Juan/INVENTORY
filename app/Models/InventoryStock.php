<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryStock extends Model
{
    use HasFactory;

    protected $table = 'inventory_stocks';
    protected $fillable = ['inventory_id', 'location_id', 'on_hand', 'reserved', 'min_stock'];
    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }
    public function location()
    {
        return $this->belongsTo(Location::class);
    }
}
