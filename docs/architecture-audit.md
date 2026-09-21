# تقرير تدقيق معمارية مشروع تسعيرة

**حالة التقرير:** مرحلة التدقيق فقط، لا توجد تغييرات تنفيذية  
**نطاق التدقيق:** الكود الموجود في مساحة العمل وقت إعداد التقرير  
**تاريخ التدقيق:** 2026-09-21  
**المرجع:** `attached_assets/Pasted--Architecture-Audit-Refactor-IMPORTANT-1789987463536_1789987463536.txt`

## 0. الملخص التنفيذي

المشروع يعمل حالياً كتطبيق PHP متعدد الصفحات بدون إطار عمل، وله نقطة دخول واحدة في
`router.php`. توجد طبقة DB موحدة ظاهرياً تدعم SQLite محلياً وMongoDB في الإنتاج،
وتوجد وظائف فعلية للمستخدمين، العروض، الرسائل، أدوات التسعير، الخطط، البريد الخاص،
وسجل النشاط.

المشكلة الأساسية ليست غياب المزايا، بل أن حدود المسؤوليات غير واضحة:

1. المستخدم والـ role والخطة والوصول إلى الأداة ممثلة غالباً في سجل واحد وفي شروط
   موزعة على PHP وJavaScript.
2. لوحة العميل والموظف والمدير مبنية داخل `pages/dashboard.php` نفسه مع فروع
   كثيرة حسب role.
3. لا توجد Organization أو Membership أو Permission مستقلة.
4. طبقة SQLite/Mongo تخفي فروقاً دلالية مهمة، وبعض العمليات العامة قد تتحول إلى
   استعلامات واسعة عند استقبال operator غير مدعوم.
5. تهيئة قاعدة البيانات وseed وindex creation تحدث أثناء أول طلب.
6. القوائم تضع حدوداً ثابتة أو لا تضع حدوداً، ولا توجد pagination موحدة.
7. ملفات `dashboard.php` و`app.js` و`app.css` كبيرة وتجمع مسؤوليات متعددة.
8. بعض العمليات الحساسة لا تملك سجلاً أمنياً منظماً أو معاملات متعددة الخطوات.

### مستوى الأولوية

| الأولوية | المشكلة | سبب الأولوية |
|---|---|---|
| حرجة | فروق مترجم Mongo/SQLite قد تحول operator غير مدعوم إلى `WHERE 1=1`، مع update/delete واسعَين | خطر قراءة أو تعديل بيانات خارج النطاق |
| حرجة | لا يوجد organization scope أو membership model | لا يمكن بناء عزل شركة متعدد المستخدمين بأمان على النموذج الحالي |
| عالية | Apple OAuth يفك payload دون تحقق تشفيري ظاهر للتوقيع والـ nonce | يحتاج تحققاً أمنياً قبل الاعتماد عليه في الإنتاج |
| عالية | seed وmigration وindex creation داخل request lifecycle | يجعل جاهزية التطبيق مرتبطة بالطلب ويخفي فشل التهيئة |
| عالية | demo action يسمح بدور يرسله العميل، مع بيانات تجريبية ثابتة | قد يتيح مسار admin غير مقصود إذا ظهر في بيئة إنتاج |
| عالية | لا توجد pagination فعلية ولا indexes كافية على الحقول التشغيلية | قابلية تدهور الأداء مع نمو البيانات |
| عالية | لوحة واحدة لكل الأدوار وملفات frontend ضخمة | يزيد احتمال كسر الوظائف ويصعّب إضافة features |
| متوسطة | الخطط تجمع السعر والحدود والأدوات والنصوص في `config.php` | يخلط subscription مع entitlement وواجهة العرض |

## 1. نطاق التدقيق وطريقته

تمت مراجعة:

- `router.php`
- `config.php`
- `src/Auth.php`
- `src/Response.php`
- `src/DB.php`
- `src/OAuth.php`
- `src/PrivateEmail.php`
- `api/auth.php`
- `api/admin.php`
- `api/quotes.php`
- `api/messages.php`
- `api/contact.php`
- `api/index.php`
- `pages/dashboard.php`
- `pages/calculator.php`
- `pages/classic-tools-inline.php`
- `pages/landing.php`
- `assets/js/app.js`
- `assets/css/app.css`
- `composer.json`
- `Dockerfile`
- `render.yaml`
- `replit.md`
- قاعدة البيانات المحلية بشكل غير تعديلي

كما تم تنفيذ خط أساس قراءة فقط:

- `php -l` على ملفات PHP التطبيقية: ناجح.
- `node --check` على ملفات JavaScript: ناجح.
- `composer validate --no-check-publish`: ناجح مع تحذير license فقط.
- طلب الصفحة العامة: HTTP 200.
- سجل المتصفح رصد خطأ runtime في `/calculator/retail`: `calcMenuAll` يستدعي
  `querySelectorAll` على قيمة `null` أثناء `loadMenuState`. لم يتم إصلاحه في
  مرحلة التدقيق.
- لا توجد إعدادات PHPUnit أو Playwright أو Vitest أو مجموعة اختبارات آلية ظاهرة.
- `api/index.php` يعيد HTTP 404 عمداً، وهو endpoint متوقف وليس health endpoint.

### حدود المعرفة

النقاط التالية غير قابلة للتحقق الكامل من مساحة العمل الحالية:

