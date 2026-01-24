<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointsSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'value_per_point',
        'redemption_info',
    ];
}
