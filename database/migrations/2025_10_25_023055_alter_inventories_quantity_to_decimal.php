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
            // Cambiar integer -> DECIMAL(12,2) con default 0
            DB::statement('ALTER TABLE inventories MODIFY quantity DECIMAL(12,2) NOT NULL DEFAULT 0');
        } elseif ($driver === 'pgsql') {
            // Cambiar tipo en PostgreSQL
            DB::statement('ALTER TABLE inventories ALTER COLUMN quantity TYPE NUMERIC(12,2)');
            DB::statement('ALTER TABLE inventories ALTER COLUMN quantity SET DEFAULT 0');
            DB::statement('UPDATE inventories SET quantity = COALESCE(quantity, 0)');
        } elseif ($driver === 'sqlite') {
            /**
             * SQLite no soporta ALTER COLUMN TYPE real.
             * Opciones:
             *  - recrear tabla temporalmente (más largo),
             *  - o dejarlo pasar en entorno de test.
             *
             * Yo no toco nada aquí para no romper tests in-memory.
             */
        }
    }

    public function down()
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE inventories MODIFY quantity INT NOT NULL DEFAULT 0');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE inventories ALTER COLUMN quantity TYPE INTEGER');
            DB::statement('ALTER TABLE inventories ALTER COLUMN quantity SET DEFAULT 0');
            DB::statement('UPDATE inventories SET quantity = COALESCE(quantity, 0)');
        } elseif ($driver === 'sqlite') {
            // mismo cuento: no hacemos rollback aquí
        }
    }
};
