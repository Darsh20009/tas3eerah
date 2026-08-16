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
