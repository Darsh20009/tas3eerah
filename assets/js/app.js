/* ═══════════════════════════════════════
   Tas3eerah Main App JS
   ═══════════════════════════════════════ */

'use strict';

// ─── LANGUAGE ────────────────────────────
const L = { current: localStorage.getItem('tas3-lang') || 'ar' };

const UI_TRANSLATIONS = {
  'نظرة عامة':'Overview', 'عروض الأسعار':'Quotes', 'عرض سعر جديد':'New Quote',
  'العملاء':'Clients', 'الرسائل':'Messages', 'أدوات التسعير':'Pricing Tools',
  'إدارة المستخدمين':'User Management', 'الاشتراكات':'Subscriptions',
  'رسائل التواصل':'Contact Messages', 'سجل النشاط':'Activity Log',
  'إعدادات النظام':'System Settings', 'حسابي':'My Account',
  'الرئيسية':'Home', 'الصفحة الرئيسية':'Home', 'عروض سعر':'Quotes',
  'عرض سعر':'Quote', 'طلب تسعيرة جديدة':'Request a Quote', 'تسعيراتي':'My Quotes',
  'خطة الاشتراك':'Subscription Plan', 'التواصل':'Communication', 'الأدوات':'Tools',
  'الإدارة':'Administration', 'الحساب':'Account', 'تسجيل الخروج':'Sign out',
  'لوحة العمل':'Workspace', 'مرحباً بك،':'Welcome,',
  'كل ما تحتاجه لتسعير مشاريعك بوضوح، في مساحة واحدة هادئة ومنظمة.':'Everything you need to price your projects clearly, in one calm, organized workspace.',
  'المستخدمون':'Users', 'إجمالي المستخدمين':'Total users', 'كل العروض':'All quotes',
  'هذا الشهر':'This month', 'عروض هذا الشهر':'Quotes this month',
  'المستخدمون النشطون':'Active users', 'حسابات نشطة':'Active accounts',
  'عروضي':'My quotes', 'إجمالي عروضي':'My total quotes', 'مرسلة':'Sent',
  'بانتظار الرد':'Awaiting response', 'عملاء لديّ':'My clients',
  'قيد الانتظار':'Pending', 'بانتظار ردك':'Awaiting your response',
  'خطتك':'Your plan', 'مستوى الاشتراك':'Subscription level',
  'ابدأ من هنا':'Start here', 'أدواتك السريعة':'Quick tools',
  'تسعير الخدمات':'Service pricing', 'للمشاريع والخدمات اليومية':'For daily projects and services',
  'الباقات والاشتراكات':'Packages & subscriptions', 'وزّع التكلفة على مستوياتك':'Distribute costs across your tiers',
  'المشاريع التقنية':'Technology projects', 'احسب الوقت والموارد والنطاق':'Calculate time, resources and scope',
  'مساحة العمل':'Workspace', 'خطتك الحالية':'Your current plan', 'مجاني':'Free',
  'ابدأ الآن بدون التزام':'Start now with no commitment', 'شهرياً':'Monthly',
  'التسعيرات الشهرية':'Monthly quotes', 'تقارير PDF':'PDF reports', 'غير محدود':'Unlimited',
  'عرض كل الأدوات':'View all tools', 'آخر عروض الأسعار':'Recent quotes', 'عرض الكل':'View all',
  'لا توجد عروض أسعار بعد':'No quotes yet', 'رقم العرض':'Quote number', 'العنوان':'Title',
  'الإجمالي':'Total', 'الحالة':'Status', 'التاريخ':'Date', 'الإجراء':'Action',
  'كل الحالات':'All statuses', 'مسودة':'Draft', 'مُرسل':'Sent', 'مقبول':'Accepted',
  'مرفوض':'Rejected', 'ملغي':'Cancelled', 'بحث...':'Search...',
  'مسح':'Clear', 'عنوان العرض *':'Quote title *', 'عنوان التسعيرة *':'Pricing title *',
  'العميل *':'Client *', 'اختر العميل...':'Choose a client...', 'ضريبة القيمة المضافة %':'VAT %',
  'خصم (ر.س)':'Discount (SAR)', 'بنود العرض':'Quote items', 'الوصف':'Description',
  'الكمية':'Quantity', 'سعر الوحدة':'Unit price', 'إضافة بند':'Add item',
  'المجموع الفرعي':'Subtotal', 'الخصم':'Discount', 'ضريبة (15%)':'VAT (15%)',
  'ملاحظات':'Notes', 'أي ملاحظات إضافية...':'Any additional notes...',
  'حفظ العرض':'Save quote', 'إلغاء':'Cancel', 'طلب الترقية':'Request upgrade',
  'عروض الأسعار هذا الشهر':'Quotes this month', 'الحد الأقصى:':'Maximum:',
  'مقارنة الخطط':'Compare plans', 'خطتك الحالية':'Your current plan',
  'ر.س / شهر':'SAR / month', 'العملاء':'Clients', 'الاسم':'Name', 'البريد':'Email',
  'البريد الإلكتروني':'Email', 'الخطة':'Plan', 'تاريخ التسجيل':'Registration date',
  'جارٍ التحميل...':'Loading...', 'لا يوجد عملاء بعد':'No clients yet',
  'رسالة جديدة':'New message', 'اختر محادثة':'Choose a conversation',
  'اختر محادثة لعرض رسائلها':'Choose a conversation to view its messages',
  'اكتب ردك...':'Write a reply...', 'إرسال':'Send', 'لا توجد رسائل بعد':'No messages yet',
  'منصة تسعيرة':'Tas3eerah platform', 'اختر الأداة المناسبة لمشروعك':'Choose the right tool for your project',
  'نظّم تسعير خدماتك ومنتجاتك في دقائق، بمنهجية واضحة تناسب نشاطك.':'Organize your service and product pricing in minutes with a clear method that fits your business.',
  'تسعير غير محدود':'Unlimited pricing', 'تسعيرات شهرياً':'quotes per month',
  'كل القطاعات متاحة':'All sectors available', 'أدوات متاحة في باقتك':'tools available in your plan',
  'تقارير PDF غير محدودة':'Unlimited PDF reports', 'اختر المجال':'Choose a sector',
  '٧ أدوات تسعير متخصصة':'7 specialized pricing tools', 'مقفل في باقتك':'Locked in your plan',
  'ترقية الخطة':'Upgrade plan', 'فتح الحاسبة الكاملة':'Open calculator',
  'يمكنك العودة لاحقاً إلى أي أداة ومراجعة حساباتك المحفوظة.':'You can return to any tool later and review your saved calculations.',
  'تسعير المطاعم والكافيهات':'Restaurant & cafe pricing', 'حاسبة تكلفة الصنف والقائمة':'Item and menu cost calculator',
  'بيانات الصنف':'Item details', 'اسم الصنف':'Item name', 'لاتيه مثلج':'Iced latte',
  'تصنيف الصنف':'Item category', 'مشروبات':'Drinks', 'وجبات':'Meals', 'حلويات':'Desserts',
  'مخبوزات':'Bakery', 'إضافات':'Extras', 'عدد الوحدات المباعة شهرياً':'Units sold per month',
  'تكلفة المكونات للوحدة (ر.س)':'Ingredient cost per unit (SAR)', 'نسبة الهدر %':'Waste %',
  'التكاليف والهامش':'Costs & margin', 'التغليف والإضافات للوحدة (ر.س)':'Packaging & extras per unit (SAR)',
  'التكاليف التشغيلية الشهرية (ر.س)':'Monthly operating costs (SAR)',
  'هامش الربح المستهدف %':'Target profit margin %', 'عمولة الدفع أو التوصيل %':'Payment or delivery fee %',
  'تكلفة المكونات بعد الهدر':'Ingredient cost after waste', 'تكلفة التغليف والإضافات':'Packaging & extras cost',
  'نصيب الصنف من التشغيل':'Item share of operations', 'التكلفة الفعلية للوحدة':'Actual unit cost',
  'سعر البيع المقترح شامل الضريبة':'Suggested selling price incl. VAT',
  'تسعير الباقات والاشتراكات':'Package & subscription pricing', 'حاسبة توزيع تكلفة الباقات':'Package cost allocation calculator',
  'أسماء الباقات':'Package names', 'الباقة الأساسية':'Basic package', 'الباقة المتوسطة':'Standard package',
  'الباقة المتقدمة':'Advanced package', 'أساسية':'Basic', 'احترافية':'Professional', 'مؤسسات':'Enterprise',
  'التكاليف الشهرية الثابتة':'Fixed monthly costs', 'إيجار وخدمات (ر.س)':'Rent & services (SAR)',
  'رواتب الفريق (ر.س)':'Team salaries (SAR)', 'تكاليف تقنية (ر.س)':'Technology costs (SAR)',
  'تكاليف تشغيلية أخرى (ر.س)':'Other operating costs (SAR)', 'توزيع الباقات والمشتركين':'Packages & subscribers',
  'مشتركو الباقة الأساسية':'Basic package subscribers', 'مشتركو الباقة المتوسطة':'Standard package subscribers',
  'مشتركو الباقة المتقدمة':'Advanced package subscribers', 'نسبة الباقة الأساسية للمتوسطة':'Basic-to-standard package ratio',
  'مثال: 2 تعني ضعف السعر':'Example: 2 means double the price',
  'إجمالي التكاليف الشهرية':'Total monthly costs', 'المستهدف مع الربح':'Target including profit',
  'سعر الباقة الأساسية / شهر':'Basic package price / month', 'سعر الباقة المتوسطة / شهر':'Standard package price / month',
  'سعر الباقة المتقدمة / شهر':'Advanced package price / month',
  'تسعير المشاريع التقنية':'Technology project pricing', 'حاسبة مراحل المشروع التقني':'Technology project stages calculator',
  'نوع المشروع ونطاقه':'Project type & scope', 'نوع المشروع':'Project type', 'تطبيق جوال':'Mobile app',
  'موقع ويب':'Website', 'ذكاء اصطناعي':'Artificial intelligence', 'جهاز وبرنامج':'Hardware & software',
  'اسم المشروع':'Project name', 'منصة طلبات':'Delivery platform', 'ساعات مراحل التنفيذ':'Implementation stage hours',
  'التصميم UX/UI: ساعات':'UX/UI design: hours', 'سعر ساعة التصميم (ر.س)':'Design hourly rate (SAR)',
  'التطوير البرمجي: ساعات':'Development: hours', 'سعر ساعة التطوير (ر.س)':'Development hourly rate (SAR)',
  'الاختبار والتسليم: ساعات':'Testing & delivery: hours', 'سعر ساعة الاختبار (ر.س)':'Testing hourly rate (SAR)',
  'تكاليف المشروع والربحية':'Project costs & profitability', 'تراخيص وخدمات خارجية (ر.س)':'Licenses & external services (SAR)',
  'استضافة وأجهزة (ر.س)':'Hosting & devices (SAR)', 'نصيب الإدارة والتشغيل (ر.س)':'Management & operations share (SAR)',
  'احتياطي المخاطر %':'Risk reserve %', 'تكلفة الجهد':'Effort cost', 'التكلفة بعد الاحتياطي':'Cost after reserve',
  'الربح المستهدف':'Target profit', 'سعر المشروع شامل الضريبة':'Project price incl. VAT',
  'تسعير التجزئة والجملة':'Retail & wholesale pricing', 'حاسبة سعر المنتج بعد التكلفة والعمولة':'Product price after cost & fee calculator',
  'بيانات المنتج':'Product details', 'اسم المنتج':'Product name', 'حقيبة جلدية':'Leather bag',
  'الفئة':'Category', 'ملابس':'Clothing', 'إلكترونيات':'Electronics', 'بقالة':'Groceries',
  'تكلفة الشراء للوحدة (ر.س)':'Purchase cost per unit (SAR)', 'شحن وتخليص للوحدة (ر.س)':'Shipping & clearance per unit (SAR)',
  'تغليف وتجهيز للوحدة (ر.س)':'Packaging & preparation per unit (SAR)', 'الكمية المستهدفة للبيع':'Target sales quantity',
  'عمولة المنصة أو الدفع %':'Platform or payment fee %', 'خصم العروض المتوقع %':'Expected promotional discount %',
  'التكلفة الواصلة للوحدة':'Landed cost per unit', 'سعر التعادل بعد العمولة':'Break-even price after fee',
  'سعر العرض قبل الضريبة':'Offer price before VAT', 'السعر المقترح للمستهلك شامل الضريبة':'Suggested consumer price incl. VAT',
  'تسعير التصميم الداخلي والمعماري':'Interior & architectural design pricing', 'حاسبة المشروع حسب المساحة والمراحل':'Project calculator by area & stages',
  'بيانات المشروع والمساحة':'Project & area details', 'تصميم داخلي سكني':'Residential interior design',
  'تصميم داخلي تجاري':'Commercial interior design', 'تصميم معماري':'Architectural design', 'تنفيذ وتجهيز':'Execution & fit-out',
  'المساحة بالمتر المربع':'Area in square meters', 'سعر التصميم للمتر (ر.س)':'Design price per meter (SAR)',
  'عدد الزيارات الميدانية':'Number of site visits', 'المراحل والتكاليف الإضافية':'Stages & additional costs',
  'تكلفة الزيارة الواحدة (ر.س)':'Cost per visit (SAR)', 'مخططات واستشارات (ر.س)':'Plans & consultations (SAR)',
  'مواد وتنفيذ مقدّرة (ر.س)':'Estimated materials & execution (SAR)', 'نصيب الإشراف والإدارة (ر.س)':'Supervision & management share (SAR)',
  'احتياطي التعديلات والمخاطر %':'Change & risk reserve %', 'أتعاب التصميم حسب المساحة':'Design fees by area',
  'إجمالي التكلفة قبل الربح':'Total cost before profit', 'احتياطي المشروع':'Project reserve',
  'تسعير الشركات التقنية':'Technology company pricing', 'حاسبة الاشتراك والخدمة المتكررة':'Recurring service & subscription calculator',
  'نوع الخدمة والعملاء':'Service type & customers', 'نوع الخدمة':'Service type', 'SaaS منصة':'SaaS platform',
  'استضافة وخوادم':'Hosting & servers', 'صيانة وتطوير':'Maintenance & development', 'ترخيص برمجي':'Software license',
  'دعم تقني':'Technical support', 'عدد العملاء أو المستخدمين':'Number of customers or users',
  'التكاليف الشهرية':'Monthly costs', 'خوادم واستضافة (ر.س)':'Servers & hosting (SAR)',
  'تراخيص وأدوات (ر.س)':'Licenses & tools (SAR)', 'تشغيل وتسويق (ر.س)':'Operations & marketing (SAR)',
  'تكلفة متغيرة لكل عميل (ر.س)':'Variable cost per customer (SAR)', 'دورة الفوترة':'Billing cycle',
  'شهري':'Monthly', 'سنوي':'Annual', 'خصم الاشتراك السنوي %':'Annual subscription discount %',
  'التكاليف الثابتة الشهرية':'Monthly fixed costs', 'التكلفة على العميل':'Cost per customer',
  'الربح المستهدف لكل عميل':'Target profit per customer', 'سعر الاشتراك الشهري قبل الضريبة':'Monthly subscription before VAT',
  'السعر المقترح شامل الضريبة':'Suggested price incl. VAT', 'السعر السنوي المقترح':'Suggested annual price',
  'إدارة المستخدمين':'User management', 'مستخدم جديد':'New user', 'كل الأدوار':'All roles',
  'عملاء':'Clients', 'موظفون':'Employees', 'مدراء':'Admins', 'بحث بالاسم أو البريد...':'Search by name or email...',
  'الدور':'Role', 'المستخدمون والخطط':'Users & plans', 'الخطة الحالية':'Current plan',
  'تنتهي في':'Expires on', 'تغيير الخطة':'Change plan', 'إدارة الاشتراكات':'Subscription management',
  'تحكم في خطة كل مستخدم وتواريخ الانتهاء':'Control each user plan and expiry dates',
  'مستخدمو هذه الخطة:':'Users on this plan:', 'سجل النشاط':'Activity log', 'تحديث':'Refresh',
  'التفاصيل':'Details', 'حسابي':'My account', 'معلومات التواصل':'Contact information',
  'بريد الدعم الفني':'Support email', 'رقم واتساب الدعم':'Support WhatsApp number',
  'إعدادات العرض':'Display settings', 'اسم المنصة':'Platform name',
  'رسالة الترحيب للمستخدمين الجدد':'Welcome message for new users', 'حفظ الإعدادات':'Save settings',
  'حفظ التغييرات':'Save changes', 'كلمة مرور جديدة':'New password',
  'اتركه فارغاً للإبقاء على الحالية':'Leave blank to keep the current password',
  'رسائل التواصل':'Contact messages', 'الرسالة':'Message', 'إجراء':'Action',
  'تم الحفظ':'Saved', 'حسناً':'OK', 'إغلاق':'Close', 'حذف':'Delete',
  'قُرئت':'Read', 'قُرئت':'Read', 'إلغاء':'Cancel', 'تعديل':'Edit', 'تفعيل':'Activate',
  'تعطيل':'Disable', 'مستخدم':'User', 'مدير':'Admin',
  'اختياري':'Optional', 'بيانات العميل':'Client details', 'اسم العميل':'Client name',
  'اسم الشركة':'Company name', 'رقم الجوال':'Mobile number', 'محمد العمري':'Mohammed Al-Omari',
  'شركة النجوم':'Stars Company', 'الاسم مطلوب':'Name is required', 'حدث خطأ':'An error occurred',
  'خطأ في الاتصال بالخادم':'Server connection error', 'لا توجد بنود في التسعيرة':'No pricing items',
  'لا يوجد مستخدمون':'No users', 'تم حفظ التغييرات بنجاح':'Changes saved successfully',
  'تم حفظ الإعدادات بنجاح ✓':'Settings saved successfully ✓', 'تأكيد حذف الرسالة؟':'Confirm deleting this message?',
  'لا توجد رسائل بعد':'No messages yet', 'يرجى اختيار العميل':'Please choose a client',
  'يرجى كتابة نص الرسالة':'Please write a message', 'عنوان العرض مطلوب':'Quote title is required',
  'تم حفظ العرض كمسودة بنجاح':'Quote saved as draft successfully', 'حفظ كعرض سعر':'Save as quote',
  'حفظ كعرض سعر يتطلب ترقية':'Saving as a quote requires an upgrade',
  'حفظ':'Save', 'رقم':'Number', 'شهر':'month', 'عرض/شهر':'quotes/month',
  'إجراءات':'Actions', 'الاسم *':'Name *', 'المستلم':'Recipient', 'الموضوع':'Subject',
  'كل الخطط':'All plans', 'نظام ERP':'ERP system', 'حفظ كمسودة':'Save draft',
  'هامش الربح':'Profit margin', 'مدير النظام':'System administrator',
  'تسعيرة جديدة':'New pricing', 'جارٍ التحميل':'Loading',
  'مدير للتجديد':'contact the administrator to renew', 'منتجات رقمية':'Digital products',
  'إغلاق القائمة':'Close menu', 'الخطة الجديدة':'New plan', 'ساعات التنفيذ':'Implementation hours',
  'موقع إلكتروني':'Website', 'عنوان العرض...':'Quote title...',
  'عرض خطط الاشتراك':'View subscription plans', 'طباعة / تحميل PDF':'Print / download PDF',
  'أدوات تسعير متخصصة':'Specialized pricing tools', 'السعر النهائي للعميل':'Final client price',
  'تسعير منتج التجزئة':'Retail product pricing', 'تسعير مشروع التصميم':'Design project pricing',
  'تسعير الشركة التقنية':'Technology company pricing', 'تسعير المشروع التقني':'Technology project pricing',
  'تسعير الباقات والاشتراكات':'Package & subscription pricing',
  'تسعير قائمة المطاعم والكافيهات':'Restaurant & cafe menu pricing',
  'تسعير التجزئة والجملة':'Retail & wholesale pricing',
  'تسعير التصميم الداخلي والمعماري':'Interior & architectural design pricing',
  'تسعيرة باقات الاشتراك':'Subscription package pricing', 'ضريبة القيمة المضافة':'VAT',
  'منصة التسعير العربية':'Arabic pricing platform', 'أدوات ومواد مباشرة (ر.س)':'Direct tools & materials (SAR)',
  'إجمالي التكاليف المباشرة':'Total direct costs', 'الخطوة 2 الخدمات المطلوبة':'Step 2: Required services',
  'الخطوة 3 التكاليف والربحية':'Step 3: Costs & profitability',
  'اختر أداة التسعير المناسبة':'Choose the right pricing tool',
  'حاسبة الخدمة والمشروع الخدمي':'Service & service-project calculator',
  'تسعير قائمة المطاعم والكافيهات':'Restaurant & cafe menu pricing',
  'كلمة المرور (فارغ = بدون تغيير)':'Password (blank = no change)',
  'هذه الأداة متاحة بعد اختيارها ضمن باقة Plus أو Pro.':'This tool is available with a Plus or Pro plan.',
  'فيديو وإنتاج':'Video & production', 'هوية بصرية':'Visual identity', 'تصوير':'Photography',
  'استشارة':'Consulting', 'برمجة خاصة':'Custom development', 'ترجمة':'Translation',
  'أخرى':'Other', 'محتوى & سوشيال':'Content & social', 'وصف البند...':'Item description...',
  'مُقدَّم من':'Provided by', 'مُقدَّم إلى':'Provided to', 'إنشاء عرض':'Create quote',
  'تغيير خطة':'Change plan', 'محادثة مع':'Conversation with', 'تسجيل دخول':'Sign in',
  'لوحة التحكم':'Dashboard', 'تم تغيير الخطة':'Plan changed', 'تعديل المستخدم':'Edit user',
  'تعديل عرض السعر':'Edit quote', 'إنشاء مستخدم':'Create user', 'تفعيل مستخدم':'Activate user',
  'رسالة مُرسلة':'Message sent', 'فعّال':'Active', 'الشركة':'Company', 'النظام':'System',
  'رفض':'Reject', 'قبول':'Accept', 'خصم':'Discount',
  'ضريبة (${tax}%)':'VAT (${tax}%)', 'رقم: ${q.number}':'Number: ${q.number}',
  'ضريبة القيمة المضافة (${q.tax_rate}%)':'VAT (${q.tax_rate}%)',
  'تسعيرة منصة التسعير الذكي':'Tas3eerah smart pricing platform',
  'تعذّر الحفظ في الوقت الحالي':'Unable to save right now',
  'أدخل بيانات التسعير أولاً لظهور قيمة محسوبة.':'Enter pricing details first to calculate a result.',
  'كل عروض الأسعار':'All quotes',
  'خدمات':'Services', 'تدريب':'Training', 'هدايا':'Gifts', 'منصات':'Platforms',
  'عضويات':'Memberships', 'كافيه':'Cafe', 'مطعم':'Restaurant', 'حلويات':'Desserts',
  'سكني':'Residential', 'تجاري':'Commercial', 'معماري':'Architectural',
  'ملابس':'Clothing', 'إلكترونيات':'Electronics', 'بقالة':'Groceries',
  'احسب السعر العادل لخدماتك بناءً على التكاليف والهامش المناسب.':'Calculate a fair price for your services based on costs and the appropriate margin.',
  'سعّر باقاتك مع توزيع التكاليف والهامش على المشتركين.':'Price your packages while distributing costs and margin across subscribers.',
  'ابنِ سعر طبقك بدقة من تكلفة المكونات والهدر والهامش.':'Build your dish price precisely from ingredient cost, waste and margin.',
  'حدد سعر البيع بناءً على تكلفة المنتج والعمولات والعروض.':'Set the selling price based on product cost, fees and promotions.',
  'سعّر مشاريع التصميم والتنفيذ وفق المساحة والمراحل والتكاليف.':'Price design and execution projects by area, stages and costs.',
  'احسب تكلفة المشروع التقني حسب الساعات والموارد والنطاق.':'Calculate the technology project cost by hours, resources and scope.',
  'احسب تكلفة الاشتراك والخدمة المتكررة حسب العملاء والتكاليف.':'Calculate recurring service and subscription costs by customers and expenses.',
  'خدمات · تدريب · تصوير · هدايا':'Services · training · photography · gifts',
  'خدمات · منصات · عضويات':'Services · platforms · memberships',
  'كافيه · مطعم · حلويات · مشروبات':'Cafe · restaurant · desserts · drinks',
  'ملابس · إلكترونيات · بقالة':'Clothing · electronics · groceries',
  'تطبيقات · ERP · مواقع · أجهزة ذكية':'Apps · ERP · websites · smart devices',
  'SaaS · استضافة · صيانة · تراخيص':'SaaS · hosting · maintenance · licenses',
  'سكني · تجاري · معماري':'Residential · commercial · architectural',
  'تصميم · تطوير · استضافة':'Design · development · hosting',
  'احسب':'Calculate', 'السعر العادل':'fair price', 'المناسب':'appropriate',
  'باقاتك':'your packages', 'توزيع التكاليف':'cost allocation', 'المشتركين':'subscribers',
  'طبقك':'your dish', 'بدقة':'precisely', 'تكلفة المنتج':'product cost',
  'العمولات والعروض':'fees and promotions', 'المساحة والمراحل والتكاليف':'area, stages and costs'
  , 'احسب سعر الاشتراك والخدمات المتكررة على أساس تكاليفك الحقيقية.':'Calculate recurring subscription and service pricing from your actual costs.'
};

