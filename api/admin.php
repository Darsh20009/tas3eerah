<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

$user   = Auth::requireRole('admin');
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? '';

match ($action) {
    'stats'             => stats(),
    'users'             => users(),
    'user_create'       => userCreate($user, $body),
    'user_update'       => userUpdate($user, $body),
    'user_toggle'       => userToggle($user, $body),
    'user_delete'       => userDelete($user, $body),
    'set_plan'          => setPlan($user, $body),
    'all_quotes'        => allQuotes(),
    'activity_log'      => activityLog(),
    'plan_settings'     => planSettings(),
    'contact_messages'  => contactMessages(),
    'contact_mark_read' => contactMarkRead($body),
    'contact_delete'    => contactDelete($body),
    'get_settings'      => getSettings(),
    'save_settings'     => saveSettings($user, $body),
    default             => Response::err('إجراء غير معروف', 400),
};

// ── Stats ─────────────────────────────────────────────────────────────
function stats(): never {
    $month = date('Y-m');
    Response::ok([
        'users_total'     => DB::count('users'),
        'users_active'    => DB::count('users',  ['is_active' => 1]),
        'clients'         => DB::count('users',  ['role' => 'client']),
        'employees'       => DB::count('users',  ['role' => 'employee']),
        'quotes_total'    => DB::count('quotes'),
        'quotes_month'    => DB::count('quotes', ['created_at' => ['$regex' => '^' . $month]]),
        'revenue_total'   => DB::sumField('quotes', ['status' => 'accepted'], 'total'),
        'messages_total'  => DB::count('messages'),
        'plan_free'       => DB::count('users', ['plan' => 'free']),
        'plan_pro'        => DB::count('users', ['plan' => 'pro']),
        'plan_enterprise' => DB::count('users', ['plan' => 'enterprise']),
    ]);
}

// ── Users ─────────────────────────────────────────────────────────────
function users(): never {
    $search = $_GET['q']    ?? '';
    $role   = $_GET['role'] ?? '';
    $plan   = $_GET['plan'] ?? '';

    $filter = [];
    if ($search) $filter['$or'] = [
        ['name'  => ['$regex' => $search, '$options' => 'i']],
        ['email' => ['$regex' => $search, '$options' => 'i']],
    ];
    if ($role) $filter['role'] = $role;
    if ($plan) $filter['plan'] = $plan;

    $list = DB::findAll('users', $filter, [
        'sort'       => ['created_at' => -1],
        'projection' => ['id' => 1, 'name' => 1, 'email' => 1, 'role' => 1,
                         'plan' => 1, 'plan_expires_at' => 1, 'is_active' => 1, 'created_at' => 1],
    ]);
    Response::ok($list);
}

function userCreate(array $me, array $b): never {
    $name  = trim($b['name'] ?? '');
    $email = strtolower(trim($b['email'] ?? ''));
    $pass  = $b['password'] ?? 'Demo@2025';
    $role  = $b['role']     ?? 'client';
    $plan  = $b['plan']     ?? 'free';

    if (!$name || !$email)   Response::err('الاسم والبريد مطلوبان');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Response::err('البريد الإلكتروني غير صحيح');
    if (DB::findOne('users', ['email' => $email])) Response::err('البريد مسجل مسبقاً');
    if (!in_array($role, ['client', 'employee', 'admin'])) Response::err('دور غير صحيح');
    if (!array_key_exists($plan, PLANS)) Response::err('خطة غير صحيحة');

    $id = DB::insertDoc('users', [
        'name'            => $name,
        'email'           => $email,
        'password_hash'   => password_hash($pass, PASSWORD_BCRYPT),
        'role'            => $role,
        'plan'            => $plan,
        'plan_expires_at' => null,
        'is_active'       => 1,
    ]);
    DB::insertDoc('activity_log', ['user_id' => (int)$me['id'], 'action' => 'admin_user_create', 'details' => "مستخدم جديد: $email"]);
    Response::ok(['id' => $id], 'تم إنشاء المستخدم. كلمة المرور الافتراضية: ' . $pass);
}

function userUpdate(array $me, array $b): never {
    $id   = (int)($b['id'] ?? 0);
    $name = trim($b['name'] ?? '');
    $role = $b['role']     ?? '';
    $pass = $b['password'] ?? '';

    if (!$id) Response::err('معرف المستخدم مطلوب');
    $u = DB::findOne('users', ['id' => $id]);
    if (!$u) Response::err('المستخدم غير موجود', 404);

    if ($role && $role !== 'admin' && $u['role'] === 'admin') {
        if (DB::count('users', ['role' => 'admin', 'is_active' => 1]) <= 1) {
            Response::err('لا يمكن تغيير دور المدير الوحيد في النظام');
        }
    }

    $update = [];
    if ($name) $update['name'] = $name;
    if ($role && in_array($role, ['client', 'employee', 'admin'], true)) $update['role'] = $role;
    if ($pass && strlen($pass) >= 6) $update['password_hash'] = password_hash($pass, PASSWORD_BCRYPT);
    if ($update) DB::updateDoc('users', ['id' => $id], $update);

    DB::insertDoc('activity_log', ['user_id' => (int)$me['id'], 'action' => 'admin_user_update', 'details' => "مستخدم: $id"]);
    Response::ok([], 'تم التحديث');
}

function userToggle(array $me, array $b): never {
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف مطلوب');
    if ($id === (int)$me['id']) Response::err('لا يمكنك تعطيل حسابك');
    $u = DB::findOne('users', ['id' => $id]);
    if (!$u) Response::err('غير موجود', 404);
    $new = $u['is_active'] ? 0 : 1;
    DB::updateDoc('users', ['id' => $id], ['is_active' => $new]);
    DB::insertDoc('activity_log', [
        'user_id' => (int)$me['id'],
        'action'  => $new ? 'user_activated' : 'user_deactivated',
        'details' => "مستخدم: $id",
    ]);
    Response::ok(['is_active' => $new], $new ? 'تم التفعيل' : 'تم التعطيل');
}

