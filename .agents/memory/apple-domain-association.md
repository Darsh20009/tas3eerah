---
name: ملف Apple Pay للنطاق
description: تقديم ملف Geidea/Apple للتحقق من النطاق من مسار .well-known في Express.
---

ملف التحقق يجب أن يكون متاحاً على `/.well-known/apple-developer-merchantid-domain-association`. عند تقديمه عبر `res.sendFile`, اسمح بملفات dotfiles لهذا الملف المحدد فقط؛ Express يرفضها افتراضياً.

**Why:** رفض Express الافتراضي ينتج 404 رغم وجود الملف، فيفشل تحقق Apple/Geidea للنطاق.

**How to apply:** قبل تفعيل Apple Pay Web، اختبر الرابط العام نفسه وتأكد أن الاستجابة تعرض محتوى الملف دون مصادقة.
