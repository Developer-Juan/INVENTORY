<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE transfer_items MODIFY quantity DECIMAL(12,2) NOT NULL DEFAULT 0');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE transfer_items ALTER COLUMN quantity TYPE NUMERIC(12,2)');
            DB::statement('ALTER TABLE transfer_items ALTER COLUMN quantity SET DEFAULT 0');
            DB::statement('UPDATE transfer_items SET quantity = COALESCE(quantity, 0)');
        } elseif ($driver === 'sqlite') {
            // En SQLite hay que recrear la tabla; si usas sqlite en tests, considera Opción A.
        }
    }

    public function down()
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE transfer_items MODIFY quantity INT NOT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE transfer_items ALTER COLUMN quantity TYPE INTEGER');
        }
    }
};
