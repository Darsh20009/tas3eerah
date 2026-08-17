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
    $method === 'GET'  && $action === 'list'        => listQuotes($user),
    $method === 'GET'  && $action === 'get'         => getQuote($user, (int)($_GET['id'] ?? 0)),
    $method === 'POST' && $action === 'create'      => createQuote($user, $body),
    $method === 'POST' && $action === 'update'      => updateQuote($user, $body),
    $method === 'POST' && $action === 'delete'      => deleteQuote($user, $body),
    $method === 'POST' && $action === 'status'      => changeStatus($user, $body),
    $method === 'GET'  && $action === 'clients'     => listClients($user),
    $method === 'POST' && $action === 'email_quote' => emailQuote($user, $body),
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
    $isClient = $u['role'] === 'client';
    if (!Auth::canCreateQuote($u)) {
        $max = PLANS[Auth::effectivePlan($u)]['max_quotes'] ?? 5;
        Response::err("وصلت للحد الأقصى ({$max} عروض هذا الشهر). يرجى ترقية الخطة.");
    }

    $title    = trim($b['title']   ?? '');
    $clientId = $isClient ? (int)$u['id'] : (int)($b['client_id'] ?? 0);
    $items    = $b['items']   ?? [];
    $taxRate  = max(0, (float)($b['tax_rate']  ?? 15));
    $discount = max(0, (float)($b['discount']  ?? 0));
    $notes    = trim($b['notes']   ?? '');

    if (!$title)       Response::err('عنوان العرض مطلوب');
    if (!$clientId)    Response::err('يرجى اختيار العميل');
    if (empty($items)) Response::err('يرجى إضافة بند واحد على الأقل');

    foreach ($items as $item) {
        if (trim($item['description'] ?? '') === '') Response::err('وصف البند مطلوب لكل بند');
    }

    // Validate client exists (for non-client creators the client must be a real client user)
    if (!$isClient) {
        $client = DB::findOne('users', ['id' => $clientId, 'role' => 'client', 'is_active' => 1]);
        if (!$client) Response::err('العميل غير موجود');
    }

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
        'employee_id' => $isClient ? 0 : (int)$u['id'],
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