- الفهارس الفعلية والبيانات الحالية في MongoDB الإنتاجية.
- سلوك التزامن تحت حمل حقيقي.
- إعدادات OAuth في provider consoles.
- سجلات الإنتاج وبيانات المستخدمين الحقيقية.
- المخطط الكامل لملف SQLite الحالي؛ فحص الملف مباشرة في وضع القراءة كان سيولد
  ملفات WAL جانبية، لذلك تم الاعتماد على DDL الموجود والمراجعة غير التعديلية.
- هل توجد حماية خارجية في proxy أو Render تعوض أي rate limit مفقود داخل التطبيق.

## 2. Current Architecture

### 2.1 الشكل العام

التطبيق عبارة عن PHP server-rendered monolith صغير من حيث عدد وحدات التطبيق، لكنه
كبير في ملفات العرض والواجهة:

```text
Browser
  -> PHP built-in server / Render container
  -> router.php
       -> static assets
       -> public landing pages
       -> authenticated calculator routes
       -> OAuth routes
       -> api/*.php
  -> shared static classes
       -> Auth
       -> DB
       -> Response
       -> OAuth / PrivateEmail
  -> SQLite locally OR MongoDB when production prerequisites exist
```

### 2.2 نقاط الدخول

- `router.php` هو نقطة الدخول الفعلية للطلبات.
- `pages/landing.php` للصفحة العامة.
- `pages/dashboard.php` يجمع workspace والـ admin panels ومحتوى الأدوات.
- `pages/calculator.php` يقدّم route مخصصاً للحاسبة.
- `pages/classic-tools-inline.php` يدمج HTML قديم للحاسبات.
- `api/auth.php`, `api/quotes.php`, `api/messages.php`, `api/admin.php`,
  `api/contact.php` هي API handlers.
- `api/index.php` endpoint متوقف يعيد 404 ويوجه إلى المسارات الجديدة.

### 2.3 البنية التشغيلية

- التطوير المحلي يعمل عبر PHP built-in server على port 5000.
- Docker يستخدم PHP 8.4 CLI ويثبت MongoDB extension.
- البيئة الحالية في الـ CLI أظهرت PHP 8.2 مع SQLite وIMAP، ولم تظهر MongoDB
  extension في الفحص المحلي. هذا متوقع في بيئة SQLite المحلية، لكنه يجعل اختبار
  parity مع MongoDB غير متاح محلياً.
- Composer يثبت `mongodb/mongodb`، لكنه لا يعرّف test scripts أو application
  scripts.

### 2.4 التقييم

**ما هو جيد:**

- نقطة دخول واحدة تجعل headers وCSRF وproduction readiness قابلة للمركزية.
- وجود DB facade يقلل عدد نقاط اتصال التطبيق بقاعدة البيانات.
- `Auth::user()` يعيد قراءة المستخدم من DB في كل طلب، فلا يعتمد على role قديم
  محفوظ في session.
- الإنتاج ممنوع من fallback إلى SQLite عند `APP_ENV=production`.

**ما يحتاج تغييراً لاحقاً:**

- static classes وglobal state تجعل dependency boundaries غير صريحة.
- لا توجد طبقة domain/application services أو repositories typed.
- route authorization وpage authorization وfrontend visibility مكررة.
- لا توجد migrations versioned أو bootstrap process مستقل.

## 3. Current Authentication Flow

### 3.1 الجلسة

`src/Auth.php:3-17` يبدأ session باسم `TAS3_SESS` مع:

- lifetime 30 يوماً.
- `HttpOnly`.
- `SameSite=Lax`.
- `Secure` عند HTTPS أو proxy headers المناسبة.

`Auth::user()` في `src/Auth.php:21-26` يأخذ `user_id` من session ثم يعيد تحميل
المستخدم من DB بشرط `id` و`is_active=1`.

### 3.2 تسجيل الدخول والتسجيل

- `Auth::login()` يتحقق من password hash، ثم يجدد session ID، ثم يسجل login.
- `Auth::register()` يتحقق من الاسم والبريد وكلمة المرور، ينشئ client free،
  يجدد session ID، ويسجل register.
- logout يسجل event ثم يدمر session.
- OAuth Google وApple يمران من `router.php` إلى `OAuth`.
- تسجيل OAuth ينشئ client free إذا لم يكن البريد موجوداً.

### 3.3 نقاط القوة

- `password_hash(..., PASSWORD_BCRYPT)` و`password_verify`.
- `session_regenerate_id(true)` بعد login/register/OAuth login.
- role المستخدم لا يثق به من session، بل يعاد تحميله من قاعدة البيانات.
- لا يتم قبول user id من العميل في `update_account`، وفق `api/auth.php:67-82`.

### 3.4 المشاكل والمخاطر

1. لا يظهر `session.use_strict_mode` أو سياسة session domain صريحة في الكود.
2. لا توجد rate limiting أو login lockout أو password reset أو inactivity timeout
   ظاهر في `Auth.php` و`api/auth.php`.
3. مسار demo في `api/auth.php:54-64` يقبل role يختاره العميل ويحتوي بيانات
   تجريبية ثابتة. لا يظهر عليه شرط `APP_ENV`.
4. seed المحلي في `src/DB.php:115-125` يحتوي حسابات وكلمات مرور تجريبية ثابتة.
   هذا مقبول للتطوير فقط ويحتاج guard أقوى ضد أي بيئة غير مقصودة.
5. `OAuth::appleCallback()` في `src/OAuth.php:92-127` يفك payload من JWT ويستخدم
   البريد و`sub` دون تحقق تشفيري ظاهر لتوقيع JWT أو التحقق من nonce. هذا يجب
   اعتباره مانعاً أمنياً قبل اعتماد Apple login في الإنتاج.
