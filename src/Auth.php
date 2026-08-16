<?php
class Auth {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                   || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
                   || ($_SERVER['SERVER_PORT'] ?? 80) == 443;

            session_name('TAS3_SESS');
            session_set_cookie_params([
                'lifetime' => SESSION_LIFETIME,
                'path'     => '/',
                'secure'   => $secure,
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
        return DB::findOne('users', ['id' => (int)$id, 'is_active' => 1]);
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
        $u = DB::findOne('users', ['email' => strtolower(trim($email)), 'is_active' => 1]);
        if (!$u || !password_verify($password, $u['password_hash'])) return false;
        self::start();
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$u['id'];
        DB::insertDoc('activity_log', [
            'user_id' => (int)$u['id'],
            'action'  => 'login',
            'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);
        return $u;
    }

    public static function register(string $name, string $email, string $password): array|string {
        $email = strtolower(trim($email));
        if (strlen($name) < 2)                          return 'الاسم قصير جداً';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return 'البريد الإلكتروني غير صحيح';
        if (strlen($password) < 6)                      return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        if (DB::findOne('users', ['email' => $email]))  return 'البريد مسجل مسبقاً';

        $id = DB::insertDoc('users', [
            'name'            => $name,
            'email'           => $email,
            'password_hash'   => password_hash($password, PASSWORD_BCRYPT),
            'role'            => 'client',
            'plan'            => 'free',
            'plan_expires_at' => null,
            'is_active'       => 1,
        ]);
        self::start();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $id;
        DB::insertDoc('activity_log', [
            'user_id' => $id,
            'action'  => 'register',
            'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);
        return DB::findOne('users', ['id' => $id]);
    }

    public static function logout(): void {
        self::start();
        $id = $_SESSION['user_id'] ?? null;
        if ($id) {
            DB::insertDoc('activity_log', [
                'user_id' => (int)$id,
                'action'  => 'logout',
            ]);
        }
        $_SESSION = [];
        session_destroy();
    }

    /** Returns the effective plan (downgrades to free if expired) */
    public static function effectivePlan(array $user): string {
        $plan    = $user['plan'] ?? 'free';
        $expires = $user['plan_expires_at'] ?? null;
        if ($plan === 'free' || $expires === null) return $plan;
        if (strtotime($expires) < time()) return 'free';
        return $plan;
    }

    public static function planAllows(array $user, string $feature): bool {
        $plan  = self::effectivePlan($user);
        $tools = PLANS[$plan]['tools'] ?? [];
        return in_array($feature, $tools, true) || in_array('all', $tools, true);
    }

    public static function canCreateQuote(array $user): bool {
        $plan = self::effectivePlan($user);
        $max  = PLANS[$plan]['max_quotes'] ?? PLANS['free']['max_quotes'];
        if ($max === -1) return true;
        $month = date('Y-m');
        $count = DB::count('quotes', [
            'employee_id' => (int)$user['id'],
            'created_at'  => ['$regex' => '^' . $month],
        ]);
        return $count < $max;
    }

    // ── CSRF ──────────────────────────────────────────────────────────
    public static function csrfToken(): string {
        self::start();
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function verifyCsrf(): void {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $valid = $_SESSION['csrf_token'] ?? '';
        if (!$token || !$valid || !hash_equals($valid, $token)) {
            Response::json(['error' => 'طلب غير صالح (CSRF)', 'code' => 'CSRF_INVALID'], 403);
        }
    }

    private static function isApi(): bool {
        return str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/');
    }
}
