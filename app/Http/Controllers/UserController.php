<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $r)
    {
        $users = User::query()
            ->select('id', 'name', 'email')               // ← sin location_id
            ->with([
                'roles:id,name',
                'location:id,name,user_id',             // ← eager load de la ubicación
            ])
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => Role::pluck('name'),
            'locations' => Location::select('id', 'name')
                ->where('type', 'dealer')   // ← solo dealers para el select
                ->orderBy('name')
                ->get(),
        ]);
    }


    public function store(Request $r)
    {
        $data = $r->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'roles' => 'array',
            'location_id' => 'nullable|exists:locations,id',
            'create_location' => 'sometimes|boolean',
            'new_location_name' => 'required_if:create_location,1|nullable|string|max:150',
        ], [
            'new_location_name.required_if' => 'Debes escribir el nombre de la nueva ubicación.',
        ]);

        DB::transaction(function () use ($data) {
            // 1) Crear usuario
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            // 2) Roles
            $user->syncRoles($data['roles'] ?? []);

            // 3) Ubicación
            if (!empty($data['create_location'])) {
                // Crear nueva ubicación tipo dealer y asignarla a este usuario
                Location::create([
                    'name' => $data['new_location_name'] ?: "Dealer - {$user->name}",
                    'type' => 'dealer',
                    'user_id' => $user->id,
                    'active' => true,
                ]);
            } elseif (!empty($data['location_id'])) {
                // Asignar una ubicación existente (si no está ocupada)
                $loc = Location::lockForUpdate()->find($data['location_id']);
                if ($loc->user_id && $loc->user_id !== $user->id) {
                    throw ValidationException::withMessages([
                        'location_id' => 'La ubicación seleccionada ya está asignada a otro usuario.',
                    ]);
                }
                $loc->update(['user_id' => $user->id]);
            }
        });

        return back()->with('success', 'Usuario creado.');
    }

    public function update(Request $r, User $user)
    {
        $data = $r->validate([
            'name' => 'required|string|max:150',
            'email' => "required|email|unique:users,email,{$user->id}",
            'password' => 'nullable|min:8|confirmed',
            'roles' => 'array',
            'location_id' => 'nullable|exists:locations,id',

            // ↓ nuevos campos para renombrar la ubicación asignada
            'rename_location' => 'sometimes|boolean',
            'location_name' => 'nullable|string|max:150',
        ], [
            'location_name.max' => 'El nombre de la ubicación no puede exceder 150 caracteres.',
        ]);

        DB::transaction(function () use ($user, $data) {
            // 1) actualizar datos base
            $payload = [
                'name' => $data['name'],
                'email' => $data['email'],
            ];
            if (!empty($data['password'])) {
                $payload['password'] = Hash::make($data['password']);
            }
            $user->update($payload);

            // 2) roles
            $user->syncRoles($data['roles'] ?? []);

            // 3) (re)asignar ubicación si mandaron location_id
            //    primero liberar cualquiera anterior del usuario
            Location::where('user_id', $user->id)->update(['user_id' => null]);

            if (!empty($data['location_id'])) {
                $loc = Location::lockForUpdate()->find($data['location_id']);

                if ($loc->user_id && $loc->user_id !== $user->id) {
                    throw ValidationException::withMessages([
                        'location_id' => 'La ubicación seleccionada ya está asignada a otro usuario.',
                    ]);
                }

                $loc->update(['user_id' => $user->id]);
            }

            // 4) Renombrar la ubicación actualmente asignada (si lo piden)
            if (!empty($data['rename_location']) && !empty($data['location_name'])) {
                // Bloqueamos y buscamos la location que *ahora* quedó asignada a este usuario
                $currentLoc = Location::lockForUpdate()
                    ->where('user_id', $user->id)
                    ->first();

                if (!$currentLoc) {
                    throw ValidationException::withMessages([
                        'location_name' => 'No hay una ubicación asignada para poder renombrarla.',
                    ]);
                }

                // (opcional) si quieres restringir que sólo se puedan renombrar dealers:
                // if ($currentLoc->type !== 'dealer') { ... }

                $currentLoc->update(['name' => $data['location_name']]);
            }
        });

        return back()->with('success', 'Usuario actualizado.');
    }


    public function destroy(User $user)
    {
        DB::transaction(function () use ($user) {
            // liberar location si la tiene
            Location::where('user_id', $user->id)->update(['user_id' => null]);
            $user->delete();
        });

        return back()->with('success', 'Usuario eliminado.');
    }
}
