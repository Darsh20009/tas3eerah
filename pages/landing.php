<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Response.php';

Auth::start();
$user = Auth::user();
if ($user) { header('Location: /dashboard'); exit; }
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="تسعيرة أول منصة سعودية متخصصة في أدوات التسعير وإدارة الخدمات والمنتجات">
  <link rel="icon" type="image/png" href="/assets/logo.png">
  <title>تسعيرة | منصة التسعير العربية</title>
  <link rel="stylesheet" href="/assets/css/app.css?v=<?= filemtime(__DIR__.'/../assets/css/app.css') ?>">
  <meta name="csrf-token" content="<?= htmlspecialchars(Auth::csrfToken(), ENT_QUOTES) ?>">
  <script src="/assets/js/currency.js?v=1"></script>
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
<script>
(function(){
  var splash  = document.getElementById('splash-screen');
  var icon    = document.getElementById('splashIcon');
  var spinner = document.getElementById('splashSpinner');
  var brand   = document.getElementById('splashBrand');
  if(icon)    icon.classList.add('clear');
  if(spinner) spinner.classList.add('done');
  if(brand)   brand.classList.add('show');
  if(splash)  splash.remove();
})();
</script>

<!-- ═══ شريط التنقل ═══ -->
<nav class="land-nav">
  <a class="land-brand" href="/">
    <img class="land-brand-logo" src="/assets/logo.png" alt="تسعيرة">
  </a>

  <div class="land-nav-links">
    <a href="#features" data-ar="المميزات"  data-en="Features">المميزات</a>
    <a href="#pricing"  data-ar="الأسعار"   data-en="Pricing">الأسعار</a>
    <a href="#about"    data-ar="من نحن"    data-en="About">من نحن</a>
    <a href="#contact"  data-ar="تواصل"     data-en="Contact">تواصل</a>
  </div>

  <div class="land-actions">
    <button class="lang-toggle" onclick="toggleLang()" id="langBtn">EN</button>
    <button class="btn btn-ghost  btn-sm" onclick="showAuth('login')"    data-ar="دخول"       data-en="Sign in">دخول</button>
    <button class="btn btn-primary btn-sm" onclick="showAuth('register')" data-ar="ابدأ مجاناً" data-en="Start free">ابدأ مجاناً</button>
    <button class="land-hamburger" id="landHamburger" onclick="toggleLandMenu()" aria-label="القائمة">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- ═══ قائمة موبايل ═══ -->
<div class="land-mobile-menu" id="landMobileMenu">
  <a href="#features" onclick="closeLandMenu()" data-ar="المميزات" data-en="Features">المميزات</a>
  <a href="#pricing"  onclick="closeLandMenu()" data-ar="الأسعار" data-en="Pricing">الأسعار</a>
  <a href="#about"    onclick="closeLandMenu()" data-ar="من نحن" data-en="About">من نحن</a>
  <a href="#contact"  onclick="closeLandMenu()" data-ar="تواصل معنا" data-en="Contact us">تواصل معنا</a>
  <div class="lmm-actions">
    <button class="btn btn-ghost"   onclick="closeLandMenu();showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</button>
    <button class="btn btn-primary" onclick="closeLandMenu();showAuth('register')" data-ar="ابدأ مجاناً" data-en="Start free">ابدأ مجاناً</button>
  </div>
</div>

<!-- ═══ الهيرو ═══ -->
<section>
  <div class="hero">
    <div class="hero-content bg-[#f7f4f0]">
      <h1 data-ar="<em>سعّر</em> بثقة<br><span class='em-gold'>أدِر</span> بذكاء." data-en="<em>Price</em> with confidence,<br><span class='em-gold'>manage</span> with clarity.">
        <em>سعّر</em> بثقة<br><span class="em-gold">أدِر</span> بذكاء.
      </h1>
      <p class="hero-sub" data-ar="أول منصة سعودية متخصصة في أدوات التسعير · قطاعات متعددة · تقارير وسجل مشاريع — كل ما تحتاجه لتنظيم تسعير خدماتك ومنتجاتك في مكان واحد." data-en="Saudi Arabia's first specialized pricing platform for multiple sectors, reports and project records.">
        أول منصة سعودية متخصصة في أدوات التسعير · قطاعات متعددة · تقارير وسجل مشاريع — كل ما تحتاجه لتنظيم تسعير خدماتك ومنتجاتك في مكان واحد.
      </p>
      <div class="hero-btns">
        <button class="btn btn-primary btn-lg" onclick="showAuth('register')" data-ar="جرّب مجاناً" data-en="Try for free">جرّب مجاناً</button>
        <button class="btn btn-ghost   btn-lg" onclick="showAuth('login')"    data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</button>
      </div>
      <p class="hero-note">
        <span>✦</span>
         <span data-ar="ابدأ بالخطة المجانية ثم اختر ما يناسب فريقك" data-en="Start free, then choose the plan that fits your team">ابدأ بالخطة المجانية ثم اختر ما يناسب فريقك</span>
      </p>
      <div class="hero-trust-stats" aria-label="مزايا المنصة">
        <div><strong>+5,000</strong><span>تسعيرة منظمة</span></div>
        <div><strong>٧</strong><span>قطاعات متخصصة</span></div>
        <div><strong>٣</strong><span>باقات واضحة</span></div>
      </div>
    </div>

    <div class="hero-visual">
      <img
        class="hero-reference-image"
        src="/assets/hero-reference-art.png?v=2"
        alt="لوحة منصة تسعيرة"
      >
    </div>
  </div>
</section>

