<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceQualityProductRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'review_id',
        'sale_item_id',
        'rating',
    ];

    public function review()
    {
        return $this->belongsTo(ServiceQualityReview::class, 'review_id');
    }

    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class, 'sale_item_id');
    }
}
