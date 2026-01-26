<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Notifications\DealerNoticeNotification;
use Spatie\Permission\Models\Role;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(403);
        }

        $user->unreadNotifications->markAsRead();

        $filter = $request->input('filter', 'all');

        $notificationsQuery = $user->notifications()->latest();
        if ($filter === 'tickets') {
            $notificationsQuery->where('data->type', 'support_ticket_new');
        } elseif ($filter === 'admin_requests') {
            $notificationsQuery->where('data->type', 'admin_request');
        }

        $notifications = $notificationsQuery
            ->paginate(15)
            ->withQueryString()
            ->through(function ($n) {
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
            });

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'isAdmin' => $request->user()->hasRole('admin'),
            'filters' => [
                'filter' => $filter,
            ],
        ]);
    }

    public function storeDealerNotice(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->hasRole('admin')) {
            abort(403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $roleNames = Role::whereIn('name', ['dealer'])->pluck('name');
        $dealers = $roleNames->isEmpty()
            ? collect()
            : User::role($roleNames)->get();

        foreach ($dealers as $dealer) {
            $dealer->notify(new DealerNoticeNotification($data['title'], $data['message']));
        }

        return back()->with('success', 'Notificación enviada a dealers.');
    }
}
