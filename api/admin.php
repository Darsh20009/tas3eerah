<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

$user   = Auth::requireRole('admin');
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? '';

match ($action) {
    'stats'         => stats(),
    'users'         => users(),
    'user_create'   => userCreate($user, $body),
    'user_update'   => userUpdate($user, $body),
    'user_toggle'   => userToggle($user, $body),
    'user_delete'   => userDelete($user, $body),
    'set_plan'      => setPlan($user, $body),
    'all_quotes'    => allQuotes(),
    'activity_log'  => activityLog(),
    'plan_settings' => planSettings(),
    default         => Response::err('إجراء غير معروف', 400),
};

function stats(): never {
    Response::ok([
        'users_total'     => (int)DB::val("SELECT COUNT(*) FROM users"),
        'users_active'    => (int)DB::val("SELECT COUNT(*) FROM users WHERE is_active=1"),
        'clients'         => (int)DB::val("SELECT COUNT(*) FROM users WHERE role='client'"),
        'employees'       => (int)DB::val("SELECT COUNT(*) FROM users WHERE role='employee'"),
        'quotes_total'    => (int)DB::val("SELECT COUNT(*) FROM quotes"),
        'quotes_month'    => (int)DB::val("SELECT COUNT(*) FROM quotes WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')"),
        'revenue_total'   => (float)(DB::val("SELECT COALESCE(SUM(total),0) FROM quotes WHERE status='accepted'") ?? 0),
        'messages_total'  => (int)DB::val("SELECT COUNT(*) FROM messages"),
        'plan_free'       => (int)DB::val("SELECT COUNT(*) FROM users WHERE plan='free'"),
        'plan_pro'        => (int)DB::val("SELECT COUNT(*) FROM users WHERE plan='pro'"),
        'plan_enterprise' => (int)DB::val("SELECT COUNT(*) FROM users WHERE plan='enterprise'"),
    ]);
}

function users(): never {
    $search = $_GET['q'] ?? '';
    $role   = $_GET['role'] ?? '';
    $plan   = $_GET['plan'] ?? '';

    $where  = ['1=1'];
    $params = [];
    if ($search) { $where[] = "(name LIKE ? OR email LIKE ?)"; $params[] = "%$search%"; $params[] = "%$search%"; }
    if ($role)   { $where[] = "role=?"; $params[] = $role; }
    if ($plan)   { $where[] = "plan=?"; $params[] = $plan; }

    $list = DB::all(
        "SELECT id,name,email,role,plan,plan_expires_at,is_active,created_at FROM users
         WHERE " . implode(' AND ', $where) . " ORDER BY created_at DESC",
        $params
    );
    Response::ok($list);
}

function userCreate(array $me, array $b): never {
    $name  = trim($b['name'] ?? '');
    $email = strtolower(trim($b['email'] ?? ''));
    $pass  = $b['password'] ?? 'Demo@2025';
    $role  = $b['role'] ?? 'client';
    $plan  = $b['plan'] ?? 'free';

    if (!$name || !$email)   Response::err('الاسم والبريد مطلوبان');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Response::err('البريد الإلكتروني غير صحيح');
    if (DB::val("SELECT id FROM users WHERE email=?", [$email])) Response::err('البريد مسجل مسبقاً');
    if (!in_array($role, ['client','employee','admin'])) Response::err('دور غير صحيح');
    if (!array_key_exists($plan, PLANS)) Response::err('خطة غير صحيحة');

    DB::run(
        "INSERT INTO users (name,email,password_hash,role,plan) VALUES (?,?,?,?,?)",
        [$name, $email, password_hash($pass, PASSWORD_BCRYPT), $role, $plan]
    );
    $id = (int)DB::id();
    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$me['id'], 'admin_user_create', "مستخدم جديد: $email"]);
    Response::ok(['id' => $id], 'تم إنشاء المستخدم. كلمة المرور الافتراضية: ' . $pass);
}

function userUpdate(array $me, array $b): never {
    $id   = (int)($b['id'] ?? 0);
    $name = trim($b['name'] ?? '');
    $role = $b['role'] ?? '';
    $pass = $b['password'] ?? '';

    if (!$id) Response::err('معرف المستخدم مطلوب');
    $u = DB::row("SELECT * FROM users WHERE id=?", [$id]);
    if (!$u) Response::err('المستخدم غير موجود', 404);

    // Prevent demoting the last admin
    if ($role && $role !== 'admin' && $u['role'] === 'admin') {
        $adminCount = (int)DB::val("SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1");
        if ($adminCount <= 1) Response::err('لا يمكن تغيير دور المدير الوحيد في النظام');
    }

    if ($name) {
        DB::run("UPDATE users SET name=? WHERE id=?", [$name, $id]);
    }
    if ($role && in_array($role, ['client','employee','admin'], true)) {
        DB::run("UPDATE users SET role=? WHERE id=?", [$role, $id]);
    }
    if ($pass && strlen($pass) >= 6) {
        DB::run("UPDATE users SET password_hash=? WHERE id=?", [password_hash($pass, PASSWORD_BCRYPT), $id]);
    }

    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$me['id'], 'admin_user_update', "مستخدم: $id"]);
    Response::ok([], 'تم التحديث');
}

