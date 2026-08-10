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
  <meta name="description" content="تسعيرة — مساحة عمل عربية للتسعير وعروض الأسعار والفواتير وإدارة الفريق والعملاء.">
  <meta name="theme-color" content="#071a2e">
  <meta property="og:title" content="تسعيرة | مساحة عملك للنمو">
  <meta property="og:url" content="https://presentation.thanarah.com">
  <link rel="icon" type="image/png" href="/assets/brand-logo-transparent.png">
  <title>تسعيرة | مساحة عملك للنمو</title>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"تسعيرة","alternateName":"Tas3eerah","applicationCategory":"BusinessApplication","operatingSystem":"Web","url":"https://presentation.thanarah.com","publisher":{"@type":"Organization","name":"Qirox Studio Group","url":"https://qiroxstudio.online"}}</script>
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>

<!-- NAV -->
<nav class="land-nav">
  <div class="land-brand">
    <img src="/assets/brand-logo-transparent.png" alt="تسعيرة">
    <div>
      <strong data-ar="تسعيرة" data-en="Tas3eerah">تسعيرة</strong>
      <span data-ar="السعر العادل لكل مشروع" data-en="Fair price for every project">السعر العادل لكل مشروع</span>
    </div>
  </div>
  <div class="land-nav-links flex gap-8">
    <a href="#features" data-ar="المميزات"  data-en="Features">المميزات</a>
    <a href="#pricing"  data-ar="الأسعار"   data-en="Pricing">الأسعار</a>
    <a href="#about"    data-ar="من نحن"    data-en="About">من نحن</a>
    <a href="#contact"  data-ar="تواصل معنا" data-en="Contact">تواصل معنا</a>
  </div>
  <div class="land-actions">
    <button class="lang-toggle" onclick="toggleLang()" id="langBtn">EN</button>
    <button class="btn btn-outline" onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign In">تسجيل الدخول</button>
    <button class="btn btn-primary" onclick="showAuth('register')" data-ar="ابدأ مجاناً" data-en="Start Free">ابدأ مجاناً</button>
  </div>
</nav>

