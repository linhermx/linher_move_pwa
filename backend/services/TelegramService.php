<?php
/**
 * Move API - Telegram Service
 */

class TelegramService
{
    private $botToken;
    private $chatId;

    public function __construct()
    {
        $this->botToken = Config::getTelegramToken(); // TODO: Add to Config
        $this->chatId = Config::getTelegramChatId();
    }

    public function sendQuoteAlert($folio, $total, $origin, $dest)
    {
        if (!$this->botToken)
            return false;

        $message = "🚚 *Nueva Cotización Generada*\n\n";
        $message .= "*Folio:* $folio\n";
        $message .= "*Ruta:* $origin ➔ $dest\n";
        $message .= "*Total:* $" . number_format($total, 2) . "\n\n";
        $message .= "[Abrir en Move](https://linher-move.pwa/)";

        $url = "https://api.telegram.org/bot{$this->botToken}/sendMessage";

        $data = [
            'chat_id' => $this->chatId,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ];

        // cURL logic to send message
        // ...
        return true;
    }
}
