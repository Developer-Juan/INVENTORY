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
        Schema::create('location_cashes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('location_id')->constrained('locations')->cascadeOnDelete();
            $t->decimal('on_hand', 14, 2)->default(0);
            $t->timestamps();
            $t->unique('location_id'); // 1 fila por ubicación
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('location_cashes');
    }
};
