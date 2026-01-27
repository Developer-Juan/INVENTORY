<?php

namespace App\Http\Controllers;

use App\Events\SupportMessageCreated;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\SupportTicketCreatedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class TelegramWebhookController extends Controller
{

    public function handle(Request $request, string $secret)
    {
        // Seguridad webhook (ruta secreta + header opcional)
        $configSecret = (string) config('services.telegram.webhook_secret');
        if ($configSecret !== '' && !hash_equals($configSecret, $secret)) {
            return response()->json(['ok' => false, 'error' => 'Invalid secret'], 403);
        }

        $headerSecret = (string) $request->header('X-Telegram-Bot-Api-Secret-Token', '');
        if ($configSecret !== '' && $headerSecret !== '' && !hash_equals($configSecret, $headerSecret)) {
            return response()->json(['ok' => false, 'error' => 'Invalid header secret'], 403);
        }

        $token = (string) config('services.telegram.bot_token');
        if ($token === '') {
            Log::warning('Telegram webhook called without bot token configured.');
            return response()->json(['ok' => true]);
        }

        $update = $request->all();

        // 1) Inline callbacks
        $callback = $update['callback_query'] ?? null;
        if (is_array($callback)) {
            $this->handleCallback($token, $callback);
            return response()->json(['ok' => true]);
        }

        // 2) Mensaje normal
        $message = $update['message'] ?? null;
        if (!is_array($message)) {
            return response()->json(['ok' => true]);
        }

        $chatId = $message['chat']['id'] ?? null;
        $text = (string) ($message['text'] ?? '');

        if (!$chatId)
            return response()->json(['ok' => true]);

        $normalized = mb_strtolower(trim($text));

        if ($this->flowExpired($chatId)) {
            $this->clearFlow($chatId);
            $closed = $this->getReply('chat_closed');
            if (!empty($closed['text'])) {
                $this->sendMessage($token, $chatId, $closed['text'], $closed['reply_markup'] ?? null);
            }
            $start = $this->getReply('start');
            $this->sendMessage($token, $chatId, $start['text'], $start['reply_markup']);
            $this->touchLastActive($chatId);
            return response()->json(['ok' => true]);
        }
        $this->touchLastActive($chatId);

        // /start = reset real
        if ($normalized === '/start') {
            $this->clearFlow($chatId);
            $reply = $this->getReply('start');
            $this->sendMessage($token, $chatId, $reply['text'], $reply['reply_markup']);
            return response()->json(['ok' => true]);
        }

        // Si estÃ¡ en flujo humano, consume pasos
        if ($this->hasFlow($chatId)) {
            $this->handleFlowMessage($token, $chatId, $text);
            return response()->json(['ok' => true]);
        }

        // Texto libre sin callback: lo resolvemos a intent (por si escriben "ayuda", "estado", etc.)
        $intent = $this->resolveIntentFromText($normalized);
        $reply = $this->getReply($intent);

        // Si intent tiene action, ejecÃºtala
        if (!empty($reply['action'])) {
            $this->runAction($reply['action'], $token, $chatId, null, $reply);
            return response()->json(['ok' => true]);
        }

        $this->sendMessage($token, $chatId, $reply['text'], $reply['reply_markup']);

        return response()->json(['ok' => true]);
    }

    /* =========================================================
     | INTENTS + DICCIONARIO (config/telegram_bot.php)
     ========================================================= */
    private function resolveIntentFromText(string $normalized): string
    {
        // Si el usuario escribe en lugar de pulsar botones
        return match (true) {
            $normalized === '' => 'start',
            $normalized === '/help' || $normalized === 'ayuda' => 'ayuda',
            $normalized === 'soporte' => 'soporte',
            $normalized === 'estado' => 'estado',
            $normalized === 'agente' => 'agente',
            default => 'default',
        };
    }

    private function getReply(string $intent): array
    {
        $cfg = (array) config('telegram_bot', []);
        $replies = (array) ($cfg['replies'] ?? []);
        $node = (array) ($replies[$intent] ?? ($replies['default'] ?? []));

        $text = (string) ($node['text'] ?? '');
        $markupKey = $node['markup'] ?? null;

        $replyMarkup = null;
        if ($markupKey) {
            $markups = (array) ($cfg['markups'] ?? []);
            $replyMarkup = $markups[$markupKey] ?? null;
        }

        return [
            'text' => $text,
            'reply_markup' => $replyMarkup,
            'action' => $node['action'] ?? null,
        ];
    }

    private function runAction(string $action, string $token, $chatId, $messageId = null, array $reply = []): void
    {
        if ($action === 'start_human_flow') {
            $this->startHumanFlow($chatId);

            // Si viene de callback, edita; si viene de texto, envÃ­a
            if ($messageId) {
                $this->editMessage($token, $chatId, $messageId, $reply['text'] ?? 'OK', $reply['reply_markup'] ?? null);
            } else {
                $this->sendMessage($token, $chatId, $reply['text'] ?? 'OK', $reply['reply_markup'] ?? null);
            }

            $prompt = $this->getReply('email_request');
            $this->sendMessage($token, $chatId, $prompt['text'] ?? 'Correo:', $prompt['reply_markup'] ?? null);
        }

        if ($action === 'start_status_flow') {
            $this->startStatusFlow($chatId);
            if ($messageId) {
                $this->editMessage($token, $chatId, $messageId, $reply['text'] ?? 'OK', $reply['reply_markup'] ?? null);
            } else {
                $this->sendMessage($token, $chatId, $reply['text'] ?? 'OK', $reply['reply_markup'] ?? null);
            }
            $prompt = $this->getReply('status_request');
            $this->sendMessage($token, $chatId, $prompt['text'] ?? 'Escribe numero de ticket o correo:', $prompt['reply_markup'] ?? null);
        }
    }

    /* =========================================================
     | CALLBACKS (inline_keyboard)
     ========================================================= */
    private function handleCallback(string $token, array $callback): void
    {
        $callbackId = $callback['id'] ?? null;
        $data = (string) ($callback['data'] ?? '');
        $message = $callback['message'] ?? [];

        $chatId = $message['chat']['id'] ?? null;
        $messageId = $message['message_id'] ?? null;

        if ($callbackId) {
            $this->answerCallback($token, (string) $callbackId);
        }

        if (!$chatId || !$messageId)
            return;

        $intent = $data !== '' ? $data : 'default';
        $reply = $this->getReply($intent);

        // Action definida en diccionario
        if (!empty($reply['action'])) {
            $this->runAction($reply['action'], $token, $chatId, $messageId, $reply);
            return;
        }

        $this->editMessage($token, $chatId, $messageId, $reply['text'], $reply['reply_markup']);
    }

    /* =========================================================
     | FLOW HUMANO
     ========================================================= */
    private function flowKey($chatId): string
    {
        return "telegram:flow:{$chatId}";
    }

    private function startHumanFlow($chatId): void
    {
        Cache::put($this->flowKey($chatId), [
            'type' => 'human',
            'step' => 'email',
            'data' => [],
        ], now()->addMinutes($this->flowTtlMinutes()));
    }

    private function startStatusFlow($chatId): void
    {
        Cache::put($this->flowKey($chatId), [
            'type' => 'status',
            'step' => 'email',
            'data' => [],
        ], now()->addMinutes($this->flowTtlMinutes()));
    }

    private function hasFlow($chatId): bool
    {
        return Cache::has($this->flowKey($chatId));
    }

    private function clearFlow($chatId): void
    {
        Cache::forget($this->flowKey($chatId));
    }

    private function handleFlowMessage(string $token, $chatId, string $text): void
    {
        $flow = Cache::get($this->flowKey($chatId), []);
        $type = (string) ($flow['type'] ?? 'human');
        $step = (string) ($flow['step'] ?? 'email');
        $data = (array) ($flow['data'] ?? []);
        $value = trim($text);

        if ($value === '') {
            $invalid = $this->getReply('email_invalid');
            $this->sendMessage($token, $chatId, $invalid['text'] ?? 'Correo invalido. Intenta de nuevo:');
            return;
        }

        if ($type === 'status') {
            $this->handleStatusQuery($token, $chatId, $value);
            return;
        }

        switch ($step) {
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $invalid = $this->getReply('email_invalid');
                    $this->sendMessage($token, $chatId, $invalid['text'] ?? 'Correo invalido. Intenta de nuevo:');
                    return;
                }
                $matchedUser = User::where('email', $value)->first();
                if (!$matchedUser) {
                    $notFound = $this->getReply('email_not_found');
                    $this->sendMessage($token, $chatId, $notFound['text'] ?? 'No encontramos ese correo en nuestra base de datos.');
                    $reply = $this->getReply('start');
                    $this->sendMessage($token, $chatId, $reply['text'], $reply['reply_markup']);
                    $this->clearFlow($chatId);
                    return;
                }

                $roleNames = method_exists($matchedUser, 'getRoleNames') ? $matchedUser->getRoleNames()->all() : [];
                $creatorAdmin = null;
                if (in_array('dealer', $roleNames, true) && !empty($matchedUser->created_by)) {
                    $creatorAdmin = User::find($matchedUser->created_by);
                }
                $isAdminRole = in_array('admin', $roleNames, true);
                $adminTarget = $isAdminRole
                    ? User::role('super-admin')->first()
                    : $creatorAdmin;

                if (!$adminTarget) {
                    $this->sendMessage($token, $chatId, 'No hay un admin asociado para atender el chat.');
                    $this->clearFlow($chatId);
                    return;
                }

                $data['email'] = $value;
                $data['user_id'] = $matchedUser->id;
                $data['admin_target_id'] = $adminTarget->id;
                $data['name'] = $matchedUser->name ?? '';
                $data['is_admin_role'] = $isAdminRole ? '1' : '0';

                $welcome = $this->getReply('email_welcome');
        $welcomeText = $this->renderTemplate($welcome['text'] ?? '', [
            'name' => mb_strtoupper((string) ($matchedUser->name ?? ''), 'UTF-8'),
            'email' => (string) ($matchedUser->email ?? ''),
        ]);
                if ($welcomeText !== '') {
                    $this->sendMessage($token, $chatId, $welcomeText, $welcome['reply_markup'] ?? null);
                }

                $prompt = $this->getReply('subject_request');
                $this->sendMessage($token, $chatId, $prompt['text'] ?? 'Asunto:');

        Cache::put($this->flowKey($chatId), [
            'type' => 'human',
            'step' => 'subject',
            'data' => $data,
        ], now()->addMinutes($this->flowTtlMinutes()));
                return;

            case 'subject':
                $data['subject'] = $value;
                $prompt = $this->getReply('description_request');
                $this->sendMessage($token, $chatId, $prompt['text'] ?? 'Descripcion del asunto:');
        Cache::put($this->flowKey($chatId), [
            'type' => 'human',
            'step' => 'description',
            'data' => $data,
        ], now()->addMinutes($this->flowTtlMinutes()));
                return;

            case 'description':
                $data['description'] = $value;
                $this->clearFlow($chatId);
                $this->createHumanTicket($token, $chatId, $data);
                return;

            default:
                $this->startHumanFlow($chatId);
                $prompt = $this->getReply('email_request');
                $this->sendMessage($token, $chatId, $prompt['text'] ?? 'Correo:');
                return;
        }
    }

    /* =========================================================
     | TICKETS
     ========================================================= */
    private function createHumanTicket(string $token, $chatId, array $data): void
    {
        $userId = (int) ($data['user_id'] ?? 0);
        $adminTargetId = (int) ($data['admin_target_id'] ?? 0);
        $subject = (string) ($data['subject'] ?? 'Soporte');
        $description = (string) ($data['description'] ?? '');

        $matchedUser = $userId ? User::find($userId) : null;
        $adminTarget = $adminTargetId ? User::find($adminTargetId) : null;

        if (!$matchedUser || !$adminTarget) {
            $this->sendMessage($token, $chatId, 'No fue posible crear el ticket. Intenta nuevamente.');
            $reply = $this->getReply('start');
            $this->sendMessage($token, $chatId, $reply['text'], $reply['reply_markup']);
            return;
        }

        $subject = Str::limit($subject, 191, '');

        $ticket = SupportTicket::create([
            'dealer_user_id' => $matchedUser->id,
            'subject' => $subject,
            'status' => 'open',
            'last_message_at' => now(),
        ]);

        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_user_id' => $matchedUser->id,
            'body' => $description !== '' ? $description : 'Sin descripcion.',
        ]);

        $message->load('sender:id,name');
        $ticket->load('dealer:id,name');
        $isAdminRole = ($data['is_admin_role'] ?? '0') === '1';

        if ($isAdminRole) {
            $superAdmins = User::role('super-admin')->get();
            foreach ($superAdmins as $superAdmin) {
                event(new SupportMessageCreated($ticket, $message, (int) $superAdmin->id));
                $superAdmin->notify(new SupportTicketCreatedNotification($ticket));
            }
        } else {
            event(new SupportMessageCreated($ticket, $message, (int) $adminTarget->id));
            $adminTarget->notify(new SupportTicketCreatedNotification($ticket));
        }

        $this->sendMessage($token, $chatId, $description !== '' ? $description : 'Descripcion recibida.');

        $reply = $this->getReply('ticket_created');
        $adminInfo = trim($adminTarget->name . ' (' . $adminTarget->email . ')');
        $ticketText = $this->renderTemplate($reply['text'] ?? '', [
            'ticket_id' => (string) $ticket->id,
            'admin_name' => $adminTarget->name ?? '',
            'admin_email' => $adminTarget->email ?? '',
            'admin_info' => $adminInfo,
        ]);
        $this->sendMessage(
            $token,
            $chatId,
            $ticketText !== '' ? $ticketText : "Listo ✅ Ticket #{$ticket->id}\nContacto: {$adminInfo}",
            $reply['reply_markup'] ?? null
        );
    }

    private function handleStatusQuery(string $token, $chatId, string $value): void
    {
        $value = trim($value);
        if ($value === '') {
            $this->sendMessage($token, $chatId, 'No puede ir vacio. Intenta de nuevo:');
            $this->startStatusFlow($chatId);
            return;
        }

        $flow = Cache::get($this->flowKey($chatId), []);
        $data = (array) ($flow['data'] ?? []);
        $step = (string) ($flow['step'] ?? 'email');

        if ($step === 'email' && ctype_digit($value)) {
            $data['pending_ticket_id'] = $value;
            Cache::put($this->flowKey($chatId), [
                'type' => 'status',
                'step' => 'email',
                'data' => $data,
            ], now()->addMinutes($this->flowTtlMinutes()));
            $prompt = $this->getReply('status_email_request');
            $this->sendMessage($token, $chatId, $prompt['text'] ?? 'Escribe tu correo para validar el ticket:');
            return;
        }

        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $invalid = $this->getReply('email_invalid');
            $this->sendMessage($token, $chatId, $invalid['text'] ?? 'Correo invalido. Intenta de nuevo:');
            return;
        }

        $user = User::where('email', $value)->first();
        if (!$user) {
            $notFound = $this->getReply('email_not_found');
            $this->sendMessage($token, $chatId, $notFound['text'] ?? 'No encontramos ese correo en nuestra base de datos.');
            $this->clearFlow($chatId);
            return;
        }

        $pendingId = $data['pending_ticket_id'] ?? null;
        if ($pendingId) {
            $ticket = SupportTicket::find((int) $pendingId);
            $this->clearFlow($chatId);
            if (!$ticket || (int) $ticket->dealer_user_id !== (int) $user->id) {
                $notFound = $this->getReply('status_not_found');
                $this->sendMessage($token, $chatId, $notFound['text'] ?? 'No encontramos ese ticket para tu correo.');
                return;
            }
            $this->sendTicketStatus($token, $chatId, $ticket);
            return;
        }

        $ticket = SupportTicket::where('dealer_user_id', $user->id)
            ->where('status', 'open')
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->first();

        $this->clearFlow($chatId);
        if (!$ticket) {
            $notFound = $this->getReply('status_not_found');
            $this->sendMessage($token, $chatId, $notFound['text'] ?? 'No encontramos tickets abiertos para ese correo.');
            return;
        }

        $this->sendTicketStatus($token, $chatId, $ticket);
    }

    private function sendTicketStatus(string $token, $chatId, SupportTicket $ticket): void
    {
        $reply = $this->getReply('status_found');
        $statusText = $this->renderTemplate($reply['text'] ?? '', [
            'ticket_id' => (string) $ticket->id,
            'status' => (string) $ticket->status,
            'subject' => (string) $ticket->subject,
            'last_message_at' => (string) ($ticket->last_message_at ?? ''),
        ]);
        $this->sendMessage(
            $token,
            $chatId,
            $statusText !== '' ? $statusText : "Ticket #{$ticket->id}\nEstado: {$ticket->status}",
            $this->buildTicketLinkMarkup($ticket->id, $reply['reply_markup'] ?? null)
        );
    }

    private function buildTicketLinkMarkup(int $ticketId, ?array $fallback): ?array
    {
        $url = route('support.index', ['ticket_id' => $ticketId]);
        return [
            'inline_keyboard' => [
                [
                    ['text' => 'Abrir ticket', 'url' => $url],
                ],
                [
                    ['text' => 'Menu', 'callback_data' => 'start'],
                ],
            ],
        ] ?: $fallback;
    }

    private function flowTtlMinutes(): int
    {
        $ttl = (int) env('TELEGRAM_FLOW_TTL_MINUTES', 30);
        return $ttl > 0 ? $ttl : 30;
    }

    private function lastActiveKey($chatId): string
    {
        return "telegram:last_active:{$chatId}";
    }

    private function touchLastActive($chatId): void
    {
        Cache::put($this->lastActiveKey($chatId), now()->timestamp, now()->addMinutes($this->flowTtlMinutes()));
    }

    private function flowExpired($chatId): bool
    {
        $last = Cache::get($this->lastActiveKey($chatId));
        if (!$last) {
            return false;
        }
        return now()->timestamp - (int) $last >= ($this->flowTtlMinutes() * 60);
    }

    private function sendTicketsList(string $token, $chatId, $tickets): void
    {
        $lines = ["Tickets encontrados (abiertos primero):"];
        foreach ($tickets as $ticket) {
            $lines[] = sprintf(
                "#%d | %s | %s",
                $ticket->id,
                $ticket->status,
                Str::limit($ticket->subject ?? '', 60)
            );
        }
        $text = implode("\n", $lines);
        $reply = $this->getReply('status_list');
        if (!empty($reply['text'])) {
            $text = $reply['text'] . "\n" . $text;
        }
        $this->sendMessage($token, $chatId, $text, $reply['reply_markup'] ?? null);
    }

    private function renderTemplate(string $text, array $vars): string
    {
        if ($text === '') {
            return $text;
        }
        foreach ($vars as $key => $value) {
            $safeValue = htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $text = str_replace('{' . $key . '}', $safeValue, $text);
        }
        return $text;
    }

    /* =========================================================
     | TELEGRAM API HELPERS
     ========================================================= */
    private function sendMessage(string $token, $chatId, string $text, ?array $replyMarkup = null): void
    {
        try {
            $payload = [
                'chat_id' => $chatId,
                'text' => $text,
                'disable_web_page_preview' => true,
                'parse_mode' => 'HTML',
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            }

            Http::post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
        } catch (\Throwable $e) {
            Log::error('Telegram sendMessage failed: ' . $e->getMessage());
        }
    }

    private function editMessage(string $token, $chatId, $messageId, string $text, ?array $replyMarkup = null): void
    {
        try {
            $payload = [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => $text,
                'disable_web_page_preview' => true,
                'parse_mode' => 'HTML',
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            }

            Http::post("https://api.telegram.org/bot{$token}/editMessageText", $payload);
        } catch (\Throwable $e) {
            Log::error('Telegram editMessageText failed: ' . $e->getMessage());
        }
    }

    private function answerCallback(string $token, string $callbackId): void
    {
        try {
            Http::post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                'callback_query_id' => $callbackId,
            ]);
        } catch (\Throwable $e) {
            Log::error('Telegram answerCallbackQuery failed: ' . $e->getMessage());
        }
    }
}