const UI_TRANSLATIONS_REVERSE = Object.entries(UI_TRANSLATIONS).reduce((reverse, [ar, en]) => {
  if (!(en in reverse)) reverse[en] = ar;
  return reverse;
}, {});

function translateString(value) {
  if (!value || typeof value !== 'string') return value;
  const source = L.current === 'en' ? UI_TRANSLATIONS : UI_TRANSLATIONS_REVERSE;
  const translated = Object.entries(source)
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isArabic = /[\u0600-\u06ff]/.test(from);
      const boundary = isArabic ? '\\u0600-\\u06ff' : 'A-Za-z';
      return text.replace(new RegExp(`(?<![${boundary}])${escaped}(?![${boundary}])`, 'g'), to);
    }, value);
  return (L.current === 'en'
    ? translated.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    : translated
  ).replace(/ر\.س/g, L.current === 'en' ? 'SAR' : 'ر.س');
}

let languageObserver = null;

function applyLanguage() {
  const isEnglish = L.current === 'en';
  document.documentElement.lang = L.current;
  document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = isEnglish ? 'AR' : 'EN';
  if (document.title.includes('لوحة التحكم') || document.title.includes('Dashboard')) {
    document.title = isEnglish ? 'Tas3eerah | Dashboard' : 'تسعيرة | لوحة التحكم';
  }

  document.querySelectorAll('[data-ar]').forEach(el => {
    const value = el.getAttribute('data-' + L.current);
    if (value !== null) el.innerHTML = value;
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName) &&
        !parent.closest('.user-content') && node.nodeValue.trim()) nodes.push(node);
  }
  nodes.forEach(node => { node.nodeValue = translateString(node.nodeValue); });

  document.querySelectorAll('input[placeholder], textarea[placeholder], [aria-label]').forEach(el => {
    if (el.placeholder) el.placeholder = translateString(el.placeholder);
    if (el.getAttribute('aria-label')) el.setAttribute('aria-label', translateString(el.getAttribute('aria-label')));
  });
  if (window.Tas3Currency) Tas3Currency.replace(document.body);
  localStorage.setItem('tas3-lang', L.current);
}

