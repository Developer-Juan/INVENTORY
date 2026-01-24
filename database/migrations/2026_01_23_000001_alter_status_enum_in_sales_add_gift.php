<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up()
    {
        DB::statement("
            ALTER TABLE sales
            MODIFY COLUMN status
            ENUM('debe','parcial','pagado','anulada','gift')
            NOT NULL DEFAULT 'debe'
        ");
    }

    public function down()
    {
        DB::statement("
            ALTER TABLE sales
            MODIFY COLUMN status
            ENUM('debe','parcial','pagado','anulada')
            NOT NULL DEFAULT 'debe'
        ");
    }
};
