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
        Schema::create('inventory_stocks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('inventory_id')->constrained()->cascadeOnDelete();
            $t->foreignId('location_id')->constrained()->cascadeOnDelete();
            $t->integer('on_hand')->default(0);
            $t->integer('reserved')->default(0);
            $t->integer('min_stock')->default(0);
            $t->timestamps();

            $t->unique(['inventory_id', 'location_id']);
            $t->index(['location_id', 'inventory_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('inventory_stocks');
    }
};
