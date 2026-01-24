<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('points_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('value_per_point', 12, 2)->default(0);
            $table->text('redemption_info')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('points_settings');
    }
};
