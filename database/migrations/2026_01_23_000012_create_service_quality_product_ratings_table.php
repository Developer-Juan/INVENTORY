<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('service_quality_product_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained('service_quality_reviews')->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained('sale_items')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->timestamps();

            $table->unique(['review_id', 'sale_item_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('service_quality_product_ratings');
    }
};
