---
name: Plan Enforcement
description: كيفية تطبيق حدود الخطط وانتهاء الصلاحية
---

## effectivePlan()

`Auth::effectivePlan($user)` في src/Auth.php:
- إذا `plan_expires_at` مضت → يُعيد 'free' بغض النظر عن الخطة المسجّلة
- إذا null أو مستقبلي → يُعيد الخطة الفعلية

**كل مكان يجب أن يستخدم effectivePlan() وليس `$user['plan']` مباشرة**

## dashboard.php

- `$effectivePlan = Auth::effectivePlan($user)` في الأعلى
- `$isPaid = in_array($effectivePlan, ['pro','enterprise'])`
- `$plan = PLANS[$effectivePlan]`
- بانر انتهاء الصلاحية: يظهر عند أقل من 7 أيام أو عند الانتهاء الفعلي

## Seed Data

- `src/DB.php`: seed يعمل فقط عندما `APP_ENV === 'development'`
- في الإنتاج (APP_ENV != development): DB تبدأ فارغة بدون حسابات تجريبية

## Message Limits

- `api/messages.php`: send() تفحص عدد الرسائل الشهرية المرسلة مقابل `PLANS[effectivePlan][max_msgs]`
- -1 = غير محدود (pro/enterprise)

## APP_URL

- `config.php`: يقرأ من `$_ENV['APP_URL']` أو `getenv('APP_URL')` مع fallback إلى localhost:5000
- اضبط env var قبل النشر للإنتاج