function emailQuote(array $u, array $b): never {
    if ($u['role'] === 'client') Response::err('غير مسموح', 403);
    $id = (int)($b['id'] ?? 0);
    if (!$id) Response::err('معرف العرض مطلوب');

    $pipeline = quotePipeline(['id' => $id]);
    $results  = DB::aggregate('quotes', $pipeline);
    if (!$results) Response::err('عرض السعر غير موجود', 404);
    $q = $results[0];
    canAccessQuote($u, $q);

    // Get client email
    $client = DB::findOne('users', ['id' => (int)$q['client_id']]);
    if (!$client || empty($client['email'])) Response::err('لا يمكن إيجاد بريد العميل');

    $to      = $client['email'];
    $subject = "=?UTF-8?B?" . base64_encode("عرض سعر جديد: {$q['title']} — رقم {$q['number']}") . "?=";
    $fromName = base64_encode('تسعيرة');
    $headers  = implode("\r\n", [
        "From: =?UTF-8?B?{$fromName}?= <no-reply@" . parse_url(APP_URL, PHP_URL_HOST) . ">",
        "Reply-To: {$u['email']}",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "X-Mailer: Tas3eerah/1.0",
    ]);

    $itemsHtml = '';
    foreach ($q['items'] ?? [] as $it) {
        $desc  = htmlspecialchars($it['description'] ?? '', ENT_QUOTES);
        $qty   = $it['qty'] ?? 1;
        $price = number_format($it['unit_price'] ?? 0, 2);
        $tot   = number_format($it['total'] ?? 0, 2);
        $itemsHtml .= "<tr><td style='padding:8px 12px;border-bottom:1px solid #eee'>$desc</td><td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>$qty</td><td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:left'>$price ر.س</td><td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:left'>$tot ر.س</td></tr>";
    }

    $clientName  = htmlspecialchars($client['name'] ?? 'العميل', ENT_QUOTES);
    $empName     = htmlspecialchars($q['employee_name'] ?? APP_NAME_AR, ENT_QUOTES);
    $quoteTitle  = htmlspecialchars($q['title'] ?? '', ENT_QUOTES);
    $quoteNum    = htmlspecialchars($q['number'] ?? '', ENT_QUOTES);
    $quoteDate   = ($q['created_at'] ?? '—');
    $subtotal    = number_format($q['subtotal'] ?? 0, 2);
    $discount    = number_format($q['discount'] ?? 0, 2);
    $tax         = number_format(($q['subtotal'] - $q['discount']) * ($q['tax_rate'] / 100), 2);
    $total       = number_format($q['total'] ?? 0, 2);
    $taxRate     = $q['tax_rate'] ?? 15;

    $body = <<<HTML
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px">
<div style="max-width:620px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
<div style="background:#1a3d2b;padding:28px 32px;text-align:center"><h1 style="color:#d7ae61;margin:0;font-size:22px">تسعيرة</h1></div>
<div style="padding:28px 32px">
<p style="font-size:15px;color:#333">مرحباً <strong>$clientName</strong>،</p>
<p style="color:#555;font-size:14px">تلقيتَ عرض سعر جديداً من <strong>$empName</strong>.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9f9f9;border-radius:8px">
<tr><td style="padding:10px 16px;color:#666;font-size:13px">رقم العرض</td><td style="padding:10px 16px;font-weight:700">$quoteNum</td></tr>
<tr><td style="padding:10px 16px;color:#666;font-size:13px">العنوان</td><td style="padding:10px 16px;font-weight:700">$quoteTitle</td></tr>
<tr><td style="padding:10px 16px;color:#666;font-size:13px">التاريخ</td><td style="padding:10px 16px">$quoteDate</td></tr>
</table>
<h3 style="font-size:14px;color:#333;margin:20px 0 10px">بنود العرض</h3>
<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:#1a3d2b;color:#fff"><th style="padding:10px 12px;text-align:right">الوصف</th><th style="padding:10px 12px;text-align:center">الكمية</th><th style="padding:10px 12px;text-align:left">سعر الوحدة</th><th style="padding:10px 12px;text-align:left">الإجمالي</th></tr></thead>
<tbody>$itemsHtml</tbody></table>
<div style="margin-top:16px;background:#f9f9f9;border-radius:8px;padding:16px">
<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px"><span style="color:#666">المجموع الفرعي</span><span>$subtotal ر.س</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px"><span style="color:#666">خصم</span><span>- $discount ر.س</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px"><span style="color:#666">ضريبة ({$taxRate}%)</span><span>$tax ر.س</span></div>
<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:2px solid #1a3d2b;font-size:16px;font-weight:700"><span>الإجمالي</span><span style="color:#1a3d2b">$total ر.س</span></div>
</div>
<p style="margin-top:24px;font-size:13px;color:#888">يمكنك تسجيل الدخول إلى المنصة لقبول أو رفض هذا العرض.</p>
</div>
<div style="background:#f0f0f0;padding:16px 32px;text-align:center;font-size:12px;color:#999">تسعيرة — منصة التسعير الذكي</div>
</div></body></html>
HTML;

    $sent = mail($to, $subject, $body, $headers);
    if (!$sent) Response::err('تعذّر إرسال البريد. يرجى التحقق من إعداد خادم البريد.');

    DB::insertDoc('activity_log', [
        'user_id' => (int)$u['id'],
        'action'  => 'quote_emailed',
        'details' => "تم إرسال العرض $quoteNum إلى $to",
    ]);
    Response::ok([], "تم إرسال عرض السعر إلى $to");
}

function listClients(array $u): never {
    if ($u['role'] === 'client') Response::err('غير مسموح', 403);
    $clients = DB::findAll('users', ['role' => 'client', 'is_active' => 1], [
        'sort'       => ['name' => 1],
        'projection' => ['id' => 1, 'name' => 1, 'email' => 1, 'plan' => 1, 'created_at' => 1],
    ]);
    Response::ok($clients);
}
