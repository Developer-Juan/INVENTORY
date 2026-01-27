<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:webhook
        {url : Public base URL (ex: https://xxxx.trycloudflare.com) or full webhook URL}
        {--secret= : Override TELEGRAM_WEBHOOK_SECRET}
        {--full : Treat url argument as full webhook URL}';

    protected $description = 'Register Telegram webhook for the support bot';

    public function handle(): int
    {
        $token = (string) config('services.telegram.bot_token');
        if ($token === '') {
            $this->error('TELEGRAM_BOT_TOKEN is not configured.');
            return self::FAILURE;
        }

        $secret = (string) ($this->option('secret') ?: config('services.telegram.webhook_secret'));
        if ($secret === '') {
            $this->warn('TELEGRAM_WEBHOOK_SECRET is empty; continuing without secret validation.');
        }

        $inputUrl = (string) $this->argument('url');
        $webhookUrl = $this->option('full')
            ? $inputUrl
            : rtrim($inputUrl, '/') . '/telegram/webhook/' . $secret;

        $payload = [
            'url' => $webhookUrl,
        ];
        if ($secret !== '') {
            $payload['secret_token'] = $secret;
        }

        $response = Http::post("https://api.telegram.org/bot{$token}/setWebhook", $payload);
        if (!$response->successful()) {
            $this->error('Failed to set webhook.');
            $this->line((string) $response->body());
            return self::FAILURE;
        }

        $data = $response->json();
        $ok = isset($data['ok']) ? (bool) $data['ok'] : false;
        if (!$ok) {
            $this->error('Telegram API returned error.');
            $this->line((string) $response->body());
            return self::FAILURE;
        }

        $this->info('Webhook configured.');
        $this->line('URL: ' . $webhookUrl);
        return self::SUCCESS;
    }
}