<!-- ═══ المميزات ═══ -->
<section id="features" class="features">
  <div class="section-head">
    <div class="eyebrow" data-ar="المميزات" data-en="Features">المميزات</div>
    <h2 data-ar="كل أدوات عملك في مكان واحد" data-en="All your business tools in one place">كل أدوات عملك في مكان واحد</h2>
    <p data-ar="منصة متكاملة مبنية خصيصاً لأصحاب المشاريع والفرق العربية" data-en="A complete platform built specifically for Arabic teams and businesses">منصة متكاملة مبنية خصيصاً لأصحاب المشاريع والفرق العربية</p>
  </div>

  <div class="feat-grid">
    <!-- 1 -->
    <div class="feat-card">
      <img src="/assets/img-pricing.png" alt="أدوات التسعير" class="feat-icon-img" style="background:var(--p-d);padding:8px;border-radius:10px;">
      <h3 data-ar="أدوات التسعير" data-en="Pricing Tools">أدوات التسعير</h3>
       <p data-ar="أدوات متخصصة للخدمات والباقات والمطاعم والتجزئة والمشاريع التقنية والتصميم." data-en="Specialized tools for services, packages, restaurants, retail, technology and design.">أدوات متخصصة للخدمات والباقات والمطاعم والتجزئة والمشاريع التقنية والتصميم.</p>
    </div>
    <!-- 2 -->
    <div class="feat-card">
      <div class="feat-icon">📄</div>
      <h3 data-ar="٧ قطاعات متخصصة" data-en="7 specialized sectors">٧ قطاعات متخصصة</h3>
      <p data-ar="من الخدمات والمطاعم إلى التجزئة والمشاريع التقنية والتصميم المعماري، لكل نشاط طريقة تسعير مناسبة." data-en="From services and restaurants to retail, technology and architecture, each sector gets the right pricing method.">من الخدمات والمطاعم إلى التجزئة والمشاريع التقنية والتصميم المعماري، لكل نشاط طريقة تسعير مناسبة.</p>
    </div>
    <!-- 3 -->
    <div class="feat-card">
      <img src="/assets/img-devices.jpg" alt="متعدد الأجهزة" class="feat-icon-img">
      <h3 data-ar="متعدد الأجهزة" data-en="All Devices">متعدد الأجهزة</h3>
      <p data-ar="يعمل على الجوال التابلت والكمبيوتر بتصميم متجاوب يتكيف مع شاشتك تلقائياً." data-en="Works on mobile, tablet and desktop with a fully responsive design.">يعمل على الجوال التابلت والكمبيوتر بتصميم متجاوب يتكيف مع شاشتك تلقائياً.</p>
    </div>
    <!-- 4 -->
    <div class="feat-card">
      <img src="/assets/img-support.jpg" alt="الرسائل الداخلية" class="feat-icon-img">
      <h3 data-ar="الرسائل الداخلية" data-en="Messaging">الرسائل الداخلية</h3>
      <p data-ar="تواصل مباشر بين العملاء والموظفين والمدير داخل النظام بدون واتساب أو إيميل خارجي." data-en="Direct communication between clients, staff and admin inside the system.">تواصل مباشر بين العملاء والموظفين والمدير داخل النظام بدون واتساب أو إيميل خارجي.</p>
    </div>
    <!-- 5 -->
    <div class="feat-card">
      <img src="/assets/img-3.png" alt="إدارة متكاملة" class="feat-icon-img" style="background:var(--p-d);padding:8px;border-radius:10px;">
      <h3 data-ar="إدارة متكاملة" data-en="Full Management">إدارة متكاملة</h3>
      <p data-ar="سجل كامل للمشاريع والخدمات والمنتجات مع تقارير ولوحة إدارة مترابطة." data-en="A connected record for projects, services and products with reports and administration.">سجل كامل للمشاريع والخدمات والمنتجات مع تقارير ولوحة إدارة مترابطة.</p>
    </div>
    <!-- 6 -->
    <div class="feat-card">
      <div class="feat-icon">🔒</div>
      <h3 data-ar="نظام الخطط" data-en="Plan System">نظام الخطط</h3>
      <p data-ar="ثلاث باقات واضحة: مجاني وPlus وPro، تناسب احتياجك وعدد أفراد فريقك." data-en="Three clear plans: Free, Plus and Pro, sized for your needs and team.">ثلاث باقات واضحة: مجاني وPlus وPro، تناسب احتياجك وعدد أفراد فريقك.</p>
    </div>
  </div>
</section>

<section class="market-strip" aria-label="نظرة سريعة على المنصة">
  <div class="market-strip-inner">
    <div class="market-strip-brand">
      <img src="/assets/icon.png" alt="تسعيرة">
    </div>
    <div class="market-strip-stat"><strong>98%</strong><span data-ar="رضا العملاء" data-en="Customer satisfaction">رضا العملاء</span></div>
    <div class="market-strip-stat"><strong>+5,000</strong><span data-ar="مشاريع منظمة" data-en="Organized projects">مشاريع منظمة</span></div>
    <div class="market-strip-stat"><strong>٧</strong><span data-ar="قطاعات متخصصة" data-en="Specialized sectors">قطاعات متخصصة</span></div>
    <div class="market-strip-copy"><strong data-ar="منصة للسوق السعودي" data-en="Built for the Saudi market">منصة للسوق السعودي</strong><span data-ar="تسعير عملي بهوية عربية" data-en="Practical pricing with an Arabic identity">تسعير عملي بهوية عربية</span></div>
  </div>
</section>

<!-- ═══ الأسعار ═══ -->
<?php if (!OPEN_ACCESS_MODE): ?><div class="pricing-section">
<section id="pricing" class="pricing">
  <div class="section-head">
    <div class="eyebrow" data-ar="الأسعار" data-en="Pricing">الأسعار</div>
    <h2 data-ar="خطط واضحة بدون مفاجآت" data-en="Clear plans, no surprises">خطط واضحة بدون مفاجآت</h2>
    <p data-ar="اختر الباقة التي تناسب طريقة عملك وعدد أفراد فريقك" data-en="Choose the plan that fits your workflow and team size">اختر الباقة التي تناسب طريقة عملك وعدد أفراد فريقك</p>
  </div>
  <div class="plan-grid">
    <?php foreach (PLANS as $slug => $plan): ?>
    <div class="plan-card <?= $slug === 'pro' ? 'featured' : '' ?>">
      <?php if ($slug === 'pro'): ?>
        <div class="plan-badge" data-ar="الأكثر طلباً" data-en="Most popular">الأكثر طلباً</div>
      <?php endif; ?>
      <div class="plan-name" data-ar="<?= htmlspecialchars($plan['name_ar']) ?>" data-en="<?= htmlspecialchars($plan['name_en']) ?>"><?= htmlspecialchars($plan['name_ar']) ?></div>
      <div class="plan-price">
        <?= $plan['price'] === 0 ? '٠' : number_format($plan['price']) ?>
        <span><?= $plan['price'] === 0 ? 'مجاني' : 'ر.س / شهر' ?></span>
      </div>
      <p class="plan-desc"><?= htmlspecialchars($plan['features_ar'][0] ?? '') ?></p>
      <ul class="plan-features">
        <?php foreach (array_slice($plan['features_ar'], 1) as $f): ?>
        <li><span class="plan-check">✓</span><?= htmlspecialchars($f) ?></li>
        <?php endforeach; ?>
      </ul>
      <button class="btn <?= $slug === 'pro' ? 'btn-primary' : 'btn-outline' ?> w-full"
              onclick="showAuth('register')"
              data-ar="ابدأ الآن" data-en="Start now">ابدأ الآن</button>
    </div>
    <?php endforeach; ?>
  </div>
