<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $this->call(SuperAdminRoleSeeder::class);
        $this->call(UserSeeder::class);
        $this->call(PaymentMethodSeeder::class);
        $this->call(DealerToDeliverySplitSeeder::class);
    }
}
