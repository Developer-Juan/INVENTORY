<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

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
        return ['database'];
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