</section>
</div><?php endif; ?>

<!-- ═══ CTA ═══ -->
<div class="trust-strip">
  <div class="trust-inner">
    <div>
      <h2 data-ar="جاهز للبدء النظام يعمل الآن." data-en="Ready to start? The platform is live.">جاهز للبدء النظام يعمل الآن.</h2>
      <p data-ar="سجّل حسابك في أقل من دقيقة وابدأ بالتسعير" data-en="Create your account in under a minute and start pricing">سجّل حسابك في أقل من دقيقة وابدأ بالتسعير</p>
    </div>
    <div class="trust-actions">
      <button class="btn btn-gold  btn-lg" onclick="showAuth('register')" data-ar="أنشئ حسابك"   data-en="Create account">أنشئ حسابك</button>
      <button class="btn btn-ghost btn-lg" onclick="showAuth('login')"   data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</button>
    </div>
  </div>
</div>

<!-- ═══ من نحن ═══ -->
<section id="about">
  <div class="about-section">
    <div>
      <div class="eyebrow" style="display:inline-block" data-ar="من نحن" data-en="About">من نحن</div>
      <h2 style="font-size:clamp(24px,4vw,36px);font-weight:900;line-height:1.2;margin:14px 0 16px"
          data-ar="بُنيت لأصحاب المشاريع العربية" data-en="Built for Arabic business owners">
        بُنيت لأصحاب المشاريع العربية
      </h2>
      <p style="color:var(--muted);font-size:15px;line-height:2;margin-bottom:8px"
         data-ar="تسعيرة منصة عربية تساعد أصحاب المشاريع على معرفة التكلفة الحقيقية وتحديد السعر العادل قبل تقديم أي خدمة أو منتج."
         data-en="Tas3eerah helps business owners understand their real costs and set a fair price before offering any service or product.">
        تسعيرة أول منصة سعودية تساعد أصحاب المشاريع على تنظيم تسعير خدماتهم ومنتجاتهم قبل تقديمها.
      </p>
      <div class="about-stats">
        <div>
          <div class="about-stat-num">سعودية</div>
          <div class="about-stat-lbl" data-ar="هوية ومنهجية محلية" data-en="Local identity and methodology">هوية ومنهجية محلية</div>
        </div>
        <div>
          <div class="about-stat-num" style="color:var(--gold)">٧</div>
          <div class="about-stat-lbl" data-ar="قطاعات متخصصة" data-en="Specialized sectors">قطاعات متخصصة</div>
        </div>
        <div>
          <div class="about-stat-num" style="color:var(--green)">٣</div>
          <div class="about-stat-lbl" data-ar="باقات واضحة" data-en="Clear plans">باقات واضحة</div>
        </div>
      </div>
    </div>
    <div class="about-values">
      <div class="about-values-title" data-ar="قيمنا" data-en="Our Values">قيمنا</div>
      <div class="about-value-item">
        <div class="about-value-dot"></div>
        <div>
          <strong data-ar="الشفافية" data-en="Transparency">الشفافية</strong>
          <span data-ar="أدوات تسعير مبنية على منهجية واضحة — لا أرقام عشوائية." data-en="Pricing tools built on a clear methodology — no random numbers.">أدوات تسعير مبنية على منهجية واضحة — لا أرقام عشوائية.</span>
        </div>
      </div>
      <div class="about-value-item">
        <div class="about-value-dot"></div>
        <div>
          <strong data-ar="الاحترافية" data-en="Professionalism">الاحترافية</strong>
          <span data-ar="واجهة عربية تعكس هوية عملك أمام عملائك." data-en="An Arabic interface that reflects your brand identity to your clients.">واجهة عربية تعكس هوية عملك أمام عملائك.</span>
        </div>
      </div>
      <div class="about-value-item">
        <div class="about-value-dot"></div>
        <div>
          <strong data-ar="البساطة" data-en="Simplicity">البساطة</strong>
          <span data-ar="نظام واحد يجمع كل احتياجاتك بدون تعقيد." data-en="One system that brings all your needs together — no complexity.">نظام واحد يجمع كل احتياجاتك بدون تعقيد.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ التواصل ═══ -->
<section id="contact" style="background:var(--surface);border-top:1px solid var(--line)">
  <div class="contact-section">
    <div>
      <div class="eyebrow" style="display:inline-block" data-ar="تواصل معنا" data-en="Contact Us">تواصل معنا</div>
      <h2 style="font-size:clamp(20px,3vw,30px);font-weight:900;margin:14px 0 10px" data-ar="لديك سؤال؟" data-en="Have a question?">لديك سؤال؟</h2>
      <p style="color:var(--muted);font-size:14px;line-height:2;margin-bottom:22px" data-ar="فريقنا يرد خلال يوم عمل واحد." data-en="Our team replies within one business day.">فريقنا يرد خلال يوم عمل واحد.</p>

      <div class="contact-info-item">
        <div class="contact-info-icon">✉</div>
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:700">البريد الإلكتروني</div>
          <div style="font-weight:700;font-size:13px;direction:ltr">info@tas3eerah.com</div>
        </div>
      </div>
      <div class="contact-info-item">
        <div class="contact-info-icon">🌐</div>
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:700">الموقع الرسمي</div>
          <div style="font-weight:700;font-size:13px">
            <a href="#" style="color:var(--p)">tas3eerah.com</a>
          </div>
        </div>
      </div>
    </div>

    <div class="contact-form">
      <h3 style="font-size:16px;font-weight:800;margin-bottom:20px">أرسل رسالة</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group" style="margin:0">
          <label>الاسم</label>
          <input type="text" class="form-control" id="ctName" placeholder="اسمك الكريم">
        </div>
        <div class="form-group" style="margin:0">
          <label>البريد الإلكتروني</label>
          <input type="email" class="form-control" id="ctEmail" placeholder="email@example.com" dir="ltr">
        </div>
        <div class="form-group" style="margin:0">
          <label>الرسالة</label>
          <textarea class="form-control" id="ctMsg" placeholder="اكتب رسالتك هنا..."></textarea>
        </div>
        <div id="ctFeedback" style="font-size:13px;display:none"></div>
        <button class="btn btn-primary" onclick="submitContact()">إرسال الرسالة</button>
      </div>
      <p style="font-size:11px;color:var(--muted2);margin-top:14px;text-align:center">نلتزم بالخصوصية ولا نشارك بياناتك</p>
    </div>
  </div>
