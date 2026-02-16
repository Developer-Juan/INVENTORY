<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guard = config('permission.default_guard_name', 'jwt');

        DB::table('roles')->update(['guard_name' => $guard]);
        DB::table('permissions')->update(['guard_name' => $guard]);
    }

    public function down(): void
    {
        DB::table('roles')->update(['guard_name' => 'web']);
        DB::table('permissions')->update(['guard_name' => 'web']);
    }
};
