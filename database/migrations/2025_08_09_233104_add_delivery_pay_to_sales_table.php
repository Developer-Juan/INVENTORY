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
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('delivery_rate', 10, 2)->default(0)->after('km');   // tarifa por km usada
            $table->decimal('delivery_pay', 12, 2)->default(0)->after('delivery_rate'); // monto a pagar al domi
            $table->timestamp('delivery_settled_at')->nullable()->after('delivery_pay'); // para marcar liquidado
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['delivery_rate', 'delivery_pay', 'delivery_settled_at']);
        });
    }
};