</section>

<!-- ═══ الفوتر ═══ -->
<footer class="land-footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <div class="footer-brand-logo">
            <img src="/assets/logo.png" alt="تسعيرة" style="width:100%;height:100%;object-fit:cover;object-position:center 38%;">
          </div>
        </div>
        <div class="footer-gold-line"></div>
        <p style="font-size:12px;color:rgba(255,255,255,.55);line-height:2;max-width:260px" data-ar="أول منصة سعودية متخصصة في أدوات التسعير وإدارة الخدمات والمنتجات." data-en="Saudi Arabia's first specialized platform for pricing tools and service and product management.">أول منصة سعودية متخصصة في أدوات التسعير وإدارة الخدمات والمنتجات.</p>
      </div>
      <div>
        <div class="footer-col-title" data-ar="المنصة" data-en="Platform">المنصة</div>
        <div class="footer-links">
          <a href="#features" data-ar="المميزات" data-en="Features">المميزات</a>
          <a href="#pricing" data-ar="الأسعار" data-en="Pricing">الأسعار</a>
          <a href="#about" data-ar="من نحن" data-en="About">من نحن</a>
          <a href="#contact" data-ar="تواصل" data-en="Contact">تواصل</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title" data-ar="الحساب" data-en="Account">الحساب</div>
        <div class="footer-links">
          <span onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</span>
          <span onclick="showAuth('register')" data-ar="إنشاء حساب" data-en="Create account">إنشاء حساب</span>
        </div>
      </div>
      <div>
        <div class="footer-col-title" data-ar="القانوني" data-en="Legal">القانوني</div>
        <div class="footer-links">
          <span onclick="showPolicy('privacy')" data-ar="سياسة الخصوصية" data-en="Privacy policy">سياسة الخصوصية</span>
          <span onclick="showPolicy('terms')" data-ar="شروط الاستخدام" data-en="Terms of use">شروط الاستخدام</span>
          <span onclick="showPolicy('refund')" data-ar="سياسة الإلغاء" data-en="Cancellation policy">سياسة الإلغاء</span>
          <span onclick="showPolicy('cookies')" data-ar="الكوكيز" data-en="Cookies">الكوكيز</span>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
       <span data-ar="© <?= date('Y') ?> تسعيرة — جميع الحقوق محفوظة" data-en="© <?= date('Y') ?> Tas3eerah — All rights reserved">© <?= date('Y') ?> تسعيرة — جميع الحقوق محفوظة</span>
       <span data-ar="🇸🇦 المملكة العربية السعودية" data-en="🇸🇦 Saudi Arabia">🇸🇦 المملكة العربية السعودية</span>
      <a class="qirox-credit" href="https://qiroxstudio.online" target="_blank" rel="noopener noreferrer">
        Made by <strong>Qirox Studio Group</strong>
      </a>
    </div>
  </div>
</footer>

<!-- ═══ مودال السياسات ═══ -->
<div class="auth-overlay hidden" id="policyOverlay" onclick="if(event.target===this)hidePolicyModal()">
  <div style="background:var(--card);border:1px solid var(--line);border-radius:var(--r-xl);width:100%;max-width:680px;max-height:88vh;overflow-y:auto;position:relative;padding:34px;box-shadow:var(--sh-lg)">
    <button onclick="hidePolicyModal()" style="position:sticky;top:0;float:left;background:none;border:none;font-size:20px;color:var(--muted);cursor:pointer;z-index:10;line-height:1">✕</button>
    <div id="policyContent" style="direction:rtl"></div>
  </div>
</div>

