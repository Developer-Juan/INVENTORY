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
        Schema::table('inventory_moves', function (Blueprint $t) {
            $t->foreignId('sale_id')->nullable()->after('location_id')->constrained('sales');
            $t->foreignId('sale_item_id')->nullable()->after('sale_id')->constrained('sale_items');
            $t->index(['inventory_id', 'location_id']); // por si no lo tienes
            $t->index(['sale_id', 'sale_item_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('inventory_moves', function (Blueprint $t) {
            $t->dropConstrainedForeignId('sale_item_id');
            $t->dropConstrainedForeignId('sale_id');
            $t->dropIndex(['inventory_id', 'location_id']); // quita si ya existía
            $t->dropIndex(['sale_id', 'sale_item_id']);
        });
    }
};
