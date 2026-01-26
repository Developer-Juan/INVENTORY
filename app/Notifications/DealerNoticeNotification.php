<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class DealerNoticeNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $message
    ) {
    }

    public function via($notifiable)
    {
        $channels = ['database'];
        if (config('notifications.mail_enabled') && ($notifiable->mail_notifications_enabled ?? true)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject($this->title)
            ->greeting('Hola ' . ($notifiable->name ?? ''))
            ->line($this->message)
            ->action('Ver notificaciones', route('notifications.index'));
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'dealer_notice',
            'title' => $this->title,
            'message' => $this->message,
        ];
    }
}
