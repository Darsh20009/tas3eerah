'use strict';

const db = require('./db');

async function refundIneligibility(payment) {
  if (payment.status !== 'paid') return 'الدفعة غير مؤكدة أو سبق استردادها';
  if (payment.environment !== 'test') return 'الاسترداد المباشر مفعّل للاختبار فقط';
  if (!payment.geidea_order_id) return 'لا يوجد رقم طلب من Geidea';
  const paidAt = Date.parse(payment.paid_at || '');
  if (!Number.isFinite(paidAt) || Date.now() - paidAt > 60 * 60 * 1000 || paidAt > Date.now()) {
    return 'انتهت مهلة الساعة الواحدة';
  }
  const [used, quote, savedCalculator] = await Promise.all([
    db.count('activity_log', {
      user_id: Number(payment.user_id), action: 'subscription_feature_used',
      created_at: { $gte: payment.paid_at },
    }),
    db.count('quotes', { client_id: Number(payment.user_id), created_at: { $gte: payment.paid_at } }),
    db.count('calculator_results', { user_id: Number(payment.user_id), created_at: { $gte: payment.paid_at } }),
  ]);
  return used || quote || savedCalculator ? 'تم استخدام ميزة مدفوعة بعد الدفع' : '';
}

module.exports = { refundIneligibility };
