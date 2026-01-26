<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Notifications\SubscriptionExpiringSoonNotification;
use App\Notifications\SubscriptionExpiredNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessSubscriptions extends Command
{
    protected $signature = 'subscriptions:process';

    protected $description = 'Process subscription expirations and send reminders';

    public function handle(): int
    {
        $now = Carbon::now();
        $reminderAt = $now->copy()->addDays(5)->endOfDay();

        $reminderQuery = Subscription::with(['user', 'plan'])
            ->where('status', 'active')
            ->whereNull('reminder_sent_at')
            ->whereBetween('ends_at', [$now->copy()->startOfDay(), $reminderAt]);

        $reminderCount = 0;
        $reminderQuery->chunkById(200, function ($subscriptions) use (&$reminderCount) {
            foreach ($subscriptions as $subscription) {
                if (!$subscription->user) {
                    continue;
                }
                $subscription->user->notify(new SubscriptionExpiringSoonNotification($subscription));
                $subscription->forceFill(['reminder_sent_at' => now()])->save();
                $reminderCount++;
            }
        });

        $expiredQuery = Subscription::with(['user', 'plan'])
            ->where('status', 'active')
            ->where('ends_at', '<=', $now);

        $expiredCount = 0;
        $expiredQuery->chunkById(200, function ($subscriptions) use (&$expiredCount) {
            foreach ($subscriptions as $subscription) {
                $subscription->forceFill(['status' => 'expired'])->save();

                if ($subscription->user) {
                    $newStatus = $subscription->plan && $subscription->plan->is_demo
                        ? User::STATUS_SUSPENDED
                        : User::STATUS_EXPIRED;
                    $subscription->user->forceFill(['status' => $newStatus])->save();
                    $subscription->user->notify(new SubscriptionExpiredNotification($subscription));
                }
                $expiredCount++;
            }
        });

        Log::info('Subscriptions processed', [
            'reminders' => $reminderCount,
            'expired' => $expiredCount,
        ]);

        $this->info("Reminders: {$reminderCount}, expired: {$expiredCount}");
        return self::SUCCESS;
    }
}

