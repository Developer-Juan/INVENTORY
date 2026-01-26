<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BroadcastMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $body,
        public User $user
    ) {
    }

    public function build()
    {
        $personalized = str_replace(
            ['{{name}}', '{{email}}', '{{status}}'],
            [$this->user->name ?? '', $this->user->email ?? '', $this->user->status ?? ''],
            $this->body
        );

        return $this->subject($this->subjectLine)
            ->view('emails.broadcast')
            ->with([
                'content' => $personalized,
                'user' => $this->user,
            ]);
    }
}
