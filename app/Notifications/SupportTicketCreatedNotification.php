<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class SupportTicketCreatedNotification extends Notification implements ShouldBroadcast
{
    use Queueable;

    public function __construct(public SupportTicket $ticket)
    {
    }

    public function via($notifiable)
    {
        return ['database', 'broadcast'];
    }

    public function toArray($notifiable)
    {
        $dealerName = $this->ticket->dealer?->name ?? 'Dealer';
        $subject = $this->ticket->subject ?? 'Nuevo ticket';
        return [
            'type' => 'support_ticket_new',
            'title' => 'Nuevo ticket de soporte',
            'message' => $dealerName . ': ' . $subject,
            'ticket_id' => $this->ticket->id,
            'ticket_status' => $this->ticket->status,
            'ticket_closed_at' => $this->ticket->closed_at,
            'dealer_name' => $dealerName,
            'subject' => $subject,
        ];
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
