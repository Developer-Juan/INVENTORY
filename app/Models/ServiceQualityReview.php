<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceQualityReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'token_id',
        'sale_id',
        'dealer_user_id',
        'rating_dealer',
        'comment',
    ];

    public function token()
    {
        return $this->belongsTo(ServiceQualityToken::class, 'token_id');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function dealer()
    {
        return $this->belongsTo(User::class, 'dealer_user_id');
    }

    public function productRatings()
    {
        return $this->hasMany(ServiceQualityProductRating::class, 'review_id');
    }
}
