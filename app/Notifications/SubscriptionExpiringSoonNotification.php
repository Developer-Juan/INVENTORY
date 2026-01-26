<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class SubscriptionExpiringSoonNotification extends Notification
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
        $endsAt = optional($this->subscription->ends_at)->format('Y-m-d');

        return (new MailMessage)
            ->subject('Tu suscripcion esta por vencer')
            ->greeting('Hola ' . ($notifiable->name ?? ''))
            ->line('Tu suscripcion esta proxima a vencer.')
            ->line('Plan: ' . ($plan->name ?? ''))
            ->line('Fecha de vencimiento: ' . ($endsAt ?? ''))
            ->line('Si deseas continuar, comunicate con nuestro equipo para renovar.');
    }
}

