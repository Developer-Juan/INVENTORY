<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

/**
 * Duplica la asignación de roles para los deliveries existentes:
 * - Todo usuario con rol "delivery" recibe también el rol "dealer".
 * - Se asegura que cada uno tenga una Location tipo "dealer" (crea si falta)
 *   usando la ubicación actual si ya existe.
 */
class DeliveryToDealerSeeder extends Seeder
{
    public function run(): void
    {
        $deliveryRole = Role::firstOrCreate(['name' => 'delivery']);
        $dealerRole   = Role::firstOrCreate(['name' => 'dealer']);

        $deliveries = User::role('delivery')->get();

        $updated = 0;
        $createdLocations = 0;

        foreach ($deliveries as $user) {
            // Asignar rol dealer además de delivery.
            if (!$user->hasRole($dealerRole)) {
                $user->assignRole($dealerRole);
            }

            // Garantizar location tipo dealer asociada al usuario.
            $loc = Location::where('type', 'dealer')
                ->where('user_id', $user->id)
                ->first();

            if (!$loc) {
                Location::create([
                    'user_id' => $user->id,
                    'type'    => 'dealer',
                    'name'    => "Dealer - {$user->name}",
                ]);
                $createdLocations++;
            }

            $updated++;
        }

        $msg = sprintf(
            'DeliveryToDealerSeeder: %d deliveries marcados como dealer, %d locations creadas.',
            $updated,
            $createdLocations
        );

        Log::info($msg);
        $this->command?->info($msg);
    }
}