6. لا توجد identity provider records منفصلة؛ حساب OAuth يرتبط بالبريد فقط ولا
   توجد unique provider identity model.

## 4. Current Authorization Flow

### 4.1 المصادقة مقابل التفويض

- `Auth::require()` يفرض تسجيل الدخول.
- `Auth::requireRole('admin')` يفرض role نصياً.
- `router.php:243-247` يفرض CSRF على POST/PUT/DELETE قبل API dispatch.
- `router.php:94-104` يفرض plan tool access للحاسبات.
- `pages/calculator.php:78-87` يعيد فحص entitlement مرة ثانية.
- `api/quotes.php` يطبق ownership حسب `client_id` أو `employee_id`.
- `api/admin.php:9` يقفل كل admin API خلف role admin.

### 4.2 ما هو غير موجود

- لا توجد `AuthorizationService` أو policy registry مركزية.
- لا توجد permission strings مثل `quotes.create` أو `users.update`.
- لا توجد organization أو membership أو organization scope.
- لا توجد resource ownership policy موحدة لكل الكيانات.
- لا توجد platform roles مثل SUPER_ADMIN أو SUPPORT أو FINANCE.
- لا توجد separation منطقية بين admin role وworkspace role.

### 4.3 مصفوفة الوضع الحالي

| المجال | الوضع الحالي | الخطر |
|---|---|---|
| Admin | role نصي واحد `admin` | لا يمكن تقييد صلاحيات الدعم أو المالية |
| Employee | role نصي `employee` | لا توجد صلاحيات داخل شركة |
| Client | role نصي `client` | العميل هو الوحدة الأساسية وليس organization |
| Plan | حقل داخل user | الخطة مرتبطة بالفرد حتى في سيناريو الفريق |
| Tool access | `PLANS[plan]['tools']` | plan وfeature access متداخلان |
| Ownership | شروط موزعة داخل handlers | احتمال اختلاف القواعد بين endpoint وآخر |
| Organization scope | غير موجود | لا يوجد عزل tenant |

## 5. Current Role System

الأدوار الفعلية المرئية في الكود هي:

- `admin`
- `employee`
- `client`

تظهر مقارنات role كثيرة في:

- `pages/dashboard.php`
- `api/quotes.php`
- `api/admin.php`
- `src/Auth.php`
- `assets/js/app.js`

النتيجة الحالية هي:

```text
User
  -> role
  -> plan
  -> dashboard conditionals
```

وليس:

```text
Identity
  -> Organization membership
  -> Role
  -> Permissions
  -> Subscription entitlements
  -> Workspace
```

لا أنصح بإضافة كل الأدوار المقترحة في الوثيقة دفعة واحدة. البداية الأقل خطورة هي
فصل `platform_role` عن `organization_role`، ثم إضافة permissions المستخدمة فعلياً.

## 6. Current Database Architecture

### 6.1 الاختيار بين Mongo وSQLite

`src/DB.php:18-35` يختار Mongo فقط عند:

- `APP_ENV=production` يمر من `assertProductionReady`.
- MongoDB extension موجودة.
- `MONGODB_URI` غير فارغ.

خلاف ذلك يستخدم SQLite. الواجهة العامة للـ DB facade متشابهة، لكن semantics
ليست متطابقة بالكامل.

### 6.2 SQLite schema الحالي

DDL موجود inline في `src/DB.php:182-255`، ويحتوي على:

- `users`
- `quotes`
- `quote_ratings`
- `messages`
- `activity_log`
- `contact_messages`
- `settings`
- `_counters`

`quotes.items` مخزن JSON داخل quote. لا تظهر foreign keys على `quotes`,
`messages`, `activity_log`, أو `quote_ratings` رغم تشغيل `PRAGMA foreign_keys=ON`.

### 6.3 Mongo initialization

`src/DB.php:43-68` ينشئ Mongo client عند أول استخدام ويستدعي `mInit()` التي:

- تنشئ بعض indexes.
- تحول enterprise إلى pro.
- تضمن admin configured.
- تعمل seed إذا لم يوجد admin.

قاعدة Mongo hardcoded إلى `tas3eerah` في `src/DB.php:45-47`.

### 6.4 مشاكل abstraction

1. `src/DB.php:330-381` يترجم operators غير المدعومة بشكل غير آمن:
   `$exists` يتم تجاهله، وarray filter يمكن أن ينتهي إلى `1=1`.
2. `$regex` يتحول إلى LIKE تقريبي، مع اختلاف في anchors وoptions وcase behavior.
3. `updateDoc/deleteDoc` يستخدمان updateMany/deleteMany في Mongo، بينما أغلب
   المستدعين يتوقعون تغيير سجل واحد.
4. identifiers الخاصة بالجداول والحقول تدخل SQL interpolation دون allowlist
   عامة واضحة.
5. projection وaggregation parity جزئية، و`$project` غير مدعوم بالكامل في
   SQLite translator.
6. لا توجد طبقة transaction عامة متعددة الخطوات.
7. `INSERT OR REPLACE` في settings له semantics delete+insert مختلفة عن Mongo
   upsert.

### 6.5 سلامة البيانات

- counter SQLite في `src/DB.php:323-328` يعمل increment ثم SELECT منفصل.
  التزامن يمكن أن يعيد الرقم الخطأ لأكثر من طلب.
- quote number ليس unique في SQLite DDL، ولا يظهر unique index له في Mongo.
- إنشاء quote، تحديث status، حذف quote/rating، وكتابة activity log ليست عملية
  واحدة transactional.
