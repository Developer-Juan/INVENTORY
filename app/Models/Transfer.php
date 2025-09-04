<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    use HasFactory;

    protected $fillable = ['from_location_id', 'to_location_id', 'created_by', 'note', 'status'];
    public function items()
    {
        return $this->hasMany(TransferItem::class);
    }
    public function from()
    {
        return $this->belongsTo(Location::class, 'from_location_id');
    }
    public function to()
    {
        return $this->belongsTo(Location::class, 'to_location_id');
    }
    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }


}
