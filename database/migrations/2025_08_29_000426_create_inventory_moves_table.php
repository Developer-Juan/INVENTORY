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
        Schema::create('inventory_moves', function (Blueprint $t) {
            $t->id();
            $t->foreignId('inventory_id')->constrained('inventories');
            $t->foreignId('location_id')->constrained('locations');
            $t->enum('direction', ['in', 'out']);
            $t->integer('quantity');                 // siempre positivo
            $t->string('reason')->default('TRANSFER'); // TRANSFER, ADJUST, SALE, etc
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('inventory_moves');
    }
};