<!-- HERO -->
<section>
  <div class="hero">
    <div class="hero-content">
      <p class="hero-eyebrow" data-ar="مساحة عمل عربية تنمو معك" data-en="Arabic workspace that grows with you">مساحة عمل عربية تنمو معك</p>
      <h1 data-ar="<em>حوّل شغلك</em> إلى نظام واضح." data-en="<em>Turn your work</em> into a clear system.">
        <em>حوّل شغلك</em> إلى نظام واضح.
      </h1>
      <p class="hero-sub" data-ar="تسعيرة تجمع أدوات التسعير، عروض الأسعار، الفواتير، العملاء، والرسائل في مكان واحد — بهوية وبطريقة عمل تناسب فريقك." data-en="Tas3eerah brings pricing tools, quotes, invoices, clients, and messages into one place — with an identity that fits your team.">
        تسعيرة تجمع أدوات التسعير، عروض الأسعار، الفواتير، العملاء، والرسائل في مكان واحد — بهوية وبطريقة عمل تناسب فريقك.
      </p>
      <div class="hero-btns">
        <button class="btn btn-primary btn-lg" onclick="showAuth('register')" data-ar="أنشئ مساحة عملك" data-en="Create your workspace">أنشئ مساحة عملك</button>
        <button class="btn btn-outline btn-lg" onclick="showAuth('demo')" data-ar="استعرض تجربة العميل" data-en="View client demo">استعرض تجربة العميل</button>
      </div>
      <p class="hero-note" data-ar="تجربة العرض لا تنشئ حساباً ولا ترسل بيانات لأي خدمة خارجية" data-en="Demo doesn't create an account or send data to any external service">تجربة العرض لا تنشئ حساباً ولا ترسل بيانات لأي خدمة خارجية</p>
    </div>
    <div class="hero-visual">
      <div class="hero-glow"></div>
      <img class="hero-logo" src="/assets/brand-logo-transparent.png" alt="تسعيرة">
      <div class="float-card fc-r">
        <small data-ar="قيمة الأعمال هذا الشهر" data-en="Business value this month">قيمة الأعمال هذا الشهر</small>
        <b>١٢٨,٤٠٠ ر.س</b>
      </div>
      <div class="float-card fc-l">
        <small data-ar="معدل إنجاز الفريق" data-en="Team completion rate">معدل إنجاز الفريق</small>
        <b>٨٧%</b>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section id="features" class="features">
  <div class="section-head">
    <h2 data-ar="كل ما تحتاجه في مكان واحد" data-en="Everything you need in one place">كل ما تحتاجه في مكان واحد</h2>
    <p data-ar="منصة متكاملة تُدار بالكامل من لوحة تحكم عربية احترافية" data-en="Fully integrated platform managed from a professional Arabic dashboard">منصة متكاملة تُدار بالكامل من لوحة تحكم عربية احترافية</p>
  </div>
  <div class="feat-grid">
    <?php
    $feats = [
      ['أدوات التسعير', 'Pricing Tools', 'حساب دقيق للخدمات، الباقات، المتاجر والمكاتب بمنهجية واضحة.', 'Accurate pricing for services, packages, stores and offices with a clear methodology.'],
      ['عروض الأسعار', 'Quotations', 'أنشئ عروض أسعار احترافية مع بنود تفصيلية وطباعة PDF فوراً.', 'Create professional quotes with detailed items and instant PDF printing.'],
      ['نظام الرسائل', 'Messaging', 'تواصل مباشر بين العملاء والموظفين والإدارة داخل النظام.', 'Direct communication between clients, employees and management inside the system.'],
      ['إدارة العملاء', 'Client Management', 'سجل كامل لكل عميل، عروضه، مدفوعاته ومحادثاته.', 'Complete record for each client, their quotes, payments and conversations.'],
      ['نظام الاشتراكات', 'Subscriptions', 'خطط متعددة يتحكم فيها المدير لكل مستخدم على حدة.', 'Multiple plans controlled by the admin for each user individually.'],
      ['لوحة المدير', 'Admin Panel', 'إحصائيات شاملة، إدارة المستخدمين، وسجل نشاط كامل.', 'Comprehensive stats, user management and full activity log.'],
    ];
    foreach ($feats as $i => [$ar, $en, $descAr, $descEn]): ?>
    <div class="feat-card">
      <div class="feat-tag" data-ar="ميزة <?= $i+1 ?>" data-en="Feature <?= $i+1 ?>">ميزة <?= $i+1 ?></div>
      <h3 data-ar="<?= $ar ?>" data-en="<?= $en ?>"><?= $ar ?></h3>
      <p data-ar="<?= $descAr ?>" data-en="<?= $descEn ?>"><?= $descAr ?></p>
    </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- ABOUT -->
