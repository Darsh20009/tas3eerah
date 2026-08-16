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
    $method === 'GET'  && $action === 'list'    => listQuotes($user),
    $method === 'GET'  && $action === 'get'     => getQuote($user, (int)($_GET['id'] ?? 0)),
    $method === 'POST' && $action === 'create'  => createQuote($user, $body),
    $method === 'POST' && $action === 'update'  => updateQuote($user, $body),
    $method === 'POST' && $action === 'delete'  => deleteQuote($user, $body),
    $method === 'POST' && $action === 'status'  => changeStatus($user, $body),
    $method === 'GET'  && $action === 'clients' => listClients($user),
    default => Response::err('إجراء غير صحيح', 400),
};

// ── helpers ──────────────────────────────────────────────────────────
function canAccessQuote(array $u, array $q): void {
    if ($u['role'] === 'admin') return;
    if ($u['role'] === 'employee' && (int)$q['employee_id'] === (int)$u['id']) return;
    if ($u['role'] === 'client'   && (int)$q['client_id']   === (int)$u['id']) return;
    Response::err('غير مسموح', 403);
}

function quotePipeline(array $match): array {
    return [
        ['$match'   => $match ?: (object)[]],
        ['$lookup'  => ['from' => 'users', 'localField' => 'client_id',   'foreignField' => 'id', 'as' => 'client']],
        ['$lookup'  => ['from' => 'users', 'localField' => 'employee_id', 'foreignField' => 'id', 'as' => 'employee']],
        ['$addFields' => [
            'client_name'   => ['$arrayElemAt' => ['$client.name',   0]],
            'employee_name' => ['$arrayElemAt' => ['$employee.name', 0]],
        ]],
        ['$project' => ['client' => 0, 'employee' => 0]],
    ];
}

function buildItems(array $items): array {
    $processed = [];
    foreach ($items as $i => $item) {
        $qty   = max(0.001, (float)($item['qty']        ?? 1));
        $price = max(0,     (float)($item['unit_price'] ?? 0));
        $processed[] = [
            'id'          => $i + 1,
            'description' => trim($item['description']),
            'qty'         => $qty,
            'unit_price'  => $price,
            'total'       => round($qty * $price, 4),
        ];
    }
    return $processed;
}

// ── actions ───────────────────────────────────────────────────────────
function listQuotes(array $u): never {
    $status = $_GET['status'] ?? '';
    $search = $_GET['q']      ?? '';
    $role   = $u['role'];

    $match = [];
    if ($role === 'client')   $match['client_id']   = (int)$u['id'];
    if ($role === 'employee') $match['employee_id']  = (int)$u['id'];
    if ($status) $match['status'] = $status;
    if ($search) $match['$or'] = [
        ['title'  => ['$regex' => $search, '$options' => 'i']],
        ['number' => ['$regex' => $search, '$options' => 'i']],
    ];

    $pipeline = quotePipeline($match);
    $pipeline[] = ['$sort'  => ['created_at' => -1]];
    $pipeline[] = ['$limit' => 100];

    Response::ok(DB::aggregate('quotes', $pipeline));
}

function getQuote(array $u, int $id): never {
    $pipeline   = quotePipeline(['id' => $id]);
    $results    = DB::aggregate('quotes', $pipeline);
    if (!$results) Response::err('عرض السعر غير موجود', 404);
    $q = $results[0];
    canAccessQuote($u, $q);
    if (!isset($q['items'])) $q['items'] = [];
    Response::ok($q);
}

function createQuote(array $u, array $b): never {
    if ($u['role'] === 'client') Response::err('العملاء لا يمكنهم إنشاء عروض أسعار', 403);
    if (!Auth::canCreateQuote($u)) Response::err('وصلت للحد الأقصى من عروض الأسعار لهذا الشهر. يرجى ترقية الخطة');

    $title    = trim($b['title']    ?? '');
    $clientId = (int)($b['client_id'] ?? 0);
    $items    = $b['items']    ?? [];
    $taxRate  = max(0, (float)($b['tax_rate']  ?? 15));
    $discount = max(0, (float)($b['discount']  ?? 0));
    $notes    = trim($b['notes']    ?? '');

    if (!$title)        Response::err('عنوان العرض مطلوب');
    if (!$clientId)     Response::err('يرجى اختيار العميل');
    if (empty($items))  Response::err('يرجى إضافة بند واحد على الأقل');

    foreach ($items as $item) {
        if (trim($item['description'] ?? '') === '') Response::err('وصف البند مطلوب لكل بند');
    }

    $client = DB::findOne('users', ['id' => $clientId, 'role' => 'client', 'is_active' => 1]);
    if (!$client) Response::err('العميل غير موجود');

    $subtotal = 0;
    foreach ($items as $item) {
        $qty   = max(0.001, (float)($item['qty']        ?? 1));
        $price = max(0,     (float)($item['unit_price'] ?? 0));
        if (!is_finite($qty) || !is_finite($price)) Response::err('قيمة غير صالحة في أحد البنود');
        $subtotal += $qty * $price;
    }
    if ($discount > $subtotal) Response::err('الخصم لا يمكن أن يتجاوز الإجمالي الفرعي');
    $taxRate = min($taxRate, 100);
    $total   = ($subtotal - $discount) * (1 + $taxRate / 100);

    $number = DB::nextQuoteNumber();

    $qid = DB::insertDoc('quotes', [
        'number'      => $number,
        'client_id'   => $clientId,
        'employee_id' => (int)$u['id'],
        'title'       => $title,
        'status'      => 'draft',
        'subtotal'    => round($subtotal, 4),
        'tax_rate'    => $taxRate,
        'discount'    => $discount,
        'total'       => round($total, 4),
        'notes'       => $notes,
        'items'       => buildItems($items),
        'updated_at'  => date('Y-m-d H:i:s'),
    ]);

    DB::insertDoc('activity_log', [
        'user_id' => (int)$u['id'],
        'action'  => 'quote_created',
        'details' => "رقم العرض: $number",
    ]);

    Response::ok(['id' => $qid, 'number' => $number], 'تم إنشاء عرض السعر');
}

