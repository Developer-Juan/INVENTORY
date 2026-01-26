<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class NewAdminRequestNotification extends Notification
{
    use Queueable;

    protected string $name;
    protected string $email;
    protected string $status;

    public function __construct(string $name, string $email, string $status)
    {
        $this->name = $name;
        $this->email = $email;
        $this->status = $status;
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
        $statusLabel = $this->status === 'pending_demo' ? 'Demo pendiente' : 'Registro pendiente';

        return [
            'type' => 'admin_request',
            'title' => 'Nueva solicitud de acceso',
            'message' => "{$this->name} ({$this->email}) - {$statusLabel}",
            'status' => $this->status,
        ];
    }

    public function toMail($notifiable)
    {
        $statusLabel = $this->status === 'pending_demo' ? 'Demo pendiente' : 'Registro pendiente';

        return (new MailMessage)
            ->subject('Nueva solicitud de acceso')
            ->greeting('Hola ' . ($notifiable->name ?? ''))
            ->line("Nombre: {$this->name}")
            ->line("Email: {$this->email}")
            ->line("Estado: {$statusLabel}")
            ->action('Ver notificaciones', route('notifications.index'));
    }
}
