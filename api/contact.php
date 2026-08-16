<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$name    = trim($body['name']    ?? '');
$email   = trim($body['email']   ?? '');
$message = trim($body['message'] ?? '');

if (!$name || !$email || !$message) {
    Response::err('يرجى تعبئة جميع الحقول');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::err('البريد الإلكتروني غير صحيح');
}
if (mb_strlen($message) < 10) {
    Response::err('الرسالة قصيرة جداً — يرجى كتابة ١٠ أحرف على الأقل');
}

// Ensure contact_messages table exists
DB::get()->exec("
    CREATE TABLE IF NOT EXISTS contact_messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        message    TEXT NOT NULL,
        ip         TEXT,
        is_read    INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now'))
    )
");

DB::run(
    "INSERT INTO contact_messages (name, email, message, ip) VALUES (?, ?, ?, ?)",
    [$name, $email, $message, $_SERVER['REMOTE_ADDR'] ?? '']
);

Response::ok([], 'تم إرسال رسالتك — سنرد خلال يوم عمل واحد');
