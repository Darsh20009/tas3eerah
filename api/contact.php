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

DB::insertDoc('contact_messages', [
    'name'    => $name,
    'email'   => $email,
    'message' => $message,
    'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
    'is_read' => 0,
]);

Response::ok([], 'تم إرسال رسالتك — سنرد خلال يوم عمل واحد');
