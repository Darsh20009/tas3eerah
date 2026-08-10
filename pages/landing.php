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
  <meta name="description" content="تسعيرة — منصة عربية للتسعير وعروض الأسعار وإدارة العملاء">
  <link rel="icon" type="image/png" href="/assets/brand-logo-transparent.png">
  <title>تسعيرة | منصة التسعير العربية</title>
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>

<!-- NAV -->
<nav class="land-nav">
  <a class="land-brand" href="/">
    <img src="/assets/brand-logo-transparent.png" alt="تسعيرة">
    <div>
      <span class="land-brand-name" data-ar="تسعيرة" data-en="Tas3eerah">تسعيرة</span>
      <span class="land-brand-sub" data-ar="منصة التسعير" data-en="Pricing Platform">منصة التسعير</span>
    </div>
  </a>

  <div class="land-nav-links">
    <a href="#features" data-ar="المميزات" data-en="Features">المميزات</a>
    <a href="#pricing"  data-ar="الأسعار"  data-en="Pricing">الأسعار</a>
    <a href="#about"    data-ar="من نحن"   data-en="About">من نحن</a>
    <a href="#contact"  data-ar="تواصل"    data-en="Contact">تواصل</a>
  </div>

  <div class="land-actions">
    <button class="lang-toggle" onclick="toggleLang()" id="langBtn">EN</button>
    <button class="btn btn-ghost btn-sm" onclick="showAuth('login')" data-ar="دخول" data-en="Sign in">دخول</button>
    <button class="btn btn-primary btn-sm" onclick="showAuth('register')" data-ar="ابدأ مجاناً" data-en="Start free">ابدأ مجاناً</button>
    <button class="land-hamburger" id="landHamburger" onclick="toggleLandMenu()" aria-label="القائمة">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- MOBILE MENU -->
<div class="land-mobile-menu" id="landMobileMenu">
  <a href="#features" onclick="closeLandMenu()">المميزات</a>
  <a href="#pricing"  onclick="closeLandMenu()">الأسعار</a>
  <a href="#about"    onclick="closeLandMenu()">من نحن</a>
  <a href="#contact"  onclick="closeLandMenu()">تواصل معنا</a>
  <div class="lmm-actions">
    <button class="btn btn-ghost" onclick="closeLandMenu();showAuth('login')">تسجيل الدخول</button>
    <button class="btn btn-primary" onclick="closeLandMenu();showAuth('register')">ابدأ مجاناً</button>
  </div>
</div>