function toggleLang() {
  if (languageObserver) languageObserver.disconnect();
  L.current = L.current === 'ar' ? 'en' : 'ar';
  applyLanguage();
  if (languageObserver) languageObserver.observe(document.body, { childList: true, subtree: true });
}

const panelTitles = {
  overview: ['نظرة عامة', 'Overview'], quotes: ['عروض الأسعار', 'Quotes'],
  'quote-new': ['عرض سعر جديد', 'New Quote'], clients: ['العملاء', 'Clients'],
  messages: ['الرسائل', 'Messages'], tools: ['أدوات التسعير', 'Pricing Tools'],
  users: ['إدارة المستخدمين', 'User Management'], subscriptions: ['الاشتراكات', 'Subscriptions'],
  'contact-inbox': ['رسائل التواصل', 'Contact Messages'], activity: ['سجل النشاط', 'Activity Log'],
  settings: ['إعدادات النظام', 'System Settings'], account: ['حسابي', 'My Account']
};

function panelTitle(panel) {
  const pair = panelTitles[panel];
  return pair ? pair[L.current === 'en' ? 1 : 0] : '';
}

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
  languageObserver = new MutationObserver(() => {
    if (!languageObserver) return;
    languageObserver.disconnect();
    applyLanguage();
    languageObserver.observe(document.body, { childList: true, subtree: true });
  });
  languageObserver.observe(document.body, { childList: true, subtree: true });
});
// ─── MOBILE SIDEBAR ──────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  const ov = document.getElementById('sbOverlay');
  if (ov) { ov.classList.add('open'); }
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const ov = document.getElementById('sbOverlay');
  if (ov) { ov.classList.remove('open'); }
  document.body.style.overflow = '';
}
// Close sidebar on wider screens if accidentally left open
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeSidebar();
});

// ─── API ─────────────────────────────────
async function api(endpoint, data = null, method = null) {
  const isGet = data === null;
  const csrf  = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const opts = {
    method : method || (isGet ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      ...(isGet ? {} : { 'X-CSRF-Token': csrf }),
    },
  };
  if (!isGet) opts.body = JSON.stringify(data);
  try {
    const r = await fetch('/api/' + endpoint, opts);
    const j = await r.json();
    return j;
  } catch (e) {
    return { success: false, error: 'خطأ في الاتصال بالخادم' };
  }
}

