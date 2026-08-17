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

// Legacy calculator
if ($uri === '/legacy-calculator.html') {
    $f = __DIR__ . '/legacy-calculator.html';
    if (file_exists($f)) { readfile($f); exit; }
    http_response_code(404); exit;
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