<!-- HERO -->
<section>
  <div class="hero">
    <div class="hero-content">
      <div class="hero-eyebrow" data-ar="منصة عربية · SaaS للتسعير" data-en="Arabic Platform · Pricing SaaS">
        منصة عربية · SaaS للتسعير
      </div>
      <h1 data-ar="<em>سعّر</em> بثقة،<br>أدِر بذكاء." data-en="<em>Price</em> with confidence,<br>manage with clarity.">
        <em>سعّر</em> بثقة،<br>أدِر بذكاء.
      </h1>
      <p class="hero-sub" data-ar="أدوات تسعير احترافية، عروض أسعار PDF، إدارة عملاء، ورسائل داخلية — كل شيء في منصة عربية واحدة." data-en="Professional pricing tools, PDF quotes, client management, and internal messaging — all in one Arabic platform.">
        أدوات تسعير احترافية، عروض أسعار PDF، إدارة عملاء، ورسائل داخلية — كل شيء في منصة عربية واحدة.
      </p>
      <div class="hero-btns">
        <button class="btn btn-primary btn-lg" onclick="showAuth('register')" data-ar="جرّب مجاناً" data-en="Try for free">جرّب مجاناً</button>
        <button class="btn btn-ghost btn-lg" onclick="showAuth('demo')" data-ar="عرض تجريبي" data-en="Live demo">عرض تجريبي</button>
      </div>
      <p class="hero-note">
        <span>✓</span>
        <span data-ar="لا يلزم بطاقة ائتمان · بيانات آمنة محلياً" data-en="No credit card · Data stored locally">لا يلزم بطاقة ائتمان · بيانات آمنة محلياً</span>
      </p>
    </div>

    <div class="hero-visual">
      <div class="hero-card-wrap">
        <div class="hero-card-header">
          <img class="hero-card-logo" src="/assets/brand-logo-transparent.png" alt="">
          <div>
            <div class="hero-card-title">لوحة تحكم تسعيرة</div>
            <div class="hero-card-sub">نظرة عامة — هذا الشهر</div>
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
          <span class="hero-stat-val" style="color:var(--yellow)">٨٧٪</span>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
          <span class="badge badge-accepted">● مقبول</span>
          <span class="badge badge-sent" style="margin-right:6px">● مُرسل</span>
          <span class="badge badge-draft" style="margin-right:6px">● مسودة</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section id="features" class="features">
  <div class="section-head">
    <div class="eyebrow" data-ar="المميزات" data-en="Features">المميزات</div>
    <h2 data-ar="كل أدوات عملك في مكان واحد" data-en="All your business tools in one place">كل أدوات عملك في مكان واحد</h2>
    <p data-ar="منصة متكاملة مبنية خصيصاً لأصحاب المشاريع والفرق العربية" data-en="A complete platform built specifically for Arabic teams and businesses">منصة متكاملة مبنية خصيصاً لأصحاب المشاريع والفرق العربية</p>
  </div>
  <div class="feat-grid">
    <?php
    $feats = [
      ['🧮', 'أدوات التسعير', 'Pricing Tools', '٥ أدوات متخصصة لحساب تسعيرة الخدمات، الباقات، المتاجر، والمكاتب بمنهجية واضحة.', '5 specialized tools for pricing services, packages, stores and offices.'],
      ['📄', 'عروض الأسعار', 'Quotations', 'أنشئ عروض أسعار احترافية بتفاصيل كاملة واطبعها PDF في ثوانٍ.', 'Create professional quotes with full details and print as PDF instantly.'],
      ['💬', 'الرسائل الداخلية', 'Messaging', 'تواصل مباشر بين العملاء والموظفين والمدير داخل النظام دون الحاجة لواتساب.', 'Direct communication between clients, staff and manager inside the system.'],
      ['👥', 'إدارة العملاء', 'Client Management', 'سجل كامل لكل عميل مع عروضه، ملفاته، ومحادثاته في مكان واحد.', 'Complete record for each client with their quotes, files and conversations.'],
      ['📊', 'لوحة الإدارة', 'Admin Dashboard', 'إحصائيات شاملة، إدارة المستخدمين، وسجل نشاط كامل لكل إجراء.', 'Comprehensive stats, user management and full activity log.'],
      ['🔒', 'نظام الخطط', 'Subscription Plans', 'ثلاث خطط مرنة يتحكم فيها المدير لكل مستخدم على حدة — مجاني، محترف، مؤسسة.', 'Three flexible plans the admin controls per user — free, pro, enterprise.'],
    ];
    foreach ($feats as [$icon, $ar, $en, $descAr, $descEn]): ?>
    <div class="feat-card">
      <div class="feat-icon"><?= $icon ?></div>
      <h3 data-ar="<?= $ar ?>" data-en="<?= $en ?>"><?= $ar ?></h3>
      <p data-ar="<?= $descAr ?>" data-en="<?= $descEn ?>"><?= $descAr ?></p>
    </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- PRICING -->
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
      <div class="plan-name" data-ar="<?= $plan['name_ar'] ?>" data-en="<?= $plan['name_en'] ?>"><?= $plan['name_ar'] ?></div>
      <div class="plan-price">
        <?= $plan['price'] === 0 ? '٠' : $plan['price'] ?>
        <span><?= $plan['price'] === 0 ? 'مجاني' : 'ر.س / شهر' ?></span>
      </div>
      <p class="plan-desc" data-ar="<?= $plan['features_ar'][0] ?? '' ?>" data-en="<?= $plan['features_en'][0] ?? '' ?>">
        <?= $plan['features_ar'][0] ?? '' ?>
      </p>
      <ul class="plan-features">
        <?php foreach (array_slice($plan['features_ar'], 1) as $f): ?>
        <li><span class="plan-check">✓</span><?= $f ?></li>
        <?php endforeach; ?>
      </ul>
      <button class="btn <?= $slug === 'pro' ? 'btn-primary' : 'btn-outline' ?> w-full" onclick="showAuth('register')" data-ar="ابدأ الآن" data-en="Start now">ابدأ الآن</button>
    </div>
    <?php endforeach; ?>
  </div>