<section id="about" style="background:var(--ink);color:white">
  <div style="max-width:1160px;margin:auto;padding:70px 30px;display:grid;grid-template-columns:1.2fr .8fr;gap:60px;align-items:center">
    <div>
      <p style="color:var(--cyan);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px" data-ar="من نحن" data-en="About Us">من نحن</p>
      <h2 style="font-size:clamp(26px,4vw,40px);font-weight:900;line-height:1.15;margin-bottom:18px" data-ar="منصة تسعيرة — بُنيت لأصحاب المشاريع العربية" data-en="Tas3eerah — Built for Arabic business owners">منصة تسعيرة — بُنيت لأصحاب المشاريع العربية</h2>
      <p style="color:rgba(255,255,255,.65);font-size:15px;line-height:2;margin-bottom:20px" data-ar="تسعيرة مبادرة من Qirox Studio Group لتمكين أصحاب المشاريع والفرق العربية من إدارة أعمالهم باحترافية — من أول لحظة تسعير للخدمة حتى إرسال الفاتورة وتسجيل المدفوعات. نؤمن أن كل مشروع عربي يستحق أدواتٍ حديثة وواضحة تتكلم لغته." data-en="Tas3eerah is an initiative by Qirox Studio Group to empower Arabic business owners and teams to manage their work professionally — from the first pricing moment to sending invoices and recording payments.">
        تسعيرة مبادرة من <strong style="color:var(--cyan)">Qirox Studio Group</strong> لتمكين أصحاب المشاريع والفرق العربية من إدارة أعمالهم باحترافية — من أول لحظة تسعير للخدمة حتى إرسال الفاتورة وتسجيل المدفوعات.
        <br><br>
        نؤمن أن كل مشروع عربي يستحق أدواتٍ حديثة وواضحة تتكلم لغته.
      </p>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:26px;font-weight:900;color:var(--cyan)">١٠٠٪</div>
          <div style="font-size:12px;color:rgba(255,255,255,.5)" data-ar="عربي كامل RTL" data-en="Full Arabic RTL">عربي كامل RTL</div>
        </div>
        <div>
          <div style="font-size:26px;font-weight:900;color:var(--gold)">٣</div>
          <div style="font-size:12px;color:rgba(255,255,255,.5)" data-ar="خطط اشتراك مرنة" data-en="Flexible subscription plans">خطط اشتراك مرنة</div>
        </div>
        <div>
          <div style="font-size:26px;font-weight:900;color:var(--success)">٥</div>
          <div style="font-size:12px;color:rgba(255,255,255,.5)" data-ar="أدوات تسعير متخصصة" data-en="Specialized pricing tools">أدوات تسعير متخصصة</div>
        </div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:26px">
      <div style="font-size:13px;font-weight:800;color:var(--cyan);margin-bottom:16px" data-ar="قيمنا" data-en="Our Values">قيمنا</div>
      <?php $values = [
        ['الشفافية','نقدم أدوات تسعير مبنية على منهجية واضحة — لا أرقام عشوائية.'],
        ['الاحترافية','واجهة عربية محترفة تعكس هوية عملك أمام عملائك.'],
        ['البساطة','نظام واحد يجمع كل احتياجاتك بدون تعقيد أو تشتت.'],
      ];
      foreach ($values as [$t, $d]): ?>
      <div style="border-bottom:1px solid rgba(255,255,255,.07);padding:12px 0;display:flex;gap:12px;align-items:flex-start">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--cyan);margin-top:6px;flex-shrink:0"></div>
        <div>
          <div style="font-weight:700;font-size:13px;margin-bottom:3px"><?= $t ?></div>
          <div style="color:rgba(255,255,255,.5);font-size:12px;line-height:1.7"><?= $d ?></div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- PRICING -->
<section id="pricing" class="pricing">
  <div class="section-head">
    <h2 data-ar="خطط تناسب حجم عملك" data-en="Plans that fit your business size">خطط تناسب حجم عملك</h2>
    <p data-ar="المدير يتحكم في خطة كل مستخدم ويمكن ترقيتها أو تخفيضها في أي وقت" data-en="The admin controls each user's plan and can upgrade or downgrade at any time">المدير يتحكم في خطة كل مستخدم ويمكن ترقيتها أو تخفيضها في أي وقت</p>
  </div>
  <div class="plan-grid">
    <?php foreach (PLANS as $slug => $plan): ?>
    <div class="plan-card <?= $slug === 'pro' ? 'featured' : '' ?>">
      <?php if ($slug === 'pro'): ?>
        <div class="plan-badge" data-ar="الأكثر طلباً" data-en="Most popular">الأكثر طلباً</div>
      <?php endif; ?>
      <div class="plan-name" data-ar="<?= $plan['name_ar'] ?>" data-en="<?= $plan['name_en'] ?>"><?= $plan['name_ar'] ?></div>
      <div class="plan-price">
        <?= $plan['price'] === 0 ? '<span data-ar="مجاني" data-en="Free">مجاني</span>' : $plan['price'] . ' <span data-ar="ر.س / شهر" data-en="SAR/mo">ر.س / شهر</span>' ?>
      </div>
      <ul class="plan-features">
        <?php foreach ($plan['features_ar'] as $f): ?>
        <li><?= $f ?></li>
        <?php endforeach; ?>
      </ul>
      <button class="btn btn-primary w-full" onclick="showAuth('register')" data-ar="ابدأ الآن" data-en="Start Now">ابدأ الآن</button>
    </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- TRUST -->
