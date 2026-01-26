<?php

namespace App\Http\Controllers;

use App\Models\DemoRequest;
use App\Models\User;
use App\Notifications\NewAdminRequestNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoRequestController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'locations' => ['nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'focus' => ['nullable', 'string', 'max:1000'],
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'status' => User::STATUS_PENDING_DEMO,
        ]);

        if (Role::where('name', 'admin')->exists()) {
            $user->assignRole('admin');
        }

        DemoRequest::create([
            'user_id' => $user->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'locations' => $data['locations'] ?? null,
            'industry' => $data['industry'] ?? null,
            'focus' => $data['focus'] ?? null,
        ]);

        $superAdmins = User::role('super-admin')->get();
        foreach ($superAdmins as $admin) {
            $admin->notify(new NewAdminRequestNotification($user->name, $user->email, $user->status));
        }

        return back()->with('success', 'Solicitud de demo enviada. Un super admin validara el acceso.');
    }
}