</section>
</div>

<!-- TRUST / CTA -->
<div class="trust-strip">
  <div class="trust-inner">
    <div>
      <h2 data-ar="جاهز للبدء؟ النظام يعمل الآن." data-en="Ready to start? The platform is live.">جاهز للبدء؟ النظام يعمل الآن.</h2>
      <p data-ar="سجّل حسابك في أقل من دقيقة وابدأ بالتسعير" data-en="Create your account in under a minute and start pricing">سجّل حسابك في أقل من دقيقة وابدأ بالتسعير</p>
    </div>
    <div class="trust-actions">
      <button class="btn btn-primary btn-lg" onclick="showAuth('register')" data-ar="أنشئ حسابك" data-en="Create account">أنشئ حسابك</button>
      <button class="btn btn-ghost btn-lg" onclick="showAuth('demo')" data-ar="جرّب بدون تسجيل" data-en="Try without signup">جرّب بدون تسجيل</button>
    </div>
  </div>
</div>

<!-- ABOUT -->
<section id="about">
  <div class="about-section">
    <div>
      <div class="eyebrow" style="display:inline-block;font-size:11px;font-weight:700;color:var(--p);text-transform:uppercase;letter-spacing:.4px;margin-bottom:14px" data-ar="من نحن" data-en="About">من نحن</div>
      <h2 style="font-size:clamp(24px,4vw,36px);font-weight:800;line-height:1.2;margin-bottom:14px" data-ar="بُنيت لأصحاب المشاريع العربية" data-en="Built for Arabic business owners">بُنيت لأصحاب المشاريع العربية</h2>
      <p style="color:var(--muted);font-size:15px;line-height:1.9;margin-bottom:8px">
        تسعيرة مبادرة من <strong style="color:var(--text)">Qirox Studio Group</strong> لتمكين أصحاب المشاريع والفرق العربية من إدارة أعمالهم باحترافية — من أول لحظة تسعير للخدمة حتى إرسال الفاتورة.
      </p>
      <div class="about-stats">
        <div>
          <div class="about-stat-num">١٠٠٪</div>
          <div class="about-stat-lbl" data-ar="عربي · RTL كامل" data-en="Arabic · Full RTL">عربي · RTL كامل</div>
        </div>
        <div>
          <div class="about-stat-num" style="color:var(--yellow)">٥</div>
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
      <?php $vals = [
        ['الشفافية', 'أدوات تسعير مبنية على منهجية واضحة — لا أرقام عشوائية.'],
        ['الاحترافية', 'واجهة عربية تعكس هوية عملك أمام عملائك.'],
        ['البساطة', 'نظام واحد يجمع كل احتياجاتك بدون تعقيد.'],
      ];
      foreach ($vals as [$t, $d]): ?>
      <div class="about-value-item">
        <div class="about-value-dot"></div>
        <div>
          <strong><?= $t ?></strong>
          <span><?= $d ?></span>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- CONTACT -->
