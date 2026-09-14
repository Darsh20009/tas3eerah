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
$canSaveQuote  = Auth::canCreateQuote($user);
$userTools     = OPEN_ACCESS_MODE ? ['all'] : ($plan['tools'] ?? []);

$roleLabel = ['admin' => 'مدير النظام', 'employee' => 'موظف', 'client' => 'عميل'][$role] ?? $role;
$planName  = $plan['name_ar'];
$usageField = $role === 'client' ? 'client_id' : 'employee_id';
$quotesUsedThisMonth = DB::count('quotes', [
    $usageField  => (int)$user['id'],
    'created_at' => ['$regex' => '^' . date('Y-m')],
]);
$maxQuotesThisMonth = $plan['max_quotes'];
$quotesRemaining = $maxQuotesThisMonth === -1
    ? null
    : max(0, $maxQuotesThisMonth - $quotesUsedThisMonth);
$quotaLabel = $maxQuotesThisMonth === -1
    ? 'تسعير غير محدود'
    : "متبقي {$quotesRemaining} من {$maxQuotesThisMonth} هذا الشهر";

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
        $expiryBannerMsg  = 'انتهت صلاحية خطتك يتم التعامل معك كمستخدم مجاني حتى تجديد الاشتراك';
    } elseif ($daysLeft <= 7) {
        $showExpiryBanner = true;
        $expiryBannerMsg  = "تنتهي خطتك ({$plan['name_ar']}) خلال $daysLeft " . ($daysLeft === 1 ? 'يوم' : 'أيام') . ' تواصل مع المدير للتجديد';
    }
}

