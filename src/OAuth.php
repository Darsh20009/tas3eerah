<?php
/**
 * OAuth 2.0 — Google & Apple Sign In
 */
class OAuth {

    // ─── GOOGLE ──────────────────────────────────────────────────────────

    public static function googleEnabled(): bool {
        return !empty(GOOGLE_CLIENT_ID) && !empty(GOOGLE_CLIENT_SECRET);
    }

    public static function googleAuthUrl(): string {
        Auth::start();
        $state = bin2hex(random_bytes(16));
        $_SESSION['oauth_state']    = $state;
        $_SESSION['oauth_provider'] = 'google';
        $params = http_build_query([
            'client_id'     => GOOGLE_CLIENT_ID,
            'redirect_uri'  => self::redirectUri('google'),
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'state'         => $state,
            'access_type'   => 'online',
            'prompt'        => 'select_account',
        ]);
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;
    }

    public static function googleCallback(string $code, string $state): array|string {
        Auth::start();
        if (!$state || $state !== ($_SESSION['oauth_state'] ?? '')) {
            return 'رابط غير صالح — يرجى المحاولة مجدداً';
        }
        unset($_SESSION['oauth_state'], $_SESSION['oauth_provider']);

        $token = self::httpPost('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'redirect_uri'  => self::redirectUri('google'),
            'grant_type'    => 'authorization_code',
        ]);

        if (empty($token['access_token'])) {
            return 'فشل الحصول على رمز الوصول من Google';
        }

        $info = self::httpGet(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            ['Authorization: Bearer ' . $token['access_token']]
        );

        if (empty($info['email'])) {
            return 'فشل قراءة بيانات المستخدم من Google';
        }

        return [
            'email'       => $info['email'],
            'name'        => $info['name'] ?? $info['email'],
            'provider'    => 'google',
            'provider_id' => $info['sub'] ?? '',
        ];
    }

    // ─── APPLE ───────────────────────────────────────────────────────────

    public static function appleEnabled(): bool {
        return !empty(APPLE_CLIENT_ID) && !empty(APPLE_TEAM_ID)
            && !empty(APPLE_KEY_ID)   && !empty(APPLE_PRIVATE_KEY);
    }

    public static function appleAuthUrl(): string {
        Auth::start();
        $state = bin2hex(random_bytes(16));
        $nonce = bin2hex(random_bytes(16));
        $_SESSION['oauth_state']    = $state;
        $_SESSION['oauth_nonce']    = $nonce;
        $_SESSION['oauth_provider'] = 'apple';
        $params = http_build_query([
            'client_id'     => APPLE_CLIENT_ID,
            'redirect_uri'  => self::redirectUri('apple'),
            'response_type' => 'code id_token',
            'response_mode' => 'form_post',
            'scope'         => 'name email',
            'state'         => $state,
            'nonce'         => hash('sha256', $nonce),
        ]);
        return 'https://appleid.apple.com/auth/authorize?' . $params;
    }

    public static function appleCallback(array $post): array|string {
        Auth::start();
        if (($post['state'] ?? '') !== ($_SESSION['oauth_state'] ?? '')) {
            return 'رابط Apple غير صالح — يرجى المحاولة مجدداً';
        }
        unset($_SESSION['oauth_state'], $_SESSION['oauth_nonce'], $_SESSION['oauth_provider']);

        // Verify client_secret JWT then exchange code for tokens
        $idToken = $post['id_token'] ?? '';
        if (!$idToken) return 'لم يتم تلقي رمز التعريف من Apple';

        // Decode payload (segments are base64url)
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) return 'رمز Apple غير صالح';
        $payload = json_decode(
            base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4 ? strlen($parts[1]) + 4 - strlen($parts[1]) % 4 : strlen($parts[1]), '=', STR_PAD_RIGHT)),
            true
        );

        if (empty($payload['email'])) {
            return 'لم يوفر Apple بريداً إلكترونياً — تأكد من إعدادات الخصوصية';
        }

        // Name comes only on first sign-in
        $nameData  = json_decode($post['user'] ?? '{}', true);
        $firstName = $nameData['name']['firstName'] ?? '';
        $lastName  = $nameData['name']['lastName']  ?? '';
        $name      = trim("$firstName $lastName") ?: $payload['email'];

        return [
            'email'       => $payload['email'],
            'name'        => $name,
            'provider'    => 'apple',
            'provider_id' => $payload['sub'] ?? '',
        ];
    }

    // ─── SHARED: login or register from OAuth profile ─────────────────

    public static function loginOrRegister(array $oauthUser): array|string {
        Auth::start();
        $email = strtolower(trim($oauthUser['email']));
        if (!$email) return 'البريد الإلكتروني مطلوب';

        $user = DB::findOne('users', ['email' => $email]);

        if ($user) {
            if (!$user['is_active']) return 'الحساب معطّل — تواصل مع الدعم';
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$user['id'];
            DB::insertDoc('activity_log', [
                'user_id' => (int)$user['id'],
                'action'  => 'oauth_login',
                'details' => $oauthUser['provider'],
                'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);
            return $user;
        }

        // First time — register
        $id = DB::insertDoc('users', [
            'name'            => $oauthUser['name'],
            'email'           => $email,
            'password_hash'   => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
            'role'            => 'client',
            'plan'            => 'free',
            'plan_expires_at' => null,
            'is_active'       => 1,
        ]);
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$id;
        DB::insertDoc('activity_log', [
            'user_id' => (int)$id,
            'action'  => 'oauth_register',
            'details' => $oauthUser['provider'],
            'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);
        return DB::findOne('users', ['id' => (int)$id]);
    }

    // ─── helpers ─────────────────────────────────────────────────────────

    private static function redirectUri(string $provider): string {
        return rtrim(APP_URL, '/') . '/auth/' . $provider . '/callback';
    }

    private static function httpPost(string $url, array $data): array {
        $ctx = stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json",
            'content' => http_build_query($data),
            'timeout' => 12,
            'ignore_errors' => true,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        return $res ? (json_decode($res, true) ?? []) : [];
    }

    private static function httpGet(string $url, array $headers = []): array {
        $ctx = stream_context_create(['http' => [
            'method'  => 'GET',
            'header'  => implode("\r\n", $headers) . "\r\nAccept: application/json",
            'timeout' => 12,
            'ignore_errors' => true,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        return $res ? (json_decode($res, true) ?? []) : [];
    }
}
