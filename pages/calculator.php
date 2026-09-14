<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

Auth::start();
$user = Auth::require();
$effectivePlan = Auth::effectivePlan($user);
$plan = PLANS[$effectivePlan] ?? PLANS['free'];

$toolMap = [
    'services' => [
        'legacy' => 'services',
        'title' => 'تسعير الخدمات',
        'short' => 'الخدمات',
        'description' => 'سعّر خدماتك ومشاريعك اليومية بناءً على التكلفة والهامش المناسب.',
        'image' => '/assets/landing/sector-services.png',
        'icon' => '/assets/landing/sector-services-icon.png',
        'plan' => 'calc_basic',
    ],
    'packages' => [
        'legacy' => 'packages',
        'title' => 'تسعير الباقات والاشتراكات',
        'short' => 'الباقات والاشتراكات',
        'description' => 'وزّع تكاليفك على الباقات والاشتراكات وحدد السعر المناسب لكل مستوى.',
        'image' => '/assets/landing/sector-services.png',
        'icon' => '/assets/landing/empty-box.png',
        'plan' => 'calc_pkg',
    ],
    'menu' => [
        'legacy' => 'menu',
        'title' => 'تسعير قوائم المطاعم والكافيهات',
        'short' => 'القوائم',
        'description' => 'احسب تكلفة الأصناف والهدر والهامش قبل اعتماد سعر القائمة.',
        'image' => '/assets/landing/sector-restaurants.png',
        'icon' => '/assets/landing/sector-restaurants-icon.png',
        'plan' => 'calc_menu',
    ],
    'retail' => [
        'legacy' => 'retail',
        'title' => 'تسعير التجزئة والجملة',
        'short' => 'التجزئة والجملة',
        'description' => 'حدد سعر البيع بعد احتساب التكلفة والعمولات والخصومات.',
        'image' => '/assets/landing/sector-retail.png',
        'icon' => '/assets/landing/sector-retail-icon.png',
        'plan' => 'calc_store',
    ],
    'tech' => [
        'legacy' => 'tech',
        'title' => 'تسعير المشاريع التقنية',
        'short' => 'المشاريع التقنية',
        'description' => 'احسب تكلفة المشروع حسب الساعات والموارد والمراحل والنطاق.',
        'image' => '/assets/landing/sector-technology.png',
        'icon' => '/assets/landing/sector-technology-icon.png',
        'plan' => 'calc_labor',
    ],
    'saas' => [
        'legacy' => 'saas',
        'title' => 'تسعير الشركات التقنية',
        'short' => 'الخدمات المتكررة',
        'description' => 'حدد سعر الاشتراك والخدمة المتكررة وفق تكاليف التشغيل والعملاء.',
        'image' => '/assets/landing/sector-technology.png',
        'icon' => '/assets/landing/sector-technology-icon.png',
        'plan' => 'calc_custom',
    ],
    'design' => [
        'legacy' => 'design',
        'title' => 'تسعير التصميم الداخلي والمعماري',
        'short' => 'التصميم والمعمار',
        'description' => 'سعّر مشاريع التصميم والتنفيذ حسب المساحة والمراحل والتكاليف.',
        'image' => '/assets/landing/sector-design.png',
        'icon' => '/assets/landing/sector-design-icon.png',
        'plan' => 'calc_office',
    ],
];

$slug = preg_replace('/[^a-z-]/', '', (string)($_GET['tool'] ?? ''));
if (!isset($toolMap[$slug])) {
    header('Location: /dashboard');
    exit;
}
$tool = $toolMap[$slug];
$planTools = $plan['tools'] ?? [];
if (!in_array('all', $planTools, true) && !in_array($tool['plan'], $planTools, true)) {
    header('Location: /dashboard?tool_locked=1');
    exit;
}

