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
    $method === 'GET' && $action === 'list'   => listQuotes($user),
    $method === 'GET' && $action === 'get'    => getQuote($user, (int)($_GET['id'] ?? 0)),
    $method === 'POST' && $action === 'create' => createQuote($user, $body),
    $method === 'POST' && $action === 'update' => updateQuote($user, $body),
    $method === 'POST' && $action === 'delete' => deleteQuote($user, $body),
    $method === 'POST' && $action === 'status' => changeStatus($user, $body),
    $method === 'GET' && $action === 'clients' => listClients($user),
    default => Response::err('إجراء غير صحيح', 400),
};

function listQuotes(array $u): never {
    $status = $_GET['status'] ?? '';
    $search = $_GET['q'] ?? '';
    $role   = $u['role'];

    $where  = ['1=1'];
    $params = [];

    if ($role === 'client') {
        $where[] = 'q.client_id=?'; $params[] = $u['id'];
    } elseif ($role === 'employee') {
        $where[] = 'q.employee_id=?'; $params[] = $u['id'];
    }
    if ($status) { $where[] = 'q.status=?'; $params[] = $status; }
    if ($search) { $where[] = "(q.title LIKE ? OR q.number LIKE ?)"; $params[] = "%$search%"; $params[] = "%$search%"; }

    $sql = "SELECT q.*, c.name as client_name, e.name as employee_name
            FROM quotes q
            LEFT JOIN users c ON c.id=q.client_id
            LEFT JOIN users e ON e.id=q.employee_id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY q.created_at DESC LIMIT 100";

    Response::ok(DB::all($sql, $params));
}

function getQuote(array $u, int $id): never {
    $q = DB::row("SELECT q.*, c.name as client_name, e.name as employee_name
                  FROM quotes q
                  LEFT JOIN users c ON c.id=q.client_id
                  LEFT JOIN users e ON e.id=q.employee_id
                  WHERE q.id=?", [$id]);
    if (!$q) Response::err('عرض السعر غير موجود', 404);
    canAccessQuote($u, $q);
    $q['items'] = DB::all("SELECT * FROM quote_items WHERE quote_id=? ORDER BY id", [$id]);
    Response::ok($q);
}

function createQuote(array $u, array $b): never {
    if ($u['role'] === 'client') Response::err('العملاء لا يمكنهم إنشاء عروض أسعار', 403);
    if (!Auth::canCreateQuote($u)) Response::err('وصلت للحد الأقصى من عروض الأسعار لهذا الشهر. يرجى ترقية الخطة.');

    $title    = trim($b['title'] ?? '');
    $clientId = (int)($b['client_id'] ?? 0);
    $items    = $b['items'] ?? [];
    $taxRate  = (float)($b['tax_rate'] ?? 15);
    $discount = (float)($b['discount'] ?? 0);
    $notes    = trim($b['notes'] ?? '');

    if (!$title)   Response::err('عنوان العرض مطلوب');
    if (!$clientId) Response::err('يرجى اختيار العميل');
    if (empty($items)) Response::err('يرجى إضافة بند واحد على الأقل');

    // Verify client exists
    $client = DB::row("SELECT id FROM users WHERE id=? AND role='client'", [$clientId]);
    if (!$client) Response::err('العميل غير موجود');

    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += (float)($item['qty'] ?? 1) * (float)($item['unit_price'] ?? 0);
    }
    $total = ($subtotal - $discount) * (1 + $taxRate / 100);

    // Generate quote number
    $count  = (int)DB::val("SELECT COUNT(*) FROM quotes") + 1;
    $number = 'QT-' . str_pad($count, 4, '0', STR_PAD_LEFT);

    DB::run("INSERT INTO quotes (number,client_id,employee_id,title,status,subtotal,tax_rate,discount,total,notes)
             VALUES (?,?,?,?,?,?,?,?,?,?)",
        [$number, $clientId, $u['id'], $title, 'draft', $subtotal, $taxRate, $discount, $total, $notes]);
    $qid = (int)DB::id();

    $ins = DB::get()->prepare("INSERT INTO quote_items (quote_id,description,qty,unit_price,total) VALUES (?,?,?,?,?)");
    foreach ($items as $item) {
        $qty   = (float)($item['qty'] ?? 1);
        $price = (float)($item['unit_price'] ?? 0);
        $ins->execute([$qid, trim($item['description'] ?? ''), $qty, $price, $qty * $price]);
    }

    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$u['id'], 'quote_created', "رقم العرض: $number"]);

    Response::ok(['id' => $qid, 'number' => $number], 'تم إنشاء عرض السعر');
}

