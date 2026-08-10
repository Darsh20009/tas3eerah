<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? '';

match ($action) {
    'login'    => handleLogin($body),
    'register' => handleRegister($body),
    'logout'   => handleLogout(),
    'me'       => handleMe(),
    'demo'     => handleDemo($body),
    default    => Response::err('إجراء غير معروف', 400),
};

function handleLogin(array $b): never {
    $email    = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';
    if (!$email || !$password) Response::err('يرجى إدخال البريد وكلمة المرور');
    $user = Auth::login($email, $password);
    if (!$user) Response::err('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    Response::ok(safeUser($user), 'تم تسجيل الدخول');
}

function handleRegister(array $b): never {
    $name     = trim($b['name'] ?? '');
    $email    = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';
    $result   = Auth::register($name, $email, $password);
    if (is_string($result)) Response::err($result);
    Response::ok(safeUser($result), 'تم إنشاء الحساب بنجاح');
}

function handleLogout(): never {
    Auth::logout();
    Response::ok([], 'تم تسجيل الخروج');
}

function handleMe(): never {
    $u = Auth::user();
    if (!$u) Response::err('غير مسجل', 401);
    Response::ok(safeUser($u));
}

function handleDemo(array $b): never {
    $role = $b['role'] ?? 'client';
    $map  = [
        'admin'    => 'admin@tas3eerah.com',
        'employee' => 'employee@tas3eerah.com',
        'client'   => 'client@tas3eerah.com',
    ];
    $email = $map[$role] ?? $map['client'];
    $user  = Auth::login($email, 'Demo@2025');
    if (!$user) {
        // Try admin password for admin role
        if ($role === 'admin') $user = Auth::login($email, 'Admin@2025');
    }
    if (!$user) Response::err('حساب التجربة غير متاح');
    Response::ok(safeUser($user), 'تم تسجيل الدخول كـ ' . $user['role']);
}

function safeUser(array $u): array {
    unset($u['password_hash']);
    $plans = PLANS;
    $u['plan_info'] = $plans[$u['plan']] ?? $plans['free'];
    return $u;
}