<!-- ═══ نافذة المصادقة ═══ -->
<div class="auth-overlay hidden" id="authOverlay">
  <div class="auth-box">
    <button onclick="hideAuth()" style="position:absolute;top:14px;left:14px;background:none;border:none;font-size:18px;color:var(--muted);cursor:pointer;line-height:1">✕</button>

    <div class="auth-logo">
      <img class="auth-logo-img" src="/assets/logo.png" alt="تسعيرة">
    </div>

    <div id="authError" class="auth-error hidden"></div>
    <?php if (!empty($_GET['oauth_error'])): ?>
    <div class="auth-error" style="display:block;margin-bottom:12px">
      ⚠️ <?= htmlspecialchars($_GET['oauth_error'], ENT_QUOTES) ?>
    </div>
    <?php endif; ?>

    <!-- تسجيل الدخول -->
    <div id="loginForm">
      <div class="auth-tabs">
        <div class="auth-tab active" onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</div>
        <div class="auth-tab"        onclick="showAuth('register')" data-ar="إنشاء حساب" data-en="Create account">إنشاء حساب</div>
      </div>

      <!-- أزرار الدخول الاجتماعي -->
      <div class="social-btns">
        <?php if (GOOGLE_CLIENT_ID): ?>
        <a href="/auth/google" class="social-btn social-btn-google">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
            <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
            <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
            <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
          </svg>
          <span data-ar="المتابعة عبر Google" data-en="Continue with Google">المتابعة عبر Google</span>
        </a>
        <?php endif; ?>
        <?php if (APPLE_CLIENT_ID): ?>
        <a href="/auth/apple" class="social-btn social-btn-apple">
          <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-166.8-106.6c-52.3-61.7-96.5-156.4-96.5-246.5C0 378.1 113.5 234.5 217.4 234.5c50.8 0 97.9 34.5 130.6 34.5 31.1 0 84.4-36.9 144.5-36.9 23.1 0 111.1 2.6 178.1 80.2zm-190.5-113.7c-29.1-36.9-66.4-64.9-105.4-64.9-2.6 0-5.2.3-7.8.6 1.3 41.5 19.5 83 47.5 111.7 28 28.6 67 47.5 102.7 47.5 2.6 0 5.2-.3 7.8-.6-1.3-39-19.5-77.3-44.8-94.3z"/>
          </svg>
          <span data-ar="المتابعة عبر Apple" data-en="Continue with Apple">المتابعة عبر Apple</span>
        </a>
        <?php endif; ?>
        <?php if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID): ?>
        <div class="social-not-configured">
          <a href="/auth/google" class="social-btn social-btn-google" style="opacity:.55;cursor:not-allowed;pointer-events:none">
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none"><path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/><path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/><path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/><path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/></svg>
            <span>Google</span>
          </a>
          <a href="/auth/apple" class="social-btn social-btn-apple" style="opacity:.55;cursor:not-allowed;pointer-events:none">
            <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-166.8-106.6c-52.3-61.7-96.5-156.4-96.5-246.5C0 378.1 113.5 234.5 217.4 234.5c50.8 0 97.9 34.5 130.6 34.5 31.1 0 84.4-36.9 144.5-36.9 23.1 0 111.1 2.6 178.1 80.2zm-190.5-113.7c-29.1-36.9-66.4-64.9-105.4-64.9-2.6 0-5.2.3-7.8.6 1.3 41.5 19.5 83 47.5 111.7 28 28.6 67 47.5 102.7 47.5 2.6 0 5.2-.3 7.8-.6-1.3-39-19.5-77.3-44.8-94.3z"/></svg>
            <span>Apple</span>
          </a>
        </div>
        <?php endif; ?>
      </div>
      <?php if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID): ?>
      <p class="social-config-note">⚙️ يحتاج الدخول الاجتماعي إلى إعداد — <a href="#" style="color:var(--p)">اطلع على الإعداد</a></p>
      <?php endif; ?>

      <div class="social-divider"><span data-ar="أو سجّل بالبريد" data-en="or use email">أو سجّل بالبريد</span></div>

      <form onsubmit="doLogin();return false;" autocomplete="on">
        <div class="form-group">
          <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</label>
          <input type="email" class="form-control" id="loginEmail" name="email" placeholder="you@example.com" dir="ltr" autocomplete="email">
        </div>
        <div class="form-group">
          <label data-ar="كلمة المرور" data-en="Password">كلمة المرور</label>
          <input type="password" class="form-control" id="loginPass" name="password" placeholder="••••••" dir="ltr" autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary w-full" data-ar="دخول" data-en="Sign in">دخول</button>
      </form>

    </div>

    <!-- إنشاء حساب -->
    <div id="registerForm" class="hidden">
      <div class="auth-tabs">
        <div class="auth-tab"        onclick="showAuth('login')"    data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</div>
        <div class="auth-tab active" onclick="showAuth('register')" data-ar="إنشاء حساب"  data-en="Create account">إنشاء حساب</div>
      </div>

      <!-- أزرار التسجيل الاجتماعي -->
      <div class="social-btns">
        <?php if (GOOGLE_CLIENT_ID): ?>
        <a href="/auth/google" class="social-btn social-btn-google">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none"><path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/><path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/><path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/><path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/></svg>
          <span data-ar="التسجيل عبر Google" data-en="Sign up with Google">التسجيل عبر Google</span>
        </a>
        <?php endif; ?>
        <?php if (APPLE_CLIENT_ID): ?>
        <a href="/auth/apple" class="social-btn social-btn-apple">
          <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-166.8-106.6c-52.3-61.7-96.5-156.4-96.5-246.5C0 378.1 113.5 234.5 217.4 234.5c50.8 0 97.9 34.5 130.6 34.5 31.1 0 84.4-36.9 144.5-36.9 23.1 0 111.1 2.6 178.1 80.2zm-190.5-113.7c-29.1-36.9-66.4-64.9-105.4-64.9-2.6 0-5.2.3-7.8.6 1.3 41.5 19.5 83 47.5 111.7 28 28.6 67 47.5 102.7 47.5 2.6 0 5.2-.3 7.8-.6-1.3-39-19.5-77.3-44.8-94.3z"/></svg>
          <span data-ar="التسجيل عبر Apple" data-en="Sign up with Apple">التسجيل عبر Apple</span>
        </a>
        <?php endif; ?>
        <?php if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID): ?>
        <a href="#" class="social-btn social-btn-google" style="opacity:.55;pointer-events:none">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none"><path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/><path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/><path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/><path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/></svg>
          <span>Google</span>
        </a>
        <a href="#" class="social-btn social-btn-apple" style="opacity:.55;pointer-events:none">
          <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-166.8-106.6c-52.3-61.7-96.5-156.4-96.5-246.5C0 378.1 113.5 234.5 217.4 234.5c50.8 0 97.9 34.5 130.6 34.5 31.1 0 84.4-36.9 144.5-36.9 23.1 0 111.1 2.6 178.1 80.2zm-190.5-113.7c-29.1-36.9-66.4-64.9-105.4-64.9-2.6 0-5.2.3-7.8.6 1.3 41.5 19.5 83 47.5 111.7 28 28.6 67 47.5 102.7 47.5 2.6 0 5.2-.3 7.8-.6-1.3-39-19.5-77.3-44.8-94.3z"/></svg>
          <span>Apple</span>
        </a>
        <?php endif; ?>
      </div>
      <?php if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID): ?>
      <p class="social-config-note">⚙️ يحتاج إلى إعداد credentials</p>
      <?php endif; ?>
      <div class="social-divider"><span data-ar="أو سجّل بالبريد" data-en="or use email">أو سجّل بالبريد</span></div>

      <form onsubmit="doRegister();return false;" autocomplete="on">
        <div class="form-group">
          <label data-ar="الاسم الكامل" data-en="Full Name">الاسم الكامل</label>
          <input type="text" class="form-control" id="regName" name="name" placeholder="محمد أحمد" autocomplete="name">
        </div>
        <div class="form-group">
          <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</label>
          <input type="email" class="form-control" id="regEmail" name="email" placeholder="you@example.com" dir="ltr" autocomplete="email">
        </div>
        <div class="form-group">
          <label data-ar="كلمة المرور" data-en="Password">كلمة المرور</label>
          <input type="password" class="form-control" id="regPass" name="password" placeholder="8+ characters" dir="ltr" autocomplete="new-password">
        </div>
        <button type="submit" class="btn btn-primary w-full" data-ar="إنشاء الحساب" data-en="Create Account">إنشاء الحساب</button>
      </form>
    </div>
  </div>