<div class="trust-strip">
  <div class="trust-inner">
    <div>
      <h2 data-ar="جاهز تبدأ؟ النظام يعمل الآن." data-en="Ready to start? The system is live.">جاهز تبدأ؟ النظام يعمل الآن.</h2>
      <p style="color:rgba(255,255,255,.6);font-size:13px;margin-top:6px" data-ar="سجّل مجاناً في ثوانٍ" data-en="Register for free in seconds">سجّل مجاناً في ثوانٍ</p>
    </div>
    <div class="trust-stats">
      <div class="trust-stat"><b>٣</b><span data-ar="خطط اشتراك" data-en="Subscription plans">خطط اشتراك</span></div>
      <div class="trust-stat"><b>٥</b><span data-ar="أدوات تسعير" data-en="Pricing tools">أدوات تسعير</span></div>
      <div class="trust-stat"><b>RTL</b><span data-ar="دعم كامل للعربية" data-en="Full Arabic support">دعم كامل للعربية</span></div>
    </div>
    <button class="btn btn-primary btn-lg" onclick="showAuth('register')" data-ar="أنشئ حسابك" data-en="Create account">أنشئ حسابك</button>
  </div>
</div>

<!-- CONTACT -->
<section id="contact" style="max-width:1160px;margin:auto;padding:70px 30px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start">
  <div>
    <p style="color:#1a9bb5;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">تواصل معنا</p>
    <h2 style="font-size:28px;font-weight:900;margin-bottom:14px">لديك سؤال أو اقتراح؟</h2>
    <p style="color:var(--muted);font-size:14px;line-height:2;margin-bottom:22px">فريقنا يرد خلال يوم عمل واحد. يمكنك التواصل معنا عبر النموذج أو مباشرةً عبر البريد.</p>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:white;border:1px solid var(--line);border-radius:10px">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(121,213,230,.12);display:flex;align-items:center;justify-content:center;font-size:16px">✉</div>
        <div>
          <div style="font-size:11px;color:var(--muted)">البريد الإلكتروني</div>
          <div style="font-weight:700;font-size:14px;direction:ltr">info@qirox.online</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:white;border:1px solid var(--line);border-radius:10px">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(215,174,97,.12);display:flex;align-items:center;justify-content:center;font-size:16px">◎</div>
        <div>
          <div style="font-size:11px;color:var(--muted)">الموقع الرسمي</div>
          <div style="font-weight:700;font-size:14px"><a href="https://qiroxstudio.online" target="_blank" rel="noopener" style="color:var(--ink)">qiroxstudio.online</a></div>
        </div>
      </div>
    </div>
  </div>
  <div style="background:white;border:1px solid var(--line);border-radius:16px;padding:26px;box-shadow:var(--shadow)">
    <h3 style="font-size:16px;font-weight:800;margin-bottom:18px">أرسل رسالة</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group" style="margin:0"><label>الاسم</label><input type="text" class="form-control" id="ctName" placeholder="اسمك الكريم"></div>
      <div class="form-group" style="margin:0"><label>البريد الإلكتروني</label><input type="email" class="form-control" id="ctEmail" placeholder="email@example.com" dir="ltr"></div>
      <div class="form-group" style="margin:0"><label>الرسالة</label><textarea class="form-control" id="ctMsg" placeholder="اكتب رسالتك هنا..." style="height:90px"></textarea></div>
      <div id="ctFeedback" style="font-size:13px;display:none"></div>
      <button class="btn btn-primary" onclick="submitContact()">إرسال الرسالة</button>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:12px;text-align:center">نلتزم بالخصوصية التامة ولا نشارك بياناتك مع أي طرف ثالث</p>
  </div>
