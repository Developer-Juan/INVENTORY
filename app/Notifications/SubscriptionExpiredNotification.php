<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class SubscriptionExpiredNotification extends Notification
{
    use Queueable;

    public function __construct(public Subscription $subscription)
    {
    }

    public function via($notifiable)
    {
        $channels = [];
        if (config('notifications.mail_enabled') && ($notifiable->mail_notifications_enabled ?? true)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail($notifiable)
    {
        $plan = $this->subscription->plan;
        $endedAt = optional($this->subscription->ends_at)->format('Y-m-d');

        return (new MailMessage)
            ->subject('Tu suscripcion ha finalizado')
            ->greeting('Hola ' . ($notifiable->name ?? ''))
            ->line('Tu suscripcion ha finalizado.')
            ->line('Plan: ' . ($plan->name ?? ''))
            ->line('Fecha de vencimiento: ' . ($endedAt ?? ''))
            ->line('Si deseas reactivar el servicio, comunicate con nuestro equipo.');
    }
}

