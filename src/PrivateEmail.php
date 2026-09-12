<?php

/**
 * Private Email SMTP/IMAP adapter.
 *
 * The mailbox password is intentionally read only from Replit Secrets.
 * It is never persisted in the database or returned by an API response.
 */
final class PrivateEmail {
    private const HOST = 'mail.privateemail.com';
    private const SMTP_PORT = 465;
    private const IMAP_PORT = 993;

    public static function address(array $settings = []): string {
        $configured = trim((string)($settings['mailbox_email'] ?? ''));
        return $configured
            ?: (trim((string)(getenv('PRIVATE_EMAIL_ADDRESS') ?: '')) ?: 'info@tas3eerah.com');
    }

    public static function displayName(array $settings = []): string {
        return trim((string)($settings['mailbox_name'] ?? '')) ?: APP_NAME_AR;
    }

    public static function isConfigured(array $settings = []): bool {
        return (bool)self::password() && filter_var(self::address($settings), FILTER_VALIDATE_EMAIL);
    }

    public static function publicConfig(array $settings = []): array {
        return [
            'address' => self::address($settings),
            'name' => self::displayName($settings),
            'host' => self::HOST,
            'smtp_port' => self::SMTP_PORT,
            'imap_port' => self::IMAP_PORT,
            'configured' => self::isConfigured($settings),
        ];
    }

    public static function sendHtml(
        string $to,
        string $subject,
        string $html,
        array $settings = [],
        ?string $replyTo = null,
        array $inlineImages = []
    ): void {
        $to = trim($to);
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('البريد المستلم غير صحيح');
        }
        if (!self::isConfigured($settings)) {
            throw new RuntimeException('لم يتم إعداد كلمة مرور صندوق البريد في Secrets');
        }

