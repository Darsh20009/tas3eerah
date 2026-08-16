<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

Auth::start();
$user          = Auth::require();
$role          = $user['role'];
$effectivePlan = Auth::effectivePlan($user);
$plan          = PLANS[$effectivePlan] ?? PLANS['free'];
$isPaid        = in_array($effectivePlan, ['pro', 'enterprise']);

$roleLabel = ['admin' => 'مدير النظام', 'employee' => 'موظف', 'client' => 'عميل'][$role] ?? $role;
$planName  = $plan['name_ar'];

// Expiry warning banner
$showExpiryBanner = false;
$expiryBannerMsg  = '';
$expiryExpired    = false;
if ($user['plan_expires_at'] && $user['plan'] !== 'free') {
    $expiry   = strtotime($user['plan_expires_at']);
    $daysLeft = (int)ceil(($expiry - time()) / 86400);
    if ($daysLeft <= 0) {
        $showExpiryBanner = true;
        $expiryExpired    = true;
        $expiryBannerMsg  = 'انتهت صلاحية خطتك — يتم التعامل معك كمستخدم مجاني حتى تجديد الاشتراك';
    } elseif ($daysLeft <= 7) {
        $showExpiryBanner = true;
        $expiryBannerMsg  = "تنتهي خطتك ({$plan['name_ar']}) خلال $daysLeft " . ($daysLeft === 1 ? 'يوم' : 'أيام') . ' · تواصل مع المدير للتجديد';
    }
}