<section id="contact" style="background:var(--surface);border-top:1px solid var(--line)">
  <div class="contact-section">
    <div>
      <div class="eyebrow" style="display:inline-block;font-size:11px;font-weight:700;color:var(--p);text-transform:uppercase;letter-spacing:.4px;margin-bottom:14px">تواصل معنا</div>
      <h2 style="font-size:clamp(20px,3vw,28px);font-weight:800;margin-bottom:10px">لديك سؤال؟</h2>
      <p style="color:var(--muted);font-size:14px;line-height:1.9;margin-bottom:20px">فريقنا يرد خلال يوم عمل واحد.</p>
      <div class="contact-info-item">
        <div class="contact-info-icon">✉</div>
        <div>
          <div style="font-size:11px;color:var(--muted)">البريد الإلكتروني</div>
          <div style="font-weight:700;font-size:13px;direction:ltr">info@qirox.online</div>
        </div>
      </div>
      <div class="contact-info-item">
        <div class="contact-info-icon">🌐</div>
        <div>
          <div style="font-size:11px;color:var(--muted)">الموقع الرسمي</div>
          <div style="font-weight:700;font-size:13px"><a href="https://qiroxstudio.online" target="_blank" rel="noopener" style="color:var(--p)">qiroxstudio.online</a></div>
        </div>
      </div>
    </div>
    <div class="contact-form">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:18px">أرسل رسالة</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group" style="margin:0"><label>الاسم</label><input type="text" class="form-control" id="ctName" placeholder="اسمك الكريم"></div>
        <div class="form-group" style="margin:0"><label>البريد الإلكتروني</label><input type="email" class="form-control" id="ctEmail" placeholder="email@example.com" dir="ltr"></div>
        <div class="form-group" style="margin:0"><label>الرسالة</label><textarea class="form-control" id="ctMsg" placeholder="اكتب رسالتك هنا..."></textarea></div>
        <div id="ctFeedback" style="font-size:13px;display:none"></div>
        <button class="btn btn-primary" onclick="submitContact()">إرسال الرسالة</button>
      </div>
      <p style="font-size:11px;color:var(--muted2);margin-top:12px;text-align:center">نلتزم بالخصوصية ولا نشارك بياناتك</p>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="land-footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="/assets/brand-logo-transparent.png" alt="تسعيرة">
          <strong>تسعيرة</strong>
        </div>
        <p style="font-size:12px;color:var(--muted);line-height:1.9;max-width:260px">منصة عربية لإدارة التسعير، عروض الأسعار، والتواصل مع العملاء.</p>
        <p style="margin-top:10px;font-size:12px;color:var(--muted2)">
          صُنع بـ <a href="https://qiroxstudio.online" target="_blank" rel="noopener" style="color:var(--p)">Qirox Studio Group</a>
        </p>
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
          <span onclick="showAuth('demo')">تجربة النظام</span>
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
      <span>© <?= date('Y') ?> تسعيرة · Qirox Studio Group</span>
      <span>المملكة العربية السعودية</span>
    </div>
  </div>
</footer>

<!-- POLICY MODAL -->
<div class="auth-overlay hidden" id="policyOverlay" onclick="if(event.target===this)hidePolicyModal()">
  <div style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-xl);width:100%;max-width:660px;max-height:86vh;overflow-y:auto;position:relative;padding:32px;box-shadow:var(--sh-lg)">
    <button onclick="hidePolicyModal()" style="position:sticky;top:0;float:left;background:none;border:none;font-size:20px;color:var(--muted);cursor:pointer;z-index:10;line-height:1">✕</button>
    <div id="policyContent" style="direction:rtl"></div>
  </div>
</div>

