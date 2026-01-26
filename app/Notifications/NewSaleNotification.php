<?php

namespace App\Notifications;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewSaleNotification extends Notification
{
    use Queueable;

    public function __construct(public Sale $sale)
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
        return [
            'type' => 'new_sale',
            'sale_id' => $this->sale->id,
            'title' => 'Nueva venta registrada',
            'message' => 'Venta #' . $this->sale->id,
        ];
    }

    public function toMail($notifiable)
    {
        $sale = $this->sale;
        $sellerName = $sale->user?->name ?? 'Usuario';
        $customerName = $sale->customerUser?->name ?? ($sale->debtor_name ?? 'Consumidor');
        $total = number_format((float) ($sale->total ?? 0), 2, ',', '.');
        $status = $sale->status ?? 'debe';

        return (new MailMessage)
            ->subject('Nueva venta #' . $sale->id)
            ->greeting('Hola ' . ($notifiable->name ?? ''))
            ->line('Se ha registrado una nueva venta.')
            ->line('Vendedor: ' . $sellerName)
            ->line('Cliente: ' . $customerName)
            ->line('Total: $' . $total)
            ->line('Estado: ' . $status)
            ->action('Ver venta', route('sales.show', $sale));
    }
}