</div>

<script>
/* ══ حالة اللغة ══ */
const LANG = { current: localStorage.getItem('tas3-lang') || 'ar' };
const LANDING_TRANSLATIONS = {
  'سياسة الخصوصية':'Privacy policy', 'شروط الاستخدام':'Terms of use',
  'سياسة الإلغاء والاسترداد':'Cancellation and refund policy', 'سياسة الكوكيز':'Cookie policy',
  'آخر تحديث:':'Last updated:', 'المعلومات التي نجمعها':'Information we collect',
  'استخدام المعلومات':'How we use information', 'الأمان':'Security', 'حقوقك':'Your rights',
  'قبول الشروط':'Acceptance of terms', 'الاستخدام المسموح':'Permitted use',
  'الملكية الفكرية':'Intellectual property', 'إلغاء الاشتراك':'Subscription cancellation',
  'الاسترداد':'Refunds', 'الكوكيز التي نستخدمها':'Cookies we use',
  'نجمع المعلومات التي تقدمها مباشرةً عند إنشاء حساب (الاسم البريد الإلكتروني كلمة المرور المشفرة). لا نجمع بيانات الدفع مباشرةً.':'We collect information you provide when creating an account (name, email and encrypted password). We do not collect payment details directly.',
  'نستخدم بياناتك لتشغيل الخدمة وتحسين التجربة. لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.':'We use your data to operate the service and improve the experience. We do not sell your data or share it with third parties for marketing.',
  'كلمات المرور مشفرة بخوارزمية bcrypt. نطبق بروتوكولات أمان معيارية لحماية بياناتك.':'Passwords are encrypted with bcrypt. We apply standard security practices to protect your data.',
  'يحق لك الاطلاع على بياناتك أو طلب حذفها. تواصل معنا على info@tas3eerah.com':'You may review or request deletion of your data. Contact us at info@tas3eerah.com',
  'باستخدامك للمنصة فأنت توافق على هذه الشروط وتلتزم بها.':'By using the platform, you agree to and will comply with these terms.',
  'تلتزم بالاستخدام للأغراض المشروعة فقط وفق الأنظمة المعمول بها في المملكة العربية السعودية.':'You agree to use the platform only for lawful purposes under the applicable laws of Saudi Arabia.',
  'جميع محتويات المنصة محمية بموجب حقوق الملكية الفكرية وتعود لـ تسعيرة.':'All platform content is protected by intellectual property rights and belongs to Tas3eerah.',
  'يمكنك إلغاء اشتراكك في أي وقت. تبقى مزاياك حتى نهاية الفترة المدفوعة.':'You can cancel your subscription at any time. Your benefits remain available until the end of the paid period.',
  'نُقدم استرداداً كاملاً خلال ٧ أيام من الاشتراك الأول إذا لم تستخدم الميزات المدفوعة.':'We provide a full refund within 7 days of the first subscription if you have not used paid features.',
  'كوكي الجلسة الضرورية لتسجيل الدخول. تنتهي تلقائياً خلال ٣٠ يوماً أو عند تسجيل الخروج. لا نستخدم كوكيز تتبعية أو تسويقية.':'The session cookie required for sign-in. It expires automatically after 30 days or when you sign out. We do not use tracking or marketing cookies.',
  'يرجى تعبئة جميع الحقول':'Please fill in all fields',
  'تم استلام رسالتك وسنرد خلال يوم عمل.':'Your message was received. We will reply within one business day.',
  'يرجى إدخال البريد وكلمة المرور':'Please enter your email and password',
  'كلمة المرور يجب أن تكون ٨ أحرف على الأقل':'Password must be at least 8 characters',
  'خطأ في إنشاء الحساب':'Unable to create the account', 'خطأ في تسجيل الدخول':'Unable to sign in',
  'تسعيرة منظمة':'Organized quotes', 'قطاعات متخصصة':'Specialized sectors', 'باقات واضحة':'Clear plans',
  'المملكة العربية السعودية':'Saudi Arabia', 'لوحة منصة تسعيرة':'Tas3eerah workspace',
  'الأكثر طلباً':'Most popular', 'مجاني':'Free', 'ر.س / شهر':'SAR / month',
  '٥ تسعيرات للخدمات أو المنتجات شهرياً':'5 service or product quotes per month',
  'تصدير ٣ تقارير PDF':'Export 3 PDF reports', 'سجل يعرض ٣ خدمات أو منتجات':'Record 3 services or products',
  'مستخدم واحد':'One user', 'دعم عبر البريد خلال ٣ أيام':'Email support within 3 days',
  'اختيار أداتي تسعير حسب احتياجك':'Choose 2 pricing tools for your needs',
  '١٥ تسعيراً للخدمات أو المنتجات شهرياً':'15 service or product quotes per month',
  'تصدير ١٥ تقرير PDF':'Export 15 PDF reports', 'سجل مشاريع كامل':'Full project record',
  'مستخدمان':'Two users', 'دعم عبر البريد خلال ٤٨ ساعة':'Email support within 48 hours',
  'اختيار ٣ أدوات تسعير حسب احتياجك':'Choose 3 pricing tools for your needs',
  'تسعير غير محدود للخدمات أو المنتجات':'Unlimited service or product pricing',
  'حتى ٤ مستخدمين للفريق':'Up to 4 team users', 'رسائل داخلية بين أعضاء الفريق':'Internal team messaging',
  'تقارير PDF غير محدودة مع شعار العميل':'Unlimited PDF reports with your logo',
  'أولوية الدعم خلال ٢٤ ساعة عبر البريد وواتساب':'Priority support within 24 hours by email and WhatsApp',
  'ابدأ الآن':'Start now', 'جاهز للبدء النظام يعمل الآن.':'Ready to start? The platform is live.',
  'سجّل حسابك في أقل من دقيقة وابدأ بالتسعير':'Create your account in under a minute and start pricing',
  'أنشئ حسابك':'Create your account', 'سعودية':'Saudi', 'هوية ومنهجية محلية':'Local identity and methodology',
  'قيمنا':'Our Values', 'الشفافية':'Transparency', 'الاحترافية':'Professionalism', 'البساطة':'Simplicity',
  'لديك سؤال؟':'Have a question?', 'فريقنا يرد خلال يوم عمل واحد.':'Our team replies within one business day.',
  'البريد الإلكتروني':'Email', 'الموقع الرسمي':'Official website', 'أرسل رسالة':'Send a message',
  'الاسم':'Name', 'اسمك الكريم':'Your name', 'الرسالة':'Message', 'اكتب رسالتك هنا...':'Write your message here...',
  'إرسال الرسالة':'Send message', 'نلتزم بالخصوصية ولا نشارك بياناتك':'We respect your privacy and do not share your data',
  'القائمة':'Menu', 'تسعيرة':'Tas3eerah', 'أول منصة سعودية':'Saudi Arabia’s first platform'
};
const LANDING_TRANSLATIONS_REVERSE = Object.fromEntries(
  Object.entries(LANDING_TRANSLATIONS).map(([ar, en]) => [en, ar])
);
function translateLandingText(text) {
  if (!text) return text;
  const source = LANG.current === 'en' ? LANDING_TRANSLATIONS : LANDING_TRANSLATIONS_REVERSE;
  return Object.entries(source)
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((value, [from, to]) => {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isArabic = /[\u0600-\u06ff]/.test(from);
      const boundary = isArabic ? '\\u0600-\\u06ff' : 'A-Za-z';
      return value.replace(new RegExp(`(?<![${boundary}])${escaped}(?![${boundary}])`, 'g'), to);
    }, text)
    .replace(LANG.current === 'en' ? /[٠-٩]/g : /$^/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/* ══ قائمة الموبايل ══ */
function toggleLandMenu() {
  const menu = document.getElementById('landMobileMenu');
  const btn  = document.getElementById('landHamburger');
  const open = menu.classList.toggle('open');
  document.body.style.overflow = open ? 'hidden' : '';
  const s = btn.querySelectorAll('span');
  if (open) {
    s[0].style.transform = 'translateY(6px) rotate(45deg)';
    s[1].style.opacity   = '0';
    s[2].style.transform = 'translateY(-6px) rotate(-45deg)';
  } else {
    s.forEach(x => { x.style.transform = ''; x.style.opacity = ''; });
  }
}
function closeLandMenu() {
  document.getElementById('landMobileMenu').classList.remove('open');
  document.getElementById('landHamburger').querySelectorAll('span').forEach(s => {
    s.style.transform = ''; s.style.opacity = '';
  });
  document.body.style.overflow = '';
}
window.addEventListener('resize', () => { if (window.innerWidth > 768) closeLandMenu(); });

/* ══ تبديل اللغة ══ */
function applyLandingLanguage() {
  const isAr = LANG.current === 'ar';
  document.documentElement.lang = LANG.current;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
  document.title = isAr ? 'تسعيرة | أول منصة سعودية للتسعير' : 'Tas3eerah | Saudi pricing platform';
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = isAr ? 'EN' : 'AR';
  document.querySelectorAll('[data-ar]').forEach(el => {
    const val = el.getAttribute('data-' + LANG.current);
    if (val !== null) el.innerHTML = val;
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName) && node.nodeValue.trim()) nodes.push(node);
  }
  nodes.forEach(node => { node.nodeValue = translateLandingText(node.nodeValue); });
  document.querySelectorAll('input[placeholder], textarea[placeholder], [aria-label]').forEach(el => {
    if (el.placeholder) el.placeholder = translateLandingText(el.placeholder);
    if (el.getAttribute('aria-label')) el.setAttribute('aria-label', translateLandingText(el.getAttribute('aria-label')));
  });
  if (ACTIVE_POLICY) showPolicy(ACTIVE_POLICY);
  if (window.Tas3Currency) Tas3Currency.replace(document.body);
  localStorage.setItem('tas3-lang', LANG.current);
}
function toggleLang() {
  LANG.current = LANG.current === 'ar' ? 'en' : 'ar';
  applyLandingLanguage();
}
document.addEventListener('DOMContentLoaded', () => {
  applyLandingLanguage();
});

/* ══ نافذة المصادقة ══ */
function showAuth(tab) {
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  const isReg = tab === 'register';
  document.getElementById('loginForm').classList.toggle('hidden', isReg);
  document.getElementById('registerForm').classList.toggle('hidden', !isReg);
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const el = isReg
      ? document.getElementById('regName')
      : document.getElementById('loginEmail');
    if (el) el.focus();
  }, 80);
}
function hideAuth() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}
function showErr(msg) {
  const el = document.getElementById('authError');
  el.textContent = translateLandingText(msg); el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function refreshCsrfToken() {
  try {
    const r = await fetch('/api/auth?action=csrf&_=' + Date.now(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin'
    });
    const json = await r.json();
    const token = json?.data?.csrf_token;
    if (!r.ok || !token) return false;
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) meta.content = token;
    return true;
  } catch (e) {
    return false;
  }
}

