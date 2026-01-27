<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointsSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'value_per_point',
        'redemption_info',
    ];
}
