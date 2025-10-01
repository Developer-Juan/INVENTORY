<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashMove extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'sale_id',
        'direction',
        'amount',
        'reason',
        'created_by',
        'note'
    ];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }


}
