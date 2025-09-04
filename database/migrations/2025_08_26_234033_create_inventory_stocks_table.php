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
        // Schema::create('inventory_stock', function (Blueprint $t) {
        //     $t->id();
        //     $t->foreignId('inventory_id')->constrained('inventories')->cascadeOnDelete();
        //     $t->foreignId('location_id')->constrained('locations')->cascadeOnDelete();
        //     $t->integer('on_hand')->default(0);     // físico
        //     $t->integer('reserved')->default(0);    // apartado
        //     $t->integer('min_stock')->default(0);   // mínimo
        //     $t->unique(['inventory_id', 'location_id']);
        //     $t->timestamps();
        // });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Schema::dropIfExists('inventory_stocks');
    }
};
