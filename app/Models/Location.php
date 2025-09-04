<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'type', 'user_id', 'active'];
    public function stocks()
    {
        return $this->hasMany(InventoryStock::class);
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }


}
