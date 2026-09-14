<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/DB.php';
require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/OAuth.php';
require_once __DIR__ . '/src/Response.php';

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$uri    = strtok($_SERVER['REQUEST_URI'], '?');
$method = $_SERVER['REQUEST_METHOD'];

// Static assets
if (preg_match('#^/assets/.+#', $uri)) {
    $file = __DIR__ . $uri;
    if (file_exists($file) && is_file($file)) {
        $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'css'  => 'text/css; charset=UTF-8',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg','jpeg' => 'image/jpeg',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon',
            'woff2'=> 'font/woff2',
            'woff' => 'font/woff',
            'ttf'  => 'font/ttf',
            'otf'  => 'font/otf',
            'eot'  => 'application/vnd.ms-fontobject',
            default => 'application/octet-stream',
        };
        header("Content-Type: $mime");
        header('Cache-Control: public, max-age=3600');
        readfile($file);
        exit;
    }
    http_response_code(404); exit;
}

// Browsers request a root favicon for the standalone detailed tools document.
// Serve the existing brand mark instead of producing a noisy 404 in previews.
if ($uri === '/favicon.ico') {
    $favicon = __DIR__ . '/assets/logo.png';
    if (file_exists($favicon) && is_file($favicon)) {
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=3600');
        readfile($favicon);
        exit;
    }
    http_response_code(404);
    exit;
}

// Legacy calculator
if ($uri === '/legacy-calculator.html') {
    $f = __DIR__ . '/legacy-calculator.html';
    if (file_exists($f)) { readfile($f); exit; }
    http_response_code(404); exit;
}

// The detailed calculator reference is kept as a first-class app route so the
// authenticated dashboard can show the complete sector tools without
// duplicating their large, self-contained markup in the PHP page.
if ($uri === '/classic-tools') {
    $f = __DIR__ . '/attached_assets/index_1789370030522.html';
    if (file_exists($f) && is_file($f)) {
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: no-store');
        readfile($f);
        exit;
    }
    http_response_code(404);
    echo '404';
    exit;
}

if (defined('APP_ENV') && APP_ENV === 'production') {
    set_exception_handler(static function (Throwable $e) use ($uri): never {
        error_log('[production] ' . $e->getMessage());
        if (str_starts_with($uri, '/api/')) {
            Response::json([
                'error' => 'تعذر الاتصال بقاعدة بيانات الإنتاج حالياً',
                'code' => 'PRODUCTION_DATABASE_UNAVAILABLE',
            ], 503);
        }
        http_response_code(503);
        echo '<!doctype html><meta charset="utf-8"><title>تسعيرة</title><p dir="rtl" style="font-family:Arial;padding:32px">قاعدة بيانات الإنتاج غير متاحة حالياً. تحقق من اتصال MongoDB ثم أعد المحاولة.</p>';
        exit;
    });
}

// Production must use the persistent MongoDB backend. Never fall back to
// ephemeral container SQLite when Render is missing its database settings.
if (defined('APP_ENV') && APP_ENV === 'production') {
    try {
        DB::assertProductionReady();
    } catch (Throwable $e) {
        http_response_code(503);
        if (str_starts_with($uri, '/api/')) {
            Response::json([
                'error' => 'قاعدة بيانات الإنتاج غير مهيأة',
                'details' => $e->getMessage(),
                'code' => 'PRODUCTION_DATABASE_NOT_READY',
            ], 503);
        }
        echo '<!doctype html><meta charset="utf-8"><title>تسعيرة</title><p dir="rtl" style="font-family:Arial;padding:32px">قاعدة بيانات الإنتاج غير مهيأة. أضف MONGODB_URI ثم أعد النشر.</p>';
        exit;
    }
}

// API routes
if (str_starts_with($uri, '/api/')) {
    header('Content-Type: application/json; charset=utf-8');

    // CSRF protection for all state-changing requests
    if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
        Auth::start();
        Auth::verifyCsrf();
    }

    $segment = explode('/', trim($uri, '/'))[1] ?? '';
    $apiFile = __DIR__ . "/api/$segment.php";
    if (file_exists($apiFile)) {
        require $apiFile;
    } else {
        Response::err("API not found: $segment", 404);
    }
    exit;
}

// OAuth routes (GET — no CSRF needed, handled internally via state)
if ($uri === '/auth/google') {
    Auth::start();
    if (!OAuth::googleEnabled()) { header('Location: /?oauth_error=google_not_configured'); exit; }
    header('Location: ' . OAuth::googleAuthUrl()); exit;
}
if ($uri === '/auth/google/callback') {
    Auth::start();
    $code  = $_GET['code']  ?? '';
    $state = $_GET['state'] ?? '';
    $err   = $_GET['error'] ?? '';
    if ($err || !$code) { header('Location: /?oauth_error=' . urlencode($err ?: 'cancelled')); exit; }
    $result = OAuth::googleCallback($code, $state);
    if (is_string($result)) { header('Location: /?oauth_error=' . urlencode($result)); exit; }
    $user = OAuth::loginOrRegister($result);
    if (is_string($user)) { header('Location: /?oauth_error=' . urlencode($user)); exit; }
    header('Location: /dashboard'); exit;
}
if ($uri === '/auth/apple') {
    Auth::start();
    if (!OAuth::appleEnabled()) { header('Location: /?oauth_error=apple_not_configured'); exit; }
    header('Location: ' . OAuth::appleAuthUrl()); exit;
}
// Apple sends a POST to the callback
if ($uri === '/auth/apple/callback') {
    Auth::start();
    $post = $_POST;
    if (empty($post['code']) && empty($post['id_token'])) {
        header('Location: /?oauth_error=apple_no_data'); exit;
    }
    $result = OAuth::appleCallback($post);
    if (is_string($result)) { header('Location: /?oauth_error=' . urlencode($result)); exit; }
    $user = OAuth::loginOrRegister($result);
    if (is_string($user)) { header('Location: /?oauth_error=' . urlencode($user)); exit; }
    header('Location: /dashboard'); exit;
}

// App pages
match (true) {
    $uri === '/'          => servePage('landing'),
    $uri === '/dashboard' => servePage('dashboard'),
    $uri === '/logout'    => (function(){ Auth::logout(); header('Location: /'); exit; })(),
    default               => (function() use ($uri) {
        // Try page file
        $slug = trim($uri, '/');
        $f    = __DIR__ . "/pages/$slug.php";
        if (file_exists($f)) { servePage($slug); }
        else { http_response_code(404); echo '404'; }
    })(),
};

function servePage(string $page): void {
    $file = __DIR__ . "/pages/$page.php";
    if (!file_exists($file)) { http_response_code(404); echo '404'; return; }
    require $file;
}