</section>

<!-- FOOTER -->
<footer style="background:var(--ink2);color:rgba(255,255,255,.55)">
  <div style="max-width:1160px;margin:auto;padding:50px 30px 24px">
    <!-- Top row -->
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <img src="/assets/brand-logo-transparent.png" style="width:34px" alt="تسعيرة">
          <div><strong style="color:white;font-size:16px">تسعيرة</strong><div style="font-size:10px;color:var(--cyan)">Tas3eerah</div></div>
        </div>
        <p style="font-size:12px;line-height:1.9;max-width:280px">منصة عربية متكاملة لإدارة التسعير، عروض الأسعار، الفواتير، والتواصل مع العملاء — بُنيت بقيم الوضوح والاحترافية.</p>
        <div style="margin-top:14px;font-size:12px">صُنع بـ <a href="https://qiroxstudio.online" target="_blank" rel="noopener" style="color:var(--cyan)">Qirox Studio Group</a></div>
      </div>
      <div>
        <div style="color:white;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">المنصة</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13px">
          <a href="#features" style="color:inherit;transition:.15s" onmouseover="this.style.color='white'" onmouseout="this.style.color=''">المميزات</a>
          <a href="#pricing"  style="color:inherit;transition:.15s" onmouseover="this.style.color='white'" onmouseout="this.style.color=''">الأسعار</a>
          <a href="#about"    style="color:inherit;transition:.15s" onmouseover="this.style.color='white'" onmouseout="this.style.color=''">من نحن</a>
          <a href="#contact"  style="color:inherit;transition:.15s" onmouseover="this.style.color='white'" onmouseout="this.style.color=''">تواصل معنا</a>
        </div>
      </div>
      <div>
        <div style="color:white;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">الحساب</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13px">
          <span style="cursor:pointer;transition:.15s" onclick="showAuth('login')"   onmouseover="this.style.color='white'" onmouseout="this.style.color=''">تسجيل الدخول</span>
          <span style="cursor:pointer;transition:.15s" onclick="showAuth('register')" onmouseover="this.style.color='white'" onmouseout="this.style.color=''">إنشاء حساب</span>
          <span style="cursor:pointer;transition:.15s" onclick="showAuth('demo')"    onmouseover="this.style.color='white'" onmouseout="this.style.color=''">تجربة النظام</span>
        </div>
      </div>
      <div>
        <div style="color:white;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">القانوني</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13px">
          <span style="cursor:pointer;transition:.15s" onclick="showPolicy('privacy')"    onmouseover="this.style.color='white'" onmouseout="this.style.color=''">سياسة الخصوصية</span>
          <span style="cursor:pointer;transition:.15s" onclick="showPolicy('terms')"      onmouseover="this.style.color='white'" onmouseout="this.style.color=''">شروط الاستخدام</span>
          <span style="cursor:pointer;transition:.15s" onclick="showPolicy('refund')"     onmouseover="this.style.color='white'" onmouseout="this.style.color=''">سياسة الإلغاء</span>
          <span style="cursor:pointer;transition:.15s" onclick="showPolicy('cookies')"    onmouseover="this.style.color='white'" onmouseout="this.style.color=''">سياسة الكوكيز</span>
        </div>
      </div>
    </div>
    <!-- Bottom row -->
    <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:12px">
      <span>© <?= date('Y') ?> تسعيرة · جميع الحقوق محفوظة</span>
      <span>المملكة العربية السعودية · منصة عربية</span>
    </div>
  </div>
</footer>