function toolSaveBtn(bool $paid, string $slug, string $name): string {
  $style = 'margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.15)';
  if ($paid) {
    return "<div style='$style'><button class='btn btn-success w-full' onclick=\"openToolQuote('$slug','$name')\">💾 حفظ كعرض سعر</button></div>";
  }
  return "<div style='$style'><button class='btn btn-ghost w-full' onclick='showPlanUpgrade()'>🔒 حفظ كعرض سعر — يتطلب خطة محترف</button></div>";
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تسعيرة | لوحة التحكم</title>
  <link rel="icon" type="image/png" href="/assets/logo.png">
  <link rel="stylesheet" href="/assets/css/app.css?v=<?= filemtime(__DIR__.'/../assets/css/app.css') ?>">
  <meta name="csrf-token" content="<?= htmlspecialchars(Auth::csrfToken(), ENT_QUOTES) ?>">
</head>
<body>
<div class="app-shell">

<!-- Mobile sidebar overlay -->
<div class="sb-overlay" id="sbOverlay" onclick="closeSidebar()"></div>

<!-- ═══ SIDEBAR ═══ -->
<aside class="sidebar" id="sidebar">
  <button class="sb-close-btn" onclick="closeSidebar()" aria-label="إغلاق القائمة">✕</button>
  <div class="sb-logo">
    <img class="sb-logo-img" src="/assets/logo.png" alt="تسعيرة">
  </div>
  <div class="sb-gold-stripe"></div>
  <div class="sb-user">
    <div class="sb-user-name"><?= htmlspecialchars($user['name']) ?></div>
    <div class="sb-user-role"><?= $roleLabel ?></div>
    <div class="sb-plan"><?= $planName ?></div>
  </div>

  <nav class="sb-nav">
    <!-- Common -->
    <div class="sb-section">الرئيسية</div>
    <button class="sb-item active" data-panel="overview" onclick="nav(this)">
      <span class="sb-icon">◈</span> نظرة عامة
    </button>

    <?php if ($role === 'employee' || $role === 'admin'): ?>
    <div class="sb-section">عروض الأسعار</div>
    <?php if ($role === 'employee'): ?>
    <button class="sb-item" data-panel="quote-new" onclick="nav(this)">
      <span class="sb-icon">✦</span> عرض سعر جديد
    </button>
    <?php endif; ?>
    <button class="sb-item" data-panel="quotes" onclick="nav(this)">
      <span class="sb-icon">◧</span> <?= $role === 'admin' ? 'كل عروض الأسعار' : 'عروضي' ?>
    </button>
    <?php endif; ?>

    <?php if ($role === 'client'): ?>
    <div class="sb-section">عروض الأسعار</div>
    <button class="sb-item" data-panel="quotes" onclick="nav(this)">
      <span class="sb-icon">◧</span> عروضي
    </button>
    <?php endif; ?>

    <?php if ($role === 'employee' || $role === 'admin'): ?>
    <div class="sb-section">العملاء</div>
    <button class="sb-item" data-panel="clients" onclick="nav(this)">
      <span class="sb-icon">◎</span> العملاء
    </button>
    <?php endif; ?>

    <div class="sb-section">التواصل</div>
    <button class="sb-item" data-panel="messages" onclick="nav(this)">
      <span class="sb-icon">◉</span> الرسائل
      <span class="sb-badge hidden" id="unreadBadge">0</span>
    </button>

    <div class="sb-section">الأدوات</div>
    <button class="sb-item" data-panel="tools" onclick="nav(this)">
      <span class="sb-icon">◈</span> أدوات التسعير
    </button>

    <?php if ($role === 'admin'): ?>
    <div class="sb-section">الإدارة</div>
    <button class="sb-item" data-panel="users" onclick="nav(this)">
      <span class="sb-icon">◎</span> المستخدمون
    </button>
    <button class="sb-item" data-panel="subscriptions" onclick="nav(this)">
      <span class="sb-icon">◈</span> الاشتراكات
    </button>
    <button class="sb-item" data-panel="activity" onclick="nav(this)">
      <span class="sb-icon">◑</span> سجل النشاط
    </button>
    <?php endif; ?>

    <div class="sb-section">الحساب</div>
    <button class="sb-item" data-panel="account" onclick="nav(this)">
      <span class="sb-icon">◉</span> حسابي
    </button>
  </nav>

  <div class="sb-footer">
    <button class="sb-logout" onclick="doLogout()">
      <span>⊗</span> تسجيل الخروج
    </button>
  </div>
</aside>

<!-- ═══ MAIN ═══ -->
<div class="main-area">
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger" id="hamburgerBtn" onclick="openSidebar()" aria-label="القائمة">
        <span></span><span></span><span></span>
      </button>
      <div class="topbar-title" id="topbarTitle">نظرة عامة</div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-ghost btn-sm" onclick="toggleLang()" id="langBtn">EN</button>
      <?php if ($role === 'employee' || $role === 'admin'): ?>
      <button class="btn btn-primary btn-sm" onclick="nav(document.querySelector('[data-panel=quote-new]') || document.querySelector('[data-panel=quotes]'))">
        + عرض سعر
      </button>
      <?php endif; ?>
    </div>
  </div>

  <?php if ($showExpiryBanner): ?>
  <div style="background:<?= $expiryExpired ? 'rgba(216,107,114,.15)' : 'rgba(201,167,65,.15)' ?>;border-bottom:1px solid <?= $expiryExpired ? 'rgba(216,107,114,.3)' : 'rgba(201,167,65,.3)' ?>;padding:8px 20px;font-size:13px;color:<?= $expiryExpired ? 'var(--danger)' : '#b8932a' ?>;text-align:center">
    <?= $expiryExpired ? '🔴' : '⚠️' ?> <?= htmlspecialchars($expiryBannerMsg) ?>
  </div>
  <?php endif; ?>
  <div class="workspace" id="workspace">

    <!-- ══ OVERVIEW ══ -->
    <div class="section-panel active" id="panel-overview">
      <div class="stats-grid" id="statsGrid">
        <?php if ($role === 'admin'): ?>
          <?php
          $stats = [
            ['المستخدمون', (int)DB::val("SELECT COUNT(*) FROM users"), 'إجمالي المستخدمين', 'accent'],
            ['عروض الأسعار', (int)DB::val("SELECT COUNT(*) FROM quotes"), 'كل العروض', 'green'],
            ['هذا الشهر', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')"), 'عروض هذا الشهر', ''],
            ['الإيراد', number_format((float)DB::val("SELECT COALESCE(SUM(total),0) FROM quotes WHERE status='accepted'"), 0) . ' ر.س', 'مجموع المقبول', 'gold'],
          ];
          ?>
        <?php elseif ($role === 'employee'): ?>
          <?php
          $uid = $user['id'];
          $stats = [
            ['عروضي', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE employee_id=?", [$uid]), 'إجمالي عروضي', 'accent'],
            ['هذا الشهر', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE employee_id=? AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')", [$uid]), 'عروض هذا الشهر', ''],
            ['مقبولة', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE employee_id=? AND status='accepted'", [$uid]), 'عروض مقبولة', 'green'],
            ['العملاء', (int)DB::val("SELECT COUNT(DISTINCT client_id) FROM quotes WHERE employee_id=?", [$uid]), 'عملاء لديّ', ''],
          ];
          ?>
        <?php else: ?>
          <?php
          $uid = $user['id'];
          $stats = [
            ['عروضي', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE client_id=?", [$uid]), 'إجمالي عروضي', 'accent'],
            ['مقبولة', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE client_id=? AND status='accepted'", [$uid]), 'مقبولة', 'green'],
            ['قيد الانتظار', (int)DB::val("SELECT COUNT(*) FROM quotes WHERE client_id=? AND status='sent'", [$uid]), 'بانتظار ردك', 'gold'],
            ['خطتك', $plan['name_ar'], 'مستوى الاشتراك', ''],
          ];
          ?>
        <?php endif; ?>
        <?php foreach ($stats as [$label, $value, $sub, $cls]): ?>
        <div class="stat-card <?= $cls ?>">
          <div class="stat-label"><?= $label ?></div>
          <div class="stat-value"><?= $value ?></div>
          <div class="stat-sub"><?= $sub ?></div>
        </div>
        <?php endforeach; ?>
      </div>

      <!-- Recent quotes -->
      <div class="card">
        <div class="card-header">
          <h3>آخر عروض الأسعار</h3>
          <button class="btn btn-ghost btn-sm" onclick="nav(document.querySelector('[data-panel=quotes]'))">عرض الكل</button>
        </div>
        <?php
        $recentQ = $role === 'admin'
          ? DB::all("SELECT q.*, c.name as client_name, e.name as employee_name FROM quotes q LEFT JOIN users c ON c.id=q.client_id LEFT JOIN users e ON e.id=q.employee_id ORDER BY q.created_at DESC LIMIT 5")
          : ($role === 'employee'
              ? DB::all("SELECT q.*, c.name as client_name FROM quotes q LEFT JOIN users c ON c.id=q.client_id WHERE q.employee_id=? ORDER BY q.created_at DESC LIMIT 5", [$user['id']])
              : DB::all("SELECT q.*, e.name as employee_name FROM quotes q LEFT JOIN users e ON e.id=q.employee_id WHERE q.client_id=? ORDER BY q.created_at DESC LIMIT 5", [$user['id']]));
        ?>
        <table class="data-table">
          <thead><tr>
            <th>رقم العرض</th>
            <th>العنوان</th>
            <?= $role !== 'client' ? '<th>العميل</th>' : '' ?>
            <?= $role !== 'employee' ? '<th>الموظف</th>' : '' ?>
            <th>الإجمالي</th>
            <th>الحالة</th>
          </tr></thead>
          <tbody>
          <?php foreach ($recentQ as $q): ?>
          <tr>
            <td><code><?= htmlspecialchars($q['number']) ?></code></td>
            <td><?= htmlspecialchars($q['title']) ?></td>
            <?= $role !== 'client' ? '<td>' . htmlspecialchars($q['client_name'] ?? '-') . '</td>' : '' ?>
            <?= $role !== 'employee' ? '<td>' . htmlspecialchars($q['employee_name'] ?? '-') . '</td>' : '' ?>
            <td><?= number_format($q['total'], 0) ?> ر.س</td>
            <td><span class="badge badge-<?= $q['status'] ?>"><?= statusLabel($q['status']) ?></span></td>
          </tr>
          <?php endforeach; ?>
          <?php if (empty($recentQ)): ?><tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">لا توجد عروض أسعار بعد</td></tr><?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ QUOTES LIST ══ -->
    <div class="section-panel" id="panel-quotes">
      <div class="card">
        <div class="card-header">
          <h3>عروض الأسعار</h3>
          <div class="flex gap-8">
            <select class="form-control" id="qStatusFilter" onchange="loadQuotes()" style="width:130px">
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="sent">مُرسل</option>
              <option value="accepted">مقبول</option>
              <option value="rejected">مرفوض</option>
            </select>
            <input class="form-control" id="qSearch" placeholder="بحث..." onkeyup="loadQuotes()" style="width:160px">
          </div>
        </div>
        <table class="data-table" id="quotesTable">
          <thead><tr>
            <th>رقم</th><th>العنوان</th>
            <?php if ($role !== 'client'): ?><th>العميل</th><?php endif; ?>
            <?php if ($role !== 'employee'): ?><th>الموظف</th><?php endif; ?>
            <th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th>
          </tr></thead>
          <tbody id="quotesTbody"><tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted)">جارٍ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- ══ NEW QUOTE ══ -->
    <?php if ($role === 'employee' || $role === 'admin'): ?>
    <div class="section-panel" id="panel-quote-new">
      <div class="card quote-builder">
        <div class="card-header">
          <h3 id="qFormTitle">عرض سعر جديد</h3>
          <button class="btn btn-ghost btn-sm" onclick="resetQuoteForm()">مسح</button>
        </div>
        <input type="hidden" id="qEditId" value="">
        <div class="form-row">
          <div class="form-group">
            <label>عنوان العرض *</label>
            <input type="text" class="form-control" id="qTitle" placeholder="تصميم موقع إلكتروني...">
          </div>
          <div class="form-group">
            <label>العميل *</label>
            <select class="form-control" id="qClient">
              <option value="">اختر العميل...</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>ضريبة القيمة المضافة %</label>
            <input type="number" class="form-control" id="qTax" value="15" min="0" max="100" onchange="calcTotals()">
          </div>
          <div class="form-group">
            <label>خصم (ر.س)</label>
            <input type="number" class="form-control" id="qDiscount" value="0" min="0" onchange="calcTotals()">
          </div>
        </div>

        <h4 style="font-size:14px;font-weight:800;margin:10px 0 10px">بنود العرض</h4>
        <table class="items-table">
          <thead><tr>
            <th style="width:45%">الوصف</th>
            <th style="width:15%">الكمية</th>
            <th style="width:20%">سعر الوحدة</th>
            <th style="width:15%">الإجمالي</th>
            <th style="width:5%"></th>
          </tr></thead>
          <tbody id="itemsBody"></tbody>
        </table>
        <button class="add-item-btn mt-8" onclick="addItem()">+ إضافة بند</button>

        <div class="quote-totals mt-16">
          <div class="quote-totals-row"><span>المجموع الفرعي</span><span id="totSub">0 ر.س</span></div>
          <div class="quote-totals-row"><span>الخصم</span><span id="totDis">0 ر.س</span></div>
          <div class="quote-totals-row"><span id="taxLbl">ضريبة (15%)</span><span id="totTax">0 ر.س</span></div>
          <div class="quote-totals-row total"><span>الإجمالي</span><span id="totFinal">0 ر.س</span></div>
        </div>

        <div class="form-group mt-16">
          <label>ملاحظات</label>
          <textarea class="form-control" id="qNotes" placeholder="أي ملاحظات إضافية..."></textarea>
        </div>

        <div class="flex gap-8 mt-16">
          <button class="btn btn-primary" onclick="saveQuote()">حفظ العرض</button>
          <button class="btn btn-ghost" onclick="nav(document.querySelector('[data-panel=quotes]'))">إلغاء</button>
        </div>
        <div id="quoteMsg" class="mt-8 hidden"></div>
      </div>
    </div>
    <?php endif; ?>

    <!-- ══ CLIENTS ══ -->
    <?php if ($role === 'employee' || $role === 'admin'): ?>
    <div class="section-panel" id="panel-clients">
      <div class="card">
        <div class="card-header">
          <h3>العملاء</h3>
        </div>
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>البريد</th><th>الخطة</th><th>تاريخ التسجيل</th><th>إجراء</th></tr></thead>
          <tbody id="clientsTbody"><tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">جارٍ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
    <?php endif; ?>

    <!-- ══ MESSAGES ══ -->
    <div class="section-panel" id="panel-messages">
      <div class="msg-layout">
        <div class="msg-list">
          <div class="msg-list-header flex justify-between items-center">
            <span>الرسائل</span>
            <button class="btn btn-primary btn-sm" onclick="openCompose()">رسالة جديدة</button>
          </div>
          <div id="inboxList"><div style="padding:20px;color:var(--muted);text-align:center">جارٍ التحميل...</div></div>
        </div>
        <div class="msg-thread" id="msgThread">
          <div class="msg-thread-header" id="threadTitle">اختر محادثة</div>
          <div class="msg-bubbles" id="threadBubbles">
            <div style="text-align:center;color:var(--muted);margin-top:40px;font-size:13px">اختر محادثة لعرض رسائلها</div>
          </div>
          <div class="msg-compose" id="msgCompose" style="display:none">
            <textarea id="replyBody" placeholder="اكتب ردك..."></textarea>
            <button class="btn btn-primary" onclick="sendReply()">إرسال</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ TOOLS ══ -->
    <div class="section-panel" id="panel-tools">
      <?php
        $userTools = $plan['tools'];
      ?>

      <!-- ═ TOOLS MENU ═ -->
      <div id="toolsMenu">
        <?php
        $toolCards = [
          ['calc_basic',  'أداة التسعير الأساسية',   'مواقع، تطبيقات، هوية، إنتاج، استشارة',  'احسب سعر خدمتك بدقة — اختر نوع المشروع وأدخل تكاليفك.'],
          ['calc_pkg',    'تسعيرة باقات الاشتراك',    'SaaS، منتجات رقمية',                   'احسب سعر باقاتك الشهرية بناءً على تكاليفك وعدد المشتركين.'],
          ['calc_store',  'تسعيرة المتجر الإلكتروني', 'تجارة إلكترونية، متاجر',               'سعّر مشاريع التجارة الإلكترونية مع حساب الربحية الكاملة.'],
          ['calc_office', 'تسعيرة المكتب والوكالة',   'مكاتب، وكالات تسويق',                  'احسب التسعيرة الصحيحة لمكتبك بناءً على تكاليف التشغيل.'],
          ['calc_labor',  'حساب تكلفة الساعة',        'مستقل، فريلانسر',                      'احسب تكلفة ساعة عملك الحقيقية مع هامش الربح المناسب.'],
          ['calc_custom', 'تسعيرة حرة مخصصة',         'مؤسسات، خدمات متعددة',                 'أنشئ تسعيرة ببنود مخصصة حرة بلا قيود على نوع المشروع.'],
        ];
        foreach ($toolCards as [$slug, $name, $sectors, $desc]):
          $locked = !in_array($slug, $userTools) && !in_array('all', $userTools);
        ?>
        <div class="tool-card <?= $locked ? 'locked' : '' ?>" onclick="<?= $locked ? "showPlanUpgrade()" : "openTool('$slug')" ?>">
          <?php if ($locked): ?><div class="tool-lock">🔒</div><?php endif; ?>
          <div class="tool-tag"><?= $locked ? 'مقفل · يتطلب ترقية' : $sectors ?></div>
          <h3><?= $name ?></h3>
          <p><?= $desc ?></p>
          <?php if (!$locked): ?>
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--p);font-weight:700">ابدأ التسعير ←</div>
          <?php endif; ?>
        </div>
        <?php endforeach; ?>
      </div>

      <!-- ═ TOOL: Basic Pricing ═ -->
      <div class="tool-panel" id="tool-calc_basic">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:16px">أداة التسعير الأساسية</h2>

        <!-- Client info card -->
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_basic">👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">(اختياري)</small></span>
            <span class="cic-arrow">▾</span>
          </div>
          <div class="cic-body">
            <div class="form-row" style="margin-bottom:0">
              <div class="form-group" style="margin-bottom:0"><label>اسم العميل</label><input type="text" class="form-control" id="ci_name_basic" placeholder="محمد العمري" oninput="updateCicLabel('basic')"></div>
              <div class="form-group" style="margin-bottom:0"><label>اسم الشركة</label><input type="text" class="form-control" id="ci_company_basic" placeholder="شركة النجوم"></div>
              <div class="form-group" style="margin-bottom:0"><label>رقم الجوال</label><input type="tel" class="form-control" id="ci_phone_basic" placeholder="05xxxxxxxx" dir="ltr"></div>
            </div>
          </div>
        </div>

        <div class="calc-section">
          <h4>الخطوة 1 — نوع المشروع</h4>
          <div class="field-grid" id="fieldGrid">
            <?php
            $fields = ['موقع إلكتروني','تطبيق موبايل','هوية بصرية','فيديو وإنتاج','تصوير','محتوى & سوشيال','استشارة','برمجة خاصة','ترجمة','أخرى'];
            foreach ($fields as $i => $f): ?>
            <div class="field-btn" onclick="selectField(this,'<?= $f ?>')"><?= $f ?></div>
            <?php endforeach; ?>
          </div>
        </div>

        <div class="calc-section" id="svcSection" style="display:none">
          <h4>الخطوة 2 — الخدمات المطلوبة</h4>
          <div class="svc-grid-2" id="svcGrid"></div>
        </div>

        <div class="calc-section" id="costsSection" style="display:none">
          <h4>الخطوة 3 — التكاليف والربحية</h4>
          <div class="form-row">
            <div class="form-group"><label>تكلفة العمالة (ر.س)</label><input type="number" class="form-control" id="cLbr" value="0" oninput="calcBasic()"></div>
            <div class="form-group"><label>تكاليف الأدوات والبرامج (ر.س)</label><input type="number" class="form-control" id="cTools" value="0" oninput="calcBasic()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تكاليف تشغيلية (ر.س)</label><input type="number" class="form-control" id="cOps" value="0" oninput="calcBasic()"></div>
            <div class="form-group"><label>هامش الربح %</label><input type="number" class="form-control" id="cProfit" value="30" min="0" max="200" oninput="calcBasic()"></div>
          </div>
          <div class="form-group">
            <label>ضريبة القيمة المضافة %</label>
            <input type="number" class="form-control" id="cTax" value="15" min="0" oninput="calcBasic()">
          </div>
        </div>

        <div class="calc-result" id="basicResult" data-amount="0" style="display:none">
          <div class="calc-result-row"><span>إجمالي التكاليف</span><span id="rCost">-</span></div>
          <div class="calc-result-row"><span>هامش الربح</span><span id="rProfit">-</span></div>
          <div class="calc-result-row"><span>ضريبة القيمة المضافة</span><span id="rTax">-</span></div>
          <div class="calc-result-row big"><span>السعر النهائي للعميل</span><span id="rFinal">-</span></div>
          <?= toolSaveBtn($isPaid, 'basic', 'أداة التسعير الأساسية') ?>
        </div>
      </div>

      <!-- ═ TOOL: Package Pricing ═ -->
      <div class="tool-panel" id="tool-calc_pkg">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:16px">تسعيرة باقات الاشتراك</h2>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_pkg">👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">(اختياري)</small></span>
            <span class="cic-arrow">▾</span>
          </div>
          <div class="cic-body">
            <div class="form-row" style="margin-bottom:0">
              <div class="form-group" style="margin-bottom:0"><label>اسم العميل</label><input type="text" class="form-control" id="ci_name_pkg" placeholder="محمد العمري" oninput="updateCicLabel('pkg')"></div>
              <div class="form-group" style="margin-bottom:0"><label>اسم الشركة</label><input type="text" class="form-control" id="ci_company_pkg" placeholder="شركة النجوم"></div>
              <div class="form-group" style="margin-bottom:0"><label>رقم الجوال</label><input type="tel" class="form-control" id="ci_phone_pkg" placeholder="05xxxxxxxx" dir="ltr"></div>
            </div>
          </div>
        </div>
        <div class="calc-section">
          <h4>التكاليف الشهرية الثابتة</h4>
          <div class="form-row">
            <div class="form-group"><label>إيجار وخدمات (ر.س)</label><input type="number" class="form-control" id="pkg_rent" value="0" oninput="calcPkg()"></div>
            <div class="form-group"><label>رواتب الفريق (ر.س)</label><input type="number" class="form-control" id="pkg_salaries" value="0" oninput="calcPkg()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تكاليف تقنية (ر.س)</label><input type="number" class="form-control" id="pkg_tech" value="0" oninput="calcPkg()"></div>
            <div class="form-group"><label>تكاليف تشغيلية أخرى (ر.س)</label><input type="number" class="form-control" id="pkg_other" value="0" oninput="calcPkg()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>توزيع الباقات والمشتركين</h4>
          <div class="form-row cols-3">
            <div class="form-group"><label>مشتركو الباقة الأساسية</label><input type="number" class="form-control" id="pkg_s1" value="50" oninput="calcPkg()"></div>
            <div class="form-group"><label>مشتركو الباقة المتوسطة</label><input type="number" class="form-control" id="pkg_s2" value="20" oninput="calcPkg()"></div>
            <div class="form-group"><label>مشتركو الباقة المتقدمة</label><input type="number" class="form-control" id="pkg_s3" value="5" oninput="calcPkg()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>هامش الربح المستهدف %</label><input type="number" class="form-control" id="pkg_profit" value="40" oninput="calcPkg()"></div>
            <div class="form-group"><label>نسبة الباقة الأساسية للمتوسطة</label><input type="number" class="form-control" id="pkg_ratio" value="2" oninput="calcPkg()" placeholder="مثال: 2 تعني ضعف السعر"></div>
          </div>
        </div>
        <div class="calc-result" id="pkgResult" data-amount="0">
          <div class="calc-result-row"><span>إجمالي التكاليف الشهرية</span><span id="pkg_rCost">-</span></div>
          <div class="calc-result-row"><span>المستهدف مع الربح</span><span id="pkg_rTarget">-</span></div>
          <div class="calc-result-row big"><span>سعر الباقة الأساسية / شهر</span><span id="pkg_r1">-</span></div>
          <div class="calc-result-row big"><span>سعر الباقة المتوسطة / شهر</span><span id="pkg_r2">-</span></div>
          <div class="calc-result-row big"><span>سعر الباقة المتقدمة / شهر</span><span id="pkg_r3">-</span></div>
          <?= toolSaveBtn($isPaid, 'pkg', 'تسعيرة باقات الاشتراك') ?>
        </div>
      </div>

      <!-- ═ TOOL: Labor Cost ═ -->
      <div class="tool-panel" id="tool-calc_labor">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:16px">حساب تكلفة الساعة</h2>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_labor">👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">(اختياري)</small></span>
            <span class="cic-arrow">▾</span>
          </div>
          <div class="cic-body">
            <div class="form-row" style="margin-bottom:0">
              <div class="form-group" style="margin-bottom:0"><label>اسم العميل</label><input type="text" class="form-control" id="ci_name_labor" placeholder="محمد العمري" oninput="updateCicLabel('labor')"></div>
              <div class="form-group" style="margin-bottom:0"><label>اسم الشركة</label><input type="text" class="form-control" id="ci_company_labor" placeholder="شركة النجوم"></div>
              <div class="form-group" style="margin-bottom:0"><label>رقم الجوال</label><input type="tel" class="form-control" id="ci_phone_labor" placeholder="05xxxxxxxx" dir="ltr"></div>
            </div>
          </div>
        </div>
        <div class="calc-section">
          <h4>بياناتك الشهرية</h4>
          <div class="form-row">
            <div class="form-group"><label>الراتب أو التكلفة الشهرية (ر.س)</label><input type="number" class="form-control" id="lb_salary" value="5000" oninput="calcLabor()"></div>
            <div class="form-group"><label>ساعات العمل اليومية</label><input type="number" class="form-control" id="lb_hrs" value="8" oninput="calcLabor()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>أيام العمل شهرياً</label><input type="number" class="form-control" id="lb_days" value="22" oninput="calcLabor()"></div>
            <div class="form-group"><label>% مهام غير مُدفوعة (اجتماعات، إدارة)</label><input type="number" class="form-control" id="lb_overhead" value="30" oninput="calcLabor()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تكاليف شهرية إضافية (أدوات، اشتراكات)</label><input type="number" class="form-control" id="lb_extra" value="0" oninput="calcLabor()"></div>
            <div class="form-group"><label>هامش الربح المستهدف %</label><input type="number" class="form-control" id="lb_profit" value="30" oninput="calcLabor()"></div>
          </div>
        </div>
        <div class="calc-result" id="laborResult" data-amount="0">
          <div class="calc-result-row"><span>إجمالي التكاليف الشهرية</span><span id="lb_rCost">-</span></div>
          <div class="calc-result-row"><span>ساعات العمل الفعلية المُدفوعة</span><span id="lb_rHrs">-</span></div>
          <div class="calc-result-row"><span>تكلفة الساعة (بدون ربح)</span><span id="lb_rBase">-</span></div>
          <div class="calc-result-row big"><span>سعر الساعة للعميل (مع الربح)</span><span id="lb_rFinal">-</span></div>
          <?= toolSaveBtn($isPaid, 'labor', 'حساب تكلفة الساعة') ?>
        </div>
      </div>

      <!-- ═ TOOL: Store ═ -->
      <div class="tool-panel" id="tool-calc_store">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:16px">تسعيرة المتجر الإلكتروني</h2>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_store">👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">(اختياري)</small></span>
            <span class="cic-arrow">▾</span>
          </div>
          <div class="cic-body">
            <div class="form-row" style="margin-bottom:0">
              <div class="form-group" style="margin-bottom:0"><label>اسم العميل</label><input type="text" class="form-control" id="ci_name_store" placeholder="محمد العمري" oninput="updateCicLabel('store')"></div>
              <div class="form-group" style="margin-bottom:0"><label>اسم الشركة</label><input type="text" class="form-control" id="ci_company_store" placeholder="شركة النجوم"></div>
              <div class="form-group" style="margin-bottom:0"><label>رقم الجوال</label><input type="tel" class="form-control" id="ci_phone_store" placeholder="05xxxxxxxx" dir="ltr"></div>
            </div>
          </div>
        </div>
        <div class="calc-section">
          <h4>تكاليف المشروع</h4>
          <div class="form-row">
            <div class="form-group"><label>ساعات العمل المقدرة</label><input type="number" class="form-control" id="st_hrs" value="0" oninput="calcStore()"></div>
            <div class="form-group"><label>سعر الساعة (ر.س)</label><input type="number" class="form-control" id="st_rate" value="150" oninput="calcStore()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تكلفة الاستضافة ودومين سنوياً (ر.س)</label><input type="number" class="form-control" id="st_hosting" value="0" oninput="calcStore()"></div>
            <div class="form-group"><label>قوالب وإضافات (ر.س)</label><input type="number" class="form-control" id="st_plugins" value="0" oninput="calcStore()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>عدد المنتجات</label><input type="number" class="form-control" id="st_products" value="0" oninput="calcStore()"></div>
            <div class="form-group"><label>سعر إدخال كل منتج (ر.س)</label><input type="number" class="form-control" id="st_perProd" value="10" oninput="calcStore()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>هامش الربح %</label><input type="number" class="form-control" id="st_profit" value="30" oninput="calcStore()"></div>
            <div class="form-group"><label>ضريبة %</label><input type="number" class="form-control" id="st_tax" value="15" oninput="calcStore()"></div>
          </div>
        </div>
        <div class="calc-result" id="storeResult" data-amount="0">
          <div class="calc-result-row"><span>تكلفة العمل</span><span id="st_rWork">-</span></div>
          <div class="calc-result-row"><span>تكلفة الإعداد</span><span id="st_rSetup">-</span></div>
          <div class="calc-result-row"><span>إجمالي التكلفة</span><span id="st_rCost">-</span></div>
          <div class="calc-result-row"><span>هامش الربح</span><span id="st_rProfit">-</span></div>
          <div class="calc-result-row big"><span>السعر النهائي (شامل الضريبة)</span><span id="st_rFinal">-</span></div>
          <?= toolSaveBtn($isPaid, 'store', 'تسعيرة المتجر الإلكتروني') ?>
        </div>
      </div>

      <!-- ═ TOOL: Office ═ -->
      <div class="tool-panel" id="tool-calc_office">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:16px">تسعيرة المكتب والوكالة</h2>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_office">👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">(اختياري)</small></span>
            <span class="cic-arrow">▾</span>
          </div>
          <div class="cic-body">
            <div class="form-row" style="margin-bottom:0">
              <div class="form-group" style="margin-bottom:0"><label>اسم العميل</label><input type="text" class="form-control" id="ci_name_office" placeholder="محمد العمري" oninput="updateCicLabel('office')"></div>
              <div class="form-group" style="margin-bottom:0"><label>اسم الشركة</label><input type="text" class="form-control" id="ci_company_office" placeholder="شركة النجوم"></div>
              <div class="form-group" style="margin-bottom:0"><label>رقم الجوال</label><input type="tel" class="form-control" id="ci_phone_office" placeholder="05xxxxxxxx" dir="ltr"></div>
            </div>
          </div>
        </div>
        <div class="calc-section">
          <h4>تكاليف التشغيل الشهرية</h4>
          <div class="form-row">
            <div class="form-group"><label>إيجار المكتب (ر.س)</label><input type="number" class="form-control" id="of_rent" value="0" oninput="calcOffice()"></div>
            <div class="form-group"><label>إجمالي الرواتب (ر.س)</label><input type="number" class="form-control" id="of_salaries" value="0" oninput="calcOffice()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>اشتراكات وأدوات (ر.س)</label><input type="number" class="form-control" id="of_tools" value="0" oninput="calcOffice()"></div>
            <div class="form-group"><label>تسويق ومصروفات أخرى (ر.س)</label><input type="number" class="form-control" id="of_other" value="0" oninput="calcOffice()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>طاقة الإنتاج</h4>
          <div class="form-row">
            <div class="form-group"><label>عدد المشاريع الشهرية</label><input type="number" class="form-control" id="of_proj" value="4" oninput="calcOffice()"></div>
            <div class="form-group"><label>هامش الربح المستهدف %</label><input type="number" class="form-control" id="of_profit" value="35" oninput="calcOffice()"></div>
          </div>
        </div>
        <div class="calc-result" id="officeResult" data-amount="0">
          <div class="calc-result-row"><span>إجمالي التكاليف الشهرية</span><span id="of_rCost">-</span></div>
          <div class="calc-result-row"><span>تكلفة المشروع الواحد</span><span id="of_rPerProj">-</span></div>
          <div class="calc-result-row big"><span>الحد الأدنى لسعر المشروع (مع الربح)</span><span id="of_rMin">-</span></div>
          <?= toolSaveBtn($isPaid, 'office', 'تسعيرة المكتب والوكالة') ?>
        </div>
        <!-- ═ TOOL: Custom Free-form ═ -->
      <div class="tool-panel" id="tool-calc_custom">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:16px">تسعيرة حرة مخصصة</h2>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_custom">👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">(اختياري)</small></span>
            <span class="cic-arrow">▾</span>
          </div>
          <div class="cic-body">
            <div class="form-row" style="margin-bottom:0">
              <div class="form-group" style="margin-bottom:0"><label>اسم العميل</label><input type="text" class="form-control" id="ci_name_custom" placeholder="محمد العمري" oninput="updateCicLabel('custom')"></div>
              <div class="form-group" style="margin-bottom:0"><label>اسم الشركة</label><input type="text" class="form-control" id="ci_company_custom" placeholder="شركة النجوم"></div>
              <div class="form-group" style="margin-bottom:0"><label>رقم الجوال</label><input type="tel" class="form-control" id="ci_phone_custom" placeholder="05xxxxxxxx" dir="ltr"></div>
            </div>
          </div>
        </div>
        <div class="calc-section">
          <h4>بنود التسعيرة</h4>
          <table class="items-table">
            <thead><tr>
              <th style="width:45%">الوصف</th>
              <th style="width:18%">الكمية</th>
              <th style="width:22%">سعر الوحدة (ر.س)</th>
              <th style="width:15%">الإجمالي</th>
            </tr></thead>
            <tbody id="custItemsBody"></tbody>
          </table>
          <button class="add-item-btn mt-8" onclick="addCustomItem()">+ إضافة بند</button>
        </div>
        <div class="calc-section">
          <div class="form-row">
            <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="cu_tax" value="15" min="0" oninput="calcCustom()"></div>
            <div class="form-group"><label>خصم (ر.س)</label><input type="number" class="form-control" id="cu_discount" value="0" min="0" oninput="calcCustom()"></div>
          </div>
        </div>
        <div class="calc-result" id="customResult" data-amount="0">
          <div class="calc-result-row"><span>المجموع الفرعي</span><span id="cu_rSub">-</span></div>
          <div class="calc-result-row"><span>الخصم</span><span id="cu_rDis">-</span></div>
          <div class="calc-result-row"><span id="cu_rTaxLbl">ضريبة (15%)</span><span id="cu_rTax">-</span></div>
          <div class="calc-result-row big"><span>الإجمالي النهائي</span><span id="cu_rFinal">-</span></div>
          <?= toolSaveBtn($isPaid, 'custom', 'تسعيرة حرة مخصصة') ?>
        </div>
      </div>

    </div>
    </div>

    <!-- ══ ADMIN: USERS ══ -->
    <?php if ($role === 'admin'): ?>
    <div class="section-panel" id="panel-users">
      <div class="card">
        <div class="card-header">
          <h3>إدارة المستخدمين</h3>
          <button class="btn btn-primary btn-sm" onclick="openUserModal()">+ مستخدم جديد</button>
        </div>
        <div class="flex gap-8 mb-16">
          <select class="form-control" id="uRoleFilter" onchange="loadUsers()" style="width:130px">
            <option value="">كل الأدوار</option>
            <option value="client">عملاء</option>
            <option value="employee">موظفون</option>
            <option value="admin">مدراء</option>
          </select>
          <select class="form-control" id="uPlanFilter" onchange="loadUsers()" style="width:130px">
            <option value="">كل الخطط</option>
            <option value="free">مجاني</option>
            <option value="pro">محترف</option>
            <option value="enterprise">مؤسسة</option>
          </select>
          <input class="form-control" id="uSearch" placeholder="بحث بالاسم أو البريد..." onkeyup="loadUsers()" style="flex:1">
        </div>
        <table class="data-table" id="usersTable">
          <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الخطة</th><th>الحالة</th><th>تاريخ التسجيل</th><th>إجراءات</th></tr></thead>
          <tbody id="usersTbody"><tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">جارٍ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- ══ ADMIN: SUBSCRIPTIONS ══ -->
    <div class="section-panel" id="panel-subscriptions">
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:900">إدارة الاشتراكات</h2>
        <p style="color:var(--muted);font-size:13px;margin-top:5px">تحكم في خطة كل مستخدم وتواريخ الانتهاء</p>
      </div>

      <div class="sub-plan-cards">
        <?php foreach (PLANS as $slug => $p): ?>
        <div class="sub-plan">
          <div class="sub-plan-name"><?= $p['name_ar'] ?> <span class="badge badge-<?= $slug ?>"><?= $p['name_en'] ?></span></div>
          <div class="sub-plan-price"><?= $p['price'] === 0 ? 'مجاني' : $p['price'] . ' ر.س' ?><small>/شهر</small></div>
          <div class="sub-plan-feat"><?= implode(' · ', $p['features_ar']) ?></div>
          <div style="margin-top:10px;font-size:12px;color:var(--muted)">
            مستخدمو هذه الخطة: <strong id="planCount_<?= $slug ?>">...</strong>
          </div>
        </div>
        <?php endforeach; ?>
      </div>

      <div class="card">
        <div class="card-header"><h3>المستخدمون والخطط</h3></div>
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الخطة الحالية</th><th>تنتهي في</th><th>تغيير الخطة</th></tr></thead>
          <tbody id="subsTbody"><tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">جارٍ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- ══ ADMIN: ACTIVITY ══ -->
    <div class="section-panel" id="panel-activity">
      <div class="card">
        <div class="card-header">
          <h3>سجل النشاط</h3>
          <button class="btn btn-ghost btn-sm" onclick="loadActivity()">تحديث</button>
        </div>
        <table class="data-table">
          <thead><tr><th>المستخدم</th><th>الدور</th><th>الإجراء</th><th>التفاصيل</th><th>IP</th><th>التاريخ</th></tr></thead>
          <tbody id="activityTbody"><tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">جارٍ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
    <?php endif; ?>

    <!-- ══ ACCOUNT ══ -->
    <div class="section-panel" id="panel-account">
      <div class="card" style="max-width:520px">
        <div class="card-header"><h3>حسابي</h3></div>
        <div class="form-group">
          <label>الاسم</label>
          <input type="text" class="form-control" id="accName" value="<?= htmlspecialchars($user['name']) ?>">
        </div>
        <div class="form-group">
          <label>البريد الإلكتروني</label>
          <input type="email" class="form-control" value="<?= htmlspecialchars($user['email']) ?>" readonly style="background:var(--surface)">
        </div>
        <div class="form-group">
          <label>الدور</label>
          <input type="text" class="form-control" value="<?= $roleLabel ?>" readonly style="background:var(--surface)">
        </div>
        <div style="background:var(--surface);border-radius:10px;padding:14px;margin-bottom:16px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px">خطة الاشتراك الحالية</div>
          <div style="font-size:18px;font-weight:900"><?= $plan['name_ar'] ?></div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">
            <?= $plan['price'] === 0 ? 'مجاني' : $plan['price'] . ' ر.س/شهر' ?> ·
            <?= $plan['max_quotes'] === -1 ? 'عروض أسعار غير محدودة' : $plan['max_quotes'] . ' عروض/شهر' ?>
          </div>
          <?php if ($user['plan_expires_at']): ?>
          <div style="font-size:12px;color:var(--warn);margin-top:4px">تنتهي في: <?= $user['plan_expires_at'] ?></div>
          <?php endif; ?>
        </div>
        <div class="form-group">
          <label>كلمة مرور جديدة <small style="color:var(--muted);font-weight:400">(اتركه فارغاً للإبقاء على الحالية)</small></label>
          <input type="password" class="form-control" id="accPass" placeholder="••••••••" autocomplete="new-password">
        </div>
        <div id="accMsg" class="hidden mb-8"></div>
        <button class="btn btn-primary" onclick="saveAccount()">حفظ التغييرات</button>
      </div>
    </div>

  </div><!-- /workspace -->
</div><!-- /main-area -->
</div><!-- /app-shell -->

<!-- ── USER MODAL (Admin) ── -->
<?php if ($role === 'admin'): ?>
<div class="modal-overlay hidden" id="userModal">
  <div class="modal-box">
    <div class="modal-header">
      <h3 id="userModalTitle">مستخدم جديد</h3>
      <button class="modal-close" onclick="closeUserModal()">✕</button>
    </div>
    <input type="hidden" id="umId" value="">
    <div class="form-group"><label>الاسم *</label><input type="text" class="form-control" id="umName"></div>
    <div class="form-group"><label>البريد الإلكتروني *</label><input type="email" class="form-control" id="umEmail" dir="ltr"></div>
    <div class="form-group"><label>كلمة المرور (فارغ = بدون تغيير)</label><input type="password" class="form-control" id="umPass" dir="ltr" placeholder="Demo@2025"></div>
    <div class="form-row">
      <div class="form-group">
        <label>الدور</label>
        <select class="form-control" id="umRole">
          <option value="client">عميل</option>
          <option value="employee">موظف</option>
          <option value="admin">مدير</option>
        </select>
      </div>
      <div class="form-group">
        <label>الخطة</label>
        <select class="form-control" id="umPlan">
          <option value="free">مجاني</option>
          <option value="pro">محترف</option>
          <option value="enterprise">مؤسسة</option>
        </select>
      </div>
    </div>
    <div id="umMsg" class="hidden mb-8"></div>
    <div class="flex gap-8">
      <button class="btn btn-primary flex-1" onclick="saveUser()">حفظ</button>
      <button class="btn btn-ghost" onclick="closeUserModal()">إلغاء</button>
    </div>
  </div>
</div>

<!-- SET PLAN MODAL -->
<div class="modal-overlay hidden" id="planModal">
  <div class="modal-box">
    <div class="modal-header">
      <h3>تغيير خطة الاشتراك</h3>
      <button class="modal-close" onclick="document.getElementById('planModal').classList.add('hidden')">✕</button>
    </div>
    <input type="hidden" id="pmUserId" value="">
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px" id="pmUserName"></div>
    <div class="form-group">
      <label>الخطة الجديدة</label>
      <select class="form-control" id="pmPlan">
        <option value="free">مجاني</option>
        <option value="pro">محترف</option>
        <option value="enterprise">مؤسسة</option>
      </select>
    </div>
    <div class="form-group">
      <label>تاريخ الانتهاء (اختياري)</label>
      <input type="date" class="form-control" id="pmExpires">
    </div>
    <div id="pmMsg" class="hidden mb-8"></div>
    <button class="btn btn-primary w-full" onclick="savePlan()">تطبيق</button>
  </div>
</div>
<?php endif; ?>

<!-- COMPOSE MODAL -->
<div class="modal-overlay hidden" id="composeModal">
  <div class="modal-box">
    <div class="modal-header">
      <h3>رسالة جديدة</h3>
      <button class="modal-close" onclick="document.getElementById('composeModal').classList.add('hidden')">✕</button>
    </div>
    <div class="form-group"><label>المستلم</label><select class="form-control" id="cmTo"></select></div>
    <div class="form-group"><label>الموضوع</label><input type="text" class="form-control" id="cmSubject"></div>
    <div class="form-group"><label>الرسالة</label><textarea class="form-control" id="cmBody" style="height:100px"></textarea></div>
    <div id="cmMsg" class="hidden mb-8"></div>
    <button class="btn btn-primary w-full" onclick="sendNewMsg()">إرسال</button>
  </div>
</div>

<!-- PDF OVERLAY -->
<div class="pdf-overlay hidden" id="pdfOverlay">
  <div style="max-width:760px;width:100%">
    <div class="pdf-doc" id="pdfDoc"></div>
    <div class="pdf-actions">
      <button class="btn btn-primary" onclick="window.print()">طباعة / PDF</button>
      <button class="btn btn-ghost" onclick="document.getElementById('pdfOverlay').classList.add('hidden')">إغلاق</button>
    </div>
  </div>
</div>

<!-- Tool → Quote Modal -->
<div class="modal-overlay hidden" id="toolQuoteModal">
  <div class="modal-box">
    <div class="modal-header">
      <h3 id="tqmTitle">حفظ كعرض سعر</h3>
      <button class="modal-close" onclick="document.getElementById('toolQuoteModal').classList.add('hidden')">✕</button>
    </div>
    <input type="hidden" id="tqmSlug" value="">
    <input type="hidden" id="tqmAmount" value="">
    <div class="form-group">
      <label>عنوان العرض *</label>
      <input type="text" class="form-control" id="tqmQuoteTitle" placeholder="عنوان العرض...">
    </div>
    <div class="form-group">
      <label>العميل *</label>
      <select class="form-control" id="tqmClient"><option value="">اختر العميل...</option></select>
    </div>
    <div class="form-group">
      <label>ملاحظات</label>
      <textarea class="form-control" id="tqmNotes" placeholder="أي ملاحظات إضافية..." style="height:70px"></textarea>
    </div>
    <div id="tqmMsg" class="hidden mb-8"></div>
    <div class="flex gap-8">
      <button class="btn btn-primary flex-1" onclick="saveToolQuote()">💾 حفظ كمسودة</button>
      <button class="btn btn-ghost" onclick="document.getElementById('toolQuoteModal').classList.add('hidden')">إلغاء</button>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:10px;text-align:center">يُحفظ كمسودة — يمكنك تعديله وإرساله للعميل من قسم عروض الأسعار</p>
  </div>
</div>

<!-- Plan upgrade notice -->
<div class="modal-overlay hidden" id="upgradeModal">
  <div class="modal-box" style="text-align:center">
    <div style="font-size:40px;margin-bottom:12px">🔒</div>
    <h3 style="margin-bottom:8px">ترقية الخطة مطلوبة</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:20px">هذه الأداة متاحة في خطة المحترف أو المؤسسة. تواصل مع مدير النظام لترقية خطتك.</p>
    <button class="btn btn-primary" onclick="document.getElementById('upgradeModal').classList.add('hidden')">حسناً</button>
  </div>
</div>

<script>
const APP = {
  role:          '<?= $role ?>',
  uid:           <?= $user['id'] ?>,
  plan:          '<?= $user['plan'] ?>',
  effectivePlan: '<?= $effectivePlan ?>',
  isPaid:        <?= $isPaid ? 'true' : 'false' ?>,
  name:          '<?= htmlspecialchars($user['name'], ENT_QUOTES) ?>',
};
</script>
<script src="/assets/js/app.js"></script>
</body>
</html>

<?php
function statusLabel(string $s): string {
  return ['draft'=>'مسودة','sent'=>'مُرسل','accepted'=>'مقبول','rejected'=>'مرفوض','cancelled'=>'ملغي'][$s] ?? $s;
}
?>
