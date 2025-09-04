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
        Schema::create('transfers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('from_location_id')->constrained('locations');
            $t->foreignId('to_location_id')->constrained('locations');
            $t->foreignId('created_by')->constrained('users');
            $t->string('note')->nullable();
            $t->string('status')->default('done'); // done/cancel/pending
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
        Schema::dropIfExists('transfers');
    }
};