<!-- POLICY MODAL -->
<div class="auth-overlay hidden" id="policyOverlay" onclick="if(event.target===this)hidePolicyModal()">
  <div style="background:white;border-radius:18px;width:100%;max-width:680px;max-height:85vh;overflow-y:auto;position:relative;padding:36px">
    <button onclick="hidePolicyModal()" style="position:sticky;top:0;float:left;background:none;border:none;font-size:22px;color:var(--muted);cursor:pointer;z-index:10">✕</button>
    <div id="policyContent" style="direction:rtl"></div>
  </div>
</div>

<!-- AUTH OVERLAY -->
<div class="auth-overlay hidden" id="authOverlay">
  <div class="auth-box">
    <button onclick="hideAuth()" style="position:absolute;top:14px;left:14px;background:none;border:none;font-size:20px;color:var(--muted);cursor:pointer">✕</button>
    <div class="auth-logo">
      <img src="/assets/brand-logo-transparent.png" width="34" alt="تسعيرة">
      <strong data-ar="تسعيرة" data-en="Tas3eerah">تسعيرة</strong>
    </div>

    <div id="authError" class="auth-error hidden"></div>

    <!-- Login -->
    <div id="loginForm">
      <div class="auth-tabs">
        <div class="auth-tab active" onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign In">تسجيل الدخول</div>
        <div class="auth-tab" onclick="showAuth('register')" data-ar="إنشاء حساب" data-en="Create Account">إنشاء حساب</div>
      </div>
      <div class="form-group">
        <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</label>
        <input type="email" class="form-control" id="loginEmail" placeholder="you@example.com" dir="ltr">
      </div>
      <div class="form-group">
        <label data-ar="كلمة المرور" data-en="Password">كلمة المرور</label>
        <input type="password" class="form-control" id="loginPass" placeholder="••••••" dir="ltr">
      </div>
      <button class="btn btn-primary w-full" onclick="doLogin()" data-ar="دخول" data-en="Sign In">دخول</button>
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
        <div class="auth-tab" onclick="showAuth('login')" data-ar="تسجيل الدخول" data-en="Sign In">تسجيل الدخول</div>
        <div class="auth-tab active" onclick="showAuth('register')" data-ar="إنشاء حساب" data-en="Create Account">إنشاء حساب</div>
      </div>
      <div class="form-group">
        <label data-ar="الاسم الكامل" data-en="Full Name">الاسم الكامل</label>
        <input type="text" class="form-control" id="regName" placeholder="محمد أحمد">
      </div>
      <div class="form-group">
        <label data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</label>
        <input type="email" class="form-control" id="regEmail" placeholder="you@example.com" dir="ltr">
      </div>
      <div class="form-group">
        <label data-ar="كلمة المرور" data-en="Password">كلمة المرور</label>
        <input type="password" class="form-control" id="regPass" placeholder="٦ أحرف على الأقل" dir="ltr">
      </div>
      <button class="btn btn-primary w-full" onclick="doRegister()" data-ar="إنشاء الحساب" data-en="Create Account">إنشاء الحساب</button>
    </div>
  </div>
</div>

<script>
const lang = { current: 'ar' };

function toggleLang() {
  lang.current = lang.current === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = lang.current;
  document.documentElement.dir = lang.current === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = lang.current === 'ar' ? 'EN' : 'AR';
  document.querySelectorAll('[data-ar]').forEach(el => {
    const txt = el.getAttribute('data-' + lang.current);
    if (txt) el.innerHTML = txt;
  });
}

function showAuth(tab) {
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
  if (tab === 'register') {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  } else if (tab === 'demo') {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  } else {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  }
}
function hideAuth() { document.getElementById('authOverlay').classList.add('hidden'); }

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
  if (res.success) window.location.href = '/dashboard';
  else showErr(res.error || 'خطأ في تسجيل الدخول');
}