- حذف user في `api/admin.php:151-174` لا يزيل quote ratings، ما يسمح orphan data.
- الحقول المالية تستخدم `REAL`، بينما `items` JSON text.
- لا توجد CHECK constraints كافية لـ role وplan وstatus.

## 7. Database Initialization and Migrations

التهيئة ليست خارج دورة الطلب:

- SQLite `DB::get()` ينشئ directory/database ويشغل PRAGMA و`sMigrate()` في أول
  request (`src/DB.php:169-179`).
- `sMigrate()` ينفذ CREATE TABLE وALTER TABLE وindex creation وplan normalization
  وseed (`src/DB.php:182-321`).
- Mongo `mdb()` يشغل `mInit()` عند أول request (`src/DB.php:43-48`).
- أخطاء index وALTER وnormalization تُبتلع في catches فارغة (`src/DB.php:61`,
  `:262-269`).
- لا توجد schema version table أو migration history أو rollback marker.

هذا يجعل فشل migration يبدو أحياناً كتطبيق يعمل مع schema ناقص.

## 8. Current API Architecture

### 8.1 المسارات

| المسار | الوظيفة |
|---|---|
| `/api/auth` | csrf، login، register، demo، logout، account update |
| `/api/quotes` | list، get، create، update، delete، status، rate، clients، email |
| `/api/messages` | inbox، thread، send، upgrade request، read، contacts، unread |
| `/api/admin` | users، stats، quotes، activity، contacts، mailbox، settings |
| `/api/contact` | public contact submission |
| `/api/index` | endpoint متوقف يعيد 404 |

### 8.2 تدفق الطلب

`router.php:239-255` يضع JSON header، يفرض CSRF على state-changing methods،
ثم يحمّل `api/{segment}.php`. داخل كل handler توجد match/action dispatch
مستقلة.

### 8.3 نقاط جيدة

- status codes الأساسية موجودة في أغلب المسارات.
- quote create يعيد حساب totals على الخادم، ولا يعتمد فقط على totals القادمة من
  المتصفح.
- quote access يطبق ownership في معظم عمليات get/update/delete/status.
- admin file gate واضح في `api/admin.php:9`.
- public contact لديه required/email/min-length validation أساسي.

### 8.4 مشاكل الاتساق

1. response envelopes مختلفة:
   - `Response::ok` يعيد `success/message/data`.
   - `Response::err` يعيد `success:false,error`.
   - Auth وCSRF يعيدان `error/code` مباشرة.
   - `api/index.php` يعيد `ok/error/message/docs`.
2. بعض mailbox وemail paths تعيد `Throwable` message أو provider detail.
3. أغلب القوائم تملك fixed cap بدلاً من pagination:
   quotes 100، admin quotes 200، contacts 200، inbox 50.
4. users وthreads لا يملكان pagination حقيقية.
5. لا توجد response metadata موحدة مثل `page`, `has_more`, `next_cursor`.
6. بعض عمليات mark/delete تعيد success حتى لو لم يتغير سجل موجود.
7. public contact لا يظهر عليه CSRF أو rate limit أو captcha أو payload cap؛
   وجود CSRF المركزي يحمي POST المار عبر router، لكن endpoint العام لا يملك
   ضوابط abuse خاصة به.
8. search inputs تستخدم regex دون سياسة طول أو تعقيد موحدة.
9. لا يوجد API واحد overview لكل workspace أو admin؛ dashboard ينفذ عدة calls
   وqueries منفصلة.

## 9. Quote Architecture

### 9.1 الوضع الحالي

quote يحتوي على:

- number
- client_id
- employee_id
- title
- status
- subtotal/tax/discount/total
- notes
- items JSON
- created_at/updated_at

الـ API يعالج CRUD وتغيير status وrating وemail quote.

### 9.2 ما هو غير موجود

لا توجد كيانات أو علاقات صريحة لـ:

- Organization
- Customer مستقل عن user
- Project
- Quote creator منفصل ومؤكد
- Assigned employee history
- Pricing calculation snapshot/version
- Quote items normalized
- Quote versions
- Status history
- Approval workflow
- Delivery tracking

الحفظ من أدوات القطاعات يتم عبر bridge في `assets/js/app.js:912-990` إلى
quote normalized، ولا يتم حفظ inputs أو formula version أو raw calculation
history على الخادم.

### 9.3 المخاطر

- لا يمكن إعادة إنتاج نتيجة تسعير قديمة إذا تغيرت الحاسبة.
- status transitions ليست state machine مركزية.
- rating يسمح بمشاركين أكثر مما يلزم ولا يربط بوضوح بحالة accepted/completed.
- عمليات quote متعددة الخطوات غير transactional.

## 10. Subscription and Entitlements

`config.php:15-57` يجمع داخل `PLANS`:

- اسم الخطة.
- السعر.
- max quotes/messages/PDF/users.
- history limit.
- tools.
- badge.
- نصوص التسويق.

`Auth::effectivePlan()` في `src/Auth.php:102-109` يخفض خطة منتهية إلى free،
و`planAllows()` يقرأ الأدوات من الخطة مباشرة.

لا توجد:

- subscriptions collection/table.
- invoices أو payments.
- subscription lifecycle.
- webhook.
- entitlement records.
- organization-level plan.
- usage ledger.
- feature limits منفصلة عن role permission.

النتيجة الحالية:

```text
user.plan
  -> effectivePlan
  -> plan tools/limits
  -> UI and route checks
```

المطلوب مستقبلاً:

