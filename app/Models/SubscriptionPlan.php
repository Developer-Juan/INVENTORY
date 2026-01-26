<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'duration_days',
        'price',
        'badge_color',
        'is_demo',
        'is_active',
    ];

    protected $casts = [
        'duration_days' => 'integer',
        'price' => 'decimal:2',
        'is_demo' => 'boolean',
        'is_active' => 'boolean',
    ];
}

