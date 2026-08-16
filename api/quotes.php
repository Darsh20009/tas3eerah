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
    $method === 'GET' && $action === 'list'    => listQuotes($user),
    $method === 'GET' && $action === 'get'     => getQuote($user, (int)($_GET['id'] ?? 0)),
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

    if ($role === 'client')   { $where[] = 'q.client_id=?';   $params[] = $u['id']; }
    elseif ($role === 'employee') { $where[] = 'q.employee_id=?'; $params[] = $u['id']; }

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
    if (!Auth::canCreateQuote($u)) Response::err('وصلت للحد الأقصى من عروض الأسعار لهذا الشهر. يرجى ترقية الخطة');

    $title    = trim($b['title'] ?? '');
    $clientId = (int)($b['client_id'] ?? 0);
    $items    = $b['items'] ?? [];
    $taxRate  = max(0, (float)($b['tax_rate'] ?? 15));
    $discount = max(0, (float)($b['discount'] ?? 0));
    $notes    = trim($b['notes'] ?? '');

    if (!$title)        Response::err('عنوان العرض مطلوب');
    if (!$clientId)     Response::err('يرجى اختيار العميل');
    if (empty($items))  Response::err('يرجى إضافة بند واحد على الأقل');

    foreach ($items as $item) {
        if (trim($item['description'] ?? '') === '') Response::err('وصف البند مطلوب لكل بند');
    }

    $client = DB::row("SELECT id FROM users WHERE id=? AND role='client' AND is_active=1", [$clientId]);
    if (!$client) Response::err('العميل غير موجود');

    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += (float)($item['qty'] ?? 1) * (float)($item['unit_price'] ?? 0);
    }
    if ($discount > $subtotal) Response::err('الخصم لا يمكن أن يتجاوز الإجمالي الفرعي');
    $total = ($subtotal - $discount) * (1 + $taxRate / 100);

    $db = DB::get();
    try {
        $db->beginTransaction();

        // Atomic quote number using a dedicated counter table
        $db->exec("CREATE TABLE IF NOT EXISTS quote_counter (last_num INTEGER NOT NULL DEFAULT 0)");
        $db->exec("INSERT OR IGNORE INTO quote_counter (last_num) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM quote_counter)");
        $db->exec("UPDATE quote_counter SET last_num = last_num + 1");
        $num    = (int)$db->query("SELECT last_num FROM quote_counter")->fetchColumn();
        $number = 'QT-' . str_pad($num, 4, '0', STR_PAD_LEFT);

        DB::run(
            "INSERT INTO quotes (number,client_id,employee_id,title,status,subtotal,tax_rate,discount,total,notes)
             VALUES (?,?,?,?,?,?,?,?,?,?)",
            [$number, $clientId, $u['id'], $title, 'draft', $subtotal, $taxRate, $discount, $total, $notes]
        );
        $qid = (int)DB::id();

        $ins = $db->prepare("INSERT INTO quote_items (quote_id,description,qty,unit_price,total) VALUES (?,?,?,?,?)");
        foreach ($items as $item) {
            $qty   = (float)($item['qty'] ?? 1);
            $price = (float)($item['unit_price'] ?? 0);
            $ins->execute([$qid, trim($item['description']), $qty, $price, $qty * $price]);
        }

        DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
            [$u['id'], 'quote_created', "رقم العرض: $number"]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        Response::err('فشل إنشاء العرض يرجى المحاولة مجدداً');
    }

    Response::ok(['id' => $qid, 'number' => $number], 'تم إنشاء عرض السعر');
}

function updateQuote(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    $q  = DB::row("SELECT * FROM quotes WHERE id=?", [$id]);
    if (!$q) Response::err('غير موجود', 404);
    canAccessQuote($u, $q);
    if ($u['role'] === 'client') Response::err('العملاء لا يمكنهم تعديل العروض', 403);
    if ($q['status'] !== 'draft') Response::err('لا يمكن تعديل عرض تم إرساله');

    $title    = trim($b['title'] ?? $q['title']);
    $items    = $b['items'] ?? [];
    $taxRate  = max(0, (float)($b['tax_rate'] ?? $q['tax_rate']));
    $discount = max(0, (float)($b['discount'] ?? $q['discount']));
    $notes    = trim($b['notes'] ?? $q['notes']);

    if (!$title) Response::err('عنوان العرض مطلوب');

    $subtotal = 0;
    foreach ($items as $item) {
        if (trim($item['description'] ?? '') === '') Response::err('وصف البند مطلوب لكل بند');
        $subtotal += (float)($item['qty'] ?? 1) * (float)($item['unit_price'] ?? 0);
    }
    if ($discount > $subtotal && $subtotal > 0) Response::err('الخصم لا يمكن أن يتجاوز الإجمالي الفرعي');
    $total = ($subtotal - $discount) * (1 + $taxRate / 100);

    $db = DB::get();
    try {
        $db->beginTransaction();

        DB::run(
            "UPDATE quotes SET title=?,subtotal=?,tax_rate=?,discount=?,total=?,notes=?,updated_at=datetime('now') WHERE id=?",
            [$title, $subtotal, $taxRate, $discount, $total, $notes, $id]
        );

        if (!empty($items)) {
            DB::run("DELETE FROM quote_items WHERE quote_id=?", [$id]);
            $ins = $db->prepare("INSERT INTO quote_items (quote_id,description,qty,unit_price,total) VALUES (?,?,?,?,?)");
            foreach ($items as $item) {
                $qty   = (float)($item['qty'] ?? 1);
                $price = (float)($item['unit_price'] ?? 0);
                $ins->execute([$id, trim($item['description']), $qty, $price, $qty * $price]);
            }
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        Response::err('فشل تحديث العرض يرجى المحاولة مجدداً');
    }

    Response::ok(['id' => $id], 'تم التحديث');
}

function deleteQuote(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    $q  = DB::row("SELECT * FROM quotes WHERE id=?", [$id]);
    if (!$q) Response::err('غير موجود', 404);
    if ($u['role'] === 'client') Response::err('العملاء لا يمكنهم حذف العروض', 403);
    if ($u['role'] !== 'admin' && (int)$q['employee_id'] !== $u['id']) Response::err('غير مسموح', 403);
    DB::run("DELETE FROM quotes WHERE id=?", [$id]);
    Response::ok([], 'تم الحذف');
}

function changeStatus(array $u, array $b): never {
    $id     = (int)($b['id'] ?? 0);
    $status = $b['status'] ?? '';

    $q = DB::row("SELECT * FROM quotes WHERE id=?", [$id]);
    if (!$q) Response::err('غير موجود', 404);
    canAccessQuote($u, $q);

    $current = $q['status'];
    $role    = $u['role'];

    // Permission matrix per role
    $allowed = match ($role) {
        'admin'    => ['draft', 'sent', 'accepted', 'rejected', 'cancelled'],
        'employee' => match ($current) {
            'draft'      => ['sent', 'cancelled'],
            'sent'       => ['draft', 'cancelled'],
            'cancelled'  => ['draft'],
            default      => [],
        },
        'client'   => match ($current) {
            'sent'  => ['accepted', 'rejected'],
            default => [],
        },
        default    => [],
    };

    if (!in_array($status, $allowed, true)) {
        Response::err("لا يمكنك تغيير الحالة من «$current» إلى «$status»", 403);
    }

    DB::run("UPDATE quotes SET status=?,updated_at=datetime('now') WHERE id=?", [$status, $id]);
    DB::run("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)",
        [$u['id'], 'quote_status_changed', "عرض $id: $current → $status"]);
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
