<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Tightenco\Ziggy\Ziggy;
use Illuminate\Support\Facades\Vite; // ← IMPORTA ESTO
use App\Models\ServiceQualityReview;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
        $user = $request->user();
        if ($user && Schema::hasColumn('users', 'last_seen_at')) {
            $lastSeen = $user->last_seen_at;
            if (!$lastSeen || $lastSeen->lt(now()->subMinute())) {
                $user->forceFill(['last_seen_at' => now()])->save();
            }
        }

        return array_merge(parent::share($request), [
            'appVersion' => config('app.version'),
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
            'dealerRating' => fn() => $request->user() && method_exists($request->user(), 'hasRole') && $request->user()->hasRole('dealer')
                ? [
                    'avg' => round((float) (ServiceQualityReview::where('dealer_user_id', $request->user()->id)->avg('rating_dealer') ?? 0), 2),
                    'total' => (int) (ServiceQualityReview::where('dealer_user_id', $request->user()->id)->count() ?? 0),
                ]
                : null,
            'supportUnread' => fn() => $request->user() && method_exists($request->user(), 'hasRole') && $request->user()->hasRole('dealer')
                ? (bool) DB::table('support_messages as sm')
                    ->joinSub(
                        DB::table('support_messages')
                            ->selectRaw('ticket_id, MAX(id) as max_id')
                            ->groupBy('ticket_id'),
                        'last_msg',
                        function ($join) {
                            $join->on('last_msg.ticket_id', '=', 'sm.ticket_id')
                                ->on('last_msg.max_id', '=', 'sm.id');
                        }
                    )
                    ->join('support_tickets as t', 't.id', '=', 'sm.ticket_id')
                    ->leftJoin('support_ticket_reads as r', function ($join) use ($request) {
                        $join->on('r.ticket_id', '=', 't.id')
                            ->where('r.user_id', '=', $request->user()->id);
                    })
                    ->where('t.dealer_user_id', $request->user()->id)
                    ->where('sm.sender_user_id', '!=', $request->user()->id)
                    ->where(function ($q) {
                        $q->whereNull('r.last_read_message_id')
                            ->orWhereColumn('r.last_read_message_id', '<', 'sm.id');
                    })
                    ->exists()
                : false,
            'supportTicketCount' => fn() => $request->user() && method_exists($request->user(), 'hasRole') && $request->user()->hasRole('admin')
                ? (int) DB::table('support_tickets')->where('status', 'open')->count()
                : 0,
            'supportUnreadAdmin' => fn() => $request->user() && method_exists($request->user(), 'hasRole') && $request->user()->hasRole('admin')
                ? (bool) DB::table('support_messages as sm')
                    ->joinSub(
                        DB::table('support_messages')
                            ->selectRaw('ticket_id, MAX(id) as max_id')
                            ->groupBy('ticket_id'),
                        'last_msg',
                        function ($join) {
                            $join->on('last_msg.ticket_id', '=', 'sm.ticket_id')
                                ->on('last_msg.max_id', '=', 'sm.id');
                        }
                    )
                    ->join('support_tickets as t', 't.id', '=', 'sm.ticket_id')
                    ->where('t.status', 'open')
                    ->whereColumn('sm.sender_user_id', 't.dealer_user_id')
                    ->exists()
                : false,
            'notifications' => fn() => $request->user()
                ? $request->user()->notifications()
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(function ($n) {
                        $data = $n->data ?? [];
                        return [
                            'id' => $n->id,
                            'type' => $data['type'] ?? $n->type,
                            'title' => $data['title'] ?? null,
                            'message' => $data['message'] ?? null,
                            'ticket_id' => $data['ticket_id'] ?? null,
                            'ticket_status' => $data['ticket_status'] ?? null,
                            'ticket_closed_at' => $data['ticket_closed_at'] ?? null,
                            'inventory_name' => $data['inventory_name'] ?? null,
                            'location_name' => $data['location_name'] ?? null,
                            'available' => $data['available'] ?? null,
                            'min_stock' => $data['min_stock'] ?? null,
                            'unit' => $data['unit'] ?? null,
                            'read_at' => $n->read_at,
                            'created_at' => $n->created_at,
                        ];
                    })
                : [],
            'notificationsUnreadCount' => fn() => $request->user()
                ? (int) $request->user()->unreadNotifications()->count()
                : 0,
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
            ],
            'telegramSupportUrl' => config('services.telegram.support_url'),
            'telegramEmbedUrl' => config('services.telegram.embed_url'),
            'ziggy' => fn() => array_merge((new \Tightenco\Ziggy\Ziggy)->toArray(), [
                'location' => $request->url(),
            ]),
        ]);
    }

}


