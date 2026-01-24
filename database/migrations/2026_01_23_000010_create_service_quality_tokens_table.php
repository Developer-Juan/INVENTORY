<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('service_quality_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('dealer_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 80)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['sale_id', 'dealer_user_id']);
            $table->index(['expires_at', 'used_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('service_quality_tokens');
    }
};