function toolSaveBtn(bool $canSave, string $slug, string $name): string {
  $style = 'margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.15)';
  if ($canSave) {
    return "<div style='$style'><button class='btn btn-success w-full' onclick=\"openToolQuote('$slug','$name')\"><span class='ui-icon ui-icon-save' aria-hidden='true'></span> حفظ كعرض سعر</button></div>";
  }
  return "<div style='$style'><button class='btn btn-ghost w-full' onclick='showPlanUpgrade()'><span class='ui-icon ui-icon-lock' aria-hidden='true'></span> حفظ كعرض سعر يتطلب ترقية</button></div>";
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تسعيرة | لوحة التحكم</title>
  <link rel="icon" type="image/png" href="/assets/logo.png">
  <link rel="stylesheet" href="/assets/css/app.css?v=<?= @filemtime(__DIR__.'/../assets/css/app.css') ?: time() ?>">
  <meta name="csrf-token" content="<?= htmlspecialchars(Auth::csrfToken(), ENT_QUOTES) ?>">
</head>
<body>

<!-- ═══ SPLASH SCREEN ═══ -->
<div id="splash-screen" role="status" aria-label="جارٍ التحميل">
  <div class="splash-icon-wrap">
    <img src="/assets/icon.png" alt="تسعيرة" class="splash-icon" id="splashIcon">
    <div class="splash-spinner" id="splashSpinner"></div>
  </div>
  <div class="splash-brand" id="splashBrand">
    <span class="splash-brand-text">تسعيرة</span>
    <span class="splash-brand-sub">منصة التسعير العربية</span>
  </div>
</div>

<div class="app-shell">

<!-- Mobile sidebar overlay -->
<div class="sb-overlay" id="sbOverlay" onclick="closeSidebar()"></div>

<!-- ═══ SIDEBAR ═══ -->
<aside class="sidebar" id="sidebar">
  <button class="sb-close-btn" onclick="closeSidebar()" aria-label="إغلاق القائمة">✕</button>
  <a class="sb-logo" href="/" aria-label="الصفحة الرئيسية">
    <img class="sb-logo-img" src="/assets/logo.png" alt="تسعيرة">
  </a>
  <div class="sb-gold-stripe"></div>
  <div class="sb-user">
     <div class="sb-user-name user-content"><?= htmlspecialchars($user['name']) ?></div>
    <div class="sb-user-role"><?= $roleLabel ?></div>
    <div class="sb-plan"><?= $planName ?></div>
    <div class="sb-plan-usage"><?= htmlspecialchars($quotaLabel) ?></div>
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
      <span class="sb-icon">◧</span>
      <span data-ar="<?= $role === 'admin' ? 'كل عروض الأسعار' : 'عروضي' ?>" data-en="<?= $role === 'admin' ? 'All quotes' : 'My quotes' ?>">
        <?= $role === 'admin' ? 'كل عروض الأسعار' : 'عروضي' ?>
      </span>
    </button>
    <?php endif; ?>

    <?php if ($role === 'client' && !OPEN_ACCESS_MODE): ?>
    <div class="sb-section">عروض الأسعار</div>
    <button class="sb-item" data-panel="quote-new" onclick="nav(this)">
      <span class="sb-icon">✦</span> طلب تسعيرة جديدة
    </button>
    <button class="sb-item" data-panel="quotes" onclick="nav(this)">
      <span class="sb-icon">◧</span> تسعيراتي
    </button>
    <div class="sb-section">حسابي</div>
    <button class="sb-item" data-panel="subscription" onclick="nav(this)">
      <span class="sb-icon">◈</span> خطة الاشتراك
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
      <span class="sb-icon">◉</span>
      <span data-ar="الرسائل الداخلية" data-en="Internal messages">الرسائل الداخلية</span>
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
    <button class="sb-item" data-panel="mailbox" onclick="nav(this)">
      <span class="sb-icon">✉</span>
      <span data-ar="البريد الإلكتروني" data-en="Email mailbox">البريد الإلكتروني</span>
      <span class="sb-badge hidden" id="mailboxBadge">0</span>
    </button>
    <button class="sb-item" data-panel="contact-inbox" onclick="nav(this)">
      <span class="sb-icon">✉</span>
      <span data-ar="رسائل الموقع" data-en="Website messages">رسائل الموقع</span>
      <span class="sb-badge hidden" id="contactBadge">0</span>
    </button>
    <button class="sb-item" data-panel="activity" onclick="nav(this)">
      <span class="sb-icon">◑</span> سجل النشاط
    </button>
    <button class="sb-item" data-panel="settings" onclick="nav(this)">
      <span class="sb-icon">⚙</span> إعدادات النظام
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
      <a class="btn btn-ghost btn-sm dashboard-home-link" href="/">الصفحة الرئيسية</a>
      <button class="btn btn-ghost btn-sm" onclick="toggleLang()" id="langBtn">EN</button>
      <div class="topbar-plan-summary" aria-label="حالة الخطة">
        <strong>الخطة: <?= htmlspecialchars($planName) ?></strong>
        <span id="topbarPlanQuota"><?= htmlspecialchars($quotaLabel) ?></span>
      </div>
      <?php if ($role === 'employee' || $role === 'admin'): ?>
      <button class="btn btn-primary btn-sm" onclick="navDirect('tools')">
        + عرض سعر
      </button>
      <?php elseif ($role === 'client'): ?>
      <button class="btn btn-primary btn-sm" onclick="navDirect('tools')">
        + تسعيرة جديدة
      </button>
      <?php endif; ?>
    </div>
  </div>

  <?php if ($showExpiryBanner): ?>
  <div style="background:<?= $expiryExpired ? 'rgba(216,107,114,.15)' : 'rgba(201,167,65,.15)' ?>;border-bottom:1px solid <?= $expiryExpired ? 'rgba(216,107,114,.3)' : 'rgba(201,167,65,.3)' ?>;padding:8px 20px;font-size:13px;color:<?= $expiryExpired ? 'var(--danger)' : '#b8932a' ?>;text-align:center">
    <span class="status-mark <?= $expiryExpired ? 'status-mark-danger' : 'status-mark-warn' ?>" aria-hidden="true"></span>
    <?= htmlspecialchars($expiryBannerMsg) ?>
  </div>
  <?php endif; ?>
  <?php
    $quickTools = [
      ['services', '01', 'الخدمات', 'تسعير الخدمات', 'calc_basic'],
      ['packages', '02', 'الباقات', 'الباقات والاشتراكات', 'calc_pkg'],
      ['menu', '03', 'القائمة', 'المطاعم والكافيهات', 'calc_menu'],
      ['retail', '04', 'التجزئة', 'التجزئة والجملة', 'calc_store'],
      ['tech', '05', 'التقنية', 'المشاريع التقنية', 'calc_labor'],
      ['saas', '06', 'الاشتراكات', 'الخدمات المتكررة', 'calc_custom'],
      ['design', '07', 'التصميم', 'التصميم والمعمار', 'calc_office'],
    ];
  ?>
  <nav class="quick-tools-bar" id="quickToolsBar" aria-label="الوصول السريع إلى أدوات التسعير">
    <div class="quick-tools-label">
      <span class="quick-tools-overline">وصول سريع</span>
      <strong>الحاسبات السبع</strong>
    </div>
    <div class="quick-tools-list">
      <?php foreach ($quickTools as [$slug, $mark, $short, $name, $legacySlug]):
        $locked = !in_array('all', $userTools, true) && !in_array($legacySlug, $userTools, true);
      ?>
      <button class="quick-tool <?= $locked ? 'is-locked' : '' ?>"
              type="button"
              data-tool="<?= $slug ?>"
              aria-label="<?= htmlspecialchars($name) ?>"
              onclick="<?= $locked ? 'showPlanUpgrade()' : "navToQuickTool('$slug')" ?>">
        <span class="quick-tool-mark" aria-hidden="true"><?= $mark ?></span>
        <span class="quick-tool-copy"><b><?= $short ?></b><small><?= $name ?></small></span>
        <?php if ($locked): ?><span class="quick-tool-lock" aria-label="مقفل بالخطة"></span><?php endif; ?>
      </button>
      <?php endforeach; ?>
    </div>
  </nav>
  <div class="workspace" id="workspace">

    <!-- ══ OVERVIEW ══ -->
    <div class="section-panel active" id="panel-overview">
      <div class="dashboard-welcome">
        <div>
          <span class="dashboard-welcome-kicker">لوحة العمل</span>
          <h1>مرحباً بك، <?= htmlspecialchars($user['name']) ?></h1>
          <p>كل ما تحتاجه لتسعير مشاريعك بوضوح، في مساحة واحدة هادئة ومنظمة.</p>
        </div>
        <div class="dashboard-welcome-mark">
          <img src="/assets/icon.png" alt="">
          <span>PRICE<br>WITH<br>CLARITY</span>
        </div>
      </div>
      <div class="stats-grid" id="statsGrid">
        <?php
        $month = date('Y-m');
        if ($role === 'admin'):
          $ratingStats = DB::quoteRatingStats();
          $stats = [
            ['المستخدمون', DB::count('users'), 'إجمالي المستخدمين', 'accent'],
            ['المستخدمون النشطون', DB::count('users', ['is_active' => 1]), 'حسابات نشطة', 'gold'],
            ['عروض الأسعار', DB::count('quotes'), 'كل العروض', 'green'],
            ['هذا الشهر', DB::count('quotes', ['created_at' => ['$regex' => '^' . $month]]), 'عروض هذا الشهر', ''],
            ['متوسط التقييمات', $ratingStats['count'] ? number_format($ratingStats['average'], 1) . ' / 5' : '—', $ratingStats['count'] . ' مشاركة', 'gold'],
          ];
        elseif ($role === 'employee'):
          $uid = $user['id'];
          $myQList = DB::findAll('quotes', ['employee_id' => (int)$uid], ['projection' => ['client_id' => 1, 'id' => 1]]);
          $distinctClients = count(array_unique(array_column($myQList, 'client_id')));
          $stats = [
            ['عروضي', DB::count('quotes', ['employee_id' => (int)$uid]), 'إجمالي عروضي', 'accent'],
            ['هذا الشهر', DB::count('quotes', ['employee_id' => (int)$uid, 'created_at' => ['$regex' => '^' . $month]]), 'عروض هذا الشهر', ''],
            ['مرسلة', DB::count('quotes', ['employee_id' => (int)$uid, 'status' => 'sent']), 'بانتظار الرد', 'green'],
            ['العملاء', $distinctClients, 'عملاء لديّ', ''],
          ];
        else:
          $uid = $user['id'];
          $stats = [
            ['عروضي', DB::count('quotes', ['client_id' => (int)$uid]), 'إجمالي عروضي', 'accent'],
            ['مرسلة', DB::count('quotes', ['client_id' => (int)$uid, 'status' => 'sent']), 'بانتظار الرد', 'green'],
            ['قيد الانتظار', DB::count('quotes', ['client_id' => (int)$uid, 'status' => 'sent']), 'بانتظار ردك', 'gold'],
            ['خطتك', $plan['name_ar'], 'مستوى الاشتراك', ''],
          ];
        endif;
        ?>
        <?php foreach ($stats as [$label, $value, $sub, $cls]): ?>
        <div class="stat-card <?= $cls ?>">
          <div class="stat-label"><?= $label ?></div>
          <div class="stat-value"><?= $value ?></div>
          <div class="stat-sub"><?= $sub ?></div>
        </div>
        <?php endforeach; ?>
      </div>
      <?php
        $overviewFilter = $role === 'admin'
          ? []
          : [($role === 'client' ? 'client_id' : 'employee_id') => (int)$user['id']];
        $overviewQuotes = DB::findAll('quotes', $overviewFilter);
        $overviewTotal = array_sum(array_map(static fn($quote) => (float)($quote['total'] ?? 0), $overviewQuotes));
        $overviewAccepted = count(array_filter($overviewQuotes, static fn($quote) => ($quote['status'] ?? '') === 'accepted'));
        $overviewSent = count(array_filter($overviewQuotes, static fn($quote) => ($quote['status'] ?? '') === 'sent'));
        $overviewConversion = count($overviewQuotes) > 0 ? (int)round(($overviewAccepted / count($overviewQuotes)) * 100) : 0;
        $overviewAverage = count($overviewQuotes) > 0 ? $overviewTotal / count($overviewQuotes) : 0;
      ?>
      <div class="overview-lower-grid">
        <section class="overview-card quick-actions-card">
          <div class="overview-card-heading">
            <div>
              <span class="section-eyebrow">مساحة العمل</span>
              <h2>اختصاراتك اليومية</h2>
            </div>
            <span class="overview-card-mark" aria-hidden="true">↗</span>
          </div>
          <div class="quick-actions-grid">
            <button type="button" class="quick-action" onclick="navToQuickTool('services')">
              <span class="quick-action-icon ui-icon ui-icon-calculator" aria-hidden="true"></span>
              <span><b>ابدأ تسعيرة</b><small>اختر الحاسبة المناسبة</small></span>
            </button>
            <button type="button" class="quick-action" onclick="navDirect('quotes')">
              <span class="quick-action-icon ui-icon ui-icon-document" aria-hidden="true"></span>
              <span><b>مراجعة العروض</b><small>تابع الحالات والردود</small></span>
            </button>
            <button type="button" class="quick-action" onclick="navDirect('messages')">
              <span class="quick-action-icon ui-icon ui-icon-message" aria-hidden="true"></span>
              <span><b>التواصل</b><small>افتح الرسائل الداخلية</small></span>
            </button>
            <?php if ($role === 'client'): ?>
            <button type="button" class="quick-action" onclick="navDirect('subscription')">
              <span class="quick-action-icon ui-icon ui-icon-plan" aria-hidden="true"></span>
              <span><b>خطتك الحالية</b><small>راجع الاستخدام والمزايا</small></span>
            </button>
            <?php else: ?>
            <button type="button" class="quick-action" onclick="navDirect('clients')">
              <span class="quick-action-icon ui-icon ui-icon-users" aria-hidden="true"></span>
              <span><b>دليل العملاء</b><small>اختر عميلاً بسرعة</small></span>
            </button>
            <?php endif; ?>
          </div>
        </section>
        <section class="overview-card insight-card">
          <div class="overview-card-heading">
            <div>
              <span class="section-eyebrow">مؤشر الأداء</span>
              <h2>قراءة سريعة لنشاطك</h2>
            </div>
            <span class="insight-status"><i></i> محدث الآن</span>
          </div>
          <div class="insight-metrics">
            <div><b><?= number_format($overviewTotal, 0) ?> <small>ر.س</small></b><span>قيمة العروض</span></div>
            <div><b><?= number_format($overviewAverage, 0) ?> <small>ر.س</small></b><span>متوسط العرض</span></div>
            <div><b><?= $overviewSent ?></b><span>بانتظار الرد</span></div>
          </div>
          <div class="conversion-line">
            <div class="conversion-label"><span>معدل القبول</span><strong><?= $overviewConversion ?>%</strong></div>
            <div class="conversion-track"><span style="width:<?= $overviewConversion ?>%"></span></div>
            <small><?= $overviewAccepted ?> عروض مقبولة من أصل <?= count($overviewQuotes) ?></small>
          </div>
        </section>
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
            <?php if ($role !== 'client'): ?><th data-ar="العميل" data-en="Client">العميل</th><?php endif; ?>
            <?php if ($role !== 'employee'): ?><th data-ar="الموظف" data-en="Employee">الموظف</th><?php endif; ?>
            <th>الإجمالي</th><th>التقييم</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th>
          </tr></thead>
          <tbody id="quotesTbody"><tr><td colspan="9" style="text-align:center;padding:20px;color:var(--muted)">جارٍ التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- ══ NEW QUOTE (all roles) ══ -->
    <div class="section-panel" id="panel-quote-new">
      <div class="card quote-builder">
        <div class="card-header">
          <h3 id="qFormTitle"><?= $role === 'client' ? 'طلب تسعيرة جديدة' : 'عرض سعر جديد' ?></h3>
          <button class="btn btn-ghost btn-sm" onclick="resetQuoteForm()">مسح</button>
        </div>
        <?php if ($role === 'client'): ?>
        <div class="plan-usage-bar" id="planUsageBar" style="margin-bottom:16px"></div>
        <?php endif; ?>
        <input type="hidden" id="qEditId" value="">
        <div class="form-row">
          <div class="form-group">
            <label><?= $role === 'client' ? 'عنوان التسعيرة *' : 'عنوان العرض *' ?></label>
            <input type="text" class="form-control" id="qTitle" placeholder="تصميم موقع إلكتروني...">
          </div>
          <?php if ($role !== 'client'): ?>
          <div class="form-group">
            <label>العميل *</label>
            <select class="form-control" id="qClient">
              <option value="">اختر العميل...</option>
            </select>
          </div>
          <?php else: ?>
          <input type="hidden" id="qClient" value="<?= (int)$user['id'] ?>">
          <?php endif; ?>
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
    </div><!-- /panel-quote-new -->

    <!-- ══ CLIENT: SUBSCRIPTION PANEL ══ -->
    <?php if ($role === 'client'): ?>
    <div class="section-panel" id="panel-subscription">
      <div class="card">
        <div class="card-header">
          <h3>خطة الاشتراك</h3>
          <span class="badge badge-<?= $effectivePlan ?>"><?= PLANS[$effectivePlan]['name_ar'] ?></span>
        </div>

        <!-- Usage summary -->
        <div class="upgrade-current" style="margin-bottom:24px">
          <div class="upgrade-usage">
            <span>عروض الأسعار هذا الشهر</span>
            <span id="subUsageCount">—</span>
          </div>
          <div class="upgrade-bar-wrap">
            <div class="upgrade-bar-fill" id="subUsageBar" style="width:0%"></div>
          </div>
          <p style="font-size:11px;color:var(--muted);margin-top:6px">
            الحد الأقصى: <?= PLANS[$effectivePlan]['max_quotes'] === -1 ? 'غير محدود' : PLANS[$effectivePlan]['max_quotes'] ?> عرض/شهر
          </p>
        </div>

        <!-- Plan comparison -->
        <h4 style="font-size:13px;font-weight:800;margin-bottom:16px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">مقارنة الخطط</h4>
        <div class="sub-plan-cards">
          <?php foreach (PLANS as $pKey => $pVal): ?>
          <div class="sub-plan <?= $effectivePlan === $pKey ? 'sub-plan-current' : '' ?>">
            <?php if ($effectivePlan === $pKey): ?>
            <div style="font-size:10px;font-weight:800;color:var(--p);letter-spacing:.5px;margin-bottom:6px">خطتك الحالية</div>
            <?php endif; ?>
            <div class="sub-plan-name">
              <span class="badge badge-<?= $pKey ?>"><?= $pVal['name_ar'] ?></span>
            </div>
            <div class="sub-plan-price">
              <?= $pVal['price'] === 0 ? 'مجاني' : number_format($pVal['price']) ?>
              <?php if ($pVal['price'] > 0): ?><small>ر.س / شهر</small><?php endif; ?>
            </div>
            <div class="sub-plan-feat">
              <?php foreach ($pVal['features_ar'] as $feat): ?>
              ✓ <?= htmlspecialchars($feat) ?><br>
              <?php endforeach; ?>
            </div>
            <?php if ($effectivePlan !== $pKey && $pVal['price'] > 0): ?>
            <button class="btn btn-outline btn-sm" style="width:100%;margin-top:12px"
                    onclick="requestUpgrade('<?= $pKey ?>', '<?= $pVal['name_ar'] ?>')">
              طلب الترقية
            </button>
            <?php endif; ?>
          </div>
          <?php endforeach; ?>
        </div>

        <div id="upgradeRequestMsg" class="hidden mt-16" style="padding:14px;border-radius:var(--r);text-align:center;font-size:13px"></div>
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
      <div class="section-intro">
        <span class="section-eyebrow">التواصل داخل المنصة</span>
        <h2>الرسائل الداخلية</h2>
        <p>محادثات المستخدمين داخل تسعيرة، منفصلة عن حساب البريد الإلكتروني الرسمي.</p>
      </div>
      <div class="msg-layout">
        <div class="msg-list">
          <div class="msg-list-header flex justify-between items-center">
            <span data-ar="صندوق البريد" data-en="Inbox">صندوق البريد</span>
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
  $userTools = OPEN_ACCESS_MODE ? ['all'] : $plan['tools'];
      ?>

      <div class="integrated-tools-host">
        <?php require __DIR__ . '/classic-tools-inline.php'; ?>
      </div>

      <?php if (false): ?>
      <!-- ═ TOOLS MENU ═ -->
      <div class="tools-intro">
        <div class="tools-intro-copy">
          <div class="tools-kicker">منصة تسعيرة</div>
          <h1>اختر الأداة المناسبة لمشروعك</h1>
          <p>نظّم تسعير خدماتك ومنتجاتك في دقائق، بمنهجية واضحة تناسب نشاطك. <strong><?= htmlspecialchars($planName) ?> · <?= $plan['max_quotes'] === -1 ? 'تسعير غير محدود' : $plan['max_quotes'] . ' تسعيرات شهرياً' ?></strong></p>
          <div class="tools-intro-meta">
            <span class="tools-plan-chip"><?= htmlspecialchars($planName) ?></span>
            <span><?= count($userTools) === 1 && $userTools[0] === 'all' ? 'كل القطاعات متاحة' : count($userTools) . ' أدوات متاحة في باقتك' ?></span>
            <span><?= $plan['max_pdf_reports'] === -1 ? 'تقارير PDF غير محدودة' : $plan['max_pdf_reports'] . ' تقارير PDF' ?></span>
          </div>
        </div>
        <div class="tools-intro-mark"><img src="/assets/icon.png" alt=""></div>
      </div>
      <div class="tools-section-head">
        <div><span class="step-number">١</span><h2>اختر المجال</h2></div>
        <span>٧ أدوات تسعير متخصصة</span>
      </div>
      <div id="toolsMenu">
        <?php
        $toolCards = [
          ['calc_basic',  'تسعير الخدمات',             'خدمات · تدريب · تصوير · هدايا',       'احسب السعر العادل لخدماتك بناءً على التكاليف والهامش المناسب.', '01', 'warm'],
          ['calc_pkg',    'تسعير الباقات والاشتراكات', 'خدمات · منصات · عضويات',             'سعّر باقاتك مع توزيع التكاليف والهامش على المشتركين.', '02', 'blue'],
          ['calc_menu',   'تسعير قائمة المطاعم والكافيهات','كافيه · مطعم · حلويات · مشروبات', 'ابنِ سعر طبقك بدقة من تكلفة المكونات والهدر والهامش.', '03', 'green'],
          ['calc_store',  'تسعير التجزئة والجملة',     'ملابس · إلكترونيات · بقالة',          'حدد سعر البيع بناءً على تكلفة المنتج والعمولات والعروض.', '04', 'gold'],
          ['calc_labor',  'تسعير المشاريع التقنية',    'تطبيقات · ERP · مواقع · أجهزة ذكية',  'احسب تكلفة المشروع التقني حسب الساعات والموارد والنطاق.', '05', 'blue'],
          ['calc_custom', 'تسعير الشركات التقنية',     'SaaS · استضافة · صيانة · تراخيص',    'احسب سعر الاشتراك والخدمات المتكررة على أساس تكاليفك الحقيقية.', '06', 'purple'],
          ['calc_office', 'تسعير التصميم الداخلي والمعماري','سكني · تجاري · معماري',          'سعّر مشاريع التصميم والتنفيذ وفق المساحة والمراحل والتكاليف.', '07', 'sand'],
        ];
        foreach ($toolCards as [$slug, $name, $sectors, $desc, $icon, $tone]):
          $locked = !in_array($slug, $userTools) && !in_array('all', $userTools);
        ?>
        <div class="tool-card sector-card tone-<?= $tone ?> <?= $locked ? 'locked' : '' ?>" onclick="<?= $locked ? "showPlanUpgrade()" : "openTool('$slug')" ?>">
          <?php if ($locked): ?><div class="tool-lock ui-icon ui-icon-lock" aria-label="مقفل بالخطة"></div><?php endif; ?>
          <div class="sector-icon"><?= $icon ?></div>
          <div class="tool-tag"><?= $locked ? 'مقفل في باقتك' : $sectors ?></div>
          <h3><?= $name ?></h3>
          <p><?= $desc ?></p>
          <div class="sector-action"><?= $locked ? 'ترقية الخطة' : 'فتح الحاسبة الكاملة' ?><span>←</span></div>
        </div>
        <?php endforeach; ?>
      </div>
      <div class="tools-note"><span>ⓘ</span> يمكنك العودة لاحقاً إلى أي أداة ومراجعة حساباتك المحفوظة.</div>

      <!-- ═ TOOL: Menu Pricing ═ -->
      <div class="tool-panel" id="tool-calc_menu">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-green">03</div><div><div class="tools-kicker">تسعير المطاعم والكافيهات</div><h2>حاسبة تكلفة الصنف والقائمة</h2></div></div>
        <div class="calc-section">
          <h4>بيانات الصنف</h4>
          <div class="form-row">
            <div class="form-group"><label>اسم الصنف</label><input type="text" class="form-control" id="mn_name" placeholder="لاتيه مثلج"></div>
            <div class="form-group"><label>تصنيف الصنف</label><select class="form-control" id="mn_category" onchange="calcMenu()"><option>مشروبات</option><option>وجبات</option><option>حلويات</option><option>مخبوزات</option><option>إضافات</option></select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>عدد الوحدات المباعة شهرياً</label><input type="number" class="form-control" id="mn_units" value="100" min="1" oninput="calcMenu()"></div>
            <div class="form-group"><label>تكلفة المكونات للوحدة (ر.س)</label><input type="number" class="form-control" id="mn_ingredients" value="4" min="0" step=".1" oninput="calcMenu()"></div>
            <div class="form-group"><label>نسبة الهدر %</label><input type="number" class="form-control" id="mn_waste" value="5" min="0" max="100" oninput="calcMenu()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>التكاليف والهامش</h4>
          <div class="form-row">
            <div class="form-group"><label>التغليف والإضافات للوحدة (ر.س)</label><input type="number" class="form-control" id="mn_packaging" value="0.5" min="0" step=".1" oninput="calcMenu()"></div>
            <div class="form-group"><label>التكاليف التشغيلية الشهرية (ر.س)</label><input type="number" class="form-control" id="mn_ops" value="8000" min="0" oninput="calcMenu()"></div>
            <div class="form-group"><label>هامش الربح المستهدف %</label><input type="number" class="form-control" id="mn_profit" value="35" min="0" max="200" oninput="calcMenu()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>عمولة الدفع أو التوصيل %</label><input type="number" class="form-control" id="mn_fee" value="0" min="0" max="50" oninput="calcMenu()"></div>
            <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="mn_tax" value="15" min="0" oninput="calcMenu()"></div>
          </div>
        </div>
        <div class="calc-result" id="menuResult" data-amount="0">
          <div class="calc-result-row"><span>تكلفة المكونات بعد الهدر</span><span id="mn_rCost">-</span></div>
          <div class="calc-result-row"><span>تكلفة التغليف والإضافات</span><span id="mn_rPackaging">-</span></div>
          <div class="calc-result-row"><span>نصيب الصنف من التشغيل</span><span id="mn_rOps">-</span></div>
          <div class="calc-result-row"><span>التكلفة الفعلية للوحدة</span><span id="mn_rBase">-</span></div>
          <div class="calc-result-row big"><span>سعر البيع المقترح شامل الضريبة</span><span id="mn_rFinal">-</span></div>
          <?= toolSaveBtn($canSaveQuote, 'menu', 'تسعير قائمة المطاعم والكافيهات') ?>
        </div>
      </div>

      <!-- ═ TOOL: Basic Pricing ═ -->
      <div class="tool-panel" id="tool-calc_basic">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-warm">01</div><div><div class="tools-kicker">تسعير الخدمات</div><h2>حاسبة الخدمة والمشروع الخدمي</h2></div></div>

        <!-- Client info card -->
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_basic"><span class="ui-icon ui-icon-user" aria-hidden="true"></span> بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small></span>
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
          <h4>الخطوة 1 نوع الخدمة</h4>
          <div class="field-grid" id="fieldGrid">
            <?php
            $fields = ['موقع إلكتروني','تطبيق موبايل','هوية بصرية','فيديو وإنتاج','تصوير','محتوى & سوشيال','استشارة','برمجة خاصة','ترجمة','أخرى'];
            foreach ($fields as $i => $f): ?>
            <div class="field-btn" onclick="selectField(this,'<?= $f ?>')"><?= $f ?></div>
            <?php endforeach; ?>
          </div>
        </div>

        <div class="calc-section" id="svcSection" style="display:none">
          <h4>الخطوة 2 الخدمات المطلوبة</h4>
          <div class="svc-grid-2" id="svcGrid"></div>
        </div>

        <div class="calc-section" id="costsSection" style="display:none">
          <h4>الخطوة 3 التكاليف والربحية</h4>
          <div class="form-row">
            <div class="form-group"><label>ساعات التنفيذ</label><input type="number" class="form-control" id="cHours" value="8" min="0" oninput="calcBasic()"></div>
            <div class="form-group"><label>سعر ساعة التنفيذ (ر.س)</label><input type="number" class="form-control" id="cRate" value="120" min="0" oninput="calcBasic()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>أدوات ومواد مباشرة (ر.س)</label><input type="number" class="form-control" id="cTools" value="0" oninput="calcBasic()"></div>
            <div class="form-group"><label>نصيب التشغيل والإدارة (ر.س)</label><input type="number" class="form-control" id="cOps" value="0" oninput="calcBasic()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>هامش الربح %</label><input type="number" class="form-control" id="cProfit" value="30" min="0" max="200" oninput="calcBasic()"></div>
            <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="cTax" value="15" min="0" oninput="calcBasic()"></div>
          </div>
        </div>

        <div class="calc-result" id="basicResult" data-amount="0" style="display:none">
          <div class="calc-result-row"><span>تكلفة الجهد</span><span id="rEffort">-</span></div>
          <div class="calc-result-row"><span>إجمالي التكاليف المباشرة</span><span id="rCost">-</span></div>
          <div class="calc-result-row"><span>هامش الربح</span><span id="rProfit">-</span></div>
          <div class="calc-result-row"><span>ضريبة القيمة المضافة</span><span id="rTax">-</span></div>
          <div class="calc-result-row big"><span>السعر النهائي للعميل</span><span id="rFinal">-</span></div>
          <?= toolSaveBtn($canSaveQuote, 'basic', 'تسعير الخدمات') ?>
        </div>
      </div>

      <!-- ═ TOOL: Package Pricing ═ -->
      <div class="tool-panel" id="tool-calc_pkg">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-blue">02</div><div><div class="tools-kicker">تسعير الباقات والاشتراكات</div><h2>حاسبة توزيع تكلفة الباقات</h2></div></div>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_pkg"><span class="ui-icon ui-icon-user" aria-hidden="true"></span> بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small></span>
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
          <h4>أسماء الباقات</h4>
          <div class="form-row cols-3">
            <div class="form-group"><label>الباقة الأساسية</label><input type="text" class="form-control" id="pkg_name1" value="أساسية" oninput="calcPkg()"></div>
            <div class="form-group"><label>الباقة المتوسطة</label><input type="text" class="form-control" id="pkg_name2" value="احترافية" oninput="calcPkg()"></div>
            <div class="form-group"><label>الباقة المتقدمة</label><input type="text" class="form-control" id="pkg_name3" value="مؤسسات" oninput="calcPkg()"></div>
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
          <?= toolSaveBtn($canSaveQuote, 'pkg', 'تسعيرة باقات الاشتراك') ?>
        </div>
      </div>

      <!-- ═ TOOL: Technical Projects Pricing ═ -->
      <div class="tool-panel" id="tool-calc_labor">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-blue">05</div><div><div class="tools-kicker">تسعير المشاريع التقنية</div><h2>حاسبة مراحل المشروع التقني</h2></div></div>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_labor"><span class="ui-icon ui-icon-user" aria-hidden="true"></span> بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small></span>
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
          <h4>نوع المشروع ونطاقه</h4>
          <div class="form-row">
            <div class="form-group"><label>نوع المشروع</label><select class="form-control" id="lb_type" onchange="calcLabor()"><option>تطبيق جوال</option><option>موقع ويب</option><option>نظام ERP</option><option>ذكاء اصطناعي</option><option>جهاز وبرنامج</option></select></div>
            <div class="form-group"><label>اسم المشروع</label><input type="text" class="form-control" id="lb_name" placeholder="منصة طلبات" oninput="calcLabor()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>ساعات مراحل التنفيذ</h4>
          <div class="form-row">
            <div class="form-group"><label>التصميم UX/UI: ساعات</label><input type="number" class="form-control" id="lb_design_h" value="20" min="0" oninput="calcLabor()"></div>
            <div class="form-group"><label>سعر ساعة التصميم (ر.س)</label><input type="number" class="form-control" id="lb_design_rate" value="150" min="0" oninput="calcLabor()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>التطوير البرمجي: ساعات</label><input type="number" class="form-control" id="lb_dev_h" value="60" min="0" oninput="calcLabor()"></div>
            <div class="form-group"><label>سعر ساعة التطوير (ر.س)</label><input type="number" class="form-control" id="lb_dev_rate" value="200" min="0" oninput="calcLabor()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>الاختبار والتسليم: ساعات</label><input type="number" class="form-control" id="lb_qa_h" value="16" min="0" oninput="calcLabor()"></div>
            <div class="form-group"><label>سعر ساعة الاختبار (ر.س)</label><input type="number" class="form-control" id="lb_qa_rate" value="120" min="0" oninput="calcLabor()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>تكاليف المشروع والربحية</h4>
          <div class="form-row">
            <div class="form-group"><label>تراخيص وخدمات خارجية (ر.س)</label><input type="number" class="form-control" id="lb_licenses" value="0" min="0" oninput="calcLabor()"></div>
            <div class="form-group"><label>استضافة وأجهزة (ر.س)</label><input type="number" class="form-control" id="lb_hosting" value="0" min="0" oninput="calcLabor()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>نصيب الإدارة والتشغيل (ر.س)</label><input type="number" class="form-control" id="lb_overhead" value="1000" min="0" oninput="calcLabor()"></div>
            <div class="form-group"><label>احتياطي المخاطر %</label><input type="number" class="form-control" id="lb_contingency" value="10" min="0" max="100" oninput="calcLabor()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>هامش الربح %</label><input type="number" class="form-control" id="lb_profit" value="30" min="0" max="200" oninput="calcLabor()"></div>
            <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="lb_tax" value="15" min="0" oninput="calcLabor()"></div>
          </div>
        </div>
        <div class="calc-result" id="laborResult" data-amount="0">
          <div class="calc-result-row"><span>تكلفة الجهد</span><span id="lb_rEffort">-</span></div>
          <div class="calc-result-row"><span>التكلفة بعد الاحتياطي</span><span id="lb_rCost">-</span></div>
          <div class="calc-result-row"><span>الربح المستهدف</span><span id="lb_rProfit">-</span></div>
          <div class="calc-result-row big"><span>سعر المشروع شامل الضريبة</span><span id="lb_rFinal">-</span></div>
          <?= toolSaveBtn($canSaveQuote, 'labor', 'تسعير المشروع التقني') ?>
        </div>
      </div>

      <!-- ═ TOOL: Retail Pricing ═ -->
      <div class="tool-panel" id="tool-calc_store">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-gold">04</div><div><div class="tools-kicker">تسعير التجزئة والجملة</div><h2>حاسبة سعر المنتج بعد التكلفة والعمولة</h2></div></div>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_store"><span class="ui-icon ui-icon-user" aria-hidden="true"></span> بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small></span>
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
          <h4>بيانات المنتج</h4>
          <div class="form-row">
            <div class="form-group"><label>اسم المنتج</label><input type="text" class="form-control" id="st_name" placeholder="حقيبة جلدية" oninput="calcStore()"></div>
            <div class="form-group"><label>الفئة</label><select class="form-control" id="st_category" onchange="calcStore()"><option>ملابس</option><option>إلكترونيات</option><option>بقالة</option><option>أثاث</option><option>منتجات رقمية</option></select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تكلفة الشراء للوحدة (ر.س)</label><input type="number" class="form-control" id="st_cost" value="50" min="0" oninput="calcStore()"></div>
            <div class="form-group"><label>شحن وتخليص للوحدة (ر.س)</label><input type="number" class="form-control" id="st_shipping" value="5" min="0" oninput="calcStore()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تغليف وتجهيز للوحدة (ر.س)</label><input type="number" class="form-control" id="st_packaging" value="2" min="0" oninput="calcStore()"></div>
            <div class="form-group"><label>الكمية المستهدفة للبيع</label><input type="number" class="form-control" id="st_units" value="100" min="1" oninput="calcStore()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>هامش الربح المستهدف %</label><input type="number" class="form-control" id="st_profit" value="35" min="0" oninput="calcStore()"></div>
            <div class="form-group"><label>عمولة المنصة أو الدفع %</label><input type="number" class="form-control" id="st_fee" value="3" min="0" max="50" oninput="calcStore()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>خصم العروض المتوقع %</label><input type="number" class="form-control" id="st_discount" value="10" min="0" max="90" oninput="calcStore()"></div>
            <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="st_tax" value="15" min="0" oninput="calcStore()"></div>
          </div>
        </div>
        <div class="calc-result" id="storeResult" data-amount="0">
          <div class="calc-result-row"><span>التكلفة الواصلة للوحدة</span><span id="st_rCost">-</span></div>
          <div class="calc-result-row"><span>سعر التعادل بعد العمولة</span><span id="st_rBreak">-</span></div>
          <div class="calc-result-row"><span>هامش الربح</span><span id="st_rProfit">-</span></div>
          <div class="calc-result-row"><span>سعر العرض قبل الضريبة</span><span id="st_rSale">-</span></div>
          <div class="calc-result-row big"><span>السعر المقترح للمستهلك شامل الضريبة</span><span id="st_rFinal">-</span></div>
          <?= toolSaveBtn($canSaveQuote, 'store', 'تسعير منتج التجزئة') ?>
        </div>
      </div>

      <!-- ═ TOOL: Office ═ -->
      <div class="tool-panel" id="tool-calc_office">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-sand">⌂</div><div><div class="tools-kicker">تسعير التصميم الداخلي والمعماري</div><h2>حاسبة المشروع حسب المساحة والمراحل</h2></div></div>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_office"><span class="ui-icon ui-icon-user" aria-hidden="true"></span> بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small></span>
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
          <h4>بيانات المشروع والمساحة</h4>
          <div class="form-row">
            <div class="form-group"><label>نوع المشروع</label><select class="form-control" id="of_type" onchange="calcOffice()"><option>تصميم داخلي سكني</option><option>تصميم داخلي تجاري</option><option>تصميم معماري</option><option>تنفيذ وتجهيز</option></select></div>
            <div class="form-group"><label>المساحة بالمتر المربع</label><input type="number" class="form-control" id="of_area" value="120" min="1" oninput="calcOffice()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>سعر التصميم للمتر (ر.س)</label><input type="number" class="form-control" id="of_designRate" value="80" min="0" oninput="calcOffice()"></div>
            <div class="form-group"><label>عدد الزيارات الميدانية</label><input type="number" class="form-control" id="of_visits" value="3" min="0" oninput="calcOffice()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>المراحل والتكاليف الإضافية</h4>
          <div class="form-row">
            <div class="form-group"><label>تكلفة الزيارة الواحدة (ر.س)</label><input type="number" class="form-control" id="of_visitRate" value="250" min="0" oninput="calcOffice()"></div>
            <div class="form-group"><label>مخططات واستشارات (ر.س)</label><input type="number" class="form-control" id="of_consult" value="1500" min="0" oninput="calcOffice()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>مواد وتنفيذ مقدّرة (ر.س)</label><input type="number" class="form-control" id="of_execution" value="0" min="0" oninput="calcOffice()"></div>
            <div class="form-group"><label>نصيب الإشراف والإدارة (ر.س)</label><input type="number" class="form-control" id="of_overhead" value="1000" min="0" oninput="calcOffice()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>احتياطي التعديلات والمخاطر %</label><input type="number" class="form-control" id="of_contingency" value="10" min="0" max="100" oninput="calcOffice()"></div>
            <div class="form-group"><label>هامش الربح %</label><input type="number" class="form-control" id="of_profit" value="30" min="0" oninput="calcOffice()"></div>
          </div>
          <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="of_tax" value="15" min="0" oninput="calcOffice()"></div>
        </div>
        <div class="calc-result" id="officeResult" data-amount="0">
          <div class="calc-result-row"><span>أتعاب التصميم حسب المساحة</span><span id="of_rDesign">-</span></div>
          <div class="calc-result-row"><span>إجمالي التكلفة قبل الربح</span><span id="of_rCost">-</span></div>
          <div class="calc-result-row"><span>احتياطي المشروع</span><span id="of_rReserve">-</span></div>
          <div class="calc-result-row big"><span>سعر المشروع شامل الضريبة</span><span id="of_rMin">-</span></div>
          <?= toolSaveBtn($canSaveQuote, 'office', 'تسعير مشروع التصميم') ?>
        </div>
      </div><!-- /tool-calc_office -->

      <!-- ═ TOOL: Technology Company Pricing ═ -->
      <div class="tool-panel" id="tool-calc_custom">
        <button class="btn btn-ghost btn-sm mb-16" onclick="closeTool()">← الأدوات</button>
        <div class="tool-heading"><div class="tool-heading-icon tone-purple">↻</div><div><div class="tools-kicker">تسعير الشركات التقنية</div><h2>حاسبة الاشتراك والخدمة المتكررة</h2></div></div>
        <div class="cic-card">
          <div class="cic-toggle" onclick="this.closest('.cic-card').classList.toggle('open')">
            <span id="cic_label_custom"><span class="ui-icon ui-icon-user" aria-hidden="true"></span> بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small></span>
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
          <h4>نوع الخدمة والعملاء</h4>
          <div class="form-row">
            <div class="form-group"><label>نوع الخدمة</label><select class="form-control" id="cu_type" onchange="calcCustom()"><option>SaaS منصة</option><option>استضافة وخوادم</option><option>صيانة وتطوير</option><option>ترخيص برمجي</option><option>دعم تقني</option></select></div>
            <div class="form-group"><label>عدد العملاء أو المستخدمين</label><input type="number" class="form-control" id="cu_clients" value="25" min="1" oninput="calcCustom()"></div>
          </div>
        </div>
        <div class="calc-section">
          <h4>التكاليف الشهرية</h4>
          <div class="form-row">
            <div class="form-group"><label>رواتب الفريق (ر.س)</label><input type="number" class="form-control" id="cu_salaries" value="12000" min="0" oninput="calcCustom()"></div>
            <div class="form-group"><label>خوادم واستضافة (ر.س)</label><input type="number" class="form-control" id="cu_servers" value="1500" min="0" oninput="calcCustom()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تراخيص وأدوات (ر.س)</label><input type="number" class="form-control" id="cu_tools" value="500" min="0" oninput="calcCustom()"></div>
            <div class="form-group"><label>تشغيل وتسويق (ر.س)</label><input type="number" class="form-control" id="cu_ops" value="1000" min="0" oninput="calcCustom()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تكلفة متغيرة لكل عميل (ر.س)</label><input type="number" class="form-control" id="cu_variable" value="20" min="0" oninput="calcCustom()"></div>
            <div class="form-group"><label>هامش الربح المستهدف %</label><input type="number" class="form-control" id="cu_profit" value="40" min="0" max="200" oninput="calcCustom()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>دورة الفوترة</label><select class="form-control" id="cu_cycle" onchange="calcCustom()"><option value="1">شهري</option><option value="12">سنوي</option></select></div>
            <div class="form-group"><label>خصم الاشتراك السنوي %</label><input type="number" class="form-control" id="cu_annualDiscount" value="15" min="0" max="50" oninput="calcCustom()"></div>
          </div>
          <div class="form-group"><label>ضريبة القيمة المضافة %</label><input type="number" class="form-control" id="cu_tax" value="15" min="0" oninput="calcCustom()"></div>
        </div>
        <div class="calc-result" id="customResult" data-amount="0">
          <div class="calc-result-row"><span>التكاليف الثابتة الشهرية</span><span id="cu_rFixed">-</span></div>
          <div class="calc-result-row"><span>التكلفة على العميل</span><span id="cu_rPerClient">-</span></div>
          <div class="calc-result-row"><span>الربح المستهدف لكل عميل</span><span id="cu_rProfit">-</span></div>
          <div class="calc-result-row"><span>سعر الاشتراك الشهري قبل الضريبة</span><span id="cu_rMonthly">-</span></div>
          <div class="calc-result-row big"><span>السعر المقترح شامل الضريبة</span><span id="cu_rFinal">-</span></div>
          <div class="calc-result-row"><span>السعر السنوي المقترح</span><span id="cu_rAnnual">-</span></div>
          <?= toolSaveBtn($canSaveQuote, 'custom', 'تسعير الشركة التقنية') ?>
        </div>
      </div>

      <?php endif; ?>
    </div><!-- /panel-tools -->

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
            <option value="plus">Plus</option>
            <option value="pro">Pro</option>
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
          <div class="sub-plan-feat"><?= implode(' ', $p['features_ar']) ?></div>
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
            <?= $plan['price'] === 0 ? 'مجاني' : $plan['price'] . ' ر.س/شهر' ?>  
            <?= $plan['max_quotes'] === -1 ? 'تسعير غير محدود' : $plan['max_quotes'] . ' تسعيرات/شهر' ?>
          </div>
          <?php if ($user['plan_expires_at']): ?>
          <div style="font-size:12px;color:var(--warn);margin-top:4px">تنتهي في: <?= $user['plan_expires_at'] ?></div>
          <?php endif; ?>
        </div>
        <div class="form-group">
          <label>كلمة مرور جديدة <small style="color:var(--muted);font-weight:400">اتركه فارغاً للإبقاء على الحالية</small></label>
          <input type="password" class="form-control" id="accPass" placeholder="••••••••" autocomplete="new-password">
        </div>
        <div id="accMsg" class="hidden mb-8"></div>
        <button class="btn btn-primary" onclick="saveAccount()">حفظ التغييرات</button>
      </div>
    </div>

    <?php if ($role === 'admin'): ?>
    <!-- ══ ADMIN: PRIVATE EMAIL MAILBOX ══ -->
    <div class="section-panel" id="panel-mailbox">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 data-ar="البريد الإلكتروني الحقيقي" data-en="Real email mailbox">البريد الإلكتروني الحقيقي</h3>
            <small id="mailboxAddress" style="display:block;color:var(--muted);margin-top:4px"></small>
            <small id="mailboxReceiveAddress" style="display:block;color:var(--muted);margin-top:3px"></small>
          </div>
          <div class="flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="openMailboxCompose()">رسالة جديدة</button>
            <button class="btn btn-ghost btn-sm" onclick="loadMailbox()">تحديث</button>
          </div>
        </div>
        <div class="mailbox-note">
          هذا هو صندوق البريد الرسمي للمنصة. الرسائل الداخلية بين المستخدمين موجودة في قسم مستقل باسم «الرسائل الداخلية».
        </div>
        <div id="mailboxStatus" class="hidden mb-8"></div>
        <div class="mailbox-folders" id="mailboxFolders" role="tablist" aria-label="مجلدات البريد">
          <button class="mailbox-folder active" data-folder="inbox" onclick="selectMailboxFolder('inbox')">الوارد <span>0</span></button>
          <button class="mailbox-folder" data-folder="sent" onclick="selectMailboxFolder('sent')">المرسل <span>0</span></button>
          <button class="mailbox-folder" data-folder="drafts" onclick="selectMailboxFolder('drafts')">المسودات <span>0</span></button>
          <button class="mailbox-folder" data-folder="spam" onclick="selectMailboxFolder('spam')">المزعجة <span>0</span></button>
          <button class="mailbox-folder" data-folder="trash" onclick="selectMailboxFolder('trash')">المحذوفة <span>0</span></button>
        </div>
        <table class="data-table">
          <thead><tr><th>المرسل</th><th>الموضوع</th><th>التاريخ</th><th>الحالة</th><th>إجراء</th></tr></thead>
          <tbody id="mailboxTbody">
            <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted)">افتح البريد الإلكتروني لتحميل الرسائل</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ ADMIN: CONTACT INBOX ══ -->
    <div class="section-panel" id="panel-contact-inbox">
      <div class="card">
        <div class="card-header"><h3 data-ar="رسائل الموقع" data-en="Website messages">رسائل الموقع</h3></div>
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>البريد</th><th>الرسالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
          <tbody id="contactInboxTbody">
            <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted)">جارٍ التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ ADMIN: SETTINGS ══ -->
    <div class="section-panel" id="panel-settings">
      <div style="max-width:560px;display:flex;flex-direction:column;gap:18px">
        <div class="card" style="padding:24px">
          <h3 style="font-size:15px;font-weight:800;margin-bottom:18px;color:var(--p)">معلومات التواصل</h3>
          <div class="form-group">
            <label>بريد الدعم الفني</label>
            <input type="email" class="form-control" id="setContactEmail" placeholder="info@tas3eerah.com" dir="ltr">
          </div>
          <div class="form-group">
            <label>رقم واتساب الدعم</label>
            <input type="text" class="form-control" id="setWhatsapp" placeholder="966500000000" dir="ltr">
          </div>
        </div>
        <div class="card" style="padding:24px">
          <h3 style="font-size:15px;font-weight:800;margin-bottom:8px;color:var(--p)">صندوق البريد المرسل</h3>
          <p style="font-size:12px;color:var(--muted);line-height:1.8;margin-bottom:16px">
             يستخدم النظام حساب الإرسال لعروض الأسعار والبريد المرسل، وحساب الاستقبال لقراءة الوارد. اترك عنوان الاستقبال مطابقاً للإرسال عند استخدام حساب واحد. كلمات المرور لا تُحفظ هنا.
          </p>
          <div class="form-group">
             <label>عنوان بريد الإرسال</label>
            <input type="email" class="form-control" id="setMailboxEmail" placeholder="info@tas3eerah.com" dir="ltr">
          </div>
           <div class="form-group">
             <label>عنوان بريد الاستقبال</label>
             <input type="email" class="form-control" id="setMailboxReceiveEmail" placeholder="info@tas3eerah.com" dir="ltr">
             <small style="display:block;color:var(--muted);font-size:11px;margin-top:6px">لحساب مختلف، أضف كلمة مروره في Secret باسم PRIVATE_EMAIL_RECEIVE_PASSWORD.</small>
           </div>
          <div class="form-group">
            <label>اسم المرسل</label>
            <input type="text" class="form-control" id="setMailboxName" placeholder="تسعيرة">
          </div>
        </div>
        <div class="card" style="padding:24px">
          <h3 style="font-size:15px;font-weight:800;margin-bottom:18px;color:var(--p)">إعدادات العرض</h3>
          <div class="form-group">
            <label>اسم المنصة</label>
            <input type="text" class="form-control" id="setSiteName" placeholder="تسعيرة">
          </div>
          <div class="form-group">
            <label>رسالة الترحيب للمستخدمين الجدد</label>
            <textarea class="form-control" id="setWelcomeMsg" placeholder="مرحباً بك في تسعيرة..." style="height:80px"></textarea>
          </div>
        </div>
        <div id="settingsMsg" class="hidden"></div>
        <button class="btn btn-primary" onclick="saveSettings()"><span class="ui-icon ui-icon-save" aria-hidden="true"></span> حفظ الإعدادات</button>
      </div>
    </div>
    <?php endif; ?>

    <footer class="workspace-footer">
      <span>© <?= date('Y') ?> تسعيرة</span>
      <a href="https://qiroxstudio.online" target="_blank" rel="noopener noreferrer">Made by <strong>Qirox Studio Group</strong></a>
    </footer>
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
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
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
        <option value="plus">Plus</option>
        <option value="pro">Pro</option>
      </select>
    </div>
    <div class="form-group">
      <label>تاريخ الانتهاء اختياري</label>
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

