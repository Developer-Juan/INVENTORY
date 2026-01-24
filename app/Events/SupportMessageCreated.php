<?php

namespace App\Events;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportMessageCreated implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public SupportTicket $ticket,
        public SupportMessage $message,
        public int $recipientId
    ) {
    }

    public function broadcastOn()
    {
        return new PrivateChannel('support.user.' . $this->recipientId);
    }

    public function broadcastAs()
    {
        return 'support.message.created';
    }

    public function broadcastWith()
    {
        return [
            'ticket_id' => $this->ticket->id,
            'message' => [
                'id' => $this->message->id,
                'body' => $this->message->body,
                'created_at' => optional($this->message->created_at)->toISOString(),
                'sender_user_id' => $this->message->sender_user_id,
                'sender_name' => $this->message->sender?->name,
            ],
            'ticket' => [
                'id' => $this->ticket->id,
                'status' => $this->ticket->status,
                'closed_at' => optional($this->ticket->closed_at)->toISOString(),
                'last_message_at' => optional($this->ticket->last_message_at)->toISOString(),
                'subject' => $this->ticket->subject,
                'dealer_name' => $this->ticket->dealer?->name,
            ],
        ];
    }
}
