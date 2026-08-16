<?php
/**
 * This endpoint is no longer active.
 * Use /api/auth for authentication, /api/quotes for quotes, etc.
 */
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'      => false,
    'error'   => 'endpoint_removed',
    'message' => 'هذا المسار غير متاح. استخدم /api/auth للتحقق من الهوية.',
    'docs'    => [
        'auth'     => '/api/auth',
        'quotes'   => '/api/quotes',
        'messages' => '/api/messages',
        'admin'    => '/api/admin',
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