<!-- PRIVATE MAILBOX COMPOSE MODAL -->
<div class="modal-overlay hidden" id="mailboxComposeModal">
  <div class="modal-box">
    <div class="modal-header">
      <h3>رسالة بريد جديدة</h3>
      <button class="modal-close" onclick="document.getElementById('mailboxComposeModal').classList.add('hidden')">✕</button>
    </div>
    <div class="form-group">
      <label>من</label>
      <input type="text" class="form-control" id="mailboxFrom" readonly dir="ltr" style="background:var(--surface)">
    </div>
    <div class="form-group"><label>إلى</label><input type="email" class="form-control" id="mailboxTo" dir="ltr" placeholder="client@example.com"></div>
    <div class="form-group"><label>الموضوع</label><input type="text" class="form-control" id="mailboxSubject"></div>
    <div class="form-group"><label>الرسالة</label><textarea class="form-control" id="mailboxMessage" style="height:150px"></textarea></div>
    <div id="mailboxComposeMsg" class="hidden mb-8"></div>
    <div class="flex gap-8">
      <button class="btn btn-primary flex-1" onclick="sendMailboxEmail()">إرسال من صندوق البريد</button>
      <button class="btn btn-outline" onclick="saveMailboxDraft()">حفظ مسودة</button>
    </div>
  </div>
