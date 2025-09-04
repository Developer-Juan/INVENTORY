<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMove extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_id',
        'location_id',
        'direction',
        'quantity',
        'reason',
        'created_by'
    ];
}
