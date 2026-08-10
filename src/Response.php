<?php
class Response {
    public static function json(mixed $data, int $status = 200): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    public static function ok(mixed $data = [], string $message = 'نجح الطلب'): never {
        self::json(['success' => true, 'message' => $message, 'data' => $data]);
    }
    public static function err(string $message, int $status = 400): never {
        self::json(['success' => false, 'error' => $message], $status);
    }
}
