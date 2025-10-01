<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('inventory_stocks', function (Blueprint $t) {
            $t->unique(['inventory_id', 'location_id'], 'inv_loc_unique');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('inventory_stocks', function (Blueprint $t) {
            $t->dropUnique('inv_loc_unique');
        });
    }
};
