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
        $isSuperAdmin = $r->user() && $r->user()->hasRole('super-admin');
        $actorId = $r->user()?->id;
        $users = User::query()
            ->select('id', 'name', 'email', 'created_by')               // ← sin location_id
            ->with([
                'roles:id,name',
                'location:id,name,user_id',             // ← eager load de la ubicacion
            ])
            ->when($actorId, function ($q) use ($actorId) {
                $q->where('id', '!=', $actorId);
            })
            ->when(!$isSuperAdmin, function ($q) {
                $q->whereDoesntHave('roles', function ($rq) {
                    $rq->where('name', 'super-admin');
                });
            })
            ->when(!$isSuperAdmin && $actorId, function ($q) use ($actorId) {
                $q->where(function ($inner) use ($actorId) {
                    $inner->where('created_by', $actorId);
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => $isSuperAdmin
                ? Role::pluck('name')
                : Role::whereNotIn('name', ['super-admin', 'admin'])->pluck('name'),
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
            'status' => 'nullable|string|in:active_demo,active_working,suspended,expired,canceled',
            'location_id' => 'nullable|exists:locations,id',
            'create_location' => 'sometimes|boolean',
            'new_location_name' => 'required_if:create_location,1|nullable|string|max:150',
        ], [
            'new_location_name.required_if' => 'Debes escribir el nombre de la nueva ubicacion.',
        ]);

        $isSuperAdmin = $r->user() && $r->user()->hasRole('super-admin');
        if (!empty($data['roles']) && !$isSuperAdmin) {
            $data['roles'] = array_values(array_filter($data['roles'], function ($role) {
                return $role !== 'super-admin' && $role !== 'admin';
            }));
        }
        if (!empty($data['roles']) && $isSuperAdmin) {
            $data['roles'] = array_values(array_unique($data['roles']));
        }
        if (!$isSuperAdmin) {
            unset($data['status']);
        }

        $actorId = $r->user()?->id;
        $isSuperAdmin = $r->user() && $r->user()->hasRole('super-admin');

        DB::transaction(function () use ($data, $actorId, $isSuperAdmin) {
            $roles = $data['roles'] ?? [];
            $isAdminTarget = in_array('admin', $roles, true) || in_array('super-admin', $roles, true);
            $status = $isAdminTarget
                ? ($data['status'] ?? User::STATUS_PENDING)
                : User::STATUS_ACTIVE_WORKING;
            // 1) Crear usuario
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'status' => $status,
                'created_by' => $isSuperAdmin ? null : $actorId,
            ]);

            // 2) Roles
            $user->syncRoles($data['roles'] ?? []);

            // 3) ubicacion
            if (!empty($data['create_location'])) {
                // Crear nueva ubicacion tipo dealer y asignarla a este usuario
                Location::create([
                    'name' => $data['new_location_name'] ?: "Dealer - {$user->name}",
                    'type' => 'dealer',
                    'user_id' => $user->id,
                    'active' => true,
                ]);
            } elseif (!empty($data['location_id'])) {
                // Asignar una ubicacion existente (si no estÃ¡ ocupada)
                $loc = Location::lockForUpdate()->find($data['location_id']);
                if ($loc->user_id && $loc->user_id !== $user->id) {
                    throw ValidationException::withMessages([
                        'location_id' => 'La ubicacion seleccionada ya estÃ¡ asignada a otro usuario.',
                    ]);
                }
                $loc->update(['user_id' => $user->id]);
            }
        });

        return back()->with('success', 'Usuario creado.');
    }

    public function update(Request $r, User $user)
    {
        $isSuperAdmin = $r->user() && $r->user()->hasRole('super-admin');
        $actorId = $r->user()?->id;
        if ($actorId && $user->id === $actorId) {
            abort(403);
        }
        if ($user->hasRole('super-admin') && !$isSuperAdmin) {
            abort(403);
        }
        if (!$isSuperAdmin && $actorId && $user->id !== $actorId && $user->created_by !== $actorId) {
            abort(403);
        }

        $data = $r->validate([
            'name' => 'required|string|max:150',
            'email' => "required|email|unique:users,email,{$user->id}",
            'password' => 'nullable|min:8|confirmed',
            'roles' => 'array',
            'status' => 'nullable|string|in:active_demo,active_working,suspended,expired,canceled',
            'location_id' => 'nullable|exists:locations,id',

            // â†“ nuevos campos para renombrar la ubicacion asignada
            'rename_location' => 'sometimes|boolean',
            'location_name' => 'nullable|string|max:150',
        ], [
            'location_name.max' => 'El nombre de la ubicacion no puede exceder 150 caracteres.',
        ]);

        if (!empty($data['roles']) && !$isSuperAdmin) {
            $data['roles'] = array_values(array_filter($data['roles'], function ($role) {
                return $role !== 'super-admin' && $role !== 'admin';
            }));
        }
        if (!empty($data['roles']) && $isSuperAdmin) {
            $data['roles'] = array_values(array_unique($data['roles']));
        }
        if (!$isSuperAdmin) {
            unset($data['status']);
        }

        $roles = $data['roles'] ?? [];
        $allowStatus = $isSuperAdmin
            && !empty($data['status'])
            && (in_array('admin', $roles, true) || in_array('super-admin', $roles, true));

        DB::transaction(function () use ($user, $data, $allowStatus) {
            // 1) actualizar datos base
            $payload = [
                'name' => $data['name'],
                'email' => $data['email'],
            ];
            if (!empty($data['password'])) {
                $payload['password'] = Hash::make($data['password']);
            }
            if ($allowStatus) {
                $payload['status'] = $data['status'];
            }
            $user->update($payload);

            // 2) roles
            $user->syncRoles($data['roles'] ?? []);

            // 3) (re)asignar ubicacion si mandaron location_id
            //    primero liberar cualquiera anterior del usuario
            Location::where('user_id', $user->id)->update(['user_id' => null]);

            if (!empty($data['location_id'])) {
                $loc = Location::lockForUpdate()->find($data['location_id']);

                if ($loc->user_id && $loc->user_id !== $user->id) {
                    throw ValidationException::withMessages([
                        'location_id' => 'La ubicacion seleccionada ya estÃ¡ asignada a otro usuario.',
                    ]);
                }

                $loc->update(['user_id' => $user->id]);
            }

            // 4) Renombrar la ubicacion actualmente asignada (si lo piden)
            if (!empty($data['rename_location']) && !empty($data['location_name'])) {
                // Bloqueamos y buscamos la location que *ahora* quedÃ³ asignada a este usuario
                $currentLoc = Location::lockForUpdate()
                    ->where('user_id', $user->id)
                    ->first();

                if (!$currentLoc) {
                    throw ValidationException::withMessages([
                        'location_name' => 'No hay una ubicacion asignada para poder renombrarla.',
                    ]);
                }

                // (opcional) si quieres restringir que sÃ³lo se puedan renombrar dealers:
                // if ($currentLoc->type !== 'dealer') { ... }

                $currentLoc->update(['name' => $data['location_name']]);
            }
        });

        return back()->with('success', 'Usuario actualizado.');
    }


    public function destroy(User $user)
    {
        $actorId = auth()->id();
        if ($actorId && $user->id === $actorId) {
            abort(403);
        }
        if (auth()->user() && $user->hasRole('super-admin') && !auth()->user()->hasRole('super-admin')) {
            abort(403);
        }
        if (auth()->user() && !auth()->user()->hasRole('super-admin')) {
            $actorId = auth()->id();
            if ($user->id !== $actorId && $user->created_by !== $actorId) {
                abort(403);
            }
        }

        DB::transaction(function () use ($user) {
            // liberar location si la tiene
            Location::where('user_id', $user->id)->update(['user_id' => null]);
            $user->delete();
        });

        return back()->with('success', 'Usuario eliminado.');
    }
}







