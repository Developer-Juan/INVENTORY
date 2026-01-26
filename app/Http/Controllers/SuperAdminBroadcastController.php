<?php

namespace App\Http\Controllers;

use App\Mail\BroadcastMessageMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class SuperAdminBroadcastController extends Controller
{
    public function index(Request $request)
    {
        $statusFilter = $request->input('status', 'active');
        $search = trim((string) $request->input('search', ''));

        $statusList = ['active_demo', 'active_working'];
        if ($statusFilter === 'demo') {
            $statusList = ['active_demo'];
        } elseif ($statusFilter === 'working') {
            $statusList = ['active_working'];
        }

        $customers = User::role('admin')
            ->whereIn('status', $statusList)
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%')
                        ->orWhere('phone', 'like', '%' . $search . '%');
                });
            })
            ->select('id', 'name', 'email', 'phone', 'status')
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('SuperAdmin/Broadcasts', [
            'customers' => $customers,
            'filters' => [
                'status' => $statusFilter,
                'search' => $search,
            ],
        ]);
    }

    public function send(Request $request)
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:8000'],
            'send_all' => ['required', 'boolean'],
            'user_ids' => ['array'],
            'user_ids.*' => ['integer'],
            'status' => ['nullable', 'string', 'in:active,active_demo,active_working'],
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        if (!$data['send_all'] && empty($data['user_ids'])) {
            return back()->with('error', 'Selecciona al menos un destinatario o activa "Enviar a todos".');
        }

        $statusList = ['active_demo', 'active_working'];
        if (($data['status'] ?? null) === 'active_demo') {
            $statusList = ['active_demo'];
        } elseif (($data['status'] ?? null) === 'active_working') {
            $statusList = ['active_working'];
        }

        $baseQuery = User::role('admin')
            ->whereIn('status', $statusList)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->where('email', 'not like', '%@local');

        $search = trim((string) ($data['search'] ?? ''));
        if ($search !== '') {
            $baseQuery->where(function ($inner) use ($search) {
                $inner->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        if (!$data['send_all'] && !empty($data['user_ids'])) {
            $baseQuery->whereIn('id', $data['user_ids']);
        }

        $subject = $data['subject'];
        $body = $data['body'];

        $total = (clone $baseQuery)->count();
        if ($total === 0) {
            Log::warning('Broadcast email: no recipients found.', [
                'status' => $statusList,
                'send_all' => $data['send_all'],
                'user_ids' => $data['user_ids'] ?? [],
                'search' => $search,
            ]);
            return back()->with('error', 'No hay destinatarios con email para los filtros actuales.');
        }

        $sent = 0;
        $failed = 0;
        Log::info('Broadcast email: sending started.', ['total' => $total]);

        try {
            $baseQuery->orderBy('id')->chunk(200, function ($users) use ($subject, $body, &$sent, &$failed) {
                foreach ($users as $user) {
                    try {
                        Mail::to($user->email)->send(new BroadcastMessageMail($subject, $body, $user));
                        $sent++;
                    } catch (\Throwable $e) {
                        $failed++;
                        Log::error('Broadcast email: failed recipient.', [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
        } catch (\Throwable $e) {
            Log::error('Broadcast email: failed.', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);
            return back()->with('error', 'No se pudo enviar el correo masivo. Revisa la configuracion SMTP.');
        }

        Log::info('Broadcast email: sending finished.', ['sent' => $sent, 'failed' => $failed]);

        if ($failed > 0) {
            return back()->with('error', "Enviados: {$sent}. Fallidos: {$failed}. Revisa el log para ver los emails con error.");
        }

        return back()->with('success', "Correos enviados: {$sent}.");
    }
}