function nav(btn) {
  closeSidebar();
  if (!btn) return;
  const panel = btn.getAttribute('data-panel');
  if (!panel) return;

  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('panel-' + panel);
  if (target) target.classList.add('active');

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = panelTitle(panel);

  if (panel === 'quotes')          loadQuotes();
  if (panel === 'clients')         loadClients();
  if (panel === 'messages')        loadInbox();
  if (panel === 'users')           loadUsers();
  if (panel === 'subscriptions')   loadSubscriptions();
  if (panel === 'contact-inbox')   loadContactInbox();
  if (panel === 'activity')        loadActivity();
  if (panel === 'settings')        loadSettings();
  if (panel === 'quote-new')       initQuoteForm();
}

// ─── DIRECT NAVIGATION (by panel id, no sidebar button required) ─────
function navDirect(panelId) {
  closeSidebar();
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  const sideBtn = document.querySelector(`[data-panel="${panelId}"]`);
  if (sideBtn) sideBtn.classList.add('active');

  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = panelTitle(panelId);

  if (panelId === 'quote-new')     initQuoteForm();
  if (panelId === 'quotes')        loadQuotes();
  if (panelId === 'messages')      loadInbox();
  if (panelId === 'users')         loadUsers();
  if (panelId === 'subscriptions') loadSubscriptions();
  if (panelId === 'activity')      loadActivity();
  if (panelId === 'settings')      loadSettings();
}

// ─── AUTH ────────────────────────────────
async function doLogout() {
  await api('auth', { action: 'logout' });
  window.location.href = '/';
}

// ─── QUOTES ──────────────────────────────
let quotes = [];
async function loadQuotes() {
  const status = (document.getElementById('qStatusFilter') || {}).value || '';
  const search = (document.getElementById('qSearch') || {}).value || '';
  const r = await api(`quotes?action=list&status=${status}&q=${encodeURIComponent(search)}`);
  if (!r.success) return;
  quotes = r.data;
  renderQuotes();
}