$sectorLinks = [
    'services' => 'تسعير الخدمات',
    'packages' => 'تسعير الباقات والاشتراكات',
    'menu' => 'تسعير القوائم',
    'retail' => 'تسعير التجزئة والجملة',
    'tech' => 'تسعير المشاريع التقنية',
    'saas' => 'تسعير الشركات التقنية',
    'design' => 'تسعير التصميم والمعمار',
];
$roleLabel = ['admin' => 'مدير النظام', 'employee' => 'موظف', 'client' => 'عميل'][$user['role']] ?? $user['role'];
$quotaLabel = $plan['max_quotes'] === -1 ? 'تسعير غير محدود' : 'خطة ' . $plan['name_ar'];
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#F8F5ED">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="csrf-token" content="<?= htmlspecialchars(Auth::csrfToken(), ENT_QUOTES) ?>">
  <title><?= htmlspecialchars($tool['title']) ?> | تسعيرة</title>
  <link rel="manifest" href="/assets/manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icons/icon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/icon-180.png">
  <link rel="stylesheet" href="/assets/css/app.css?v=<?= @filemtime(__DIR__.'/../assets/css/app.css') ?: time() ?>">
  <style>
    .calculator-workspace { padding: 24px 26px 46px; }
    .calculator-page-head { max-width: 1120px; margin: 0 auto 18px; }
    .calculator-breadcrumb { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:12px; margin-bottom:14px; }
    .calculator-breadcrumb a { color:var(--green); text-decoration:none; }
    .calculator-hero { display:flex; align-items:center; justify-content:space-between; gap:24px; background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg); padding:18px 22px; overflow:hidden; }
    .calculator-hero-copy { min-width:0; }
    .calculator-kicker { color:var(--green); font-size:11px; font-weight:800; margin-bottom:5px; }
    .calculator-hero h1 { margin:0; color:var(--text); font-size:24px; line-height:1.35; }
    .calculator-hero p { margin:7px 0 0; color:var(--muted); font-size:13px; line-height:1.8; }
    .calculator-hero-art { width:150px; height:84px; flex:0 0 150px; border-radius:12px; overflow:hidden; background:var(--surface); }
    .calculator-hero-art img { width:100%; height:100%; object-fit:cover; }
    .calculator-content { max-width:1120px; margin:0 auto; }
    .calculator-content #integrated-tools { border-radius:var(--r-lg); margin-top:18px; }
    .calculator-content #integrated-tools .tool-screen.active { display:block!important; }
    .calculator-content #integrated-tools .tool-screen:not(.active) { display:none!important; }
    .calculator-shell .workspace-footer { max-width:1120px; margin:0 auto; }
    .calculator-shell .sb-item,
    .calculator-shell .sb-logout { text-decoration:none; }
    @media (max-width:700px) {
      .calculator-workspace { padding:16px 13px 34px; }
      .calculator-hero { padding:16px; }
      .calculator-hero h1 { font-size:20px; }
      .calculator-hero-art { width:96px; height:68px; flex-basis:96px; }
    }
  </style>
