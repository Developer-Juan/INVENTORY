<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleVoid extends Model
{
    protected $fillable = ['sale_id', 'canceled_by', 'reason', 'snapshot'];

    protected $casts = [
        'snapshot' => 'array',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
    public function canceledBy()
    {
        return $this->belongsTo(User::class, 'canceled_by');
    }

}