---
name: CSRF Protection
description: كيفية تطبيق حماية CSRF في التطبيق
---

## الطريقة المطبّقة

- **Token generation:** `Auth::csrfToken()` — ينشئ token في `$_SESSION['csrf_token']` عند أول طلب
- **Meta tag:** كل صفحة HTML (landing.php + dashboard.php) تحتوي على `<meta name="csrf-token" content="...">`
- **JavaScript:** دالة `api()` في app.js تقرأ التوكن من meta وتضيفه كـ `X-CSRF-Token` header لكل POST
- **Validation:** router.php يستدعي `Auth::verifyCsrf()` قبل كل POST/PUT/DELETE إلى /api/
- **Verification:** `Auth::verifyCsrf()` في src/Auth.php يستخدم `hash_equals()` لمنع timing attacks

**Why:** حماية من Cross-Site Request Forgery — المتصفح يرسل cookies تلقائياً فيجب التحقق من نية الطلب

**How to apply:** أي endpoint جديد يستقبل POST يُغطّى تلقائياً بالـ router. أي JS جديد يستخدم `api()` يرسل التوكن تلقائياً.

## تجديد الرمز

إذا أعادت الواجهة `CSRF_INVALID` بسبب صفحة قديمة أو جلسة انتهت، يجلب JavaScript رمزاً جديداً عبر `GET /api/auth?action=csrf` ويعيد الطلب مرة واحدة فقط. لا يتم تعطيل التحقق أو قبول رمز ناقص.

**Why:** الصفحات المفتوحة لفترة طويلة أو علامات التبويب القديمة قد تحمل رمزاً لا يطابق جلسة PHP الحالية، وكان ذلك يمنع تسجيل الدخول رغم صحة البيانات.

**How to apply:** حافظ على endpoint التجديد ومعالجة retry في دوال الطلب الحالية عند إضافة أي تدفق POST جديد.