        $from = self::address($settings);
        $socket = self::connectSmtp();
        try {
            self::expect($socket, [220]);
            self::command($socket, 'EHLO tas3eerah.com', [250]);
            self::command($socket, 'AUTH LOGIN', [334]);
            self::command($socket, base64_encode($from), [334]);
            self::command($socket, base64_encode(self::password()), [235]);
            self::command($socket, "MAIL FROM:<{$from}>", [250]);
            self::command($socket, "RCPT TO:<{$to}>", [250, 251]);
            self::command($socket, 'DATA', [354]);

            $headers = [
                'Date: ' . date(DATE_RFC2822),
                'From: ' . self::mimeHeader(self::displayName($settings)) . " <{$from}>",
                'To: <' . $to . '>',
                'Subject: ' . self::mimeHeader($subject),
                'Reply-To: ' . ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : $from),
                'MIME-Version: 1.0',
                'X-Mailer: Tas3eerah/1.0',
            ];
            $validImages = array_values(array_filter($inlineImages, static function (array $asset): bool {
                return !empty($asset['path']) && !empty($asset['cid']) && is_readable($asset['path']);
            }));
            if ($validImages) {
                $boundary = '=_tas3eerah_' . bin2hex(random_bytes(8));
                $headers[] = 'Content-Type: multipart/related; boundary="' . $boundary . '"';
                $body = '--' . $boundary . "\r\n";
                $body .= "Content-Type: text/html; charset=UTF-8\r\n";
                $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
                $body .= self::dotStuff($html) . "\r\n";
                foreach ($validImages as $asset) {
                    $content = base64_encode((string)file_get_contents($asset['path']));
                    $body .= '--' . $boundary . "\r\n";
                    $body .= 'Content-Type: ' . ($asset['type'] ?? 'application/octet-stream') . '; name="' . ($asset['name'] ?? 'asset') . '"' . "\r\n";
                    $body .= "Content-Transfer-Encoding: base64\r\n";
                    $body .= 'Content-ID: <' . $asset['cid'] . ">\r\n";
                    $body .= 'Content-Disposition: inline; filename="' . ($asset['name'] ?? 'asset') . '"' . "\r\n\r\n";
                    $body .= chunk_split($content) . "\r\n";
                }
                $body .= '--' . $boundary . '--';
            } else {
                $headers[] = 'Content-Type: text/html; charset=UTF-8';
                $headers[] = 'Content-Transfer-Encoding: 8bit';
                $body = self::dotStuff($html);
            }
            $payload = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";
            fwrite($socket, $payload . "\r\n");
            self::expect($socket, [250]);
            self::command($socket, 'QUIT', [221, 250]);
        } finally {
            fclose($socket);
        }
    }

    public static function inbox(array $settings = [], int $limit = 50): array {
        self::requireImap($settings);
        $imap = self::openImap('INBOX', $settings, false);
        try {
            $uids = imap_search($imap, 'ALL', SE_UID) ?: [];
            rsort($uids, SORT_NUMERIC);
            $messages = [];
            foreach (array_slice($uids, 0, max(1, min($limit, 100))) as $uid) {
                $overview = imap_fetch_overview($imap, (string)$uid, FT_UID)[0] ?? null;
                if (!$overview) continue;
                $structure = imap_fetchstructure($imap, (string)$uid, FT_UID);
                $body = self::messageBody($imap, (int)$uid, $structure);
                $messages[] = [
                    'uid' => (int)$uid,
                    'subject' => self::decodeHeader((string)($overview->subject ?? '(بدون موضوع)')),
                    'from' => self::decodeHeader((string)($overview->from ?? '')),
                    'to' => self::decodeHeader((string)($overview->to ?? self::address($settings))),
                    'date' => (string)($overview->date ?? ''),
                    'seen' => !empty($overview->seen),
                    'body' => $body,
                ];
            }
            return $messages;
        } finally {
            imap_close($imap);
        }
    }

    public static function markRead(int $uid, array $settings = []): void {
        if ($uid < 1) throw new RuntimeException('معرف الرسالة غير صحيح');
        self::requireImap($settings);
        $imap = self::openImap('INBOX', $settings, true);
        try {
            if (!imap_setflag_full($imap, (string)$uid, '\\Seen', ST_UID)) {
                throw new RuntimeException('تعذر تحديث حالة الرسالة');
            }
        } finally {
            imap_close($imap);
        }
    }

    private static function password(): string {
        return (string)(getenv('PRIVATE_EMAIL_PASSWORD') ?: '');
    }

    private static function connectSmtp() {
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ],
        ]);
        $socket = @stream_socket_client(
            'ssl://' . self::HOST . ':' . self::SMTP_PORT,
            $errno,
            $error,
            25,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!$socket) {
            throw new RuntimeException('تعذر الاتصال بخادم SMTP: ' . ($error ?: 'خطأ غير معروف'));
        }
        stream_set_timeout($socket, 25);
        return $socket;
    }

    private static function command($socket, string $command, array $codes): void {
        fwrite($socket, $command . "\r\n");
        self::expect($socket, $codes);
    }

    private static function expect($socket, array $codes): string {
        $response = '';
        while (($line = fgets($socket, 2048)) !== false) {
            $response .= $line;
            if (preg_match('/^(\d{3})\s/', $line, $match)) break;
        }
        $code = (int)substr(trim($response), 0, 3);
        if (!in_array($code, $codes, true)) {
            throw new RuntimeException('رفض خادم البريد الطلب (SMTP ' . ($code ?: 'unknown') . ')');
        }
        return $response;
    }

    private static function openImap(string $folder, array $settings, bool $writable) {
        $flags = '/imap/ssl' . ($writable ? '' : '/readonly');
        $mailbox = '{' . self::HOST . ':' . self::IMAP_PORT . $flags . '}' . $folder;
        $imap = @imap_open($mailbox, self::address($settings), self::password(), 0, 1);
        if (!$imap) {
            $error = imap_last_error() ?: 'تعذر تسجيل الدخول إلى صندوق البريد';
            throw new RuntimeException(self::safeImapError($error));
        }
        return $imap;
    }

    private static function requireImap(array $settings): void {
        if (!function_exists('imap_open')) {
            throw new RuntimeException('امتداد IMAP غير متاح في خادم PHP');
        }
        if (!self::isConfigured($settings)) {
            throw new RuntimeException('لم يتم إعداد كلمة مرور صندوق البريد في Secrets');
        }
    }

    private static function messageBody($imap, int $uid, ?object $structure): string {
        if (!$structure) return '';
        if (empty($structure->parts)) {
            return self::decodeBody((string)imap_body($imap, (string)$uid, FT_UID), (int)($structure->encoding ?? 0));
        }

        $plain = '';
        $html = '';
        self::collectParts($imap, $uid, $structure->parts, '', $plain, $html);
        $body = $plain ?: strip_tags($html);
        return trim(mb_substr($body, 0, 12000));
    }

    private static function collectParts($imap, int $uid, array $parts, string $prefix, string &$plain, string &$html): void {
        foreach ($parts as $index => $part) {
            $section = $prefix === '' ? (string)($index + 1) : $prefix . '.' . ($index + 1);
            if (!empty($part->parts)) {
                self::collectParts($imap, $uid, $part->parts, $section, $plain, $html);
                continue;
            }
            if ((int)($part->type ?? -1) !== 0) continue;
            if (isset($part->disposition) && strtolower((string)$part->disposition) === 'attachment') continue;
            $content = self::decodeBody(
                (string)imap_fetchbody($imap, (string)$uid, $section, FT_UID),
                (int)($part->encoding ?? 0)
            );
            $subtype = strtoupper((string)($part->subtype ?? 'PLAIN'));
            if ($subtype === 'HTML' && !$html) $html = $content;
            if ($subtype !== 'HTML' && !$plain) $plain = $content;
        }
    }

    private static function decodeBody(string $body, int $encoding): string {
        return match ($encoding) {
            3 => (string)base64_decode($body),
            4 => (string)quoted_printable_decode($body),
            default => $body,
        };
    }

    private static function decodeHeader(string $value): string {
        if ($value === '') return '';
        $decoded = @imap_mime_header_decode($value);
        if (!$decoded) return imap_utf8($value);
        $result = '';
        foreach ($decoded as $part) {
            $text = $part->text ?? '';
            $charset = strtoupper((string)($part->charset ?? 'DEFAULT'));
            if ($charset !== 'DEFAULT' && $charset !== 'UTF-8') {
                $converted = @iconv($charset, 'UTF-8//IGNORE', $text);
                if ($converted !== false) $text = $converted;
            }
            $result .= $text;
        }
        return trim($result);
    }

    private static function mimeHeader(string $value): string {
        return function_exists('mb_encode_mimeheader')
            ? mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n")
            : '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    private static function dotStuff(string $body): string {
        $body = str_replace(["\r\n", "\r"], "\n", $body);
        $body = str_replace("\n", "\r\n", $body);
        return preg_replace('/(^|\r\n)\./', '$1..', $body) ?? $body;
    }

    private static function safeImapError(string $error): string {
        $error = preg_replace('/' . preg_quote(self::password(), '/') . '/i', '[hidden]', $error) ?? $error;
        return 'تعذر الاتصال بصندوق البريد: ' . $error;
    }
}