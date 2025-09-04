<?php
// app/Services/DeliveryFare.php
namespace App\Services;

class DeliveryFare
{
    /** @var array<int, array{min?:float,max?:float|null,price:float}> */
    private array $tiers;
    private float $baseFee;

    public function __construct()
    {
        $this->tiers = config('delivery.tiers', []);
        $this->baseFee = (float) config('delivery.base_fee', 0);
    }

    public function fareForKm(float $km): float
    {
        foreach ($this->tiers as $t) {
            $min = array_key_exists('min', $t) ? (float) $t['min'] : 0.0;
            $max = array_key_exists('max', $t) ? ($t['max'] === null ? null : (float) $t['max']) : null;
            $price = (float) $t['price'];

            if ($km >= $min && ($max === null || $km <= $max)) {
                return round($this->baseFee + $price, 2);
            }
        }
        // si no matchea nada, devuelve solo base
        return round($this->baseFee, 2);
    }
}

