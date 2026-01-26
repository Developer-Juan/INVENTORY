<?php

namespace App\Http\Controllers;

use App\Events\SupportMessageCreated;
use App\Events\SupportTicketClosed;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\SupportTicketCreatedNotification;
use App\Notifications\SupportMessageReplyNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class SupportController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $roles = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');
        $isDealer = $roles->contains('dealer');

        $ticketId = $request->query('ticket_id');

        $ticketsQuery = SupportTicket::query()
            ->with('dealer:id,name')
            ->when(!$isAdmin, fn($q) => $q->where('dealer_user_id', $user->id))
            ->orderByDesc('last_message_at')
            ->orderByDesc('id');

        $tickets = $ticketsQuery->get();
        $ticketIds = $tickets->pluck('id')->values();
        $lastByTicket = collect();
        $lastMessages = collect();
        $reads = collect();
        if ($ticketIds->isNotEmpty()) {
            $lastByTicket = DB::table('support_messages')
                ->selectRaw('ticket_id, MAX(id) as last_id')
                ->whereIn('ticket_id', $ticketIds)
                ->groupBy('ticket_id')
                ->get()
                ->keyBy('ticket_id');

            $lastIds = $lastByTicket->pluck('last_id')->filter()->values();
            if ($lastIds->isNotEmpty()) {
                $lastMessages = DB::table('support_messages')
                    ->whereIn('id', $lastIds)
                    ->get()
                    ->keyBy('ticket_id');
            }

            $reads = DB::table('support_ticket_reads')
                ->whereIn('ticket_id', $ticketIds)
                ->where('user_id', $user->id)
                ->get()
                ->keyBy('ticket_id');
        }

        $selected = null;
        if ($ticketId) {
            $selected = SupportTicket::query()
                ->with(['dealer:id,name', 'messages.sender:id,name'])
                ->when(!$isAdmin, fn($q) => $q->where('dealer_user_id', $user->id))
                ->where('id', (int) $ticketId)
                ->first();
        }
        if (!$selected && $tickets->count() > 0) {
            $selected = SupportTicket::query()
                ->with(['dealer:id,name', 'messages.sender:id,name'])
                ->where('id', $tickets->first()->id)
                ->first();
        }
        // Marcar como leído el ticket seleccionado (admin o dealer)
        if ($selected && $lastByTicket->has($selected->id)) {
            $lastId = (int) $lastByTicket->get($selected->id)->last_id;
            if ($lastId > 0) {
                $now = now();
                DB::table('support_ticket_reads')->upsert(
                    [[
                        'ticket_id' => (int) $selected->id,
                        'user_id' => (int) $user->id,
                        'last_read_message_id' => $lastId,
                        'read_at' => $now,
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]],
                    ['ticket_id', 'user_id'],
                    ['last_read_message_id', 'read_at', 'updated_at']
                );
                $reads->put($selected->id, (object) ['last_read_message_id' => $lastId]);
            }
        }

        $tickets = $tickets->map(function ($t) use ($lastByTicket, $lastMessages, $reads, $user) {
            $lastId = (int) optional($lastByTicket->get($t->id))->last_id;
            $lastMsg = $lastMessages->get($t->id);
            $lastSenderId = (int) ($lastMsg->sender_user_id ?? 0);
            $lastReadId = (int) optional($reads->get($t->id))->last_read_message_id;
            $unread = $lastId > 0 && ($lastReadId <= 0 || $lastId > $lastReadId) && $lastSenderId !== (int) $user->id;
            $t->unread = $unread;
            return $t;
        });

        return Inertia::render('Support/Index', [
            'tickets' => $tickets,
            'selectedTicket' => $selected,
            'isAdmin' => $isAdmin,
        ]);
    }

    public function storeTicket(Request $request)
    {
        $user = auth()->user();
        $roles = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $isDealer = $roles->contains('dealer');
        if (!$isDealer) {
            abort(403);
        }

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:191'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $ticket = null;
        $message = null;
        DB::transaction(function () use ($user, $data, &$ticket, &$message) {
            $ticket = SupportTicket::create([
                'dealer_user_id' => $user->id,
                'subject' => $data['subject'],
                'status' => 'open',
                'last_message_at' => now(),
            ]);

            $message = SupportMessage::create([
                'ticket_id' => $ticket->id,
                'sender_user_id' => $user->id,
                'body' => $data['message'],
            ]);
        });

        $message->load('sender:id,name');
        $ticket->load('dealer:id,name');
        $roleNames = Role::whereIn('name', ['admin', 'super-admin'])->pluck('name');
        $adminIds = $roleNames->isEmpty() ? collect() : User::role($roleNames)->pluck('id');
        foreach ($adminIds as $adminId) {
            event(new SupportMessageCreated($ticket, $message, (int) $adminId));
        }

        $admins = $roleNames->isEmpty() ? collect() : User::role($roleNames)->get();
        foreach ($admins as $admin) {
            $admin->notify(new SupportTicketCreatedNotification($ticket));
        }

        return redirect()->route('support.index', ['ticket_id' => $ticket->id])
            ->with('success', 'Ticket creado.');
    }

    public function storeMessage(Request $request, SupportTicket $ticket)
    {
        $user = auth()->user();
        $roles = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');

        if (!$isAdmin && (int) $ticket->dealer_user_id !== (int) $user->id) {
            abort(403);
        }

        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $newTicketId = null;
        $message = null;
        $targetTicket = $ticket;
        DB::transaction(function () use ($ticket, $user, $data, $isAdmin, &$newTicketId, &$message, &$targetTicket) {
            $targetTicket = $ticket;

            if (!$isAdmin && $ticket->status === 'closed') {
                $targetTicket = SupportTicket::create([
                    'dealer_user_id' => $ticket->dealer_user_id,
                    'subject' => $ticket->subject . ' (nuevo)',
                    'status' => 'open',
                    'last_message_at' => now(),
                ]);
                $newTicketId = $targetTicket->id;
            }

            $message = SupportMessage::create([
                'ticket_id' => $targetTicket->id,
                'sender_user_id' => $user->id,
                'body' => $data['message'],
            ]);

            $targetTicket->update([
                'last_message_at' => now(),
            ]);
        });

        $message->load('sender:id,name');
        $targetTicket->load('dealer:id,name');
        if ($isAdmin) {
            event(new SupportMessageCreated($targetTicket, $message, (int) $targetTicket->dealer_user_id));
            $dealerUser = User::find($targetTicket->dealer_user_id);
            if ($dealerUser) {
                $dealerUser->notify(new SupportMessageReplyNotification($targetTicket, $message));
            }
        } else {
            $roleNames = Role::whereIn('name', ['admin', 'super-admin'])->pluck('name');
            $adminIds = $roleNames->isEmpty() ? collect() : User::role($roleNames)->pluck('id');
            foreach ($adminIds as $adminId) {
                event(new SupportMessageCreated($targetTicket, $message, (int) $adminId));
            }
            $admins = $roleNames->isEmpty() ? collect() : User::role($roleNames)->get();
            foreach ($admins as $admin) {
                $admin->notify(new SupportMessageReplyNotification($targetTicket, $message));
            }
        }

        return redirect()->route('support.index', ['ticket_id' => $newTicketId ?: $ticket->id]);
    }

    public function closeTicket(SupportTicket $ticket)
    {
        $user = auth()->user();
        $roles = method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');

        if (!$isAdmin) {
            abort(403);
        }

        DB::transaction(function () use ($ticket, $user) {
            $ticket->update([
                'status' => 'closed',
                'closed_at' => now(),
                'last_message_at' => now(),
            ]);
        });

        $roleNames = Role::whereIn('name', ['admin', 'super-admin'])->pluck('name');
        $adminIds = $roleNames->isEmpty() ? collect() : User::role($roleNames)->pluck('id');
        foreach ($adminIds as $adminId) {
            event(new SupportTicketClosed($ticket, (int) $adminId));
        }
        if ($adminIds->isNotEmpty()) {
            $notifications = DB::table('notifications')
                ->whereIn('notifiable_id', $adminIds->all())
                ->where('notifiable_type', User::class)
                ->where('data->type', 'support_ticket_new')
                ->where('data->ticket_id', $ticket->id)
                ->get();

            foreach ($notifications as $notification) {
                $data = json_decode($notification->data ?? '{}', true) ?: [];
                $data['ticket_status'] = 'closed';
                $data['ticket_closed_at'] = now()->toISOString();
                DB::table('notifications')
                    ->where('id', $notification->id)
                    ->update(['data' => json_encode($data)]);
            }
        }

        return back()->with('success', 'Ticket cerrado.');
    }
}

