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
        // Ajusta la lista a lo que tengas hoy + 'anulada'
        DB::statement("
            ALTER TABLE sales
            MODIFY COLUMN status
            ENUM('debe','parcial','pagado','anulada')
            NOT NULL DEFAULT 'debe'
        ");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Reviértelo si quieres (sin 'anulada')
        DB::statement("
            ALTER TABLE sales
            MODIFY COLUMN status
            ENUM('debe','parcial','pagado')
            NOT NULL DEFAULT 'debe'
        ");
    }
};
