<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('payment_methods', function (Blueprint $t) {
            $t->boolean('is_cash')->default(false)->after('name');
        });

        // Backfill básico (ajusta a tus códigos/nombres)
        DB::statement("UPDATE payment_methods SET is_cash = 1 WHERE LOWER(code) IN ('cash','efectivo','efec') OR LOWER(name) LIKE '%efect%'");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('payment_methods', function (Blueprint $t) {
            $t->dropColumn('is_cash');
        });
    }
};
