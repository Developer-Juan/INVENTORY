<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('service_quality_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('token_id')->constrained('service_quality_tokens')->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('dealer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating_dealer');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index(['sale_id', 'dealer_user_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('service_quality_reviews');
    }
};
