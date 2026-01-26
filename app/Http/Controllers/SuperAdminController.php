<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminController extends Controller
{
    public function dashboard(): Response
    {
        $totalUsers = User::count();
        $pendingUsers = User::whereIn('status', [User::STATUS_PENDING, User::STATUS_PENDING_DEMO])->count();
        $activeDemo = User::where('status', User::STATUS_ACTIVE_DEMO)->count();
        $activeWorking = User::where('status', User::STATUS_ACTIVE_WORKING)->count();
        $onlineUsers = User::where('last_seen_at', '>=', now()->subMinutes(5))->count();

        return Inertia::render('SuperAdmin/Dashboard', [
            'stats' => [
                'total' => $totalUsers,
                'pending' => $pendingUsers,
                'active_demo' => $activeDemo,
                'active_working' => $activeWorking,
                'online' => $onlineUsers,
            ],
        ]);
    }

    public function approvals(Request $request): Response
    {
        if (!$request->user() || !$request->user()->hasAnyRole(['admin', 'super-admin'])) {
            abort(403);
        }

        $pendingUsers = User::whereIn('status', [User::STATUS_PENDING, User::STATUS_PENDING_DEMO])
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['admin', 'super-admin']);
            })
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'status', 'created_at']);

        $activeAdmins = User::whereIn('status', [User::STATUS_ACTIVE_DEMO, User::STATUS_ACTIVE_WORKING])
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['admin', 'super-admin']);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status', 'created_at']);

        return Inertia::render('SuperAdmin/Approvals', [
            'pendingUsers' => $pendingUsers,
            'activeAdmins' => $activeAdmins,
        ]);
    }

    public function updateStatus(Request $request, User $user)
    {
        if (!$request->user() || !$request->user()->hasAnyRole(['admin', 'super-admin'])) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'in:active_demo,active_working'],
        ]);

        $user->update([
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Usuario actualizado.');
    }

    public function users(Request $request): Response
    {
        if (!$request->user() || !$request->user()->hasRole('super-admin')) {
            abort(403);
        }

        $users = User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['admin', 'super-admin']);
            })
            ->with('roles:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status', 'created_at']);

        return Inertia::render('SuperAdmin/Users', [
            'users' => $users,
        ]);
    }

    public function updateUser(Request $request, User $user)
    {
        if (!$request->user() || !$request->user()->hasRole('super-admin')) {
            abort(403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', "unique:users,email,{$user->id}"],
            'status' => ['required', 'string', 'in:active_demo,active_working,suspended,expired,canceled'],
            'roles' => ['required', 'array'],
            'roles.*' => ['string', 'in:admin,super-admin'],
            'password' => ['nullable', 'confirmed', 'min:8'],
        ]);

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'status' => $data['status'],
        ];
        if (!empty($data['password'])) {
            $payload['password'] = bcrypt($data['password']);
        }
        $user->update($payload);
        $user->syncRoles($data['roles']);

        return back()->with('success', 'Usuario actualizado.');
    }
}
