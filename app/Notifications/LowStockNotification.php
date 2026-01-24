<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LowStockNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $inventoryId,
        public string $inventoryName,
        public ?string $unit,
        public int $locationId,
        public string $locationName,
        public float $available,
        public float $minStock
    ) {
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'low_stock',
            'inventory_id' => $this->inventoryId,
            'inventory_name' => $this->inventoryName,
            'unit' => $this->unit,
            'location_id' => $this->locationId,
            'location_name' => $this->locationName,
            'available' => $this->available,
            'min_stock' => $this->minStock,
            'message' => "Stock mínimo alcanzado en {$this->locationName} para {$this->inventoryName}.",
        ];
    }
}