</div>

<!-- PRIVATE MAILBOX MESSAGE MODAL -->
<div class="modal-overlay hidden" id="mailboxReadModal">
  <div class="modal-box" style="max-width:680px">
    <div class="modal-header">
      <h3 id="mailboxReadSubject">رسالة</h3>
      <button class="modal-close" onclick="document.getElementById('mailboxReadModal').classList.add('hidden')">✕</button>
    </div>
    <div style="font-size:12px;color:var(--muted);line-height:1.9;margin-bottom:16px">
      <div><strong>من:</strong> <span id="mailboxReadFrom" class="user-content"></span></div>
      <div><strong>إلى:</strong> <span id="mailboxReadTo" class="user-content"></span></div>
      <div><strong>التاريخ:</strong> <span id="mailboxReadDate"></span></div>
    </div>
    <div id="mailboxReadBody" class="user-content" style="white-space:pre-wrap;line-height:1.9;border-top:1px solid var(--border);padding-top:16px;max-height:420px;overflow:auto"></div>
    <div id="mailboxReadActions" class="mailbox-read-actions"></div>
  </div>
</div>

<!-- PDF OVERLAY -->
<div class="pdf-overlay hidden" id="pdfOverlay">
  <div style="max-width:760px;width:100%">
    <div class="pdf-doc" id="pdfDoc"></div>
    <div class="quote-tool-rail" aria-label="انتقل إلى حاسبة أخرى">
      <div class="quote-tool-rail-title">
        <span class="section-eyebrow">تنقل سريع</span>
        <strong>ابدأ تسعيرة جديدة من أي قطاع</strong>
      </div>
      <div class="quote-tool-rail-list">
        <?php foreach ($quickTools as [$slug, $mark, $short, $name, $legacySlug]):
          $locked = !in_array('all', $userTools, true) && !in_array($legacySlug, $userTools, true);
        ?>
        <button type="button" class="quote-tool-link <?= $locked ? 'is-locked' : '' ?>"
                onclick="<?= $locked ? 'showPlanUpgrade()' : "closeQuoteAndOpenTool('$slug')" ?>">
          <span><?= $mark ?></span><?= $short ?>
        </button>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="quote-rating-panel hidden" id="quoteRatingPanel">
      <div>
        <span class="section-eyebrow">تفاعل المستخدم</span>
        <strong>كيف تقيّم وضوح هذه التسعيرة؟</strong>
        <span class="quote-rating-summary" id="quoteRatingSummary">لا توجد تقييمات بعد</span>
      </div>
      <div class="quote-rating-actions" role="group" aria-label="تقييم التسعيرة">
        <?php for ($rating = 1; $rating <= 5; $rating++): ?>
        <button type="button" class="rating-button" data-rating="<?= $rating ?>" onclick="setQuoteRating(<?= $rating ?>)" aria-label="تقييم <?= $rating ?> من 5"><?= $rating ?></button>
        <?php endfor; ?>
      </div>
      <span class="quote-rating-label" id="quoteRatingLabel">لم يتم التقييم بعد</span>
    </div>
    <div class="pdf-actions no-print">
      <button class="btn btn-primary" onclick="window.print()">
        <span class="ui-icon ui-icon-print" aria-hidden="true"></span> طباعة / تحميل PDF
      </button>
      <?php if ($role !== 'client'): ?>
      <button class="btn btn-outline" id="pdfEmailBtn" onclick="sendQuoteByEmail()">
        <span>✉</span> إرسال للعميل بالبريد
      </button>
      <?php endif; ?>
      <button class="btn btn-ghost" onclick="document.getElementById('pdfOverlay').classList.add('hidden')">إغلاق</button>
    </div>
    <div id="pdfEmailMsg" class="hidden mt-8" style="text-align:center;font-size:13px;padding:8px 14px;border-radius:var(--r)"></div>
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
      <?php if ($role === 'client'): ?>
      <input type="hidden" id="tqmClient" value="<?= (int)$user['id'] ?>">
      <div class="client-self-note">سيتم حفظ هذه التسعيرة مباشرة في حسابك، ولا تحتاج إلى اختيار عميل.</div>
      <?php else: ?>
      <label>العميل *</label>
      <select class="form-control" id="tqmClient"><option value="">اختر العميل...</option></select>
      <?php endif; ?>
    </div>
    <div class="form-group">
      <label>ملاحظات</label>
      <textarea class="form-control" id="tqmNotes" placeholder="أي ملاحظات إضافية..." style="height:70px"></textarea>
    </div>
    <div id="tqmMsg" class="hidden mb-8"></div>
    <div class="flex gap-8">
      <button class="btn btn-primary flex-1" onclick="saveToolQuote()"><span class="ui-icon ui-icon-save" aria-hidden="true"></span> حفظ كمسودة</button>
      <button class="btn btn-ghost" onclick="document.getElementById('toolQuoteModal').classList.add('hidden')">إلغاء</button>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:10px;text-align:center">يُحفظ كمسودة يمكنك تعديله وإرساله للعميل من قسم عروض الأسعار</p>
  </div>
