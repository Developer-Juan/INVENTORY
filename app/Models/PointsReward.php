<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointsReward extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'name',
        'points_required',
        'description',
        'is_active',
    ];
}
