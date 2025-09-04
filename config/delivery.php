<?php


return [
    // ejecuta ahora (no un closure) para que quede un array real
    'tiers' => (static function () {
        $raw = env('DELIVERY_DISTANCE_TIERS_JSON', '[]');
        $arr = json_decode($raw, true);
        return is_array($arr) ? $arr : [];
    })(),

    'base_fee' => (float) env('DELIVERY_BASE_FEE', 0),
];