```text
Subscription
  -> Entitlements/Limits
Organization membership
  -> Role permissions
Decision = permission + entitlement + organization/resource scope
```

## 11. Current Frontend Architecture

### 11.1 أحجام الملفات والمسؤوليات

- `pages/dashboard.php`: حوالي 103 KB و1623 سطراً.
- `assets/js/app.js`: حوالي 115 KB و2270 سطراً.
- `assets/css/app.css`: حوالي 125 KB و2990 سطراً.
- `pages/landing.php`: حوالي 74 KB.

`dashboard.php` يجمع:

- authentication/plan shaping.
- navigation.
- overview.
- quote UI.
- clients/messages.
- subscription.
- admin panels.
- seven calculators.
- mailbox.
- modals وinline bootstrapping.

`app.js` يجمع:

- i18n.
- API/CSRF.
- navigation.
- quote CRUD/PDF.
- calculator formulas.
- localStorage/sessionStorage.
- admin users/subscriptions/mailbox/settings.
- account.
- unread polling.

`app.css` يجمع landing وdashboard وcalculator وlegacy overrides في cascade واحد،
مع blocks مكررة لنفس shell selectors في مواضع مختلفة.

### 11.2 coupling واضح

1. `dashboard.php` يحتوي فروعاً كثيرة على `admin`, `employee`, `client` في
   navigation والمحتوى.
2. `pages/calculator.php` و`router.php` يكرران map الأدوات ومفاتيح الخطط.
3. route calculator وpage calculator يفحصان plan بشكل منفصل.
4. `classic-tools-inline.php` يقرأ HTML كاملاً، يستخرج body/style/script،
   ويعيد تسمية functions عبر string replacement.
5. `app.js` يركب legacy globals ويعترض save handlers عبر
   `installClassicQuoteBridge`.
6. `dashboard.php:643-653` يحتوي include داخل `if (false)`، وهو dead/ambiguous
   integration path.

### 11.3 state وUX

- التنقل يعتمد إخفاء/إظهار panels داخل الذاكرة، بدون URL/history state كافٍ.
- calculator/project state محلي في browser، وقد يضيع عند تغيير الجهاز أو مسح
  storage.
- `MutationObserver` واسع على body يعيد translation وcurrency replacement لشجرة
  النصوص، ما قد يسبب تكلفة متكررة.
- يوجد splash delay صناعي حوالي 850ms.
- unread polling كل 60 ثانية ولا يظهر pause عند hidden tab.

## 12. Current Admin Architecture

المدير ليس Control Center مستقلاً؛ هو نفس `dashboard.php` مع عناصر وفروع
تظهر عند `role === 'admin'`.

توجد admin capabilities فعلية لـ:

- users create/update/activate/delete.
- plan changes.
- stats.
- all quotes.
- activity log.
- contact inbox.
- private mailbox.
- settings.

لكن لا توجد حدود مستقلة لـ:

- Platform administration.
- Organizations.
- Roles & Permissions.
- Billing.
- Usage.
- Security.
- Integrations.
- System Health.

### مخاطر admin

- admin role واحد يمنح مجموعة واسعة.
- admin يستطيع تعديل role وplan لأي حساب.
- self-demotion مسموح ما لم يكن المستخدم آخر admin.
- إنشاء user يعيد كلمة المرور plain text، وله default predictable.
- حذف user يحذف بعض activity records، ما يقلل auditability.
- عمليات admin الحساسة لا تستخدم structured security audit event موحداً.
- لا يوجد confirmation أو second factor أو step-up authentication ظاهر.

## 13. Performance Problems

### مؤكدة من الكود

1. dashboard ينفذ عدة استعلامات ويحمّل quote lists ثم يحسب totals/statuses في PHP
   (`pages/dashboard.php:294-351`).
2. usage counts تستخدم regex على `created_at` بدلاً من range query.
3. لا توجد indexes كافية على:
   - quotes ownership/status/created_at.
   - messages participants/parent/read/created_at.
   - activity log user/date.
   - contact messages read/date.
4. لا توجد cursor أو offset pagination موحدة.
5. mailbox يقرأ overview/body لعدد من الرسائل على IMAP في request واحد.
6. body-wide MutationObserver وfull text tree replacement مكلفان.
7. app.js يشحن مسؤوليات calculator/admin/mailbox حتى في سياقات لا تحتاجها.
8. legacy HTML/CSS/scripts يتم استخراجه وحقنه وقت التشغيل.

### أثر متوقع

- أول فتح للوحة يزداد مع عدد quotes/messages.
- scans كاملة بدل indexes.
- تحميل JavaScript/CSS أكبر من المطلوب لكل دور.
- صعوبة قياس latency لأن لا يوجد overview endpoint أو query timing layer.

## 14. Security Problems

### مثبتة وتحتاج أولوية عالية

1. **Apple OAuth verification:** لا يظهر تحقق توقيع JWT أو nonce في
   `src/OAuth.php:92-127`.
2. **Demo role escalation risk:** `api/auth.php:54-64` يقبل role من الطلب دون
   guard بيئي ظاهر.
3. **Plaintext password response:** `api/admin.php:83-106` يعيد كلمة مرور
   user الجديد.
4. **Default/predictable passwords:** admin create وdevelopment seed يملكان
   defaults ثابتة.
5. **Broad DB operations:** `updateMany/deleteMany` وفلاتر غير مدعومة يمكن أن
   توسع scope.
6. **Production details leakage:** readiness path في `router.php:220-235`
   يعيد exception detail.
