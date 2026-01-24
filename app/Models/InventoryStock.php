<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Notifications\LowStockNotification;
use App\Models\User;
use Spatie\Permission\Models\Role;

class InventoryStock extends Model
{
    use HasFactory;

    protected $table = 'inventory_stocks';
    protected $fillable = ['inventory_id', 'location_id', 'on_hand', 'reserved', 'min_stock'];

    protected static function booted()
    {
        static::updated(function (InventoryStock $stock) {
            $newMin = (float) ($stock->min_stock ?? 0);
            if ($newMin <= 0) {
                return;
            }

            $newAvailable = (float) ($stock->on_hand ?? 0) - (float) ($stock->reserved ?? 0);
            $oldOnHand = (float) ($stock->getOriginal('on_hand') ?? 0);
            $oldReserved = (float) ($stock->getOriginal('reserved') ?? 0);
            $oldAvailable = $oldOnHand - $oldReserved;
            $oldMin = (float) ($stock->getOriginal('min_stock') ?? 0);

            $crossed = $newAvailable < $newMin && ($oldAvailable >= $newMin || $oldMin !== $newMin);
            if (!$crossed) {
                return;
            }

            $location = $stock->location()->with('user:id,name')->first();
            $inventory = $stock->inventory()->select('id', 'name', 'unit')->first();
            if (!$location || !$inventory) {
                return;
            }

            $recipients = collect();
            if ($location->user) {
                $recipients->push($location->user);
            } else {
                $roleNames = Role::whereIn('name', ['admin', 'super-admin'])->pluck('name');
                if ($roleNames->isNotEmpty()) {
                    $recipients = $recipients->merge(User::role($roleNames)->get());
                }
            }

            if ($recipients->isEmpty()) {
                return;
            }

            $notification = new LowStockNotification(
                (int) $inventory->id,
                (string) $inventory->name,
                $inventory->unit ? (string) $inventory->unit : null,
                (int) $location->id,
                (string) $location->name,
                (float) $newAvailable,
                (float) $newMin
            );

            foreach ($recipients as $user) {
                $user->notify($notification);
            }
        });
    }
    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }
    public function location()
    {
        return $this->belongsTo(Location::class);
    }
}
