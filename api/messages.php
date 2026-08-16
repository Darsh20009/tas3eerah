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
    $action === 'read'         => markRead($user, $body),
    $action === 'contacts'     => contacts($user),
    $action === 'unread_count' => unreadCount($user),
    default => Response::err('إجراء غير معروف', 400),
};

function inbox(array $u): never {
    $msgs = DB::all(
        "SELECT m.*, s.name as sender_name, r.name as receiver_name
         FROM messages m
         JOIN users s ON s.id=m.sender_id
         JOIN users r ON r.id=m.receiver_id
         WHERE (m.receiver_id=? OR m.sender_id=?) AND m.parent_id IS NULL
         ORDER BY m.created_at DESC LIMIT 50",
        [$u['id'], $u['id']]
    );
    foreach ($msgs as &$m) {
        $m['unread'] = (int)DB::val(
            "SELECT COUNT(*) FROM messages WHERE (id=? OR parent_id=?) AND receiver_id=? AND is_read=0",
            [$m['id'], $m['id'], $u['id']]
        );
    }
    Response::ok($msgs);
}

function thread(array $u, int $id): never {
    $root = DB::row("SELECT * FROM messages WHERE id=?", [$id]);
    if (!$root) Response::err('المحادثة غير موجودة', 404);
    if ($root['sender_id'] != $u['id'] && $root['receiver_id'] != $u['id'])
        Response::err('غير مسموح', 403);

    $msgs = DB::all(
        "SELECT m.*, s.name as sender_name
         FROM messages m JOIN users s ON s.id=m.sender_id
         WHERE m.id=? OR m.parent_id=?
         ORDER BY m.created_at ASC",
        [$id, $id]
    );
    DB::run("UPDATE messages SET is_read=1 WHERE (id=? OR parent_id=?) AND receiver_id=?", [$id, $id, $u['id']]);
    Response::ok($msgs);
}

function send(array $u, array $b): never {
    $to      = (int)($b['receiver_id'] ?? 0);
    $subject = trim($b['subject'] ?? '');
    $body    = trim($b['body'] ?? '');
    $parent  = isset($b['parent_id']) ? (int)$b['parent_id'] : null;

    if (!$body) Response::err('نص الرسالة مطلوب');
    if (!$to)   Response::err('يرجى تحديد المستلم');
    if ($to === $u['id']) Response::err('لا يمكنك إرسال رسالة لنفسك');
    if (!DB::val("SELECT id FROM users WHERE id=? AND is_active=1", [$to]))
        Response::err('المستلم غير موجود');

    // Validate parent_id: sender must be a participant in the parent conversation
    if ($parent !== null) {
        $parentMsg = DB::row("SELECT * FROM messages WHERE id=? AND parent_id IS NULL", [$parent]);
        if (!$parentMsg) Response::err('المحادثة الأصلية غير موجودة', 404);
        $isParticipant = ($parentMsg['sender_id'] == $u['id'] || $parentMsg['receiver_id'] == $u['id']);
        if (!$isParticipant) Response::err('غير مسموح بالرد على هذه المحادثة', 403);

        // Reply must go to the other party in the conversation
        $expectedReceiver = ($parentMsg['sender_id'] == $u['id'])
            ? $parentMsg['receiver_id']
            : $parentMsg['sender_id'];
        if ($to !== (int)$expectedReceiver) {
            Response::err('المستلم لا يطابق طرفي المحادثة', 403);
        }
    }

    DB::run(
        "INSERT INTO messages (sender_id,receiver_id,subject,body,parent_id) VALUES (?,?,?,?,?)",
        [$u['id'], $to, $subject ?: null, $body, $parent]
    );
    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$u['id'], 'message_sent', "إلى المستخدم: $to"]);
    Response::ok(['id' => (int)DB::id()], 'تم الإرسال');
}

function markRead(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    // Only mark as read if user is the receiver
    DB::run(
        "UPDATE messages SET is_read=1 WHERE (id=? OR parent_id=?) AND receiver_id=?",
        [$id, $id, $u['id']]
    );
    Response::ok([], 'تم');
}

function contacts(array $u): never {
    $role = $u['role'];
    if ($role === 'admin') {
        $list = DB::all(
            "SELECT id,name,email,role,plan FROM users WHERE id!=? AND is_active=1 ORDER BY name",
            [$u['id']]
        );
    } elseif ($role === 'employee') {
        $list = DB::all(
            "SELECT id,name,email,role,plan FROM users WHERE role IN ('client','admin') AND is_active=1 ORDER BY name"
        );
    } else {
        $list = DB::all(
            "SELECT id,name,email,role,plan FROM users WHERE role IN ('employee','admin') AND is_active=1 ORDER BY name"
        );
    }
    Response::ok($list);
}

function unreadCount(array $u): never {
    $count = (int)DB::val(
        "SELECT COUNT(*) FROM messages WHERE receiver_id=? AND is_read=0",
        [$u['id']]
    );
    Response::ok(['count' => $count]);
}
