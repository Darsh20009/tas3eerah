<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

if ($path === '/' || $path === '/index.html') {
    readfile(__DIR__ . '/app.html');
    exit;
}

$requested = realpath(__DIR__ . $path);
$root = realpath(__DIR__);

if ($requested === false || $root === false || strncmp($requested, $root, strlen($root)) !== 0) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'not_found'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (is_file($requested)) {
    return false;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => false, 'error' => 'not_found'], JSON_UNESCAPED_UNICODE);