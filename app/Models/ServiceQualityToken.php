<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceQualityToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'dealer_user_id',
        'token',
        'expires_at',
        'used_at',
        'created_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function dealer()
    {
        return $this->belongsTo(User::class, 'dealer_user_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function review()
    {
        return $this->hasOne(ServiceQualityReview::class, 'token_id');
    }
}
