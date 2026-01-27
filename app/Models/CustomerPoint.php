<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerPoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'admin_id',
        'points_balance',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
