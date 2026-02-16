<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): JsonResponse
    {
        $request->ensureIsNotRateLimited();

        $credentials = $request->only('email', 'password');

        $token = Auth::guard('jwt')->attempt($credentials);
        if (! $token) {
            RateLimiter::hit($request->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        $user = Auth::guard('jwt')->user();
        if ($user && method_exists($user, 'isActiveForLogin') && ! $user->isActiveForLogin()) {
            Auth::guard('jwt')->logout();
            RateLimiter::clear($request->throttleKey());

            throw ValidationException::withMessages([
                'email' => 'Cuenta pendiente de aprobacion. Un super admin debe activarla.',
            ]);
        }

        RateLimiter::clear($request->throttleKey());

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => Auth::guard('jwt')->factory()->getTTL() * 60,
            'user' => $user,
        ])->withCookie($this->tokenCookie($token));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): JsonResponse
    {
        Auth::guard('jwt')->logout();

        return response()->json([
            'message' => 'Sesion cerrada.',
        ])->withCookie(cookie()->forget('token'));
    }

    private function tokenCookie(string $token)
    {
        $minutes = Auth::guard('jwt')->factory()->getTTL();

        return cookie(
            'token',
            $token,
            $minutes,
            '/',
            config('session.domain'),
            config('session.secure'),
            true,
            false,
            config('session.same_site')
        );
    }
}
