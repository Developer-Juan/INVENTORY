<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JwtTokenController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function refresh(): JsonResponse
    {
        $token = Auth::guard('jwt')->refresh();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => Auth::guard('jwt')->factory()->getTTL() * 60,
        ])->withCookie($this->tokenCookie($token));
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
