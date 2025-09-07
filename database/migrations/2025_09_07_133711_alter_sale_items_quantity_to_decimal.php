<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sale_items MODIFY quantity DECIMAL(12,3) NOT NULL DEFAULT 0");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(12,3) USING quantity::DECIMAL(12,3)");
            DB::statement("ALTER TABLE sale_items ALTER COLUMN quantity SET DEFAULT 0");
            DB::statement("ALTER TABLE sale_items ALTER COLUMN quantity SET NOT NULL");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sale_items MODIFY quantity DECIMAL(12,0) NOT NULL DEFAULT 0");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(12,0) USING quantity::DECIMAL(12,0)");
            DB::statement("ALTER TABLE sale_items ALTER COLUMN quantity SET DEFAULT 0");
            DB::statement("ALTER TABLE sale_items ALTER COLUMN quantity SET NOT NULL");
        }
    }
};
