<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/DB.php';
require_once __DIR__ . '/src/Auth.php';
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
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg','jpeg' => 'image/jpeg',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon',
            'woff2'=> 'font/woff2',
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
    $segment = explode('/', trim($uri, '/'))[1] ?? '';
    $apiFile = __DIR__ . "/api/$segment.php";
    if (file_exists($apiFile)) {
        require $apiFile;
    } else {
        Response::err("API not found: $segment", 404);
    }
    exit;
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
