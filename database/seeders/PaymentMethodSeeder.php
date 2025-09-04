<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        PaymentMethod::create([
            'code' => 'cash',
            'name' => 'Efectivo'
        ]);

        PaymentMethod::create([
            'code' => 'transfer',
            'name' => 'Transferencia Bancaria'
        ]);

        PaymentMethod::create([
            'code' => 'credit_card',
            'name' => 'Tarjeta de Crédito'
        ]);

        PaymentMethod::create([
            'code' => 'nequi',
            'name' => 'Nequi'
        ]);
    }
}
