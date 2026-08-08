<?php
declare(strict_types=1);

/*
 * Tas3eerah API boundary.
 *
 * This file intentionally never contains credentials. Production integrations
 * are read from environment variables and remain disabled until configured.
 * MongoDB persistence can be enabled when the PHP MongoDB extension and URI
 * are available in the deployment environment.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 1048576) {
        respond(['ok' => false, 'code' => 'REQUEST_TOO_LARGE', 'message' => 'الطلب أكبر من الحد المسموح.'], 413);
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function configured(string $name): bool
{
    $value = getenv($name);
    return is_string($value) && trim($value) !== '';
}

function publicConfig(): array
{
    return [
        'brand' => 'Tas3eerah',
        'presentationUrl' => 'https://presentation.thanarah.com',
        'database' => [
            'configured' => configured('MONGODB_URI'),
            'driver' => class_exists('MongoDB\\Client'),
        ],
        'mail' => [
            'configured' => configured('CPANEL_SMTP_HOST')
                && configured('CPANEL_SMTP_PORT')
                && configured('CPANEL_SMTP_USER')
                && configured('SMTP_PASS'),
        ],
        'ai' => [
            'configured' => configured('MOONSHOT_API_KEY'),
        ],
        'payments' => [
            'configured' => configured('GIDDYA_API_KEY')
                || configured('GIDDYA_SECRET')
                || configured('GIDDYA_MERCHANT_ID'),
        ],
        'whatsapp' => [
            'configured' => configured('WHATSAPP_SESSION_SECRET'),
        ],
    ];
}

$action = (string)($_GET['action'] ?? 'health');

if ($action === 'health') {
    respond(['ok' => true, 'mode' => 'preview-safe', 'config' => publicConfig()]);
}

if ($action === 'me') {
    respond(['ok' => true, 'user' => $_SESSION['user'] ?? null]);
}

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(['ok' => true]);
}

if (in_array($action, ['login', 'register'], true)) {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }
    if (!configured('MONGODB_URI')) {
        respond([
            'ok' => false,
            'code' => 'DATABASE_NOT_CONFIGURED',
            'message' => 'الحسابات الحقيقية تحتاج ضبط MONGODB_URI في بيئة التشغيل أولاً.',
        ], 503);
    }
    if (!class_exists('MongoDB\\Client')) {
        respond([
            'ok' => false,
            'code' => 'MONGODB_DRIVER_NOT_AVAILABLE',
            'message' => 'تم ضبط MongoDB لكن إضافة PHP الخاصة بها غير متاحة في بيئة التشغيل.',
        ], 503);
    }
    respond([
        'ok' => false,
        'code' => 'AUTH_IMPLEMENTATION_PENDING',
        'message' => 'طبقة الحسابات مؤمنة بنقطة API واضحة، ويجب ربطها بمخطط MongoDB قبل استقبال مستخدمين حقيقيين.',
    ], 501);
}

if ($action === 'contact') {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }
    $data = input();
    $name = trim((string)($data['name'] ?? ''));
    $email = trim((string)($data['email'] ?? ''));
    $message = trim((string)($data['message'] ?? ''));
    if ($name === '' || $email === '' || $message === '') {
        respond(['ok' => false, 'code' => 'VALIDATION_ERROR', 'message' => 'أكمل بيانات الرسالة قبل الإرسال.'], 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['ok' => false, 'code' => 'INVALID_EMAIL', 'message' => 'تحقق من البريد الإلكتروني.'], 422);
    }
    if (!publicConfig()['mail']['configured']) {
        respond([
            'ok' => false,
            'code' => 'MAIL_NOT_CONFIGURED',
            'message' => 'البريد غير مفعّل بعد. أضف إعدادات SMTP كمتغيرات بيئة ثم أعد المحاولة.',
        ], 503);
    }
    respond(['ok' => false, 'code' => 'MAIL_PROVIDER_PENDING', 'message' => 'مزود البريد جاهز للربط الآمن عبر SMTP.'], 501);
}

respond(['ok' => false, 'error' => 'unknown_action'], 404);