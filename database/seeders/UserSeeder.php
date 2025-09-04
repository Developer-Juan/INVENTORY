<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Limpia el caché de permisos/roles de Spatie
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Crea los roles que usarás
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $deliveryRole = Role::firstOrCreate(['name' => 'delivery']);
        $cashierRole = Role::firstOrCreate(['name' => 'cashier']);
        $dealerRole = Role::firstOrCreate(['name' => 'dealer']); // opcional

        // Usuarios fijos
        $dani = User::firstOrCreate(
            ['email' => 'daniflex@tudominio.com'],
            ['name' => 'Dani', 'password' => Hash::make('secret123')]
        );
        $jose = User::firstOrCreate(
            ['email' => 'joseAk47@tudominio.com'],
            ['name' => 'Jose', 'password' => Hash::make('secret123')]
        );
        $admin = User::firstOrCreate(
            ['email' => 'admin@tudominio.com'],
            ['name' => 'Admin', 'password' => Hash::make('secret123')]
        );

        // Asigna roles
        $dani->syncRoles([$deliveryRole]); // Dani repartidor
        $jose->syncRoles([$deliveryRole]); // Jose repartidor
        $admin->syncRoles([$adminRole]);   // Admin administrador

        // 10 usuarios aleatorios (5 delivery, 5 cashier - opcional)
        User::factory()->count(5)->create()->each(
            fn($u) => $u->assignRole($deliveryRole)
        );
        // User::factory()->count(5)->create()->each(
        //     fn($u) => $u->assignRole($dealerRole)
        // );
    }
}