function userDelete(array $me, array $b): never {
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف مطلوب');
    if ($id === (int)$me['id']) Response::err('لا يمكنك حذف حسابك');

    $u = DB::findOne('users', ['id' => $id]);
    if (!$u) Response::err('المستخدم غير موجود', 404);

    if ($u['role'] === 'admin') {
        if (DB::count('users', ['role' => 'admin', 'is_active' => 1]) <= 1) {
            Response::err('لا يمكن حذف المدير الأخير في النظام', 409);
        }
    }

    $quoteCount = DB::count('quotes', ['$or' => [['employee_id' => $id], ['client_id' => $id]]]);
    if ($quoteCount > 0) {
        Response::err("لا يمكن حذف المستخدم لأن لديه $quoteCount عرض/عروض أسعار. قم بتعطيل الحساب عوضاً عن ذلك.", 409);
    }

    DB::deleteDoc('messages',     ['$or' => [['sender_id' => $id], ['receiver_id' => $id]]]);
    DB::deleteDoc('activity_log', ['user_id' => $id]);
    DB::deleteDoc('users',        ['id' => $id]);
    DB::insertDoc('activity_log', ['user_id' => (int)$me['id'], 'action' => 'admin_user_delete', 'details' => "حذف: {$u['email']}"]);
    Response::ok([], 'تم حذف المستخدم');
}

function setPlan(array $me, array $b): never {
    $id      = (int)($b['id']        ?? 0);
    $plan    = $b['plan']     ?? '';
    $expires = $b['expires_at'] ?? null;

    if (!$id || !$plan) Response::err('البيانات ناقصة');
    if (!array_key_exists($plan, PLANS)) Response::err('خطة غير صحيحة');
    if (!DB::findOne('users', ['id' => $id])) Response::err('المستخدم غير موجود', 404);

    DB::updateDoc('users', ['id' => $id], ['plan' => $plan, 'plan_expires_at' => $expires]);
    DB::insertDoc('activity_log', ['user_id' => (int)$me['id'], 'action' => 'plan_changed', 'details' => "مستخدم $id → خطة $plan"]);
    Response::ok([], 'تم تغيير الخطة');
}

// ── All Quotes ────────────────────────────────────────────────────────
function allQuotes(): never {
    $status = $_GET['status'] ?? '';
    $match  = $status ? ['status' => $status] : [];
    $quotes = DB::aggregate('quotes', [
        ['$match'    => $match ?: (object)[]],
        ['$lookup'   => ['from' => 'users', 'localField' => 'client_id',   'foreignField' => 'id', 'as' => 'client']],
        ['$lookup'   => ['from' => 'users', 'localField' => 'employee_id', 'foreignField' => 'id', 'as' => 'employee']],
        ['$addFields' => [
            'client_name'   => ['$arrayElemAt' => ['$client.name',   0]],
            'employee_name' => ['$arrayElemAt' => ['$employee.name', 0]],
        ]],
        ['$project'  => ['client' => 0, 'employee' => 0]],
        ['$sort'     => ['created_at' => -1]],
        ['$limit'    => 200],
    ]);
    Response::ok($quotes);
}

// ── Activity Log ──────────────────────────────────────────────────────
function activityLog(): never {
    $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));
    $logs  = DB::aggregate('activity_log', [
        ['$sort'    => ['created_at' => -1]],
        ['$limit'   => $limit],
        ['$lookup'  => ['from' => 'users', 'localField' => 'user_id', 'foreignField' => 'id', 'as' => 'user']],
        ['$addFields' => [
            'user_name' => ['$arrayElemAt' => ['$user.name', 0]],
            'user_role' => ['$arrayElemAt' => ['$user.role', 0]],
        ]],
        ['$project' => ['user' => 0]],
    ]);
    Response::ok($logs);
}

// ── Plan Settings ─────────────────────────────────────────────────────
function planSettings(): never {
    Response::ok(PLANS);
}

// ── Contact Messages ──────────────────────────────────────────────────
function contactMessages(): never {
    $msgs = DB::findAll('contact_messages', [], ['sort' => ['created_at' => -1], 'limit' => 200]);
    Response::ok($msgs);
}

function contactMarkRead(array $b): never {
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف مطلوب');
    DB::updateDoc('contact_messages', ['id' => $id], ['is_read' => 1]);
    Response::ok([], 'تم التحديث');
}

function contactDelete(array $b): never {
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف مطلوب');
    DB::deleteDoc('contact_messages', ['id' => $id]);
    Response::ok([], 'تم الحذف');
}

// ── System Settings ───────────────────────────────────────────────────
function getSettings(): never {
    $rows = DB::findAll('settings');
    $map  = [];
    foreach ($rows as $r) $map[$r['key']] = $r['value'];
    Response::ok($map);
}

function saveSettings(array $me, array $b): never {
    $allowed = ['contact_email', 'whatsapp', 'site_name', 'welcome_message'];
    foreach ($allowed as $key) {
        if (array_key_exists($key, $b)) {
            DB::upsertByKey('settings', 'key', $key, ['value' => trim((string)$b[$key])]);
        }
    }
    DB::insertDoc('activity_log', ['user_id' => (int)$me['id'], 'action' => 'settings_saved', 'details' => 'تعديل إعدادات النظام']);
    Response::ok([], 'تم حفظ الإعدادات');
}