function renderQuotes() {
  const tb = document.getElementById('quotesTbody');
  if (!tb) return;
  if (!quotes.length) {
    tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">لا توجد عروض أسعار</td></tr>';
    return;
  }
  tb.innerHTML = quotes.map(q => `
    <tr>
      <td><code style="font-size:11px">${q.number}</code></td>
      <td class="user-content">${esc(q.title)}</td>
      ${APP.role !== 'client'   ? `<td class="user-content">${esc(q.client_name || '-')}</td>` : ''}
      ${APP.role !== 'employee' ? `<td class="user-content">${esc(q.employee_name || '-')}</td>` : ''}
      <td>${fmt(q.total)} ر.س</td>
      <td><span class="badge badge-${q.status}">${statusLabel(q.status)}</span></td>
      <td style="font-size:11px;color:var(--muted)">${q.created_at ? q.created_at.slice(0,10) : ''}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="viewQuote(${q.id})">عرض</button>
          ${APP.role !== 'client' && q.status === 'draft' ? `<button class="btn btn-outline btn-sm" onclick="editQuote(${q.id})">تعديل</button>` : ''}
          ${q.status === 'sent' && APP.role === 'client' ? `
            <button class="btn btn-success btn-sm" onclick="changeStatus(${q.id},'accepted')">قبول</button>
            <button class="btn btn-danger btn-sm"  onclick="changeStatus(${q.id},'rejected')">رفض</button>
          ` : ''}
          ${q.status === 'draft' && APP.role !== 'client' ? `<button class="btn btn-primary btn-sm" onclick="changeStatus(${q.id},'sent')">إرسال</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function viewQuote(id) {
  const r = await api(`quotes?action=get&id=${id}`);
  if (!r.success) { alert(r.error); return; }
  const q = r.data;
  const itemsHtml = (q.items || []).map(it => `
    <tr>
       <td class="user-content">${esc(it.description)}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:left">${fmt(it.unit_price)}</td>
      <td style="text-align:left">${fmt(it.total)}</td>
    </tr>
  `).join('');
  const subtotal = q.subtotal || 0;
  const discount = q.discount || 0;
  const taxAmt   = (subtotal - discount) * (q.tax_rate / 100);
  document.getElementById('pdfDoc').innerHTML = `
    <div class="pdf-header">
      <div><img src="/assets/brand-logo-transparent.png" class="pdf-logo" alt="تسعيرة"></div>
      <div style="text-align:left">
        <h1>${translateString('عرض سعر')}</h1>
        <div class="pdf-meta">${translateString('رقم')}: ${q.number}</div>
        <div class="pdf-meta">${translateString('التاريخ')}: ${(q.created_at||'').slice(0,10)}</div>
        <div class="pdf-meta"><span class="badge badge-${q.status}">${statusLabel(q.status)}</span></div>
      </div>
    </div>
    <div class="pdf-parties">
      <div class="pdf-party"><label>${translateString('مُقدَّم من')}</label><p>${esc(q.employee_name || translateString('الشركة'))}</p></div>
      <div class="pdf-party"><label>${translateString('مُقدَّم إلى')}</label><p>${esc(q.client_name || '-')}</p></div>
    </div>
    <h3 style="margin-bottom:12px">${esc(q.title)}</h3>
    <table>
      <thead><tr><th>${translateString('الوصف')}</th><th>${translateString('الكمية')}</th><th>${translateString('سعر الوحدة')}</th><th>${translateString('الإجمالي')}</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="pdf-totals">
      <div class="pdf-total-row"><span>${translateString('المجموع الفرعي')}</span><span>${fmt(subtotal)} ${translateString('ر.س')}</span></div>
      ${discount > 0 ? `<div class="pdf-total-row"><span>${translateString('خصم')}</span><span>- ${fmt(discount)} ${translateString('ر.س')}</span></div>` : ''}
      <div class="pdf-total-row"><span>${translateString('ضريبة القيمة المضافة')} (${q.tax_rate}%)</span><span>${fmt(taxAmt)} ${translateString('ر.س')}</span></div>
      <div class="pdf-total-row grand"><span>${translateString('الإجمالي')}</span><span>${fmt(q.total)} ${translateString('ر.س')}</span></div>
    </div>
    ${q.notes ? `<div style="margin-top:16px;padding:12px;background:var(--paper);border-radius:8px;font-size:13px"><strong>${translateString('ملاحظات')}:</strong> ${esc(q.notes)}</div>` : ''}
    <div class="pdf-footer">${translateString('تسعيرة منصة التسعير الذكي')}</div>
  `;
  document.getElementById('pdfOverlay').classList.remove('hidden');
}

async function editQuote(id) {
  const r = await api(`quotes?action=get&id=${id}`);
  if (!r.success) { alert(r.error); return; }
  const q = r.data;
  const btn = document.querySelector('[data-panel="quote-new"]');
  if (btn) nav(btn); else return;

  document.getElementById('qEditId').value   = q.id;
  document.getElementById('qFormTitle').textContent = 'تعديل عرض السعر';
  document.getElementById('qTitle').value    = q.title;
  document.getElementById('qTax').value      = q.tax_rate;
  document.getElementById('qDiscount').value = q.discount;
  document.getElementById('qNotes').value    = q.notes || '';
  await ensureClientsLoaded();
  document.getElementById('qClient').value = q.client_id;
  document.getElementById('itemsBody').innerHTML = '';
  (q.items || []).forEach(it => addItem(it.description, it.qty, it.unit_price));
  calcTotals();
}

async function changeStatus(id, status) {
  const r = await api('quotes', { action: 'status', id, status });
  if (r.success) loadQuotes();
  else alert(r.error);
}

// ─── QUOTE BUILDER ───────────────────────
let clientsCache = null;

async function initQuoteForm() {
  await ensureClientsLoaded();
  if (!document.getElementById('itemsBody').children.length) addItem();
}

async function ensureClientsLoaded() {
  if (clientsCache) { populateClientSelect(clientsCache); return; }
  const r = await api('quotes?action=clients');
  if (r.success) { clientsCache = r.data; populateClientSelect(clientsCache); }
}

function populateClientSelect(clients) {
  const sel = document.getElementById('qClient');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">اختر العميل...</option>' +
    clients.map(c => `<option value="${c.id}" ${c.id == cur ? 'selected' : ''}>${esc(c.name)} ${esc(c.email)}</option>`).join('');
}

function addItem(desc = '', qty = 1, price = 0) {
  const tbody = document.getElementById('itemsBody');
  const row   = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text"   value="${esc(desc)}"  placeholder="وصف البند..." oninput="calcTotals()"></td>
    <td><input type="number" value="${qty}"   min="0.01" step="0.01" oninput="calcTotals()" style="text-align:center"></td>
    <td><input type="number" value="${price}" min="0"    step="0.01" oninput="calcTotals()"></td>
    <td class="row-total" style="font-weight:700;padding:8px 10px">${fmt(qty * price)}</td>
    <td><button class="del-item" onclick="this.closest('tr').remove();calcTotals()">✕</button></td>
  `;
  tbody.appendChild(row);
  calcTotals();
}

function calcTotals() {
  let subtotal = 0;
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 3) return;
    const qty   = parseFloat(inputs[1].value) || 0;
    const price = parseFloat(inputs[2].value) || 0;
    const tot   = qty * price;
    subtotal += tot;
    const td = row.querySelector('.row-total');
    if (td) td.textContent = fmt(tot);
  });
  const tax      = parseFloat(document.getElementById('qTax')?.value) || 0;
  const discount = parseFloat(document.getElementById('qDiscount')?.value) || 0;
  const taxAmt   = (subtotal - discount) * tax / 100;
  const total    = subtotal - discount + taxAmt;

  setText('totSub',   fmt(subtotal) + ' ر.س');
  setText('totDis',   fmt(discount) + ' ر.س');
  setText('totTax',   fmt(taxAmt)   + ' ر.س');
  setText('totFinal', fmt(total)    + ' ر.س');
  setText('taxLbl',   `ضريبة (${tax}%)`);
}

async function saveQuote() {
  const editId   = document.getElementById('qEditId').value;
  const title    = document.getElementById('qTitle').value.trim();
  const clientId = document.getElementById('qClient').value;
  const taxRate  = parseFloat(document.getElementById('qTax').value) || 0;
  const discount = parseFloat(document.getElementById('qDiscount').value) || 0;
  const notes    = document.getElementById('qNotes').value.trim();

  const items = [];
  document.querySelectorAll('#itemsBody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 3) return;
    const desc  = inputs[0].value.trim();
    const qty   = parseFloat(inputs[1].value) || 0;
    const price = parseFloat(inputs[2].value) || 0;
    if (desc) items.push({ description: desc, qty, unit_price: price });
  });

  const msgEl = document.getElementById('quoteMsg');
  const showMsg = (txt, isErr) => {
    msgEl.className = `alert alert-${isErr ? 'danger' : 'success'} mb-8`;
    msgEl.textContent = txt;
  };

  const action = editId ? 'update' : 'create';
  const payload = { action, title, client_id: clientId, items, tax_rate: taxRate, discount, notes };
  if (editId) payload.id = parseInt(editId);

  const r = await api('quotes', payload);
  if (r.success) {
    showMsg(r.message || 'تم الحفظ', false);
    setTimeout(() => {
      resetQuoteForm();
      nav(document.querySelector('[data-panel="quotes"]'));
    }, 1200);
  } else {
    showMsg(r.error || 'حدث خطأ', true);
  }
}

function resetQuoteForm() {
  document.getElementById('qEditId').value = '';
  document.getElementById('qFormTitle').textContent = 'عرض سعر جديد';
  ['qTitle','qNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('qTax').value = '15';
  document.getElementById('qDiscount').value = '0';
  document.getElementById('itemsBody').innerHTML = '';
  document.getElementById('quoteMsg').className = 'hidden';
  addItem();
  calcTotals();
}

// ─── CLIENTS ─────────────────────────────
async function loadClients() {
  const r = await api('quotes?action=clients');
  const tb = document.getElementById('clientsTbody');
  if (!tb) return;
  if (!r.success) { tb.innerHTML = `<tr><td colspan="5">${r.error}</td></tr>`; return; }
  const clients = r.data;
  if (!clients.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">لا يوجد عملاء بعد</td></tr>';
    return;
  }
  tb.innerHTML = clients.map(c => `
    <tr>
       <td class="user-content">${esc(c.name)}</td>
       <td class="user-content" style="direction:ltr;text-align:right">${esc(c.email)}</td>
      <td><span class="badge badge-${c.plan}">${planLabel(c.plan)}</span></td>
      <td style="font-size:11px;color:var(--muted)">${(c.created_at||'').slice(0,10)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="composeToUser(${JSON.stringify(c)})">رسالة</button></td>
    </tr>
  `).join('');
}

// ─── MESSAGES ────────────────────────────
let currentThreadId = null;

async function loadInbox() {
  const r = await api('messages?action=inbox');
  const list = document.getElementById('inboxList');
  if (!list) return;
  if (!r.success) { list.innerHTML = `<div style="padding:16px;color:var(--muted)">${r.error}</div>`; return; }
  const msgs = r.data;
  if (!msgs.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">لا توجد رسائل بعد</div>';
    return;
  }
  list.innerHTML = msgs.map(m => `
    <div class="msg-item ${m.unread > 0 ? 'unread' : ''}" onclick="openThread(${m.id})">
      <div class="msg-item-name user-content">${esc(m.sender_id == APP.uid ? m.receiver_name : m.sender_name)}</div>
      <div class="msg-item-preview user-content">${esc(m.subject || m.body)}</div>
      <div class="msg-item-time">${(m.created_at||'').slice(0,10)}</div>
    </div>
  `).join('');
  loadUnreadCount();
}

async function openThread(id) {
  currentThreadId = id;
  document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
  const r = await api('messages', { action: 'thread', id });
  if (!r.success) return;
  const msgs = r.data;
  const title = document.getElementById('threadTitle');
  if (title && msgs.length) {
    const other = msgs[0].sender_id == APP.uid ? 'المستلم' : esc(msgs[0].sender_name);
    title.textContent = msgs[0].subject || 'محادثة مع ' + other;
  }
  const bubbles = document.getElementById('threadBubbles');
  if (bubbles) {
    bubbles.innerHTML = msgs.map(m => `
      <div>
        <div class="bubble ${m.sender_id == APP.uid ? 'mine' : 'theirs'}">${esc(m.body)}</div>
        <div class="bubble-meta" style="${m.sender_id == APP.uid ? 'text-align:right' : ''}">
          ${esc(m.sender_name)} ${(m.created_at||'').slice(0,16).replace('T',' ')}
        </div>
      </div>
    `).join('');
    bubbles.scrollTop = bubbles.scrollHeight;
  }
  const compose = document.getElementById('msgCompose');
  if (compose) compose.style.display = 'flex';
  loadUnreadCount();
}

async function sendReply() {
  if (!currentThreadId) return;
  const body = document.getElementById('replyBody').value.trim();
  if (!body) return;
  const r2 = await api('messages', { action: 'thread', id: currentThreadId });
  if (!r2.success) return;
  const other = r2.data.find(m => m.sender_id != APP.uid) || r2.data[0];
  const receiverId = other.sender_id == APP.uid ? other.receiver_id : other.sender_id;
  const r = await api('messages', { action: 'send', receiver_id: receiverId, body, parent_id: currentThreadId });
  if (r.success) {
    document.getElementById('replyBody').value = '';
    openThread(currentThreadId);
  }
}

function openCompose() {
  loadContacts();
  document.getElementById('composeModal').classList.remove('hidden');
}

async function loadContacts() {
  const r = await api('messages?action=contacts');
  const sel = document.getElementById('cmTo');
  if (!sel || !r.success) return;
  sel.innerHTML = r.data.map(u => `<option value="${u.id}">${esc(u.name)} (${roleLabel(u.role)})</option>`).join('');
}

async function sendNewMsg() {
  const to      = document.getElementById('cmTo').value;
  const subject = document.getElementById('cmSubject').value.trim();
  const body    = document.getElementById('cmBody').value.trim();
  if (!body) { showInModal('cmMsg', 'يرجى كتابة نص الرسالة', true); return; }
  const r = await api('messages', { action: 'send', receiver_id: parseInt(to), subject, body });
  if (r.success) {
    document.getElementById('composeModal').classList.add('hidden');
    ['cmSubject','cmBody'].forEach(id => { document.getElementById(id).value = ''; });
    loadInbox();
  } else {
    showInModal('cmMsg', r.error, true);
  }
}

function composeToUser(user) {
  loadContacts().then(() => {
    document.getElementById('cmTo').value = user.id;
  });
  document.getElementById('composeModal').classList.remove('hidden');
  nav(document.querySelector('[data-panel="messages"]'));
}

async function loadUnreadCount() {
  const r = await api('messages?action=unread_count');
  if (!r.success) return;
  const badge = document.getElementById('unreadBadge');
  if (!badge) return;
  if (r.data.count > 0) {
    badge.textContent = r.data.count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ─── TOOLS ───────────────────────────────
function openTool(slug) {
  document.getElementById('toolsMenu').style.display = 'none';
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('tool-' + slug);
  if (panel) panel.classList.add('active');
  // Restore sessionStorage state
  restoreToolState(slug);
  // Trigger initial calculation
  if (slug === 'calc_menu')   calcMenu();
  if (slug === 'calc_pkg')    calcPkg();
  if (slug === 'calc_labor')  calcLabor();
  if (slug === 'calc_store')  calcStore();
  if (slug === 'calc_office') calcOffice();
  if (slug === 'calc_custom') calcCustom();
}

function calcMenu() {
  const ingredients = Math.max(0, parseFloat(document.getElementById('mn_ingredients')?.value) || 0);
  const waste = Math.max(0, parseFloat(document.getElementById('mn_waste')?.value) || 0);
  const units = Math.max(1, parseFloat(document.getElementById('mn_units')?.value) || 1);
  const packaging = Math.max(0, parseFloat(document.getElementById('mn_packaging')?.value) || 0);
  const ops = Math.max(0, parseFloat(document.getElementById('mn_ops')?.value) || 0);
  const profit = Math.max(0, parseFloat(document.getElementById('mn_profit')?.value) || 0);
  const fee = Math.min(95, Math.max(0, parseFloat(document.getElementById('mn_fee')?.value) || 0));
  const tax = Math.max(0, parseFloat(document.getElementById('mn_tax')?.value) || 0);
  const ingredientCost = ingredients * (1 + waste / 100);
  const opsPerUnit = ops / units;
  const base = ingredientCost + packaging + opsPerUnit;
  const priceBeforeFee = base * (1 + profit / 100);
  const priceBeforeTax = fee >= 95 ? priceBeforeFee : priceBeforeFee / (1 - fee / 100);
  const finalPrice = priceBeforeTax * (1 + tax / 100);
  setText('mn_rCost', fmt(ingredientCost) + ' ر.س');
  setText('mn_rPackaging', fmt(packaging) + ' ر.س');
  setText('mn_rOps', fmt(opsPerUnit) + ' ر.س');
  setText('mn_rBase', fmt(base) + ' ر.س');
  setText('mn_rFinal', fmt(finalPrice) + ' ر.س');
  const result = document.getElementById('menuResult');
  if (result) result.dataset.amount = finalPrice;
  saveToolState('calc_menu');
}

function closeTool() {
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('toolsMenu').style.display = '';
}

// Open the complete sector calculator that matches the reference workflows.
function openLegacyTool(tool) {
  window.location.href = '/legacy-calculator.html#' + encodeURIComponent(tool);
}

// Update client info card label when name is typed
function updateCicLabel(toolId) {
  const name = (document.getElementById('ci_name_' + toolId)?.value || '').trim();
  const lbl  = document.getElementById('cic_label_' + toolId);
  if (!lbl) return;
  lbl.innerHTML = name
    ? `👤 <strong>${esc(name)}</strong>`
    : `👤 بيانات العميل <small style="font-weight:400;color:var(--muted)">اختياري</small>`;
}

function showPlanUpgrade() {
  document.getElementById('upgradeModal').classList.remove('hidden');
}

// ─── TOOL STATE (sessionStorage) ─────────
function saveToolState(slug) {
  const panel = document.getElementById('tool-' + slug);
  if (!panel) return;
  const state = {};
  panel.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    if (el.type !== 'button' && el.id) state[el.id] = el.value;
  });
  if (slug === 'calc_basic') {
    if (selectedField) state.__selectedField = selectedField;
    state.__selectedSvcs = selectedSvcs.slice();
  }
  try { localStorage.setItem('tas3_tool_state_' + slug, JSON.stringify(state)); } catch (_) {}
}

function restoreToolState(slug) {
  try {
    const raw = localStorage.getItem('tas3_tool_state_' + slug) || sessionStorage.getItem('tool_state_' + slug);
    if (!raw) return;
    const state = JSON.parse(raw);
    const panel = document.getElementById('tool-' + slug);
    if (!panel) return;
    Object.entries(state).forEach(([id, val]) => {
      const el = panel.querySelector('#' + id);
      if (el && el.type !== 'button') el.value = val;
    });
    if (slug === 'calc_basic' && state.__selectedField) {
      const btn = [...document.querySelectorAll('#fieldGrid .field-btn')].find(el => el.textContent.trim() === state.__selectedField);
      if (btn) {
        selectField(btn, state.__selectedField);
        (state.__selectedSvcs || []).forEach(service => {
          const serviceBtn = [...document.querySelectorAll('#svcGrid .svc-btn')].find(el => el.textContent.trim() === service);
          if (serviceBtn && !serviceBtn.classList.contains('active')) toggleSvc(serviceBtn, service);
        });
      }
    }
  } catch (_) {}
}

// Tool: Basic
const svcMap = {
  'موقع إلكتروني': ['تصميم الواجهة','تطوير الصفحات','SEO أساسي','لوحة تحكم','نماذج تواصل','تهيئة الاستضافة'],
  'تطبيق موبايل':  ['تصميم UX/UI','تطوير iOS','تطوير Android','API Backend','اختبار وتجربة','نشر المتجر'],
  'هوية بصرية':    ['شعار رئيسي','دليل الهوية','قرطاسية','سوشيال ميديا','موك أب','ملف ختم'],
  'فيديو وإنتاج':  ['كتابة السيناريو','تصوير','مونتاج','تصميم جرافيك','ترجمة','نشر ومشاركة'],
  'تصوير':         ['تصوير المنتجات','بورتريه','تصوير جوي','تعديل الصور','تسليم عالي الجودة','حقوق ملكية'],
  'محتوى & سوشيال':['استراتيجية المحتوى','كتابة نصوص','تصميم منشورات','إدارة حسابات','تقارير شهرية','إعلانات'],
  'استشارة':       ['تحليل الوضع الحالي','وضع الاستراتيجية','خطة تنفيذية','ورش عمل','متابعة شهرية','تقرير ختامي'],
  'برمجة خاصة':   ['تحليل المتطلبات','تصميم قاعدة البيانات','تطوير Backend','تطوير Frontend','اختبار','توثيق'],
  'ترجمة':         ['ترجمة بشرية','مراجعة لغوية','تدقيق إملائي','تعريب','ترجمة تقنية','ترجمة تسويقية'],
  'أخرى':          ['استشارة أولية','إعداد خطة العمل','تنفيذ المهام','مراجعة وتسليم','دعم ما بعد التسليم','أخرى'],
};

let selectedField = '';
let selectedSvcs  = [];

function selectField(btn, field) {
  document.querySelectorAll('.field-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedField = field;
  selectedSvcs  = [];

  const svcs = svcMap[field] || [];
  document.getElementById('svcGrid').innerHTML = svcs.map(s => `
    <div class="svc-btn" onclick="toggleSvc(this,'${s}')">${s}</div>
  `).join('');
  document.getElementById('svcSection').style.display = '';
  document.getElementById('costsSection').style.display = '';
  document.getElementById('basicResult').style.display = '';
  calcBasic();
  saveToolState('calc_basic');
}

function toggleSvc(btn, svc) {
  btn.classList.toggle('active');
  if (btn.classList.contains('active')) selectedSvcs.push(svc);
  else selectedSvcs = selectedSvcs.filter(s => s !== svc);
  calcBasic();
}

function calcBasic() {
  const hours  = Math.max(0, parseFloat(document.getElementById('cHours')?.value) || 0);
  const rate   = Math.max(0, parseFloat(document.getElementById('cRate')?.value) || 0);
  const tools  = parseFloat(document.getElementById('cTools')?.value)   || 0;
  const ops    = parseFloat(document.getElementById('cOps')?.value)     || 0;
  const profit = parseFloat(document.getElementById('cProfit')?.value)  || 30;
  const tax    = parseFloat(document.getElementById('cTax')?.value)     || 15;

  const effort   = hours * rate;
  const cost     = effort + tools + ops;
  const profAmt  = cost * profit / 100;
  const taxAmt   = (cost + profAmt) * tax / 100;
  const total    = cost + profAmt + taxAmt;

  setText('rEffort', fmt(effort)  + ' ر.س');
  setText('rCost',   fmt(cost)    + ' ر.س');
  setText('rProfit', fmt(profAmt) + ' ر.س');
  setText('rTax',    fmt(taxAmt)  + ' ر.س');
  setText('rFinal',  fmt(total)   + ' ر.س');

  const el = document.getElementById('basicResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_basic');
}

// Tool: Packages
function calcPkg() {
  const rent     = parseFloat(document.getElementById('pkg_rent')?.value)     || 0;
  const salaries = parseFloat(document.getElementById('pkg_salaries')?.value) || 0;
  const tech     = parseFloat(document.getElementById('pkg_tech')?.value)     || 0;
  const other    = parseFloat(document.getElementById('pkg_other')?.value)    || 0;
  const s1       = parseFloat(document.getElementById('pkg_s1')?.value)       || 1;
  const s2       = parseFloat(document.getElementById('pkg_s2')?.value)       || 1;
  const s3       = parseFloat(document.getElementById('pkg_s3')?.value)       || 1;
  const profit   = parseFloat(document.getElementById('pkg_profit')?.value)   || 40;
  const ratio    = parseFloat(document.getElementById('pkg_ratio')?.value)    || 2;

  const cost   = rent + salaries + tech + other;
  const target = cost * (1 + profit / 100);
  const denom  = s1 + s2 * ratio + s3 * ratio * ratio;
  const r1     = denom > 0 ? target / denom : 0;
  const r2     = r1 * ratio;
  const r3     = r2 * ratio;

  setText('pkg_r1', fmt(r1) + ' ر.س');
  setText('pkg_r2', fmt(r2) + ' ر.س');
  setText('pkg_r3', fmt(r3) + ' ر.س');
  const names = ['pkg_name1', 'pkg_name2', 'pkg_name3'].map((id, i) =>
    (document.getElementById(id)?.value || ['أساسية', 'احترافية', 'مؤسسات'][i]).trim()
  );
  const labels = document.querySelectorAll('#tool-calc_pkg .calc-result-row.big span:first-child');
  [names[0], names[1], names[2]].forEach((name, i) => { if (labels[i]) labels[i].textContent = `${name} / شهر`; });
  setText('pkg_rCost',   fmt(cost)   + ' ر.س');
  setText('pkg_rTarget', fmt(target) + ' ر.س');

  const el = document.getElementById('pkgResult');
  if (el) el.setAttribute('data-amount', r1.toFixed(2));
  saveToolState('calc_pkg');
}

// Tool: Labor
function calcLabor() {
  const effort = ['design', 'dev', 'qa'].reduce((sum, phase) => {
    const hours = Math.max(0, parseFloat(document.getElementById(`lb_${phase}_h`)?.value) || 0);
    const rate = Math.max(0, parseFloat(document.getElementById(`lb_${phase}_rate`)?.value) || 0);
    return sum + hours * rate;
  }, 0);
  const extra = ['lb_licenses', 'lb_hosting', 'lb_overhead'].reduce((sum, id) =>
    sum + Math.max(0, parseFloat(document.getElementById(id)?.value) || 0), 0);
  const contingencyPct = Math.max(0, parseFloat(document.getElementById('lb_contingency')?.value) || 0);
  const profitPct = Math.max(0, parseFloat(document.getElementById('lb_profit')?.value) || 0);
  const taxPct = Math.max(0, parseFloat(document.getElementById('lb_tax')?.value) || 0);
  const base = effort + extra;
  const reserve = base * contingencyPct / 100;
  const profit = (base + reserve) * profitPct / 100;
  const total = (base + reserve + profit) * (1 + taxPct / 100);

  setText('lb_rEffort', fmt(effort) + ' ر.س');
  setText('lb_rCost', fmt(base + reserve) + ' ر.س');
  setText('lb_rProfit', fmt(profit) + ' ر.س');
  setText('lb_rFinal', fmt(total) + ' ر.س');

  const el = document.getElementById('laborResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_labor');
}

// Tool: Retail products
function calcStore() {
  const cost = Math.max(0, parseFloat(document.getElementById('st_cost')?.value) || 0);
  const shipping = Math.max(0, parseFloat(document.getElementById('st_shipping')?.value) || 0);
  const packaging = Math.max(0, parseFloat(document.getElementById('st_packaging')?.value) || 0);
  const profitPct = Math.max(0, parseFloat(document.getElementById('st_profit')?.value) || 0);
  const feePct = Math.min(95, Math.max(0, parseFloat(document.getElementById('st_fee')?.value) || 0));
  const discountPct = Math.min(90, Math.max(0, parseFloat(document.getElementById('st_discount')?.value) || 0));
  const taxPct = Math.max(0, parseFloat(document.getElementById('st_tax')?.value) || 0);
  const landed = cost + shipping + packaging;
  const breakEven = feePct >= 95 ? landed : landed / (1 - feePct / 100);
  const profitAmount = landed * profitPct / 100;
  const sale = feePct >= 95 ? breakEven + profitAmount : (landed + profitAmount) / (1 - feePct / 100);
  const listPrice = discountPct >= 100 ? sale : sale / (1 - discountPct / 100);
  const total = listPrice * (1 + taxPct / 100);

  setText('st_rCost', fmt(landed) + ' ر.س');
  setText('st_rBreak', fmt(breakEven) + ' ر.س');
  setText('st_rProfit', fmt(profitAmount) + ' ر.س');
  setText('st_rSale', fmt(sale) + ' ر.س');
  setText('st_rFinal', fmt(total) + ' ر.س');

  const el = document.getElementById('storeResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_store');
}

// Tool: Office
function calcOffice() {
  const area = Math.max(0, parseFloat(document.getElementById('of_area')?.value) || 0);
  const designRate = Math.max(0, parseFloat(document.getElementById('of_designRate')?.value) || 0);
  const visits = Math.max(0, parseFloat(document.getElementById('of_visits')?.value) || 0);
  const visitRate = Math.max(0, parseFloat(document.getElementById('of_visitRate')?.value) || 0);
  const consult = Math.max(0, parseFloat(document.getElementById('of_consult')?.value) || 0);
  const execution = Math.max(0, parseFloat(document.getElementById('of_execution')?.value) || 0);
  const overhead = Math.max(0, parseFloat(document.getElementById('of_overhead')?.value) || 0);
  const reservePct = Math.max(0, parseFloat(document.getElementById('of_contingency')?.value) || 0);
  const profitPct = Math.max(0, parseFloat(document.getElementById('of_profit')?.value) || 0);
  const taxPct = Math.max(0, parseFloat(document.getElementById('of_tax')?.value) || 0);
  const design = area * designRate;
  const cost = design + visits * visitRate + consult + execution + overhead;
  const reserve = cost * reservePct / 100;
  const profit = (cost + reserve) * profitPct / 100;
  const total = (cost + reserve + profit) * (1 + taxPct / 100);

  setText('of_rDesign', fmt(design) + ' ر.س');
  setText('of_rCost', fmt(cost) + ' ر.س');
  setText('of_rReserve', fmt(reserve) + ' ر.س');
  setText('of_rMin', fmt(total) + ' ر.س');

  const el = document.getElementById('officeResult');
  if (el) el.setAttribute('data-amount', total.toFixed(2));
  saveToolState('calc_office');
}

// Tool: technology companies and recurring services
function calcCustom() {
  const clients = Math.max(1, parseFloat(document.getElementById('cu_clients')?.value) || 1);
  const fixed = ['cu_salaries', 'cu_servers', 'cu_tools', 'cu_ops'].reduce((sum, id) =>
    sum + Math.max(0, parseFloat(document.getElementById(id)?.value) || 0), 0);
  const variable = Math.max(0, parseFloat(document.getElementById('cu_variable')?.value) || 0);
  const profitPct = Math.max(0, parseFloat(document.getElementById('cu_profit')?.value) || 0);
  const taxPct = Math.max(0, parseFloat(document.getElementById('cu_tax')?.value) || 0);
  const annualDiscount = Math.min(50, Math.max(0, parseFloat(document.getElementById('cu_annualDiscount')?.value) || 0));
  const perClientCost = fixed / clients + variable;
  const profitPerClient = perClientCost * profitPct / 100;
  const monthlyBeforeTax = perClientCost + profitPerClient;
  const monthly = monthlyBeforeTax * (1 + taxPct / 100);
  const annual = monthly * 12 * (1 - annualDiscount / 100);
  const cycle = document.getElementById('cu_cycle')?.value || '1';
  const displayed = cycle === '12' ? annual : monthly;

  setText('cu_rFixed', fmt(fixed) + ' ر.س');
  setText('cu_rPerClient', fmt(perClientCost) + ' ر.س');
  setText('cu_rProfit', fmt(profitPerClient) + ' ر.س');
  setText('cu_rMonthly', fmt(monthlyBeforeTax) + ' ر.س');
  setText('cu_rFinal', fmt(displayed) + ' ر.س');
  setText('cu_rAnnual', fmt(annual) + ' ر.س');
  const el = document.getElementById('customResult');
  if (el) el.setAttribute('data-amount', displayed.toFixed(2));
  saveToolState('calc_custom');
}

// ─── TOOL → QUOTE ────────────────────────
async function openToolQuote(slug, toolName) {
  const resultEl = document.getElementById(
    slug === 'basic'  ? 'basicResult'  :
    slug === 'pkg'    ? 'pkgResult'    :
    slug === 'labor'  ? 'laborResult'  :
    slug === 'store'  ? 'storeResult'  :
    slug === 'menu'   ? 'menuResult'   :
    slug === 'office' ? 'officeResult' : 'customResult'
  );
  const amount = parseFloat(resultEl?.getAttribute('data-amount') || '0');
  if (!amount) {
    alert('أدخل بيانات التسعير أولاً لظهور قيمة محسوبة.');
    return;
  }

  document.getElementById('tqmSlug').value   = slug;
  document.getElementById('tqmAmount').value = amount;
  document.getElementById('tqmTitle').textContent = `حفظ نتيجة ${toolName} كعرض سعر`;
  document.getElementById('tqmQuoteTitle').value  = toolName;
  document.getElementById('tqmNotes').value = '';
  document.getElementById('tqmMsg').className = 'hidden';

  // Load clients into the select
  await ensureClientsLoaded();
  const sel = document.getElementById('tqmClient');
  if (sel && clientsCache) {
    sel.innerHTML = '<option value="">اختر العميل...</option>' +
      clientsCache.map(c => `<option value="${c.id}">${esc(c.name)} ${esc(c.email)}</option>`).join('');
  }

  document.getElementById('toolQuoteModal').classList.remove('hidden');
}

async function saveToolQuote() {
  const slug     = document.getElementById('tqmSlug').value;
  const amount   = parseFloat(document.getElementById('tqmAmount').value) || 0;
  const title    = document.getElementById('tqmQuoteTitle').value.trim();
  const clientId = document.getElementById('tqmClient').value;
  const notes    = document.getElementById('tqmNotes').value.trim();
  const msgEl    = document.getElementById('tqmMsg');

  const showMsg = (txt, isErr) => {
    msgEl.className = `alert alert-${isErr ? 'danger' : 'success'}`;
    msgEl.textContent = txt;
  };

  if (!title) { showMsg('عنوان العرض مطلوب', true); return; }
  if (!clientId) { showMsg('يرجى اختيار العميل', true); return; }

  const toolLabel = {
    basic: 'تسعير الخدمات', pkg: 'الباقات والاشتراكات', menu: 'قائمة المطاعم والكافيهات',
    labor: 'المشروع التقني', store: 'منتج التجزئة',
    office: 'مشروع التصميم', custom: 'الشركة التقنية',
  };

  // Each specialized calculator already returns its customer-facing total.
  // Keep the saved quote as one isolated summary item so sectors never share rows.
  const items = [{ description: toolLabel[slug] || title, qty: 1, unit_price: amount }];
  const taxRate = 0; // amount already includes tax
  const discount = 0;

  if (!items.length) { showMsg('لا توجد بنود في التسعيرة', true); return; }

  const r = await api('quotes', {
    action: 'create', title, client_id: clientId,
    items, tax_rate: taxRate, discount, notes,
  });

  if (r.success) {
    showMsg('✅ تم حفظ العرض كمسودة بنجاح', false);
    setTimeout(() => {
      document.getElementById('toolQuoteModal').classList.add('hidden');
      // Switch to quotes panel
      nav(document.querySelector('[data-panel="quotes"]'));
    }, 1500);
  } else {
    showMsg(r.error || 'حدث خطأ', true);
  }
}

// ─── ADMIN: USERS ────────────────────────
async function loadUsers() {
  const role   = (document.getElementById('uRoleFilter') || {}).value || '';
  const plan   = (document.getElementById('uPlanFilter') || {}).value || '';
  const search = (document.getElementById('uSearch')     || {}).value || '';
  const r = await api(`admin?action=users&role=${role}&plan=${plan}&q=${encodeURIComponent(search)}`);
  const tb = document.getElementById('usersTbody');
  if (!tb) return;
  if (!r.success) { tb.innerHTML = `<tr><td colspan="7">${r.error}</td></tr>`; return; }
  const users = r.data;
  if (!users.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">لا يوجد مستخدمون</td></tr>';
    return;
  }
  tb.innerHTML = users.map(u => `
    <tr>
       <td class="user-content">${esc(u.name)}</td>
       <td class="user-content" style="direction:ltr;text-align:right;font-size:12px">${esc(u.email)}</td>
      <td><span class="badge badge-${u.role}">${roleLabel(u.role)}</span></td>
      <td><span class="badge badge-${u.plan}">${planLabel(u.plan)}</span></td>
      <td>
        <span class="badge" style="${u.is_active ? 'background:rgba(92,186,150,.12);color:#2a8a60' : 'background:rgba(216,107,114,.1);color:var(--danger)'}">
          ${u.is_active ? 'فعّال' : 'معطّل'}
        </span>
      </td>
      <td style="font-size:11px;color:var(--muted)">${(u.created_at||'').slice(0,10)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="editUser(${JSON.stringify(u).replace(/"/g,'&quot;')})">تعديل</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleUser(${u.id})">${u.is_active ? 'تعطيل' : 'تفعيل'}</button>
          <button class="btn btn-primary btn-sm" data-uid="${u.id}" data-uname="${esc(u.name)}" data-uplan="${esc(u.plan)}" onclick="openPlanModal(+this.dataset.uid,this.dataset.uname,this.dataset.uplan)">الخطة</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openUserModal() {
  document.getElementById('umId').value = '';
  document.getElementById('userModalTitle').textContent = 'مستخدم جديد';
  ['umName','umEmail','umPass'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('umRole').value = 'client';
  document.getElementById('umPlan').value = 'free';
  document.getElementById('umMsg').className = 'hidden';
  document.getElementById('userModal').classList.remove('hidden');
}

function editUser(u) {
  document.getElementById('umId').value   = u.id;
  document.getElementById('userModalTitle').textContent = 'تعديل المستخدم';
  document.getElementById('umName').value = u.name;
  document.getElementById('umEmail').value= u.email;
  document.getElementById('umPass').value = '';
  document.getElementById('umRole').value = u.role;
  document.getElementById('umPlan').value = u.plan;
  document.getElementById('umMsg').className = 'hidden';
  document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
}

async function saveUser() {
  const id   = document.getElementById('umId').value;
  const name = document.getElementById('umName').value.trim();
  const email= document.getElementById('umEmail').value.trim();
  const pass = document.getElementById('umPass').value;
  const role = document.getElementById('umRole').value;
  const plan = document.getElementById('umPlan').value;

  let r;
  if (id) {
    r = await api('admin', { action: 'user_update', id: parseInt(id), name, role, password: pass || undefined });
    if (r.success) {
      await api('admin', { action: 'set_plan', id: parseInt(id), plan });
    }
  } else {
    r = await api('admin', { action: 'user_create', name, email, role, plan, password: pass || 'Demo@2025' });
  }
  if (r.success) {
    showInModal('umMsg', r.message || 'تم الحفظ', false);
    setTimeout(() => { closeUserModal(); loadUsers(); }, 1200);
  } else {
    showInModal('umMsg', r.error, true);
  }
}

async function toggleUser(id) {
  const r = await api('admin', { action: 'user_toggle', id });
  if (r.success) loadUsers();
  else alert(r.error);
}

function openPlanModal(id, name, currentPlan) {
  document.getElementById('pmUserId').value = id;
  document.getElementById('pmUserName').textContent = name;
  document.getElementById('pmPlan').value = currentPlan;
  document.getElementById('pmExpires').value = '';
  document.getElementById('pmMsg').className = 'hidden';
  document.getElementById('planModal').classList.remove('hidden');
}

async function savePlan() {
  const id      = parseInt(document.getElementById('pmUserId').value);
  const plan    = document.getElementById('pmPlan').value;
  const expires = document.getElementById('pmExpires').value || null;
  const r = await api('admin', { action: 'set_plan', id, plan, expires_at: expires });
  if (r.success) {
    showInModal('pmMsg', 'تم تغيير الخطة', false);
    setTimeout(() => {
      document.getElementById('planModal').classList.add('hidden');
      loadUsers();
      loadSubscriptions();
    }, 1000);
  } else {
    showInModal('pmMsg', r.error, true);
  }
}

// ─── ADMIN: SUBSCRIPTIONS ────────────────
async function loadSubscriptions() {
  const r = await api('admin?action=stats');
  if (r.success) {
    setText('planCount_free',       r.data.plan_free);
    setText('planCount_plus',       r.data.plan_plus);
    setText('planCount_pro',        r.data.plan_pro);
  }

  const r2 = await api('admin?action=users');
  const tb = document.getElementById('subsTbody');
  if (!tb || !r2.success) return;
  tb.innerHTML = r2.data.map(u => `
    <tr>
       <td class="user-content">${esc(u.name)}</td>
       <td class="user-content" style="direction:ltr;text-align:right;font-size:12px">${esc(u.email)}</td>
      <td><span class="badge badge-${u.role}">${roleLabel(u.role)}</span></td>
      <td><span class="badge badge-${u.plan}">${planLabel(u.plan)}</span></td>
      <td style="font-size:12px;color:var(--muted)">${u.plan_expires_at || ''}</td>
      <td>
        <select class="form-control" style="width:110px" onchange="quickPlan(${u.id},this.value)">
          <option value="free"       ${u.plan==='free'       ?'selected':''}>مجاني</option>
          <option value="plus"        ${u.plan==='plus'        ?'selected':''}>Plus</option>
          <option value="pro"         ${u.plan==='pro'         ?'selected':''}>Pro</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function quickPlan(id, plan) {
  await api('admin', { action: 'set_plan', id, plan });
  loadSubscriptions();
}

// ─── ADMIN: ACTIVITY ─────────────────────
async function loadActivity() {
  const r  = await api('admin?action=activity_log&limit=50');
  const tb = document.getElementById('activityTbody');
  if (!tb || !r.success) return;
  const actionLabels = {
    login:'تسجيل دخول', logout:'تسجيل خروج', register:'تسجيل جديد',
    quote_created:'إنشاء عرض', quote_status_changed:'تغيير حالة عرض',
    message_sent:'رسالة مُرسلة',
    admin_user_create:'إنشاء مستخدم', admin_user_update:'تعديل مستخدم',
    user_activated:'تفعيل مستخدم', user_deactivated:'تعطيل مستخدم',
    plan_changed:'تغيير خطة', system_init:'تهيئة النظام',
  };
  tb.innerHTML = r.data.map(l => `
    <tr>
       <td class="user-content">${esc(l.user_name || 'النظام')}</td>
      <td>${l.user_role ? `<span class="badge badge-${l.user_role}">${roleLabel(l.user_role)}</span>` : ''}</td>
      <td>${actionLabels[l.action] || l.action}</td>
       <td class="user-content" style="font-size:12px;color:var(--muted)">${esc(l.details || '')}</td>
      <td style="font-size:11px;direction:ltr">${esc(l.ip || '')}</td>
      <td style="font-size:11px;color:var(--muted)">${(l.created_at||'').slice(0,16).replace('T',' ')}</td>
    </tr>
  `).join('');
}

// ─── ADMIN: CONTACT INBOX ────────────────
async function loadContactInbox() {
  const r = await api('admin?action=contact_messages');
  const tb = document.getElementById('contactInboxTbody');
  const badge = document.getElementById('contactBadge');
  if (!tb || !r.success) return;
  const msgs = r.data;
  const unread = msgs.filter(m => !m.is_read).length;
  if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
  if (!msgs.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px">لا توجد رسائل بعد</td></tr>'; return; }
  tb.innerHTML = msgs.map(m => `
    <tr style="${m.is_read ? '' : 'background:var(--surface);font-weight:600'}">
      <td>${esc(m.name)}</td>
      <td style="direction:ltr;font-size:12px">${esc(m.email)}</td>
      <td style="max-width:260px;white-space:pre-wrap;font-size:13px">${esc(m.message)}</td>
      <td style="font-size:11px;color:var(--muted)">${(m.created_at||'').slice(0,16).replace('T',' ')}</td>
      <td>
        <div class="actions">
          ${!m.is_read ? `<button class="btn btn-ghost btn-sm" onclick="markContactRead(${m.id})">قُرئت</button>` : '<span style="font-size:11px;color:var(--muted)">✓</span>'}
          <button class="btn btn-ghost btn-sm" style="color:var(--red,#e53e3e)" onclick="deleteContact(${m.id})">حذف</button>
        </div>
      </td>
    </tr>`).join('');
}
async function markContactRead(id) {
  const r = await api('admin', { action: 'contact_mark_read', id });
  if (r.success) loadContactInbox();
}
async function deleteContact(id) {
  if (!confirm('تأكيد حذف الرسالة؟')) return;
  const r = await api('admin', { action: 'contact_delete', id });
  if (r.success) loadContactInbox();
}

// ─── ADMIN: SETTINGS ─────────────────────
async function loadSettings() {
  const r = await api('admin?action=get_settings');
  if (!r.success) return;
  const s = r.data;
  const f = id => document.getElementById(id);
  if (f('setContactEmail'))   f('setContactEmail').value   = s.contact_email   || '';
  if (f('setWhatsapp'))       f('setWhatsapp').value       = s.whatsapp        || '';
  if (f('setSiteName'))       f('setSiteName').value       = s.site_name       || 'تسعيرة';
  if (f('setWelcomeMsg'))     f('setWelcomeMsg').value     = s.welcome_message || '';
}
async function saveSettings() {
  const val = id => (document.getElementById(id)||{}).value || '';
  const payload = {
    action: 'save_settings',
    contact_email:   val('setContactEmail'),
    whatsapp:        val('setWhatsapp'),
    site_name:       val('setSiteName'),
    welcome_message: val('setWelcomeMsg'),
  };
  const r = await api('admin', payload);
  const msg = document.getElementById('settingsMsg');
  if (!msg) return;
  msg.className = r.success ? 'alert alert-success' : 'alert alert-danger';
  msg.textContent = r.success ? 'تم حفظ الإعدادات بنجاح ✓' : (r.error || 'فشل الحفظ');
  setTimeout(() => { msg.className = 'hidden'; }, 3000);
}

// ─── ACCOUNT ─────────────────────────────
async function saveAccount() {
  const name = document.getElementById('accName').value.trim();
  const pass  = document.getElementById('accPass')?.value || '';
  const msg   = document.getElementById('accMsg');
  if (!name) { msg.className='alert alert-danger mb-8'; msg.textContent='الاسم مطلوب'; return; }

  const payload = { action: 'update_account', name };
  if (pass) payload.password = pass;

  const r = await api('auth', payload);
  if (r && r.success) {
    msg.className = 'alert alert-success mb-8';
    msg.textContent = 'تم حفظ التغييرات بنجاح';
  } else {
    msg.className = 'alert alert-danger mb-8';
    msg.textContent = (r && r.error) ? r.error : 'تعذّر الحفظ في الوقت الحالي';
  }
  setTimeout(() => msg.className = 'hidden', 2500);
}

// ─── HELPERS ─────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(n) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString(L.current === 'en' ? 'en-US' : 'ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function statusLabel(s) {
  const labels = L.current === 'en'
    ? { draft:'Draft', sent:'Sent', accepted:'Accepted', rejected:'Rejected', cancelled:'Cancelled' }
    : { draft:'مسودة', sent:'مُرسل', accepted:'مقبول', rejected:'مرفوض', cancelled:'ملغي' };
  return labels[s] || s;
}
function roleLabel(r) {
  const labels = L.current === 'en' ? { admin:'Admin', employee:'Employee', client:'Client' } : { admin:'مدير', employee:'موظف', client:'عميل' };
  return labels[r] || r;
}
function planLabel(p) {
  return { free: L.current === 'en' ? 'Free' : 'مجاني', plus:'Plus', pro:'Pro', enterprise:'Pro' }[p] || p;
}
function showInModal(id, msg, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${isErr ? 'danger' : 'success'}`;
  el.textContent = msg;
}

// ─── SPLASH SCREEN ───────────────────────
(function initSplash() {
  const splash   = document.getElementById('splash-screen');
  if (!splash) return;
  const icon     = document.getElementById('splashIcon');
  const spinner  = document.getElementById('splashSpinner');
  const brand    = document.getElementById('splashBrand');

  // Keep the intro brief so the workspace is immediately usable.
  setTimeout(() => {
    if (icon)    icon.classList.add('clear');
    if (spinner) spinner.classList.add('done');
    if (brand)   brand.classList.add('show');
  }, 350);

  // Fade out after the brand mark has appeared.
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 650);
  }, 850);
})();

// ─── INIT ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUnreadCount();
  setInterval(loadUnreadCount, 60000);
});