7. **Provider error leakage:** بعض mailbox/email paths تعيد exception text.
8. **No rate limiting:** login/demo/contact/mailbox actions لا يظهر لها rate
   limiter داخل التطبيق.
9. **No structured admin audit:** الأحداث الحالية ليست security audit schema
   موحداً ولا تملك actor/resource/organization/metadata دائماً.
10. **No tenant isolation:** تعديل ID أو الوصول إلى resource خارج organization
    لا يمكن تقييمه كعزل tenant لأنه لا توجد organization أصلاً.

### مثبتة كحماية موجودة

- session ID regeneration بعد login/register/OAuth login.
- password hashing.
- HttpOnly وSameSite.
- centralized CSRF gate للطلبات state-changing عبر router.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- quote ownership checks في معظم quote actions.
- server-side quote total recalculation.
- production لا يستخدم SQLite fallback عند missing Mongo prerequisites.

### غير مثبتة أو تحتاج اختباراً

- session strict mode.
- CSP.
- OAuth provider configuration correctness.
- reverse proxy trust boundaries.
- upload surface الكامل.
- production Mongo auth/TLS/index state.
- actual IDOR behavior على كل endpoint بعد تسجيل الدخول.

## 15. Error Handling

### الوضع الحالي

- `Response::json()` يضبط status وcontent type وينهي الطلب.
- production handler يسجل message ويعيد response آمن غالباً للـ API.
- بعض catches في DB فارغة.
- بعض mailbox وquote email paths تعيد تفاصيل exception.
- response envelope غير موحد بين Auth وResponse وapi/index.

### المطلوب

اعتماد error contract واحد مثل:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_FORBIDDEN",
    "message": "رسالة آمنة للمستخدم",
    "request_id": "..."
  }
}
```

مع:

- server log مفصل مرتبط بـ request ID.
- عدم إعادة provider/database exception للمستخدم.
- تمييز 401 و403 و404 و422 و409 و500 و503.
- عدم ابتلاع migration/index errors بدون log وreadiness failure.

## 16. Duplicated Logic

أهم التكرار المؤكد:

1. calculator route map في `router.php` و`pages/calculator.php` وJS.
2. effective plan/tool checks في router وcalculator page وdashboard.
3. role visibility في PHP وJavaScript.
4. response/error handling في Auth وResponse وكل API handler.
5. DB filter translation logic بين Mongo وSQLite.
6. dashboard statistics queries بدلاً من summary service واحد.
7. classic calculator integration بين dashboard وcalculator page.
8. localization/state handling في أكثر من مكان.

## 17. High Coupling Areas

### أعلى مناطق الترابط

1. `pages/dashboard.php` بين auth/role/plan/data/template/calculators/admin.
2. `assets/js/app.js` بين API/navigation/storage/calculators/admin.
3. `src/DB.php` بين backend selection/migrations/seeding/query translation/business
   compatibility.
4. `router.php` بين static files/routes/production readiness/CSRF/OAuth/tool access.
5. `classic-tools-inline.php` بين HTML خارجي وregex extraction وlegacy globals.
6. `config.php` بين pricing policy والواجهة والحدود وmarketing copy.

### سبب خطورة هذه المناطق

تغيير قاعدة واحدة مثل role أو plan قد يحتاج تعديل router وpage وAPI وJS وCSS في
نفس الوقت، ولا توجد contract tests تمنع اختلاف هذه النقاط.

## 18. Risky Areas

| المجال | سبب الخطورة | قبل أي تعديل |
|---|---|---|
| DB facade | اختلاف Mongo/SQLite مخفي خلف interface واحدة | parity tests وcopy من DB |
| counters | احتمال duplicate quote numbers تحت التزامن | unique constraint واستراتيجية atomic |
| user deletion | cascades جزئية وorphan records | migration/backfill وtransaction |
| OAuth Apple | تحقق هوية غير مكتمل ظاهرياً | provider security test |
| admin role/plan | صلاحيات واسعة بلا capability layer | تعريف permission matrix |
| classic calculators | runtime string rewriting | golden browser tests للحاسبات السبع |
| dashboard monolith | regressions واسعة | characterization tests وsplit تدريجي |
| local storage | نتائج جهازية غير قابلة للاستعادة | قرار product واضح حول persistence |
| production bootstrap | seed/migration أثناء request | deploy bootstrap وhealth check |

## 19. Recommended Target Architecture

لا أوصي بإعادة كتابة المشروع دفعة واحدة. الهدف الآمن هو وضع حدود جديدة حول
الكود الموجود ثم نقل السلوك تدريجياً.

```text
HTTP Request
  -> Bootstrap / Request ID / Security headers
  -> Router
  -> IdentityResolver
  -> AuthorizationService
       -> Permission policy
       -> Entitlement policy
       -> Organization/resource scope
  -> Application Use Case
  -> Repository / Query service
  -> Domain event / Audit event
  -> Response serializer
