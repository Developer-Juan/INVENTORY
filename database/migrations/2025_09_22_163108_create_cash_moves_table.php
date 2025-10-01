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
        Schema::create('cash_moves', function (Blueprint $t) {
            $t->id();
            $t->foreignId('location_id')->constrained('locations')->cascadeOnDelete();
            $t->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $t->enum('direction', ['in', 'out']);
            $t->decimal('amount', 14, 2);
            $t->string('reason', 40)->nullable(); // SALE, SALE_CANCEL, AJUSTE, etc.
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->string('note', 191)->nullable();
            $t->timestamps();

            $t->index(['location_id', 'sale_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('cash_moves');
    }
};
