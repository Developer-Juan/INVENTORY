<?php

namespace App\Notifications;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SupportMessageReplyNotification extends Notification
{
    use Queueable;

    public function __construct(public SupportTicket $ticket, public SupportMessage $message)
    {
    }

    public function via($notifiable)
    {
        $channels = ['database'];
        if (config('notifications.mail_enabled') && ($notifiable->mail_notifications_enabled ?? true)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toArray($notifiable)
    {
        $senderName = $this->message->sender?->name ?? 'Usuario';
        return [
            'type' => 'support_ticket_reply',
            'title' => 'Nuevo mensaje en ticket',
            'message' => $senderName . ': ' . ($this->message->body ?? ''),
            'ticket_id' => $this->ticket->id,
            'ticket_status' => $this->ticket->status,
            'ticket_closed_at' => $this->ticket->closed_at,
        ];
    }

    public function toMail($notifiable)
    {
        $senderName = $this->message->sender?->name ?? 'Usuario';
        $subject = $this->ticket->subject ?? 'Ticket';

        return (new MailMessage)
            ->subject('Nuevo mensaje en ticket #' . $this->ticket->id)
            ->greeting('Hola ' . ($notifiable->name ?? ''))
            ->line('Asunto: ' . $subject)
            ->line('De: ' . $senderName)
            ->line('Mensaje: ' . ($this->message->body ?? ''))
            ->action('Ver ticket', route('support.index', ['ticket_id' => $this->ticket->id]));
    }
}
