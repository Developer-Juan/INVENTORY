<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PointsBackfillAdmin extends Command
{
    protected $signature = 'points:backfill-admin';
    protected $description = 'Backfill admin_id for points transactions and rebuild customer points per admin.';

    public function handle(): int
    {
        $this->info('Backfilling points admin_id from sales/delivery...');

        DB::transaction(function () {
            // 1) When there is a dealer, use dealer.created_by as admin_id, otherwise use sale.user_id.
            DB::statement("
                UPDATE points_transactions pt
                JOIN sales s ON s.id = pt.sale_id
                LEFT JOIN users d ON d.id = s.delivery_id
                SET pt.admin_id = CASE
                    WHEN s.delivery_id IS NOT NULL AND d.created_by IS NOT NULL THEN d.created_by
                    ELSE s.user_id
                END
                WHERE pt.admin_id IS NULL AND pt.sale_id IS NOT NULL
            ");

            // 2) Fallback: if no sale, use created_by
            DB::statement("
                UPDATE points_transactions
                SET admin_id = created_by
                WHERE admin_id IS NULL AND created_by IS NOT NULL
            ");

            // 3) Final fallback: if still null and has sale, use sale.user_id
            DB::statement("
                UPDATE points_transactions pt
                JOIN sales s ON s.id = pt.sale_id
                SET pt.admin_id = s.user_id
                WHERE pt.admin_id IS NULL AND s.user_id IS NOT NULL
            ");

            // 4) Rebuild customer_points per admin
            DB::statement('DELETE FROM customer_points');

            DB::statement("
                INSERT INTO customer_points (user_id, admin_id, points_balance, created_at, updated_at)
                SELECT
                    user_id,
                    admin_id,
                    GREATEST(SUM(points), 0) as points_balance,
                    NOW(),
                    NOW()
                FROM points_transactions
                WHERE admin_id IS NOT NULL
                GROUP BY user_id, admin_id
            ");
        });

        $this->info('Backfill completed.');
        return self::SUCCESS;
    }
}