function updateQuote(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    $q  = DB::findOne('quotes', ['id' => $id]);
    if (!$q) Response::err('غير موجود', 404);
    canAccessQuote($u, $q);
    if ($u['role'] === 'client') Response::err('العملاء لا يمكنهم تعديل العروض', 403);
    if ($q['status'] !== 'draft') Response::err('لا يمكن تعديل عرض تم إرساله');

    $title    = trim($b['title']    ?? $q['title']);
    $items    = $b['items']    ?? [];
    $taxRate  = max(0, (float)($b['tax_rate']  ?? $q['tax_rate']));
    $discount = max(0, (float)($b['discount']  ?? $q['discount']));
    $notes    = trim($b['notes']    ?? $q['notes'] ?? '');

    if (!$title)       Response::err('عنوان العرض مطلوب');
    if (empty($items)) Response::err('يرجى إضافة بند واحد على الأقل');

    $subtotal = 0;
    foreach ($items as $item) {
        if (trim($item['description'] ?? '') === '') Response::err('وصف البند مطلوب لكل بند');
        $qty   = max(0.001, (float)($item['qty']        ?? 1));
        $price = max(0,     (float)($item['unit_price'] ?? 0));
        if (!is_finite($qty) || !is_finite($price)) Response::err('قيمة غير صالحة في أحد البنود');
        $subtotal += $qty * $price;
    }
    if ($discount > $subtotal && $subtotal > 0) Response::err('الخصم لا يمكن أن يتجاوز الإجمالي الفرعي');
    $taxRate = min($taxRate, 100);
    $total   = ($subtotal - $discount) * (1 + $taxRate / 100);

    DB::updateDoc('quotes', ['id' => $id], [
        'title'      => $title,
        'subtotal'   => round($subtotal, 4),
        'tax_rate'   => $taxRate,
        'discount'   => $discount,
        'total'      => round($total, 4),
        'notes'      => $notes,
        'items'      => buildItems($items),
        'updated_at' => date('Y-m-d H:i:s'),
    ]);

    Response::ok(['id' => $id], 'تم التحديث');
}

function deleteQuote(array $u, array $b): never {
    $id = (int)($b['id'] ?? 0);
    $q  = DB::findOne('quotes', ['id' => $id]);
    if (!$q) Response::err('غير موجود', 404);
    if ($u['role'] === 'client') Response::err('العملاء لا يمكنهم حذف العروض', 403);
    if ($u['role'] !== 'admin' && (int)$q['employee_id'] !== (int)$u['id']) Response::err('غير مسموح', 403);
    DB::deleteDoc('quotes', ['id' => $id]);
    Response::ok([], 'تم الحذف');
}

function changeStatus(array $u, array $b): never {
    $id     = (int)($b['id']     ?? 0);
    $status =        $b['status'] ?? '';

    $q = DB::findOne('quotes', ['id' => $id]);
    if (!$q) Response::err('غير موجود', 404);
    canAccessQuote($u, $q);

    $current = $q['status'];
    $role    = $u['role'];

    $allowed = match ($role) {
        'admin'    => ['draft', 'sent', 'accepted', 'rejected', 'cancelled'],
        'employee' => match ($current) {
            'draft'     => ['sent', 'cancelled'],
            'sent'      => ['draft', 'cancelled'],
            'cancelled' => ['draft'],
            default     => [],
        },
        'client' => match ($current) {
            'sent'  => ['accepted', 'rejected'],
            default => [],
        },
        default => [],
    };

    if (!in_array($status, $allowed, true)) {
        Response::err("لا يمكنك تغيير الحالة من «$current» إلى «$status»", 403);
    }

    DB::updateDoc('quotes', ['id' => $id], [
        'status'     => $status,
        'updated_at' => date('Y-m-d H:i:s'),
    ]);
    DB::insertDoc('activity_log', [
        'user_id' => (int)$u['id'],
        'action'  => 'quote_status_changed',
        'details' => "عرض $id: $current → $status",
    ]);
    Response::ok(['status' => $status], 'تم تحديث الحالة');
}

function listClients(array $u): never {
    if ($u['role'] === 'client') Response::err('غير مسموح', 403);
    $clients = DB::findAll('users', ['role' => 'client', 'is_active' => 1], [
        'sort'       => ['name' => 1],
        'projection' => ['id' => 1, 'name' => 1, 'email' => 1, 'plan' => 1, 'created_at' => 1],
    ]);
    Response::ok($clients);
}
