<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DealerLocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run(): void
    {
        // toma todos los usuarios con rol 'dealer'
        $dealers = User::role('dealer')->get(); // o 'delivery' según tu naming

        foreach ($dealers as $u) {
            Location::firstOrCreate(
                ['user_id' => $u->id, 'type' => 'dealer'],
                ['name' => "Dealer - {$u->name}"]
            );
        }
    }
}
