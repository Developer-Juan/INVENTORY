<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('debtor_name')->nullable()->after('customer_id');
            $table->string('debtor_phone')->nullable()->after('debtor_name');
        });
    }

    public function down()
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['debtor_name', 'debtor_phone']);
        });
    }
};