async function apiPost(url, data, allowCsrfRetry = true) {
  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(data)
    });
    const json = await r.json();
    if (r.status === 403 && json?.code === 'CSRF_INVALID' && allowCsrfRetry) {
      if (await refreshCsrfToken()) return apiPost(url, data, false);
    }
    if (!r.ok && !json.error) json.error = 'خطأ في الخادم (' + r.status + ')';
    return json;
  } catch (e) {
    return { success: false, error: 'خطأ في الاتصال بالخادم — تحقق من الاتصال بالإنترنت' };
  }
}

async function submitContact() {
  const name  = document.getElementById('ctName')?.value.trim();
  const email = document.getElementById('ctEmail')?.value.trim();
  const msg   = document.getElementById('ctMsg')?.value.trim();
  const fb    = document.getElementById('ctFeedback');
  if (!name || !email || !msg) {
    fb.style.display = 'block';
    fb.style.color   = 'var(--red, #e53e3e)';
    fb.textContent   = 'يرجى تعبئة جميع الحقول';
    return;
  }
  const res = await apiPost('/api/contact', { name, email, message: msg });
  fb.style.display = 'block';
  if (res.success) {
    fb.style.color = 'var(--p)';
    fb.textContent = '✓ تم إرسال رسالتك — سنرد خلال يوم عمل واحد';
    document.getElementById('ctName').value = '';
    document.getElementById('ctEmail').value = '';
    document.getElementById('ctMsg').value = '';
  } else {
    fb.style.color = 'var(--red, #e53e3e)';
    fb.textContent = res.error || 'حدث خطأ — يرجى المحاولة مجدداً';
  }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { showErr('يرجى إدخال البريد وكلمة المرور'); return; }
  const res = await apiPost('/api/auth', { action: 'login', email, password: pass });
  if (res.success) location.href = '/dashboard';
  else showErr(res.error || 'بيانات غير صحيحة');
}

