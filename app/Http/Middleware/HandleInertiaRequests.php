<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Tightenco\Ziggy\Ziggy;
use Illuminate\Support\Facades\Vite; // ← IMPORTA ESTO

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    // ← CAMBIA ESTA FUNCIÓN
    public function version(Request $request): ?string
    {
        // Laravel + Vite
        return Vite::manifestHash();

        // Si tu proyecto fuera viejo y no tuviera Vite::manifestHash():
        // return file_exists(public_path('build/manifest.json'))
        //     ? md5_file(public_path('build/manifest.json'))
        //     : parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                // Carga ligera del usuario con roles (Spatie)
                'user' => fn() => $request->user()
                    ? $request->user()->loadMissing('roles:id,name')
                    : null,
                // Atajo: arreglo plano de nombres de roles
                'roles' => fn() => $request->user()
                    ? $request->user()->getRoleNames()
                    : [],
            ],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
            ],
            'ziggy' => fn() => array_merge((new \Tightenco\Ziggy\Ziggy)->toArray(), [
                'location' => $request->url(),
            ]),
        ]);
    }

}
