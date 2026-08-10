<?php
class Auth {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name('TAS3_SESS');
            session_set_cookie_params([
                'lifetime' => SESSION_LIFETIME,
                'path'     => '/',
                'secure'   => false,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_start();
        }
    }

    public static function user(): ?array {
        self::start();
        $id = $_SESSION['user_id'] ?? null;
        if (!$id) return null;
        $u = DB::row("SELECT * FROM users WHERE id=? AND is_active=1", [$id]);
        return $u ?: null;
    }

    public static function require(): array {
        $u = self::user();
        if (!$u) {
            if (self::isApi()) {
                Response::json(['error' => 'غير مصرح', 'code' => 'UNAUTHORIZED'], 401);
            }
            header('Location: /'); exit;
        }
        return $u;
    }

    public static function requireRole(string ...$roles): array {
        $u = self::require();
        if (!in_array($u['role'], $roles, true)) {
            if (self::isApi()) Response::json(['error' => 'غير مسموح'], 403);
            header('Location: /dashboard'); exit;
        }
        return $u;
    }

    public static function login(string $email, string $password): array|false {
        $u = DB::row("SELECT * FROM users WHERE email=? AND is_active=1", [strtolower(trim($email))]);
        if (!$u || !password_verify($password, $u['password_hash'])) return false;
        self::start();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $u['id'];
        DB::run("INSERT INTO activity_log (user_id,action,ip) VALUES (?,?,?)",
            [$u['id'], 'login', $_SERVER['REMOTE_ADDR'] ?? '']);
        return $u;
    }

    public static function register(string $name, string $email, string $password): array|string {
        $email = strtolower(trim($email));
        if (strlen($name) < 2)              return 'الاسم قصير جداً';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return 'البريد الإلكتروني غير صحيح';
        if (strlen($password) < 6)          return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        if (DB::val("SELECT id FROM users WHERE email=?", [$email])) return 'البريد مسجل مسبقاً';

        DB::run("INSERT INTO users (name,email,password_hash,role,plan) VALUES (?,?,?,'client','free')",
            [$name, $email, password_hash($password, PASSWORD_BCRYPT)]);
        $id = DB::id();
        self::start();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $id;
        DB::run("INSERT INTO activity_log (user_id,action,ip) VALUES (?,?,?)",
            [$id, 'register', $_SERVER['REMOTE_ADDR'] ?? '']);
        return DB::row("SELECT * FROM users WHERE id=?", [$id]);
    }

    public static function logout(): void {
        self::start();
        $id = $_SESSION['user_id'] ?? null;
        if ($id) DB::run("INSERT INTO activity_log (user_id,action) VALUES (?,?)", [$id,'logout']);
        session_destroy();
    }

    public static function planAllows(array $user, string $feature): bool {
        $plans = PLANS;
        $tools = $plans[$user['plan']]['tools'] ?? [];
        return in_array($feature, $tools, true) || in_array('all', $tools, true);
    }

    public static function canCreateQuote(array $user): bool {
        $plan  = PLANS[$user['plan']] ?? PLANS['free'];
        $max   = $plan['max_quotes'];
        if ($max === -1) return true;
        $month = date('Y-m');
        $count = (int)DB::val(
            "SELECT COUNT(*) FROM quotes WHERE employee_id=? AND strftime('%Y-%m',created_at)=?",
            [$user['id'], $month]
        );
        return $count < $max;
    }

    private static function isApi(): bool {
        return str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/');
    }
}
