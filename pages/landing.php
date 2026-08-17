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
  <meta name="description" content="تسعيرة منصة عربية سعودية للتسعير وعروض الأسعار وإدارة العملاء">
  <link rel="icon" type="image/png" href="/assets/logo.png">
  <title>تسعيرة | منصة التسعير العربية</title>
  <link rel="stylesheet" href="/assets/css/app.css?v=<?= filemtime(__DIR__.'/../assets/css/app.css') ?>">
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
<script>
(function(){
  var splash  = document.getElementById('splash-screen');
  var icon    = document.getElementById('splashIcon');
  var spinner = document.getElementById('splashSpinner');
  var brand   = document.getElementById('splashBrand');
  setTimeout(function(){
    if(icon)    icon.classList.add('clear');
    if(spinner) spinner.classList.add('done');
    if(brand)   brand.classList.add('show');
  }, 1400);
  setTimeout(function(){
    splash.classList.add('fade-out');
    setTimeout(function(){ if(splash.parentNode) splash.parentNode.removeChild(splash); }, 650);
  }, 2800);
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
  <a href="#features" onclick="closeLandMenu()">المميزات</a>
  <a href="#pricing"  onclick="closeLandMenu()">الأسعار</a>
  <a href="#about"    onclick="closeLandMenu()">من نحن</a>
  <a href="#contact"  onclick="closeLandMenu()">تواصل معنا</a>
  <div class="lmm-actions">
    <button class="btn btn-ghost"   onclick="closeLandMenu();showAuth('login')">تسجيل الدخول</button>
    <button class="btn btn-primary" onclick="closeLandMenu();showAuth('register')">ابدأ مجاناً</button>
  </div>
</div>

<!-- ═══ الهيرو ═══ -->
<section>
  <div class="hero">
    <div class="hero-content">
      <h1 data-ar="<em>سعّر</em> بثقة<br><span class='em-gold'>أدِر</span> بذكاء." data-en="<em>Price</em> with confidence,<br><span class='em-gold'>manage</span> with clarity.">
        <em>سعّر</em> بثقة<br><span class="em-gold">أدِر</span> بذكاء.
      </h1>
      <p class="hero-sub" data-ar="أدوات تسعير احترافية · عروض أسعار PDF · إدارة عملاء · رسائل داخلية — كل شيء في منصة عربية واحدة." data-en="Professional pricing tools · PDF quotes · client management · internal messaging — all in one platform.">
        أدوات تسعير احترافية · عروض أسعار PDF · إدارة عملاء · رسائل داخلية — كل شيء في منصة عربية واحدة.
      </p>
      <div class="hero-btns">
        <button class="btn btn-primary btn-lg" onclick="showAuth('register')" data-ar="جرّب مجاناً" data-en="Try for free">جرّب مجاناً</button>
        <button class="btn btn-ghost   btn-lg" onclick="showAuth('login')"    data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</button>
      </div>
      <p class="hero-note">
        <span>✦</span>
        <span data-ar="لا يلزم بطاقة ائتمان · بيانات آمنة محلياً" data-en="No credit card required · Data stored securely">لا يلزم بطاقة ائتمان · بيانات آمنة محلياً</span>
      </p>
    </div>

    <div class="hero-visual">
      <div class="hero-card-wrap">
        <div class="hero-card-header">
          <div class="hero-card-logo-wrap">
            <img src="/assets/logo.png" alt="تسعيرة" style="width:100%;height:100%;object-fit:cover;object-position:center 38%;">
          </div>
          <div>
            <div class="hero-card-title">لوحة تحكم تسعيرة</div>
            <div class="hero-card-sub">نظرة عامة هذا الشهر</div>
          </div>
        </div>
        <div class="hero-stat-row">
          <span class="hero-stat-label">عروض الأسعار</span>
          <span class="hero-stat-val" style="color:var(--p)">٢٤ عرض</span>
        </div>
        <div class="hero-stat-row">
          <span class="hero-stat-label">إجمالي مقبول</span>
          <span class="hero-stat-val" style="color:var(--green)">١٢٨,٤٠٠ ر.س</span>
        </div>
        <div class="hero-stat-row">
          <span class="hero-stat-label">العملاء النشطون</span>
          <span class="hero-stat-val">١١ عميل</span>
        </div>
        <div class="hero-stat-row">
          <span class="hero-stat-label">معدل القبول</span>
          <span class="hero-stat-val" style="color:var(--gold)">٨٧٪</span>
        </div>
        <div class="hero-card-tags">
          <span class="badge badge-accepted">● مقبول</span>
          <span class="badge badge-sent">● مُرسل</span>
          <span class="badge badge-draft">● مسودة</span>
        </div>
      </div>
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
      <p data-ar="٥ أدوات متخصصة لحساب تسعيرة الخدمات الباقات المتاجر والمكاتب بمنهجية احترافية واضحة." data-en="5 specialized tools for pricing services, packages, stores and offices with clear methodology.">٥ أدوات متخصصة لحساب تسعيرة الخدمات الباقات المتاجر والمكاتب بمنهجية احترافية واضحة.</p>
    </div>
    <!-- 2 -->
    <div class="feat-card">
      <div class="feat-icon">📄</div>
      <h3 data-ar="عروض الأسعار" data-en="Quotations">عروض الأسعار</h3>
      <p data-ar="أنشئ عروض أسعار احترافية بتفاصيل كاملة واطبعها PDF في ثوانٍ مع شعار علامتك التجارية." data-en="Create professional quotes with full details and print as PDF instantly with your brand logo.">أنشئ عروض أسعار احترافية بتفاصيل كاملة واطبعها PDF في ثوانٍ مع شعار علامتك التجارية.</p>
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
      <p data-ar="سجل كامل لكل عميل مع عروضه وملفاته ومحادثاته ولوحة إدارة شاملة مع إحصاءات حية." data-en="Full client records with quotes, files and conversations plus a live admin dashboard.">سجل كامل لكل عميل مع عروضه وملفاته ومحادثاته ولوحة إدارة شاملة مع إحصاءات حية.</p>
    </div>
    <!-- 6 -->
    <div class="feat-card">
      <div class="feat-icon">🔒</div>
      <h3 data-ar="نظام الخطط" data-en="Plan System">نظام الخطط</h3>
      <p data-ar="ثلاث خطط مرنة يتحكم فيها المدير لكل مستخدم على حدة مجاني محترف مؤسسة." data-en="Three flexible plans the admin controls per user free, pro, enterprise.">ثلاث خطط مرنة يتحكم فيها المدير لكل مستخدم على حدة مجاني محترف مؤسسة.</p>
    </div>
  </div>
</section>

<!-- ═══ الأسعار ═══ -->
<div class="pricing-section">
<section id="pricing" class="pricing">
  <div class="section-head">
    <div class="eyebrow" data-ar="الأسعار" data-en="Pricing">الأسعار</div>
    <h2 data-ar="خطط واضحة بدون مفاجآت" data-en="Clear plans, no surprises">خطط واضحة بدون مفاجآت</h2>
    <p data-ar="المدير يتحكم في خطة كل مستخدم ويغيرها في أي وقت" data-en="The admin controls each user's plan and can change it anytime">المدير يتحكم في خطة كل مستخدم ويغيرها في أي وقت</p>
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
</div>

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
         data-ar="تسعيرة منصة عربية متكاملة تُمكّن أصحاب المشاريع والفرق من إدارة أعمالهم باحترافية — من أول لحظة تسعير حتى إرسال الفاتورة."
         data-en="Tas3eerah is an all-in-one Arabic platform that empowers businesses and teams to manage their work professionally — from the first pricing moment to the final invoice.">
        تسعيرة منصة عربية متكاملة تُمكّن أصحاب المشاريع والفرق من إدارة أعمالهم باحترافية — من أول لحظة تسعير حتى إرسال الفاتورة.
      </p>
      <div class="about-stats">
        <div>
          <div class="about-stat-num">١٠٠٪</div>
          <div class="about-stat-lbl" data-ar="عربي RTL كامل" data-en="Arabic Full RTL">عربي RTL كامل</div>
        </div>
        <div>
          <div class="about-stat-num" style="color:var(--gold)">٥</div>
          <div class="about-stat-lbl" data-ar="أدوات تسعير" data-en="Pricing tools">أدوات تسعير</div>
        </div>
        <div>
          <div class="about-stat-num" style="color:var(--green)">٣</div>
          <div class="about-stat-lbl" data-ar="خطط مرنة" data-en="Flexible plans">خطط مرنة</div>
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
          <div style="font-weight:700;font-size:13px;direction:ltr">support@tas3eerah.com</div>
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
        <p style="font-size:12px;color:rgba(255,255,255,.55);line-height:2;max-width:260px">منصة عربية لإدارة التسعير عروض الأسعار والتواصل مع العملاء.</p>
      </div>
      <div>
        <div class="footer-col-title">المنصة</div>
        <div class="footer-links">
          <a href="#features">المميزات</a>
          <a href="#pricing">الأسعار</a>
          <a href="#about">من نحن</a>
          <a href="#contact">تواصل</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">الحساب</div>
        <div class="footer-links">
          <span onclick="showAuth('login')">تسجيل الدخول</span>
          <span onclick="showAuth('register')">إنشاء حساب</span>
        </div>
      </div>
      <div>
        <div class="footer-col-title">القانوني</div>
        <div class="footer-links">
          <span onclick="showPolicy('privacy')">سياسة الخصوصية</span>
          <span onclick="showPolicy('terms')">شروط الاستخدام</span>
          <span onclick="showPolicy('refund')">سياسة الإلغاء</span>
          <span onclick="showPolicy('cookies')">الكوكيز</span>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <?= date('Y') ?> تسعيرة — جميع الحقوق محفوظة</span>
      <span>🇸🇦 المملكة العربية السعودية</span>
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

      <!-- حسابات تجريبية -->
      <div style="margin-top:18px;border-top:1px solid var(--line);padding-top:14px">
        <div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:10px;font-weight:700;letter-spacing:.5px"
             data-ar="حسابات تجريبية — اضغط للملء التلقائي" data-en="Demo accounts — click to auto-fill">
          حسابات تجريبية — اضغط للملء التلقائي
        </div>
        <div style="display:flex;flex-direction:column;gap:7px">
          <div onclick="fillLogin('admin@tas3eerah.com','Admin@2025')"
               style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;background:var(--surface);transition:background .15s"
               onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'">
            <span style="background:var(--p);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap"
                  data-ar="مدير" data-en="Admin">مدير</span>
            <span style="font-size:12px;direction:ltr;flex:1;color:var(--muted)">admin@tas3eerah.com</span>
            <span style="font-size:11px;color:var(--muted2);direction:ltr">Admin@2025</span>
          </div>
          <div onclick="fillLogin('employee@tas3eerah.com','Demo@2025')"
               style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;background:var(--surface);transition:background .15s"
               onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'">
            <span style="background:var(--gold);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap"
                  data-ar="موظف" data-en="Employee">موظف</span>
            <span style="font-size:12px;direction:ltr;flex:1;color:var(--muted)">employee@tas3eerah.com</span>
            <span style="font-size:11px;color:var(--muted2);direction:ltr">Demo@2025</span>
          </div>
          <div onclick="fillLogin('client@tas3eerah.com','Demo@2025')"
               style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;background:var(--surface);transition:background .15s"
               onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'">
            <span style="background:var(--green);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap"
                  data-ar="عميل" data-en="Client">عميل</span>
            <span style="font-size:12px;direction:ltr;flex:1;color:var(--muted)">client@tas3eerah.com</span>
            <span style="font-size:11px;color:var(--muted2);direction:ltr">Demo@2025</span>
          </div>
        </div>
      </div>
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
          <input type="password" class="form-control" id="regPass" name="password" placeholder="6+ characters" dir="ltr" autocomplete="new-password">
        </div>
        <button type="submit" class="btn btn-primary w-full" data-ar="إنشاء الحساب" data-en="Create Account">إنشاء الحساب</button>
      </form>
    </div>
  </div>
</div>

<script>
/* ══ حالة اللغة ══ */
const LANG = { current: 'ar' };

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
function toggleLang() {
  LANG.current = LANG.current === 'ar' ? 'en' : 'ar';
  const isAr = LANG.current === 'ar';
  document.documentElement.lang = LANG.current;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = isAr ? 'EN' : 'AR';
  document.querySelectorAll('[data-ar]').forEach(el => {
    const val = el.getAttribute('data-' + LANG.current);
    if (val !== null) el.innerHTML = val;
  });
}

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
  el.textContent = msg; el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fillLogin(email, pass) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPass').value  = pass;
  document.getElementById('authError').classList.add('hidden');
}

async function apiPost(url, data) {
  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(data)
    });
    const json = await r.json();
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
    <p style="color:var(--muted);font-size:13px;line-height:2">يحق لك الاطلاع على بياناتك أو طلب حذفها. تواصل معنا على support@tas3eerah.com</p>`
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
  document.getElementById('policyContent').innerHTML =
    `<h2 style="font-size:22px;font-weight:900;margin-bottom:8px">${p.title}</h2>${p.body}`;
  document.getElementById('policyOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function hidePolicyModal() {
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
    fb.textContent = 'يرجى تعبئة جميع الحقول'; return;
  }
  fb.style.display = 'block'; fb.style.color = 'var(--green)';
  fb.textContent = 'تم استلام رسالتك وسنرد خلال يوم عمل.';
  document.getElementById('ctName').value  = '';
  document.getElementById('ctEmail').value = '';
  document.getElementById('ctMsg').value   = '';
}
</script>
</body>
</html>