<!-- AUTH OVERLAY -->
<div class="auth-overlay hidden" id="authOverlay">
  <div class="auth-box">
    <button onclick="hideAuth()" style="position:absolute;top:14px;left:14px;background:none;border:none;font-size:18px;color:var(--muted);cursor:pointer;line-height:1">✕</button>
    <div class="auth-logo">
      <img src="/assets/brand-logo-transparent.png" width="30" alt="تسعيرة">
      <strong data-ar="تسعيرة" data-en="Tas3eerah">تسعيرة</strong>
    </div>

    <div id="authError" class="auth-error hidden"></div>

    <!-- Login -->
    <div id="loginForm">
      <div class="auth-tabs">
        <div class="auth-tab active" onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</div>
        <div class="auth-tab" onclick="showAuth('register')" data-ar="إنشاء حساب" data-en="Create account">إنشاء حساب</div>
      </div>
      <div class="form-group"><label>البريد الإلكتروني</label><input type="email" class="form-control" id="loginEmail" placeholder="you@example.com" dir="ltr"></div>
      <div class="form-group"><label>كلمة المرور</label><input type="password" class="form-control" id="loginPass" placeholder="••••••" dir="ltr"></div>
      <button class="btn btn-primary w-full" onclick="doLogin()">دخول</button>
      <div class="auth-sep" data-ar="أو جرّب بدون تسجيل" data-en="or try without signing up">أو جرّب بدون تسجيل</div>
      <div class="auth-demo">
        <button onclick="doDemo('client')"   data-ar="عميل"  data-en="Client">عميل</button>
        <button onclick="doDemo('employee')" data-ar="موظف"  data-en="Employee">موظف</button>
        <button onclick="doDemo('admin')"    data-ar="مدير"  data-en="Admin">مدير</button>
      </div>
    </div>

    <!-- Register -->
    <div id="registerForm" class="hidden">
      <div class="auth-tabs">
        <div class="auth-tab" onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign in">تسجيل الدخول</div>
        <div class="auth-tab active" onclick="showAuth('register')" data-ar="إنشاء حساب" data-en="Create account">إنشاء حساب</div>
      </div>
      <div class="form-group"><label>الاسم الكامل</label><input type="text" class="form-control" id="regName" placeholder="محمد أحمد"></div>
      <div class="form-group"><label>البريد الإلكتروني</label><input type="email" class="form-control" id="regEmail" placeholder="you@example.com" dir="ltr"></div>
      <div class="form-group"><label>كلمة المرور</label><input type="password" class="form-control" id="regPass" placeholder="٦ أحرف على الأقل" dir="ltr"></div>
      <button class="btn btn-primary w-full" onclick="doRegister()">إنشاء الحساب</button>
    </div>
  </div>
</div>

<script>
const lang = { current: 'ar' };

// ── MOBILE MENU ─────────────────────────
function toggleLandMenu() {
  const menu = document.getElementById('landMobileMenu');
  const btn   = document.getElementById('landHamburger');
  const open  = menu.classList.toggle('open');
  document.body.style.overflow = open ? 'hidden' : '';
  const s = btn.querySelectorAll('span');
  if (open) {
    s[0].style.transform = 'translateY(5.5px) rotate(45deg)';
    s[1].style.opacity   = '0';
    s[2].style.transform = 'translateY(-5.5px) rotate(-45deg)';
  } else {
    s.forEach(x => { x.style.transform = ''; x.style.opacity = ''; });
  }
}
function closeLandMenu() {
  document.getElementById('landMobileMenu').classList.remove('open');
  document.getElementById('landHamburger').querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  document.body.style.overflow = '';
}
window.addEventListener('resize', () => { if (window.innerWidth > 768) closeLandMenu(); });

// ── LANGUAGE ─────────────────────────────
function toggleLang() {
  lang.current = lang.current === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = lang.current;
  document.documentElement.dir  = lang.current === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = lang.current === 'ar' ? 'EN' : 'AR';
  document.querySelectorAll('[data-ar]').forEach(el => {
    const v = el.getAttribute('data-' + lang.current);
    if (v) el.innerHTML = v;
  });
}

// ── AUTH ─────────────────────────────────
function showAuth(tab) {
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  const isReg = tab === 'register';
  document.getElementById('loginForm').classList.toggle('hidden', isReg);
  document.getElementById('registerForm').classList.toggle('hidden', !isReg);
  document.body.style.overflow = 'hidden';
}
function hideAuth() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function showErr(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg; el.classList.remove('hidden');
}

async function apiPost(url, data) {
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
  return r.json();
}

async function doLogin() {
  const res = await apiPost('/api/auth', { action:'login', email: document.getElementById('loginEmail').value, password: document.getElementById('loginPass').value });
  if (res.success) location.href = '/dashboard';
  else showErr(res.error || 'خطأ في تسجيل الدخول');
}

async function doRegister() {
  const res = await apiPost('/api/auth', { action:'register', name: document.getElementById('regName').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPass').value });
  if (res.success) location.href = '/dashboard';
  else showErr(res.error || 'خطأ في إنشاء الحساب');
}

async function doDemo(role) {
  const res = await apiPost('/api/auth', { action:'demo', role });
  if (res.success) location.href = '/dashboard';
  else showErr(res.error || 'حساب التجربة غير متاح');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!document.getElementById('registerForm').classList.contains('hidden')) doRegister();
    else if (!document.getElementById('loginForm').classList.contains('hidden')) doLogin();
  }
  if (e.key === 'Escape') { hideAuth(); hidePolicyModal(); }
});

