<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // MySQL/MariaDB
        DB::statement("ALTER TABLE inventories MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE inventory_stocks MODIFY COLUMN on_hand DECIMAL(10,3) NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE inventory_stocks MODIFY COLUMN reserved DECIMAL(10,3) NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE inventory_stocks MODIFY COLUMN min_stock DECIMAL(10,3) NOT NULL DEFAULT 0");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE inventories MODIFY COLUMN quantity INT NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE inventory_stocks MODIFY COLUMN on_hand INT NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE inventory_stocks MODIFY COLUMN reserved INT NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE inventory_stocks MODIFY COLUMN min_stock INT NOT NULL DEFAULT 0");
    }
};