</head>
<body class="calculator-view">
<div class="app-shell calculator-shell">
  <div class="sb-overlay" id="calculatorSidebarOverlay" onclick="closeCalculatorSidebar()"></div>
  <aside class="sidebar" id="sidebar">
    <button class="sb-close-btn" type="button" onclick="closeCalculatorSidebar()" aria-label="إغلاق القائمة">✕</button>
    <a class="sb-logo" href="/dashboard" aria-label="العودة إلى لوحة التحكم">
      <img class="sb-logo-img" src="/assets/logo.png" alt="تسعيرة">
    </a>
    <div class="sb-gold-stripe"></div>
    <div class="sb-user">
      <div class="sb-user-name user-content"><?= htmlspecialchars($user['name']) ?></div>
      <div class="sb-user-role"><?= htmlspecialchars($roleLabel) ?></div>
      <div class="sb-plan"><?= htmlspecialchars($plan['name_ar']) ?></div>
      <div class="sb-plan-usage"><?= htmlspecialchars($quotaLabel) ?></div>
    </div>
    <nav class="sb-nav" aria-label="التنقل">
      <div class="sb-section">الرئيسية</div>
      <a class="sb-item" href="/dashboard"><span class="sb-icon">◈</span> نظرة عامة</a>
      <div class="sb-section">عروض الأسعار</div>
      <a class="sb-item" href="/dashboard"><span class="sb-icon">◧</span> عروض الأسعار</a>
      <div class="sb-section">التسعيرات</div>
      <?php foreach ($sectorLinks as $linkSlug => $linkTitle): ?>
        <?php $linkAvailable = in_array('all', $planTools, true) || in_array($toolMap[$linkSlug]['plan'], $planTools, true); ?>
        <a class="sb-item <?= $slug === $linkSlug ? 'active' : '' ?>" href="<?= $linkAvailable ? '/calculator/' . $linkSlug : '/dashboard?tool_locked=1' ?>">
          <span class="sb-icon"><?= $slug === $linkSlug ? '●' : '○' ?></span>
          <?= htmlspecialchars($linkTitle) ?>
        </a>
      <?php endforeach; ?>
      <div class="sb-section">إدارة العمل</div>
      <a class="sb-item" href="/dashboard"><span class="sb-icon">▤</span> سجل المشاريع</a>
      <div class="sb-section">الحساب</div>
      <a class="sb-item" href="/dashboard"><span class="sb-icon">◉</span> حسابي</a>
    </nav>
    <div class="sb-footer">
      <a class="sb-logout" href="/logout"><span>⊗</span> تسجيل الخروج</a>
    </div>
  </aside>

  <div class="main-area">
    <header class="topbar">
      <div class="topbar-left">
        <button class="hamburger" type="button" onclick="openCalculatorSidebar()" aria-label="فتح القائمة">
          <span></span><span></span><span></span>
        </button>
        <a class="btn btn-ghost btn-sm" href="/dashboard">← لوحة التحكم</a>
        <div class="topbar-title">التسعيرات · <?= htmlspecialchars($tool['short']) ?></div>
      </div>
      <div class="topbar-actions">
        <div class="client-header-frame frame-crossfade" data-frame-animation data-frame-speed="85" aria-hidden="true">
          <img data-frame-image class="is-visible" src="/assets/ui/frame-sequence/frame-01.png" alt="">
          <img data-frame-image src="/assets/ui/frame-sequence/frame-01.png" alt="" aria-hidden="true">
        </div>
        <a class="btn btn-ghost btn-sm" href="/">الرئيسية</a>
      </div>
    </header>

    <main class="workspace calculator-workspace">
      <div class="calculator-page-head">
        <div class="calculator-breadcrumb"><a href="/dashboard">لوحة التحكم</a><span>›</span><span>التسعيرات</span><span>›</span><strong><?= htmlspecialchars($tool['short']) ?></strong></div>
        <div class="calculator-hero">
          <div class="calculator-hero-copy">
            <div class="calculator-kicker">التسعيرات</div>
            <h1><?= htmlspecialchars($tool['title']) ?></h1>
            <p><?= htmlspecialchars($tool['description']) ?></p>
          </div>
          <div class="calculator-hero-art"><img src="<?= htmlspecialchars($tool['image']) ?>" alt=""></div>
        </div>
      </div>
      <div class="calculator-content">
        <?php $classicToolOnly = $tool['legacy']; require __DIR__ . '/classic-tools-inline.php'; ?>
      </div>
      <footer class="workspace-footer">
        <span>© <?= date('Y') ?> تسعيرة · منصة التسعير العربية</span>
        <span><a href="/">الرئيسية</a> · <a href="/dashboard">لوحة التحكم</a> · <a href="/logout">تسجيل الخروج</a></span>
      </footer>
    </main>
  </div>
</div>
<script src="/assets/js/frame-loader.js?v=<?= @filemtime(__DIR__.'/../assets/js/frame-loader.js') ?: time() ?>"></script>
<script>
  window.goHome = function () { window.location.href = '/dashboard'; };
  function openCalculatorSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('calculatorSidebarOverlay').classList.add('open');
  }
  function closeCalculatorSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('calculatorSidebarOverlay').classList.remove('open');
  }
</script>
</body>
</html>