// ── POLICIES ────────────────────────────
const policies = {
  privacy: { title: 'سياسة الخصوصية', body: `<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()} — تسعيرة / Qirox Studio Group</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">١. المعلومات التي نجمعها</h3><p style="color:var(--muted);font-size:13px;line-height:2">نجمع المعلومات التي تقدمها مباشرةً عند إنشاء حساب (الاسم، البريد الإلكتروني، كلمة المرور المشفرة). لا نجمع بيانات الدفع مباشرةً.</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">٢. استخدام المعلومات</h3><p style="color:var(--muted);font-size:13px;line-height:2">نستخدم بياناتك لتشغيل الخدمة وتحسين التجربة. لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">٣. الأمان</h3><p style="color:var(--muted);font-size:13px;line-height:2">كلمات المرور مشفرة بخوارزمية bcrypt. نطبق بروتوكولات أمان معيارية.</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">٤. حقوقك</h3><p style="color:var(--muted);font-size:13px;line-height:2">يحق لك الاطلاع على بياناتك أو طلب حذفها. تواصل معنا على info@qirox.online</p>` },
  terms:   { title: 'شروط الاستخدام', body: `<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()}</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">١. قبول الشروط</h3><p style="color:var(--muted);font-size:13px;line-height:2">باستخدامك للمنصة فأنت توافق على هذه الشروط.</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">٢. الاستخدام المسموح</h3><p style="color:var(--muted);font-size:13px;line-height:2">تلتزم بالاستخدام للأغراض المشروعة فقط وفق الأنظمة المعمول بها في المملكة العربية السعودية.</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">٣. الملكية الفكرية</h3><p style="color:var(--muted);font-size:13px;line-height:2">جميع محتويات المنصة محمية بموجب حقوق الملكية الفكرية وتعود لـ Qirox Studio Group.</p>` },
  refund:  { title: 'سياسة الإلغاء والاسترداد', body: `<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()}</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">١. إلغاء الاشتراك</h3><p style="color:var(--muted);font-size:13px;line-height:2">يمكنك إلغاء اشتراكك في أي وقت. تبقى مزاياك حتى نهاية الفترة المدفوعة.</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">٢. الاسترداد</h3><p style="color:var(--muted);font-size:13px;line-height:2">نُقدم استرداداً كاملاً خلال ٧ أيام من الاشتراك الأول إذا لم تستخدم الميزات المدفوعة.</p>` },
  cookies: { title: 'سياسة الكوكيز', body: `<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()}</p><h3 style="font-size:15px;font-weight:700;margin:18px 0 9px">الكوكيز التي نستخدمها</h3><p style="color:var(--muted);font-size:13px;line-height:2"><strong>TAS3_SESS</strong>: كوكي الجلسة الضرورية لتسجيل الدخول. تنتهي تلقائياً خلال ٣٠ يوماً أو عند تسجيل الخروج.</p>` },
};

function showPolicy(key) {
  const p = policies[key]; if (!p) return;
  document.getElementById('policyContent').innerHTML = `<h2 style="font-size:20px;font-weight:800;margin-bottom:6px">${p.title}</h2>${p.body}`;
  document.getElementById('policyOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function hidePolicyModal() {
  document.getElementById('policyOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── CONTACT ─────────────────────────────
function submitContact() {
  const name = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const msg   = document.getElementById('ctMsg').value.trim();
  const fb    = document.getElementById('ctFeedback');
  if (!name || !email || !msg) {
    fb.style.display = 'block'; fb.style.color = 'var(--red)';
    fb.textContent = 'يرجى تعبئة جميع الحقول'; return;
  }
  fb.style.display = 'block'; fb.style.color = 'var(--green)';
  fb.textContent = 'شكراً! تم استلام رسالتك.';
  document.getElementById('ctName').value = '';
  document.getElementById('ctEmail').value = '';
  document.getElementById('ctMsg').value = '';
}
</script>
</body>
</html>
