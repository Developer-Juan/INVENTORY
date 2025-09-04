<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $principalId = DB::table('locations')->where('type', 'principal')->value('id');
        if (!$principalId) {
            $principalId = DB::table('locations')->insertGetId([
                'name' => 'Principal',
                'type' => 'principal',
                'user_id' => null,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Si no existe la columna 'quantity', no hay nada que migrar
        if (!Schema::hasColumn('inventories', 'quantity')) {
            return;
        }

        $items = DB::table('inventories')->select('id', 'quantity')->get();

        foreach ($items as $it) {
            $exists = DB::table('inventory_stocks')
                ->where('inventory_id', $it->id)
                ->where('location_id', $principalId)
                ->exists();

            if (!$exists) {
                DB::table('inventory_stocks')->insert([
                    'inventory_id' => $it->id,
                    'location_id' => $principalId,
                    'on_hand' => (int) ($it->quantity ?? 0),
                    'reserved' => 0,
                    'min_stock' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        $principalId = DB::table('locations')->where('type', 'principal')->value('id');
        if ($principalId) {
            DB::table('inventory_stocks')->where('location_id', $principalId)->delete();
        }
    }
};
