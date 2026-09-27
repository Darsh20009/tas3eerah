'use strict';

const toolMap = Object.freeze({
  services: { legacy: 'services', title: 'تسعير الخدمات', short: 'الخدمات', description: 'سعّر خدماتك ومشاريعك وفق التكلفة والهامش المناسب.', image: '/assets/landing/sector-services-icon-transparent.png', plan: 'calc_basic' },
  packages: { legacy: 'packages', title: 'تسعير الباقات والاشتراكات', short: 'الباقات والاشتراكات', description: 'وزّع تكاليفك على الباقات وحدد السعر المناسب لكل مستوى.', image: '/assets/landing/empty-box-transparent.png', plan: 'calc_pkg' },
  menu: { legacy: 'menu', title: 'تسعير قوائم المطاعم والكافيهات', short: 'القوائم', description: 'احسب تكلفة الأصناف والهدر والهامش قبل اعتماد سعر القائمة.', image: '/assets/landing/sector-restaurants-icon-transparent.png', plan: 'calc_menu' },
  retail: { legacy: 'retail', title: 'تسعير التجزئة والجملة', short: 'التجزئة والجملة', description: 'حدد سعر البيع بعد احتساب التكلفة والعمولات والخصومات.', image: '/assets/landing/sector-retail-icon-transparent.png', plan: 'calc_store' },
  tech: { legacy: 'tech', title: 'تسعير المشاريع التقنية', short: 'المشاريع التقنية', description: 'احسب تكلفة المشروع حسب الساعات والموارد والنطاق.', image: '/assets/landing/sector-technology-icon-transparent.png', plan: 'calc_labor' },
  saas: { legacy: 'saas', title: 'تسعير الشركات التقنية', short: 'الخدمات المتكررة', description: 'حدد سعر الاشتراك والخدمة المتكررة وفق تكاليف التشغيل والعملاء.', image: '/assets/landing/sector-technology-icon-transparent.png', plan: 'calc_custom' },
  design: { legacy: 'design', title: 'تسعير التصميم الداخلي والمعماري', short: 'التصميم والمعمار', description: 'سعّر مشاريع التصميم والتنفيذ حسب المساحة والمراحل والتكاليف.', image: '/assets/landing/sector-design-icon-transparent.png', plan: 'calc_office' },
});

module.exports = toolMap;