function userToggle(array $me, array $b): never {
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف مطلوب');
    if ($id === $me['id']) Response::err('لا يمكنك تعطيل حسابك');
    $u = DB::row("SELECT * FROM users WHERE id=?", [$id]);
    if (!$u) Response::err('غير موجود', 404);
    $new = $u['is_active'] ? 0 : 1;
    DB::run("UPDATE users SET is_active=? WHERE id=?", [$new, $id]);
    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$me['id'], $new ? 'user_activated' : 'user_deactivated', "مستخدم: $id"]);
    Response::ok(['is_active' => $new], $new ? 'تم التفعيل' : 'تم التعطيل');
}

function userDelete(array $me, array $b): never {
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف مطلوب');
    if ($id === $me['id']) Response::err('لا يمكنك حذف حسابك');

    $u = DB::row("SELECT * FROM users WHERE id=?", [$id]);
    if (!$u) Response::err('المستخدم غير موجود', 404);

    // Prevent deleting the last admin
    if ($u['role'] === 'admin') {
        $adminCount = (int)DB::val("SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1");
        if ($adminCount <= 1) Response::err('لا يمكن حذف المدير الأخير في النظام', 409);
    }

    // Prevent deletion if user has quotes (data integrity)
    $quoteCount = (int)DB::val(
        "SELECT COUNT(*) FROM quotes WHERE employee_id=? OR client_id=?",
        [$id, $id]
    );
    if ($quoteCount > 0) {
        Response::err(
            "لا يمكن حذف المستخدم لأن لديه $quoteCount عرض/عروض أسعار. قم بتعطيل الحساب عوضاً عن ذلك.",
            409
        );
    }

    $db = DB::get();
    try {
        $db->beginTransaction();
        // Clean up messages (no CASCADE on users FK)
        DB::run("DELETE FROM messages WHERE sender_id=? OR receiver_id=?", [$id, $id]);
        DB::run("DELETE FROM activity_log WHERE user_id=?", [$id]);
        DB::run("DELETE FROM users WHERE id=?", [$id]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        Response::err('فشل حذف المستخدم يرجى المحاولة مجدداً');
    }

    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$me['id'], 'admin_user_delete', "حذف المستخدم: {$u['email']}"]);
    Response::ok([], 'تم حذف المستخدم');
}

function setPlan(array $me, array $b): never {
    $id      = (int)($b['id'] ?? 0);
    $plan    = $b['plan'] ?? '';
    $expires = $b['expires_at'] ?? null;

    if (!$id || !$plan) Response::err('البيانات ناقصة');
    if (!array_key_exists($plan, PLANS)) Response::err('خطة غير صحيحة');
    if (!DB::val("SELECT id FROM users WHERE id=?", [$id])) Response::err('المستخدم غير موجود', 404);

    DB::run("UPDATE users SET plan=?, plan_expires_at=? WHERE id=?", [$plan, $expires, $id]);
    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$me['id'], 'plan_changed', "مستخدم $id → خطة $plan"]);
    Response::ok([], 'تم تغيير الخطة');
}

function allQuotes(): never {
    $status = $_GET['status'] ?? '';
    $where  = ['1=1'];
    $params = [];
    if ($status) { $where[] = "q.status=?"; $params[] = $status; }
    $quotes = DB::all(
        "SELECT q.*, c.name as client_name, e.name as employee_name
         FROM quotes q
         LEFT JOIN users c ON c.id=q.client_id
         LEFT JOIN users e ON e.id=q.employee_id
         WHERE " . implode(' AND ', $where) . "
         ORDER BY q.created_at DESC LIMIT 200",
        $params
    );
    Response::ok($quotes);
}

function activityLog(): never {
    $limit = max(1, min((int)($_GET['limit'] ?? 50), 200));
    $log   = DB::all(
        "SELECT l.*, u.name as user_name, u.role as user_role
         FROM activity_log l LEFT JOIN users u ON u.id=l.user_id
         ORDER BY l.created_at DESC LIMIT ?",
        [$limit]
    );
    Response::ok($log);
}

function planSettings(): never {
    Response::ok(PLANS);
}
