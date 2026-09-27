'use strict';

const path = require('node:path');

const APP_ENV = String(process.env.APP_ENV || process.env.NODE_ENV || 'development').trim().toLowerCase();
const APP_URL = String(
  process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
).replace(/\/+$/, '');
const MONGODB_URI = String(process.env.MONGODB_URI || '').trim();
const DB_PATH = path.resolve(
  process.env.DB_PATH || path.join(__dirname, '..', 'database', 'tas3eerah.db'),
);
const SESSION_LIFETIME = 60 * 60 * 24 * 30;

const PLANS = Object.freeze({
  free: Object.freeze({
    name_ar: 'مجاني',
    name_en: 'Free',
    price: 0,
    max_quotes: 1,
    max_msgs: 0,
    max_pdf_reports: 3,
    history_limit: 3,
    max_users: 1,
    tools: Object.freeze(['all']),
    badge: '#6B7C73',
    features_ar: Object.freeze([
      'تسعيرة واحدة للخدمات أو المنتجات شهرياً',
      'تصدير ٣ تقارير PDF',
      'سجل يعرض ٣ خدمات أو منتجات',
      'مستخدم واحد',
      'دعم عبر البريد خلال ٣ أيام',
    ]),
  }),
  plus: Object.freeze({
    name_ar: 'Plus',
    name_en: 'Plus',
    price: 49,
    max_quotes: 15,
    max_msgs: 0,
    max_pdf_reports: 15,
    history_limit: -1,
    max_users: 2,
    tools: Object.freeze(['calc_basic', 'calc_store']),
    tool_limit: 2,
    badge: '#2471A3',
    features_ar: Object.freeze([
      'اختيار أداتي تسعير حسب احتياجك',
      '١٥ تسعيراً للخدمات أو المنتجات شهرياً',
      'تصدير ١٥ تقرير PDF',
      'سجل مشاريع كامل',
      'مستخدمان',
      'دعم عبر البريد خلال ٤٨ ساعة',
    ]),
  }),
  pro: Object.freeze({
    name_ar: 'Pro',
    name_en: 'Pro',
    price: 79,
    max_quotes: -1,
    max_msgs: -1,
    max_pdf_reports: -1,
    history_limit: -1,
    max_users: 4,
    tools: Object.freeze(['calc_basic', 'calc_store', 'calc_menu']),
    tool_limit: 3,
    badge: '#C9A741',
    features_ar: Object.freeze([
      'اختيار ٣ أدوات تسعير حسب احتياجك',
      'تسعير غير محدود للخدمات أو المنتجات',
      'حتى ٤ مستخدمين للفريق',
      'رسائل داخلية بين أعضاء الفريق',
      'تقارير PDF غير محدودة مع شعار العميل',
      'أولوية الدعم خلال ٢٤ ساعة عبر البريد وواتساب',
    ]),
  }),
});

function isProduction() {
  return APP_ENV === 'production';
}

function assertProductionReady() {
  if (isProduction() && !MONGODB_URI) {
    throw new Error('لم يتم إعداد MONGODB_URI في بيئة الإنتاج؛ أوقف التطبيق لمنع استخدام تخزين مؤقت.');
  }
}

function getConfiguredAdmin() {
  const email = String(process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.INITIAL_ADMIN_PASSWORD || '');
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12
  ) {
    return null;
  }
  return { email, password };
}

module.exports = Object.freeze({
  APP_ENV,
  APP_URL,
  DB_PATH,
  MONGODB_URI,
  SESSION_LIFETIME,
  PLANS,
  isProduction,
  assertProductionReady,
  getConfiguredAdmin,
});