</div>

<!-- Plan upgrade notice -->
<div class="modal-overlay hidden" id="upgradeModal">
  <div class="modal-box" style="text-align:center">
    <div class="upgrade-modal-mark ui-icon ui-icon-lock" aria-hidden="true"></div>
    <h3 style="margin-bottom:8px">ترقية الخطة مطلوبة</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:20px">هذه الأداة متاحة بعد اختيارها ضمن باقة Plus أو Pro.</p>
    <div class="flex gap-8" style="justify-content:center">
      <?php if ($role === 'client'): ?>
      <button class="btn btn-primary" onclick="document.getElementById('upgradeModal').classList.add('hidden');navDirect('subscription')">عرض خطط الاشتراك</button>
      <?php else: ?>
      <button class="btn btn-primary" onclick="document.getElementById('upgradeModal').classList.add('hidden')">حسناً</button>
      <?php endif; ?>
      <button class="btn btn-ghost" onclick="document.getElementById('upgradeModal').classList.add('hidden')">إغلاق</button>
    </div>
  </div>
</div>

<script>
const APP = <?= json_encode([
  'role'          => $role,
  'uid'           => (int)$user['id'],
  'plan'          => $user['plan'],
  'effectivePlan' => $effectivePlan,
  'isPaid'        => true,
  'name'          => $user['name'],
  'maxQuotes'     => $maxQuotesThisMonth,
  'quotesUsed'    => $quotesUsedThisMonth,
  'quotesRemaining' => $quotesRemaining,
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
</script>
<script src="/assets/js/currency.js?v=1"></script>
<script src="/assets/js/app.js?v=<?= @filemtime(__DIR__.'/../assets/js/app.js') ?: time() ?>"></script>
</body>
</html>

<?php
function statusLabel(string $s): string {
  return ['draft'=>'مسودة','sent'=>'مُرسل','accepted'=>'مقبول','rejected'=>'مرفوض','cancelled'=>'ملغي'][$s] ?? $s;
}
?>
