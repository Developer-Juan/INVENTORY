<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject', 191);
            $table->string('status', 30)->default('open'); // open|closed
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['dealer_user_id', 'status']);
            $table->index(['last_message_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('support_tickets');
    }
};
