<?php
// app/Services/StockService.php
namespace App\Services;

use App\Models\InventoryStock;
use Illuminate\Support\Facades\DB;

// app/Services/StockService.php
class StockService
{
    public function inc(int $inventoryId, int $locationId, int $qty): void
    {
        DB::transaction(function () use ($inventoryId, $locationId, $qty) {
            $row = InventoryStock::lockForUpdate()
                ->firstOrCreate(['inventory_id' => $inventoryId, 'location_id' => $locationId]);
            $row->on_hand += $qty;
            $row->save();
        });
    }
    public function dec(int $inventoryId, int $locationId, int $qty): void
    {
        DB::transaction(function () use ($inventoryId, $locationId, $qty) {
            $row = InventoryStock::lockForUpdate()
                ->where(compact('inventoryId', 'locationId'))
                ->firstOrFail();
            if ($row->on_hand < $qty)
                throw new \RuntimeException('Stock insuficiente');
            $row->on_hand -= $qty;
            $row->save();
        });
    }
    public function reserve(int $inventoryId, int $locationId, int $qty): void
    {
        DB::transaction(function () use ($inventoryId, $locationId, $qty) {
            $row = InventoryStock::lockForUpdate()
                ->firstOrCreate(['inventory_id' => $inventoryId, 'location_id' => $locationId]);
            if (($row->on_hand - $row->reserved) < $qty)
                throw new \RuntimeException('No hay disponible');
            $row->reserved += $qty;
            $row->save();
        });
    }
    public function release(int $inventoryId, int $locationId, int $qty): void
    {
        DB::transaction(function () use ($inventoryId, $locationId, $qty) {
            $row = InventoryStock::lockForUpdate()
                ->where(compact('inventoryId', 'locationId'))->firstOrFail();
            $row->reserved = max(0, $row->reserved - $qty);
            $row->save();
        });
    }
    public function transfer(int $inventoryId, int $fromId, int $toId, int $qty): void
    {
        DB::transaction(function () use ($inventoryId, $fromId, $toId, $qty) {
            $this->dec($inventoryId, $fromId, $qty);
            $this->inc($inventoryId, $toId, $qty);
        });
    }
}
