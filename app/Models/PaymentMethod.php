<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'name'];

    // Relación con los pagos
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
