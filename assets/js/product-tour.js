(() => {
  const card = document.getElementById('dashboardTour');
  if (!card) return;

  const role = card.dataset.role || 'client';
  const user = card.dataset.user || 'account';
  const storageKey = `tas3-tour-hidden:${user}`;
  const steps = {
    client: [
      ['ابدأ من لوحة العمل', 'تابع ملخص حسابك وخطتك وآخر نشاطك.', 'نظرة عامة', 'ملخص حسابك'],
      ['اختر أداة التسعير', 'حدد الأداة المناسبة لنشاطك وأدخل بيانات التكلفة.', 'أدوات التسعير', 'أدوات تناسب نشاطك'],
      ['احفظ مشروعك', 'احتفظ بالنتيجة في سجل المشاريع للرجوع إليها لاحقاً.', 'سجل المشاريع', 'مشاريعك المحفوظة'],
      ['تابع عروضك', 'راجع حالة عروض الأسعار وتواصل عبر الرسائل الداخلية.', 'عروض الأسعار', 'الحالة والردود']
    ],
    employee: [
      ['نظرة عامة', 'ابدأ بمتابعة نشاطك والعروض والعملاء.', 'لوحة العمل', 'ملخص العمل'],
      ['أنشئ عرض سعر', 'اختر العميل وأدخل بيانات العرض ثم احفظه كمسودة.', 'عرض سعر جديد', 'بيانات العرض'],
      ['استخدم أدوات التسعير', 'احسب التكلفة والسعر المناسب ثم احفظ النتيجة.', 'أدوات التسعير', 'حساب السعر'],
      ['تابع الردود والعملاء', 'راجع حالة العرض وتواصل مع العملاء من داخل النظام.', 'العروض والعملاء', 'متابعة التواصل']
    ],
    admin: [
      ['نظرة عامة', 'تابع مؤشرات النظام والعروض من مركز الإدارة.', 'مركز الإدارة', 'مؤشرات النظام'],
      ['راجع عروض الأسعار', 'تابع حالات العروض والقيم بحسب العملة.', 'كل عروض الأسعار', 'الحالات والقيم'],
      ['أدر المستخدمين والخطط', 'أدوات إدارة الحسابات والخطط متاحة للمدير فقط.', 'إدارة النظام', 'إدارة بصلاحية المدير'],
      ['تابع الرسائل والنشاط', 'راجع رسائل الموقع والبريد وسجل نشاط النظام.', 'المتابعة', 'الرسائل والنشاط']
    ]
  }[role] || [];
  const description = document.getElementById('tourDescription');
  const sceneTitle = document.getElementById('tourSceneTitle');
  const sceneCaption = document.getElementById('tourSceneCaption');
  const progress = document.getElementById('tourProgress');
  const label = document.getElementById('tourStepLabel');
  const next = document.getElementById('tourNext');
  const play = document.getElementById('tourPlay');
  const hide = document.getElementById('tourHide');
  const show = document.getElementById('tourShow');
  const title = document.getElementById('tourTitle');
  let index = 0;
  let timer;

  function render() {
    const step = steps[index];
    if (!step) return;
    title.textContent = `تعرّف على لوحة ${role === 'admin' ? 'مدير النظام' : role === 'employee' ? 'الموظف' : 'العميل'}`;
    description.textContent = step[1];
    sceneTitle.textContent = step[2];
    sceneCaption.textContent = step[3];
    label.textContent = `الخطوة ${index + 1} من ${steps.length}`;
    progress.style.width = `${((index + 1) / steps.length) * 100}%`;
    next.textContent = index === steps.length - 1 ? 'أعد الجولة' : 'التالي';
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    play.setAttribute('aria-pressed', 'false');
    play.textContent = 'تشغيل تلقائي';
  }
  render();
  if (localStorage.getItem(storageKey) === '1') {
    card.classList.add('hidden');
    show.classList.remove('hidden');
  }
  next.addEventListener('click', () => { index = (index + 1) % steps.length; render(); });
  play.addEventListener('click', () => {
    if (timer) return stop();
    play.setAttribute('aria-pressed', 'true');
    play.textContent = 'إيقاف الجولة';
    timer = setInterval(() => { index = (index + 1) % steps.length; render(); }, 3800);
  });
  hide.addEventListener('click', () => {
    stop();
    localStorage.setItem(storageKey, '1');
    card.classList.add('hidden');
    show.classList.remove('hidden');
  });
  show.addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    show.classList.add('hidden');
    card.classList.remove('hidden');
  });
})();
