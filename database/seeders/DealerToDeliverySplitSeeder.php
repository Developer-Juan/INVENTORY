<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

/**
 * Separa lógicas de dealer vs delivery:
 * - Los usuarios con rol dealer que ya tienen una ubicación (location type=dealer)
 *   pasan a rol delivery (se les quita dealer).
 * - Los usuarios sin ubicación se mantienen con rol dealer.
 */
class DealerToDeliverySplitSeeder extends Seeder
{
    public function run(): void
    {
        $dealerRole = Role::firstOrCreate(['name' => 'dealer']);
        $deliveryRole = Role::firstOrCreate(['name' => 'delivery']);

        $dealers = User::role('dealer')->get();

        $moved = 0;
        $kept = 0;

        foreach ($dealers as $user) {
            $hasDealerLocation = Location::where('type', 'dealer')
                ->where('user_id', $user->id)
                ->exists();

            if ($hasDealerLocation) {
                // Quita dealer y asigna delivery (manteniendo otros roles que tenga).
                $user->removeRole($dealerRole);
                $user->assignRole($deliveryRole);
                $moved++;
                continue;
            }

            // Asegura que los que no se movieron sigan teniendo dealer.
            if (!$user->hasRole($dealerRole)) {
                $user->assignRole($dealerRole);
            }
            $kept++;
        }

        $msg = sprintf(
            'DealerToDeliverySplitSeeder: %d usuarios movidos a delivery, %d conservados como dealer.',
            $moved,
            $kept
        );

        // Log para debugging en seeding local/CI; no rompe en producción.
        Log::info($msg);
        $this->command?->info($msg);
    }
}
