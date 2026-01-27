<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up()
    {
        if (!Schema::hasColumn('points_settings', 'admin_id')) {
            Schema::table('points_settings', function (Blueprint $table) {
                $table->foreignId('admin_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index('admin_id');
            });
        }

        if (!Schema::hasColumn('points_rewards', 'admin_id')) {
            Schema::table('points_rewards', function (Blueprint $table) {
                $table->foreignId('admin_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index('admin_id');
            });
        }

        if (!Schema::hasColumn('customer_points', 'admin_id')) {
            Schema::table('customer_points', function (Blueprint $table) {
                $table->foreignId('admin_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index('admin_id');
            });
        }

        if (!Schema::hasColumn('points_transactions', 'admin_id')) {
            Schema::table('points_transactions', function (Blueprint $table) {
                $table->foreignId('admin_id')
                    ->nullable()
                    ->after('sale_id')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index('admin_id');
            });
        }

        if (Schema::hasColumn('customer_points', 'admin_id')) {
            // Ensure there's a non-unique index for FK, then drop unique and add composite unique.
            try {
                DB::statement('CREATE INDEX customer_points_user_id_idx ON customer_points (user_id)');
            } catch (\Throwable $e) {
                // ignore if exists
            }
            try {
                DB::statement('ALTER TABLE customer_points DROP INDEX customer_points_user_id_unique');
            } catch (\Throwable $e) {
                // ignore if already dropped
            }
            try {
                DB::statement('ALTER TABLE customer_points ADD UNIQUE customer_points_user_id_admin_id_unique (user_id, admin_id)');
            } catch (\Throwable $e) {
                // ignore if already added
            }
        }
    }

    public function down()
    {
        Schema::table('customer_points', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'admin_id']);
            $table->unique('user_id');
        });

        if (Schema::hasColumn('points_transactions', 'admin_id')) {
            Schema::table('points_transactions', function (Blueprint $table) {
                $table->dropIndex(['admin_id']);
                $table->dropConstrainedForeignId('admin_id');
            });
        }

        if (Schema::hasColumn('customer_points', 'admin_id')) {
            Schema::table('customer_points', function (Blueprint $table) {
                $table->dropIndex(['admin_id']);
                $table->dropConstrainedForeignId('admin_id');
            });
        }

        if (Schema::hasColumn('points_rewards', 'admin_id')) {
            Schema::table('points_rewards', function (Blueprint $table) {
                $table->dropIndex(['admin_id']);
                $table->dropConstrainedForeignId('admin_id');
            });
        }

        if (Schema::hasColumn('points_settings', 'admin_id')) {
            Schema::table('points_settings', function (Blueprint $table) {
                $table->dropIndex(['admin_id']);
                $table->dropConstrainedForeignId('admin_id');
            });
        }
    }
};
