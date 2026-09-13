<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

$user   = Auth::require();
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? $_GET['action'] ?? '';

match (true) {
    $action === 'inbox'        => inbox($user),
    $action === 'thread'       => thread($user, (int)($body['id'] ?? $_GET['id'] ?? 0)),
    $action === 'send'         => send($user, $body),
    $action === 'upgrade_request' => upgradeRequest($user, $body),
    $action === 'read'         => markRead($user, $body),
    $action === 'contacts'     => contacts($user),
    $action === 'unread_count' => unreadCount($user),
    default => Response::err('إجراء غير معروف', 400),
};

function inbox(array $u): never {
    $uid  = (int)$u['id'];
    $msgs = DB::aggregate('messages', [
        ['$match' => [
            '$or'       => [['receiver_id' => $uid], ['sender_id' => $uid]],
            'parent_id' => null,
        ]],
        ['$lookup' => ['from' => 'users', 'localField' => 'sender_id',   'foreignField' => 'id', 'as' => 'sender']],
        ['$lookup' => ['from' => 'users', 'localField' => 'receiver_id', 'foreignField' => 'id', 'as' => 'receiver']],
        ['$addFields' => [
            'sender_name'   => ['$arrayElemAt' => ['$sender.name',   0]],
            'receiver_name' => ['$arrayElemAt' => ['$receiver.name', 0]],
        ]],
        ['$project' => ['sender' => 0, 'receiver' => 0]],
        ['$sort'    => ['created_at' => -1]],
        ['$limit'   => 50],
    ]);

    foreach ($msgs as &$m) {
        $m['unread'] = DB::count('messages', [
            '$or'         => [['id' => (int)$m['id']], ['parent_id' => (int)$m['id']]],
            'receiver_id' => $uid,
            'is_read'     => 0,
        ]);
    }
    unset($m);

    Response::ok($msgs);
}

function thread(array $u, int $id): never {
    $uid  = (int)$u['id'];
    $root = DB::findOne('messages', ['id' => $id]);
    if (!$root) Response::err('المحادثة غير موجودة', 404);
    if ((int)$root['sender_id'] !== $uid && (int)$root['receiver_id'] !== $uid) {
        Response::err('غير مسموح', 403);
    }

    $msgs = DB::aggregate('messages', [
        ['$match' => ['$or' => [['id' => $id], ['parent_id' => $id]]]],
        ['$lookup' => ['from' => 'users', 'localField' => 'sender_id', 'foreignField' => 'id', 'as' => 'sender']],
        ['$addFields' => ['sender_name' => ['$arrayElemAt' => ['$sender.name', 0]]]],
        ['$project' => ['sender' => 0]],
        ['$sort'    => ['created_at' => 1]],
    ]);

    // Mark thread as read for this user
    DB::updateDoc('messages', [
        '$or'         => [['id' => $id], ['parent_id' => $id]],
        'receiver_id' => $uid,
    ], ['is_read' => 1]);

    Response::ok($msgs);
}

function send(array $u, array $b): never {
    $to      = (int)($b['receiver_id'] ?? 0);
    $subject = trim($b['subject'] ?? '');
    $body    = trim($b['body']    ?? '');
    $parent  = isset($b['parent_id']) ? (int)$b['parent_id'] : null;

    if (!$body) Response::err('نص الرسالة مطلوب');
    if (!$to)   Response::err('يرجى تحديد المستلم');

    // Monthly limit
    $plan    = Auth::effectivePlan($u);
    $maxMsgs = PLANS[$plan]['max_msgs'] ?? PLANS['free']['max_msgs'];
    if ($maxMsgs !== -1) {
        $month = date('Y-m');
        $sent  = DB::count('messages', [
            'sender_id'  => (int)$u['id'],
            'created_at' => ['$regex' => '^' . $month],
        ]);
        if ($sent >= $maxMsgs) {
            Response::err("وصلت للحد الأقصى من الرسائل لهذا الشهر ($maxMsgs). يرجى ترقية الخطة.");
        }
    }

    if ($to === (int)$u['id']) Response::err('لا يمكنك إرسال رسالة لنفسك');
    if (!DB::findOne('users', ['id' => $to, 'is_active' => 1])) Response::err('المستلم غير موجود');

    if ($parent !== null) {
        $parentMsg = DB::findOne('messages', ['id' => $parent, 'parent_id' => null]);
        if (!$parentMsg) Response::err('المحادثة الأصلية غير موجودة', 404);
        $isParticipant = ((int)$parentMsg['sender_id'] === (int)$u['id'] || (int)$parentMsg['receiver_id'] === (int)$u['id']);
        if (!$isParticipant) Response::err('غير مسموح بالرد على هذه المحادثة', 403);
        $expected = ((int)$parentMsg['sender_id'] === (int)$u['id']) ? (int)$parentMsg['receiver_id'] : (int)$parentMsg['sender_id'];
        if ($to !== $expected) Response::err('المستلم لا يطابق طرفي المحادثة', 403);
    }

    $id = DB::insertDoc('messages', [
        'sender_id'   => (int)$u['id'],
        'receiver_id' => $to,
        'subject'     => $subject ?: null,
        'body'        => $body,
        'parent_id'   => $parent,
        'is_read'     => 0,
    ]);
    DB::insertDoc('activity_log', [
        'user_id' => (int)$u['id'],
        'action'  => 'message_sent',
        'details' => "إلى المستخدم: $to",
    ]);
    Response::ok(['id' => $id], 'تم الإرسال');
}

