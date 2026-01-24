<?php

namespace App\Http\Controllers;

use App\Models\CustomerPoint;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class CustomerController extends Controller
{
    public function lookup(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\d{7,15}$/'],
        ]);

        $phone = $data['phone'];

        $role = Role::firstOrCreate(['name' => 'customer']);
        $user = User::role($role->name)->where('phone', $phone)->first();
        if (!$user) {
            return response()->json(['found' => false]);
        }

        $points = CustomerPoint::firstOrCreate(
            ['user_id' => $user->id],
            ['points_balance' => 0]
        );

        return response()->json([
            'found' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'points_balance' => (int) $points->points_balance,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'phone' => ['required', 'string', 'regex:/^\d{7,15}$/', 'unique:users,phone'],
        ]);

        $phone = $data['phone'];

        $baseEmail = "customer+{$phone}@local";
        $email = $baseEmail;
        $i = 1;
        while (User::where('email', $email)->exists()) {
            $email = "customer+{$phone}+{$i}@local";
            $i++;
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $email,
            'phone' => $phone,
            'password' => Hash::make(Str::random(20)),
        ]);

        $role = Role::firstOrCreate(['name' => 'customer']);
        $user->assignRole($role);

        $points = CustomerPoint::firstOrCreate(
            ['user_id' => $user->id],
            ['points_balance' => 0]
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'points_balance' => (int) $points->points_balance,
            ],
        ], 201);
    }
}
