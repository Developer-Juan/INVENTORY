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
            // Cambiar las columnas a DECIMAL(12,2) con default 0
            DB::statement("
                ALTER TABLE inventory_stocks 
                MODIFY on_hand   DECIMAL(12,2) NOT NULL DEFAULT 0,
                MODIFY reserved  DECIMAL(12,2) NOT NULL DEFAULT 0,
                MODIFY min_stock DECIMAL(12,2) NOT NULL DEFAULT 0
            ");
        } elseif ($driver === 'pgsql') {
            // Cambiar tipo en PostgreSQL
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN on_hand   TYPE NUMERIC(12,2)");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN reserved  TYPE NUMERIC(12,2)");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN min_stock TYPE NUMERIC(12,2)");

            // Defaults
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN on_hand   SET DEFAULT 0");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN reserved  SET DEFAULT 0");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN min_stock SET DEFAULT 0");

            // Asegurar valores no nulos (por si había NULL)
            DB::statement("UPDATE inventory_stocks SET on_hand   = COALESCE(on_hand,   0)");
            DB::statement("UPDATE inventory_stocks SET reserved  = COALESCE(reserved,  0)");
            DB::statement("UPDATE inventory_stocks SET min_stock = COALESCE(min_stock, 0)");

            // En PG puedes además forzar NOT NULL (por si no lo era)
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN on_hand   SET NOT NULL");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN reserved  SET NOT NULL");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN min_stock SET NOT NULL");
        } elseif ($driver === 'sqlite') {
            // SQLite no soporta ALTER COLUMN TYPE real.
            // Si usas sqlite solo en tests in-memory, lo dejamos así para no romper tests.
            // Si necesitas exactitud en sqlite, toca recrear la tabla completa (más largo).
        }
    }

    public function down()
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // Volver a INT NOT NULL DEFAULT 0
            DB::statement("
                ALTER TABLE inventory_stocks 
                MODIFY on_hand   INT NOT NULL DEFAULT 0,
                MODIFY reserved  INT NOT NULL DEFAULT 0,
                MODIFY min_stock INT NOT NULL DEFAULT 0
            ");
        } elseif ($driver === 'pgsql') {
            // Volver a INTEGER
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN on_hand   TYPE INTEGER");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN reserved  TYPE INTEGER");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN min_stock TYPE INTEGER");

            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN on_hand   SET DEFAULT 0");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN reserved  SET DEFAULT 0");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN min_stock SET DEFAULT 0");

            DB::statement("UPDATE inventory_stocks SET on_hand   = COALESCE(on_hand,   0)");
            DB::statement("UPDATE inventory_stocks SET reserved  = COALESCE(reserved,  0)");
            DB::statement("UPDATE inventory_stocks SET min_stock = COALESCE(min_stock, 0)");

            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN on_hand   SET NOT NULL");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN reserved  SET NOT NULL");
            DB::statement("ALTER TABLE inventory_stocks ALTER COLUMN min_stock SET NOT NULL");
        } elseif ($driver === 'sqlite') {
            // Igual, no tocamos sqlite aquí.
        }
    }
};
