<?php

namespace App\Console\Commands;

use App\Models\Inventory;
use App\Models\User;
use Illuminate\Console\Command;

class InventoryBackfillCreatedBy extends Command
{
    protected $signature = 'inventories:backfill-created-by {--admin_id= : Use a specific admin id instead of auto-detecting}';

    protected $description = 'Backfill inventories.created_by using the admin with most dealers (or a specified admin id).';

    public function handle(): int
    {
        $adminId = (int) ($this->option('admin_id') ?? 0);

        if ($adminId <= 0) {
            $adminId = (int) User::query()
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'admin');
                })
                ->withCount(['createdUsers as dealer_count' => function ($q) {
                    $q->whereHas('roles', function ($r) {
                        $r->where('name', 'dealer');
                    });
                }])
                ->orderByDesc('dealer_count')
                ->value('id');
        }

        if ($adminId <= 0) {
            $this->error('No admin found to assign created_by.');
            return self::FAILURE;
        }

        $updated = Inventory::whereNull('created_by')->update(['created_by' => $adminId]);

        $this->info("admin_id={$adminId} updated={$updated}");
        return self::SUCCESS;
    }
}
