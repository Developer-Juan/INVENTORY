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
        Schema::create('locations', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->enum('type', ['principal', 'dealer']);
            $t->foreignId('user_id')->nullable()->constrained(); // dealer/delivery dueño
            $t->boolean('active')->default(true);
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
        Schema::dropIfExists('locations');
    }
};