async function doRegister() {
  const res = await apiPost('/api/auth', { action:'register', name: document.getElementById('regName').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPass').value });
  if (res.success) window.location.href = '/dashboard';
  else showErr(res.error || 'خطأ في إنشاء الحساب');
}

async function doDemo(role) {
  const res = await apiPost('/api/auth', { action:'demo', role });
  if (res.success) window.location.href = '/dashboard';
  else showErr(res.error || 'حساب التجربة غير متاح');
}

// Enter key support
document.addEventListener('keydown', e => { if (e.key === 'Enter') { if (!document.getElementById('registerForm').classList.contains('hidden')) doRegister(); else if (!document.getElementById('loginForm').classList.contains('hidden')) doLogin(); } });

// ─── POLICIES ───────────────────────────
const policies = {
  privacy: {
    title: 'سياسة الخصوصية',
    body: `
<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()} — تسعيرة / Qirox Studio Group</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">١. المعلومات التي نجمعها</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">نجمع المعلومات التي تقدمها مباشرةً عند إنشاء حساب (الاسم، البريد الإلكتروني، كلمة المرور المشفرة)، وعند استخدام المنصة (عروض الأسعار، الرسائل، بيانات القطاع). لا نجمع بيانات الدفع مباشرةً — يُعالَج الدفع عبر مزودين خارجيين معتمدين.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٢. كيف نستخدم معلوماتك</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">نستخدم بياناتك لتشغيل الخدمة، تحسين تجربة المستخدم، إرسال الإشعارات المتعلقة بحسابك، وتقديم الدعم الفني. لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث لأغراض تسويقية.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٣. تخزين البيانات وأمانها</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">تُخزَّن بياناتك على خوادم آمنة. كلمات المرور مشفرة بخوارزمية bcrypt. نطبق بروتوكولات أمان معيارية للحماية من الوصول غير المصرح به.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٤. حقوقك</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">يحق لك الاطلاع على بياناتك، تعديلها، أو طلب حذفها في أي وقت. تواصل معنا على info@qirox.online لممارسة هذه الحقوق.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٥. التواصل</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">لأي استفسارات تتعلق بالخصوصية: <strong>info@qirox.online</strong></p>
`
  },
  terms: {
    title: 'شروط الاستخدام',
    body: `
<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()} — تسعيرة / Qirox Studio Group</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">١. قبول الشروط</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">باستخدامك لمنصة تسعيرة، فإنك توافق على هذه الشروط كاملةً. إن كنت تمثل شركة أو مؤسسة، فأنت تقر بأن لديك الصلاحية للموافقة نيابةً عنها.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٢. استخدام الخدمة</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">تلتزم باستخدام المنصة للأغراض المشروعة فقط. يُحظر استخدامها لنشر محتوى مضلل، أو انتهاك حقوق الآخرين، أو أي نشاط يتعارض مع الأنظمة والقوانين المعمول بها في المملكة العربية السعودية.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٣. الحسابات والاشتراكات</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">أنت مسؤول عن الحفاظ على سرية بيانات حسابك. تسعيرة تحتفظ بحق تعليق أو إنهاء أي حساب يُخالف هذه الشروط. الاشتراكات المدفوعة تُجدَّد تلقائياً ما لم يتم إلغاؤها قبل تاريخ التجديد.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٤. الملكية الفكرية</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">جميع محتويات المنصة (التصاميم، الكود، الخوارزميات، العلامة التجارية) محمية بموجب حقوق الملكية الفكرية وتعود لـ Qirox Studio Group. يُمنع نسخها أو إعادة توزيعها دون إذن صريح.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٥. تحديد المسؤولية</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">تسعيرة أداة مساعدة للتسعير وإدارة الأعمال. القرارات التجارية النهائية مسؤولية المستخدم. لا تتحمل المنصة مسؤولية أي خسائر ناتجة عن استخدام نتائج الأدوات مباشرةً دون مراجعة.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٦. التعديلات</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">نحتفظ بحق تعديل هذه الشروط في أي وقت. سيُبلَّغ المستخدمون بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة.</p>
`
  },
  refund: {
    title: 'سياسة الإلغاء والاسترداد',
    body: `
<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()} — تسعيرة / Qirox Studio Group</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">١. إلغاء الاشتراك</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">يمكنك إلغاء اشتراكك في أي وقت من داخل لوحة التحكم. عند الإلغاء، تظل مزاياك الحالية متاحة حتى نهاية فترة الاشتراك المدفوعة، ثم يتحول الحساب تلقائياً للخطة المجانية.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٢. استرداد المبالغ</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">نُقدم استرداداً كاملاً خلال <strong>7 أيام</strong> من تاريخ الاشتراك الأول إذا لم تكن قد استخدمت الميزات المدفوعة. بعد هذه المدة، لا يتم رد المبالغ عن الفترات المستخدمة.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٣. حالات الاسترداد الاستثنائية</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">في حال حدوث عطل تقني موثق من جانبنا أدى إلى عدم توفر الخدمة لأكثر من 72 ساعة متواصلة، يحق للمستخدم الحصول على تعويض بتمديد الاشتراك أو استرداد نسبي.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٤. طلب الاسترداد</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">لتقديم طلب استرداد، تواصل معنا على <strong>info@qirox.online</strong> مع ذكر رقم الحساب وتاريخ الاشتراك. يُعالَج الطلب خلال 5-10 أيام عمل.</p>
`
  },
  cookies: {
    title: 'سياسة ملفات تعريف الارتباط (Cookies)',
    body: `
<p style="color:var(--muted);font-size:12px;margin-bottom:20px">آخر تحديث: ${new Date().getFullYear()} — تسعيرة / Qirox Studio Group</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">١. ما هي الكوكيز؟</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">ملفات تعريف الارتباط (Cookies) هي ملفات نصية صغيرة تُخزَّن على جهازك عند زيارة المنصة. تستخدمها المواقع للتعرف على الزوار والحفاظ على جلسات الدخول.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٢. الكوكيز التي نستخدمها</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2"><strong>كوكيز الجلسة (TAS3_SESS):</strong> ضرورية لتسجيل الدخول والحفاظ على جلستك آمنة. لا يمكن تعطيلها دون التأثير على عمل المنصة.<br><br>
<strong>كوكيز التحليل:</strong> نستخدم Google Analytics لفهم كيفية استخدام المنصة بشكل مجمع وغير شخصي لتحسين التجربة.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٣. التحكم في الكوكيز</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">يمكنك التحكم في الكوكيز من إعدادات متصفحك. تعطيل الكوكيز الأساسية سيؤثر على إمكانية تسجيل الدخول للمنصة.</p>

<h3 style="font-size:16px;font-weight:800;margin:20px 0 10px">٤. انتهاء الكوكيز</h3>
<p style="color:#4e6a7e;font-size:13px;line-height:2">كوكيز الجلسة تنتهي تلقائياً خلال 30 يوماً أو عند تسجيل الخروج.</p>
`
  }
};

function showPolicy(key) {
  const p = policies[key];
  if (!p) return;
  document.getElementById('policyContent').innerHTML =
    `<h2 style="font-size:22px;font-weight:900;margin-bottom:6px">${p.title}</h2>${p.body}`;
  document.getElementById('policyOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function hidePolicyModal() {
  document.getElementById('policyOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── CONTACT FORM ────────────────────────
function submitContact() {
  const name  = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const msg   = document.getElementById('ctMsg').value.trim();
  const fb    = document.getElementById('ctFeedback');
  if (!name || !email || !msg) {
    fb.style.display = 'block'; fb.style.color = 'var(--danger)';
    fb.textContent = 'يرجى تعبئة جميع الحقول'; return;
  }
  // Simulate send (replace with real SMTP when configured)
  fb.style.display = 'block'; fb.style.color = 'var(--success)';
  fb.textContent = 'شكراً! تم استلام رسالتك وسنرد خلال يوم عمل.';
  document.getElementById('ctName').value = '';
  document.getElementById('ctEmail').value = '';
  document.getElementById('ctMsg').value = '';
}
</script>
</body>
</html>
