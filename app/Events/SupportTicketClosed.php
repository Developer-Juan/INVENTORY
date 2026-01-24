<?php

namespace App\Events;

use App\Models\SupportTicket;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportTicketClosed implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public SupportTicket $ticket,
        public int $recipientId
    ) {
    }

    public function broadcastOn()
    {
        return new PrivateChannel('support.user.' . $this->recipientId);
    }

    public function broadcastAs()
    {
        return 'support.ticket.closed';
    }

    public function broadcastWith()
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'status' => $this->ticket->status,
                'closed_at' => optional($this->ticket->closed_at)->toISOString(),
            ],
        ];
    }
}