function upgradeRequest(array $u, array $b): never {
    if (($u['role'] ?? '') !== 'client') {
        Response::err('طلبات الترقية متاحة للعملاء فقط', 403);
    }

    $to       = (int)($b['receiver_id'] ?? 0);
    $plan     = trim((string)($b['plan'] ?? ''));
    $planName = trim((string)($b['plan_name'] ?? $plan));
    $month    = date('Y-m');

    if (!$to || !$plan) Response::err('بيانات طلب الترقية ناقصة');
    if (!array_key_exists($plan, PLANS)) Response::err('الخطة المطلوبة غير صحيحة');

    $admin = DB::findOne('users', ['id' => $to, 'role' => 'admin', 'is_active' => 1]);
    if (!$admin) Response::err('حساب الإدارة غير موجود');

    $alreadyRequested = DB::count('messages', [
        'sender_id'  => (int)$u['id'],
        'receiver_id'=> $to,
        'subject'    => "طلب ترقية إلى خطة $planName",
        'created_at' => ['$regex' => '^' . $month],
    ]);
    if ($alreadyRequested > 0) {
        Response::err('تم إرسال طلب ترقية لهذه الخطة هذا الشهر مسبقاً');
    }

    $id = DB::insertDoc('messages', [
        'sender_id'   => (int)$u['id'],
        'receiver_id' => $to,
        'subject'     => "طلب ترقية إلى خطة $planName",
        'body'        => "يرغب العميل في الترقية إلى خطة $planName ($plan). يرجى التواصل معه لاستكمال الطلب.",
        'parent_id'   => null,
        'is_read'     => 0,
    ]);
    DB::insertDoc('activity_log', [
        'user_id' => (int)$u['id'],
        'action'  => 'upgrade_request',
        'details' => "طلب ترقية إلى خطة $planName",
    ]);

    Response::ok(['id' => $id], 'تم إرسال طلب الترقية');
}

function markRead(array $u, array $b): never {
    $id  = (int)($b['id'] ?? 0);
    $uid = (int)$u['id'];
    DB::updateDoc('messages', [
        '$or'         => [['id' => $id], ['parent_id' => $id]],
        'receiver_id' => $uid,
    ], ['is_read' => 1]);
    Response::ok([], 'تم');
}

function contacts(array $u): never {
    $role = $u['role'];
    $filter = ['is_active' => 1];
    if ($role === 'admin') {
        $filter['id'] = ['$ne' => (int)$u['id']];
    } elseif ($role === 'employee') {
        $filter['role'] = ['$in' => ['client', 'admin']];
    } else {
        $filter['role'] = ['$in' => ['employee', 'admin']];
    }
    $list = DB::findAll('users', $filter, [
        'sort'       => ['name' => 1],
        'projection' => ['id' => 1, 'name' => 1, 'email' => 1, 'role' => 1, 'plan' => 1],
    ]);
    Response::ok($list);
}

function unreadCount(array $u): never {
    $count = DB::count('messages', [
        'receiver_id' => (int)$u['id'],
        'is_read'     => 0,
    ]);
    Response::ok(['count' => $count]);
}