function updateQuote(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    $q  = DB::row("SELECT * FROM quotes WHERE id=?", [$id]);
    if (!$q) Response::err('غير موجود', 404);
    canAccessQuote($u, $q);
    if ($q['status'] !== 'draft') Response::err('لا يمكن تعديل عرض تم إرساله');

    $title    = trim($b['title'] ?? $q['title']);
    $items    = $b['items'] ?? [];
    $taxRate  = (float)($b['tax_rate'] ?? $q['tax_rate']);
    $discount = (float)($b['discount'] ?? $q['discount']);
    $notes    = trim($b['notes'] ?? $q['notes']);

    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += (float)($item['qty'] ?? 1) * (float)($item['unit_price'] ?? 0);
    }
    $total = ($subtotal - $discount) * (1 + $taxRate / 100);

    DB::run("UPDATE quotes SET title=?,subtotal=?,tax_rate=?,discount=?,total=?,notes=?,updated_at=datetime('now') WHERE id=?",
        [$title, $subtotal, $taxRate, $discount, $total, $notes, $id]);

    DB::run("DELETE FROM quote_items WHERE quote_id=?", [$id]);
    $ins = DB::get()->prepare("INSERT INTO quote_items (quote_id,description,qty,unit_price,total) VALUES (?,?,?,?,?)");
    foreach ($items as $item) {
        $qty   = (float)($item['qty'] ?? 1);
        $price = (float)($item['unit_price'] ?? 0);
        $ins->execute([$id, trim($item['description'] ?? ''), $qty, $price, $qty * $price]);
    }
    Response::ok(['id' => $id], 'تم التحديث');
}

function deleteQuote(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    $q  = DB::row("SELECT * FROM quotes WHERE id=?", [$id]);
    if (!$q) Response::err('غير موجود', 404);
    if ($u['role'] !== 'admin' && (int)$q['employee_id'] !== $u['id']) Response::err('غير مسموح', 403);
    DB::run("DELETE FROM quotes WHERE id=?", [$id]);
    Response::ok([], 'تم الحذف');
}

function changeStatus(array $u, array $b): never {
    $id     = (int)($b['id'] ?? 0);
    $status = $b['status'] ?? '';
    $valid  = ['draft','sent','accepted','rejected','cancelled'];
    if (!in_array($status, $valid)) Response::err('حالة غير صحيحة');
    $q = DB::row("SELECT * FROM quotes WHERE id=?", [$id]);
    if (!$q) Response::err('غير موجود', 404);
    canAccessQuote($u, $q);
    DB::run("UPDATE quotes SET status=?,updated_at=datetime('now') WHERE id=?", [$status, $id]);
    Response::ok(['status' => $status], 'تم تحديث الحالة');
}

function listClients(array $u): never {
    if ($u['role'] === 'client') Response::err('غير مسموح', 403);
    $clients = DB::all("SELECT id, name, email, plan, created_at FROM users WHERE role='client' AND is_active=1 ORDER BY name");
    Response::ok($clients);
}

function canAccessQuote(array $u, array $q): void {
    if ($u['role'] === 'admin') return;
    if ($u['role'] === 'employee' && (int)$q['employee_id'] === $u['id']) return;
    if ($u['role'] === 'client'   && (int)$q['client_id']   === $u['id']) return;
    Response::err('غير مسموح', 403);
}