```

### 19.1 Identity

احتفظ بالمستخدم الحالي، وأضف تدريجياً:

- `users`
- `external_identities`
- `sessions` أو session policy موثقة
- `platform_role` عند الحاجة فقط

لا تستخدم email وحده كبديل عن provider identity.

### 19.2 Organization

كيانات مقترحة:

- `organizations`
- `organization_members`
- `organization_roles` أو role mapping ثابت
- `organization_settings`
- `organization_id` على quotes/customers/projects/messages عند الحاجة

كل query domain يجب أن يأخذ scope من authorization context، وليس من body القادم
من العميل.

### 19.3 Authorization

طبقة مركزية مثل:

```text
AuthorizationService::authorize(
    actor,
    permission,
    resource,
    organization
)
```

القرار النهائي:

```text
authenticated
AND permission granted
AND entitlement available
AND resource belongs to allowed organization/scope
```

ابدأ بمجموعة permissions صغيرة مستخدمة فعلياً:

- `users.view`
- `users.manage`
- `quotes.view`
- `quotes.create`
- `quotes.update`
- `quotes.delete`
- `messages.view`
- `messages.send`
- `subscriptions.view`
- `subscriptions.manage`
- `settings.view`
- `settings.manage`
- `audit.view`

### 19.4 Subscription and entitlements

افصل:

- plan catalog.
- subscription state.
- organization entitlement snapshot.
- usage counters/limits.

مثال:

```text
Subscription: pro, active, period_start, period_end
Entitlement: quotes.max_monthly = unlimited
Permission: employee can quotes.create
```

لا تغيّر `user.plan` مباشرة إلى model جديد قبل migration وتوافق backward
compatibility.

### 19.5 Workspaces

قسّم منطقياً أولاً، ثم بصرياً إذا لزم:

- Client Workspace
- Employee Workspace
- Admin Control Center

يمكن مشاركة shell والمكونات العامة، لكن لا تشارك decision logic عبر if role في
كل template.

### 19.6 Data access

الاحتفاظ بالـ dual backend ممكن في المدى القصير، بشرط:

- typed/narrow query methods بدلاً من facade عامة لكل operator.
- رفض operator غير مدعوم بدلاً من تحويله إلى `1=1`.
- فصل migrations وseed عن `DB::get()` و`mdb()`.
- repository methods مثل `findQuoteForActor()` بدلاً من تمرير filters حرة.
- parity tests لكل query فعلي بين SQLite وMongo.

### 19.7 Audit events

افصل User Activity عن Security Audit:

```text
actor_id
action
resource_type
resource_id
organization_id
timestamp_utc
metadata
ip
user_agent
request_id
```

الأحداث الحساسة:

- login/logout/password changed.
- role/permission changed.
- subscription changed.
- user/organization deleted.
- quote deleted/status changed.
- system settings changed.

## 20. Migration Plan

### Phase 0: Audit + Baseline

**الحالة:** هذا التقرير.  
**مخرجاتها:**

- architecture audit.
- dependency map.
- current route/API inventory.
- baseline lint/smoke.
- list of unknown production facts.

**بوابة الخروج:** موافقة المستخدم على target architecture والأولويات.

### Phase 1: Identity + Authorization foundation

- إنشاء `AuthorizationService` وpermission registry.
- تحويل admin-sensitive endpoints تدريجياً إلى capability checks.
- إبقاء `role` الحالي كcompatibility adapter.
- منع demo role creation خارج development.
- توحيد error envelope.

**لا تبدأ migration data هنا قبل اختبارات authorization.**

### Phase 2: Organization/Tenant foundation

- إضافة organizations وmemberships.
- تحديد organization الافتراضية للحسابات القديمة.
- backfill قابل للـ rollback.
- إلزام scope في quote/message/customer/project queries.
- اختبارات cross-organization denial.

### Phase 3: Subscription + Entitlements

- استخراج plan catalog من marketing copy.
- subscription state وperiod.
- entitlement resolver.
- ربط limits بالـ organization.
- إبقاء `effectivePlan` كadapter مؤقتاً.

### Phase 4: Admin Control Center backend

- فصل admin use cases عن workspace use cases.
- capability matrix للإدارة.
- structured audit events.
- overview endpoint محدود ومُرقم حيث يلزم.

### Phase 5: Workspace separation

- view models منفصلة للعميل والموظف والمدير.
- shared components فقط للعناصر العامة.
- إزالة raw role conditionals تدريجياً.

### Phase 6: Database/index/performance

- migrations versioned خارج request.
- unique quote number.
- atomic counters.
- foreign-key/validator policy.
- indexes مبنية على explain/query patterns.
- pagination cursor.

### Phase 7: API cleanup

- request validation موحد.
- response/error contract موحد.
- 401/403/404/422/409/500/503 موحد.
- resource scope في كل endpoint.
- إزالة provider/internal details من response.

### Phase 8: Frontend architecture

- registry واحد للأدوات.
- تقسيم app.js إلى modules.
- تقسيم dashboard إلى shells/panels.
- فصل CSS حسب surface.
- إزالة string-rewrite integration تدريجياً.

### Phase 9: Security hardening

- Apple JWT signature/nonce verification.
- rate limits وlockout policy.
- password reset.
- CSP ومراجعة headers.
- admin step-up/2FA إذا كان ضمن product scope.
- مراجعة upload وIDOR وsecrets.

### Phase 10: Testing + regression + production verification

- authorization/security tests.
- SQLite/Mongo parity.
- seven calculator browser regression.
- migration rollback rehearsal.
- production readiness/health checks.
- load tests للـ overview/lists/messages.

## 21. Files That Will Change Later

هذه قائمة مبدئية وليست تفويضاً بالبدء:

### Authorization and identity

- `src/Auth.php`
- ملف جديد `src/AuthorizationService.php`
- ملف جديد `src/PermissionRegistry.php`
- `api/auth.php`
- `api/admin.php`
- `router.php`

### Database and migrations

- `src/DB.php` تدريجياً، مع إبقاء public compatibility أثناء النقل.
- ملفات جديدة تحت `database/migrations/`.
- ملف bootstrap/deploy مستقل.
- `api/quotes.php`, `api/messages.php`, `api/admin.php` لتقليل filters الحرة.

### Domain/API

- ملفات service/repository جديدة حسب المجال.
- `api/quotes.php`
- `api/messages.php`
- `api/contact.php`
- `api/admin.php`

### Frontend

- `pages/dashboard.php`
- `pages/calculator.php`
- `pages/classic-tools-inline.php`
- `assets/js/app.js`
- `assets/css/app.css`
- registry مشتركة للحاسبات والـ workspace panels.

### Audit and operations

- `src/PrivateEmail.php` فقط إذا تغير contract أو error handling.
- `src/OAuth.php` للتحقق الأمني.
- `config.php` لفصل plan catalog عن copy عند بدء Phase 3.

## 22. Files That Must Not Change in Phase 0

حتى صدور موافقة صريحة على التنفيذ، يجب ألا يتغير:

- `database/tas3eerah.db`
- أي collection أو production document.
- `src/DB.php`
- `src/Auth.php`
- `router.php`
- `api/*.php`
- `pages/*.php`
- `assets/js/*.js`
- `assets/css/*.css`
- `Dockerfile`
- `render.yaml`
- secrets أو environment variables.

الملف الوحيد الذي أُنشئ في هذه المرحلة هو هذا التقرير:

- `docs/architecture-audit.md`

## 23. Risks and Dependencies

### مخاطر التغيير

1. نقل role إلى permission دون adapter قد يمنع مستخدمين حاليين من الوصول.
2. إضافة organization_id دون backfill صحيح قد تعزل quotes عن أصحابها.
3. إصلاح Mongo/SQLite parity قد يكشف بيانات أو filters كانت تعمل بالصدفة.
4. إضافة foreign keys قد تفشل بسبب orphan data موجودة حالياً.
5. pagination قد تغير response shape الذي يعتمد عليه `app.js`.
6. تقسيم الحاسبات قد يكسر globals التي يعتمد عليها quote bridge.
7. migration داخل production لا يجوز أن تعتمد على أول page request.
8. تغيير plan model قد يؤثر على انتهاء الخطط وواجهة pricing الحالية.

### Dependencies تحتاج قراراً أو تحققاً

- قرار: هل organization مطلوبة لكل مستخدم أم اختيارية للحسابات الفردية؟
- قرار: هل subscription تتبع organization أم user في الخطط الفردية؟
- قرار: هل employee ينتمي إلى organization واحدة أم عدة organizations؟
- تحقق: Mongo production indexes والـ collection schema الحقيقي.
- تحقق: Apple OAuth configuration وJWKS/signature requirements.
- تحقق: هل هناك proxy-level rate limiting أو WAF.
- قرار: هل نتائج الحاسبات يجب أن تكون cross-device ومراجعة تاريخية.

## 24. Test Plan

### Baseline الحالي

- PHP lint: ناجح.
- JavaScript syntax check: ناجح.
- Composer validation: ناجح مع warning license.
- Landing smoke: HTTP 200.
- Automated unit/integration/browser test suite: غير موجودة ظاهرياً.

### اختبارات Phase 1

- unauthenticated API -> 401.
- authenticated wrong permission -> 403.
- role compatibility mapping.
- CSRF missing/invalid/valid.
- demo endpoint rejected in production.
- admin self-demotion policy.
- user update cannot change protected identity/scope.

### اختبارات Phase 2

- user cannot read another organization quote.
- employee cannot mutate another organization message.
- admin platform scope separate from organization scope.
- organization backfill preserves all current records.
- rollback leaves old role routes usable.

### اختبارات Phase 3

- expired subscription loses entitlement only.
- role permission does not grant unavailable plan feature.
- concurrent usage cannot exceed limit.
- unlimited and zero limits are explicit.

### اختبارات DB/API

- SQLite/Mongo same filters/results for every repository query.
- unsupported operators fail explicitly.
- duplicate quote number rejected.
- counter concurrency.
- update/delete affects one intended record.
- pagination stable under inserts.
- API error envelope/status contract.

### اختبارات الأمن

- Apple JWT signature and nonce rejection.
- IDOR matrix for every resource endpoint.
- regex abuse and input length limits.
- login/contact rate limits.
- provider exception redaction.
- admin sensitive action audit events.
- secret values absent from HTML/API/logs.

### اختبارات الحاسبات

- browser regression للحاسبات السبع.
- save bridge لكل حاسبة.
- plan lock and expiry.
- local storage migration/failure.
- mobile and desktop route access.

## 25. قرار التدقيق

المشروع **ليس مرشحاً لإعادة بناء كاملة**. الأساس القابل للاحتفاظ به:

- router المركزي.
- Auth session flow الأساسي.
- CSRF gate المركزي.
- dual DB facade كحل انتقال مؤقت.
- quote server-side total calculation.
- existing UI والـ calculator functionality.

لكن قبل إضافة admin center أو organization features يجب تنفيذ الأساس التالي
بالترتيب:

1. إغلاق مخاطر OAuth/demo/password/error leakage.
2. بناء AuthorizationService مع compatibility adapter.
3. تعريف organization scope قبل إضافة أي multi-user data.
4. فصل migrations/bootstrap عن request lifecycle.
5. وضع DB parity وtransaction/unique-counter tests.
6. إنشاء contract tests للـ API والحاسبات.

**توقّف التنفيذ هنا حسب الطلب. لم يتم تعديل كود التطبيق أو قاعدة البيانات أو
الإعدادات. الخطوة التالية تحتاج موافقة على خطة الترحيل والأولوية قبل بدء Phase 1.**