async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  if (!name || !email || !pass) { showErr('يرجى تعبئة جميع الحقول'); return; }
  if (pass.length < 8) { showErr('كلمة المرور يجب أن تكون ٨ أحرف على الأقل'); return; }
  const res = await apiPost('/api/auth', { action: 'register', name, email, password: pass });
  if (res.success) location.href = '/dashboard';
  else showErr(res.error || 'خطأ في إنشاء الحساب');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { hideAuth(); hidePolicyModal(); return; }
  if (e.key !== 'Enter') return;
  if (!document.getElementById('registerForm').classList.contains('hidden')) doRegister();
  else if (!document.getElementById('loginForm').classList.contains('hidden')) doLogin();
});

/* ══ السياسات ══ */
let ACTIVE_POLICY = null;
const POLICIES = {
  privacy: {
    title: 'سياسة الخصوصية',
    body: `<p style="color:var(--muted);font-size:12px;margin-bottom:22px">آخر تحديث: ${new Date().getFullYear()} — تسعيرة</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">١. المعلومات التي نجمعها</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">نجمع المعلومات التي تقدمها مباشرةً عند إنشاء حساب (الاسم البريد الإلكتروني كلمة المرور المشفرة). لا نجمع بيانات الدفع مباشرةً.</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">٢. استخدام المعلومات</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">نستخدم بياناتك لتشغيل الخدمة وتحسين التجربة. لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">٣. الأمان</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">كلمات المرور مشفرة بخوارزمية bcrypt. نطبق بروتوكولات أمان معيارية لحماية بياناتك.</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">٤. حقوقك</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">يحق لك الاطلاع على بياناتك أو طلب حذفها. تواصل معنا على info@tas3eerah.com</p>`
  },
  terms: {
    title: 'شروط الاستخدام',
    body: `<p style="color:var(--muted);font-size:12px;margin-bottom:22px">آخر تحديث: ${new Date().getFullYear()}</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">١. قبول الشروط</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">باستخدامك للمنصة فأنت توافق على هذه الشروط وتلتزم بها.</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">٢. الاستخدام المسموح</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">تلتزم بالاستخدام للأغراض المشروعة فقط وفق الأنظمة المعمول بها في المملكة العربية السعودية.</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">٣. الملكية الفكرية</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">جميع محتويات المنصة محمية بموجب حقوق الملكية الفكرية وتعود لـ تسعيرة.</p>`
  },
  refund: {
    title: 'سياسة الإلغاء والاسترداد',
    body: `<p style="color:var(--muted);font-size:12px;margin-bottom:22px">آخر تحديث: ${new Date().getFullYear()}</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">١. إلغاء الاشتراك</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">يمكنك إلغاء اشتراكك في أي وقت. تبقى مزاياك حتى نهاية الفترة المدفوعة.</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">٢. الاسترداد</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2">نُقدم استرداداً كاملاً خلال ٧ أيام من الاشتراك الأول إذا لم تستخدم الميزات المدفوعة.</p>`
  },
  cookies: {
    title: 'سياسة الكوكيز',
    body: `<p style="color:var(--muted);font-size:12px;margin-bottom:22px">آخر تحديث: ${new Date().getFullYear()}</p>
    <h3 style="font-size:15px;font-weight:800;margin:20px 0 10px;color:var(--p)">الكوكيز التي نستخدمها</h3>
    <p style="color:var(--muted);font-size:13px;line-height:2"><strong style="color:var(--text)">TAS3_SESS</strong>: كوكي الجلسة الضرورية لتسجيل الدخول. تنتهي تلقائياً خلال ٣٠ يوماً أو عند تسجيل الخروج. لا نستخدم كوكيز تتبعية أو تسويقية.</p>`
  }
};

function showPolicy(key) {
  const p = POLICIES[key]; if (!p) return;
  ACTIVE_POLICY = key;
  document.getElementById('policyContent').innerHTML =
    `<h2 style="font-size:22px;font-weight:900;margin-bottom:8px">${translateLandingText(p.title)}</h2>${translateLandingText(p.body)}`;
  document.getElementById('policyOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function hidePolicyModal() {
  ACTIVE_POLICY = null;
  document.getElementById('policyOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ══ نموذج التواصل ══ */
function submitContact() {
  const name  = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const msg   = document.getElementById('ctMsg').value.trim();
  const fb    = document.getElementById('ctFeedback');
  if (!name || !email || !msg) {
    fb.style.display = 'block'; fb.style.color = 'var(--red)';
    fb.textContent = translateLandingText('يرجى تعبئة جميع الحقول'); return;
  }
  fb.style.display = 'block'; fb.style.color = 'var(--green)';
  fb.textContent = translateLandingText('تم استلام رسالتك وسنرد خلال يوم عمل.');
  document.getElementById('ctName').value  = '';
  document.getElementById('ctEmail').value = '';
  document.getElementById('ctMsg').value   = '';
}
</script>
<script src="/assets/js/form-enhancements.js?v=<?= @filemtime(__DIR__.'/../assets/js/form-enhancements.js') ?: time() ?>"></script>
</body>
</html>
