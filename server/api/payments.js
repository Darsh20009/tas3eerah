'use strict';

const crypto = require('node:crypto');
const express = require('express');
const db = require('../db');
const { PLANS, APP_URL, isProduction } = require('../config');
const auth = require('../auth');
const { sendOk, sendError, failFromError, text } = require('./_helpers');
const geidea = require('../geidea');

const router = express.Router();
router.use(auth.loadUser, auth.requireUser);
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

function siteUrl() {
  if (/^https:\/\//i.test(APP_URL) && !/localhost|127\.0\.0\.1/i.test(APP_URL)) return APP_URL;
  if (!isProduction() && process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  throw new Error('اضبط APP_URL على نطاق HTTPS قبل بدء الدفع.');
}

router.post('/', async (req, res) => {
  try {
    const action = text(req.body?.action, 40);
    if (action === 'start_trial') {
      if (req.user.role !== 'client') return sendError(res, 'التجربة متاحة لحسابات العملاء فقط', 403);
      if (Date.now() < Date.parse('2026-10-25T00:00:00+03:00')) {
        return sendError(res, 'يبدأ عرض الشهر المجاني يوم الأحد 25 أكتوبر 2026', 409);
      }
      if (req.user.trial_used_at) return sendError(res, 'تم استخدام الشهر المجاني لهذا الحساب مسبقاً', 409);
      const plan = text(req.body.plan, 30);
      if (!PLANS[plan] || PLANS[plan].price <= 0) return sendError(res, 'اختر خطة مدفوعة للتجربة');
      const now = new Date();
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + 1);
      const modified = await db.updateDoc('users', { id: Number(req.user.id), trial_used_at: { $eq: null } }, {
        trial_used_at: now.toISOString(),
        trial_plan: plan,
        trial_ends_at: expiry.toISOString(),
      });
      if (!modified) return sendError(res, 'تم استخدام الشهر المجاني لهذا الحساب مسبقاً', 409);
      await db.insertDoc('activity_log', {
        user_id: Number(req.user.id), action: 'subscription_trial_started',
        details: `تجربة مجانية لخطة ${plan}`,
      });
      return sendOk(res, { plan, expires_at: expiry.toISOString() }, 'بدأ الشهر المجاني');
    }
    if (action === 'create_session') {
      if (req.user.role !== 'client') return sendError(res, 'الدفع متاح لحسابات العملاء فقط', 403);
      const plan = text(req.body.plan, 30);
      const selectedPlan = PLANS[plan];
      if (!selectedPlan || selectedPlan.price <= 0) return sendError(res, 'الخطة المطلوبة غير صالحة');
      const origin = siteUrl();
      const reference = `TAS-${Number(req.user.id)}-${crypto.randomUUID()}`;
      const { sessionId, publicKey } = await geidea.createSession({
        amount: selectedPlan.price,
        reference,
        returnUrl: `${origin}/dashboard?panel=subscription`,
        customer: { email: req.user.email, name: req.user.name },
      });
      const paymentId = await db.insertDoc('payment_transactions', {
        user_id: Number(req.user.id),
        plan,
        amount: selectedPlan.price,
        currency: 'SAR',
        status: 'pending',
        environment: 'test',
        merchant_reference_id: reference,
        geidea_session_id: sessionId,
      });
      return sendOk(res, { paymentId, sessionId, publicKey, amount: selectedPlan.price });
    }

    if (action === 'confirm') {
      const paymentId = Number(req.body.payment_id);
      const orderId = text(req.body.order_id, 80);
      if (!Number.isInteger(paymentId) || paymentId < 1 || !orderId) return sendError(res, 'بيانات الدفع غير مكتملة');
      const payment = await db.findOne('payment_transactions', {
        id: paymentId, user_id: Number(req.user.id), status: 'pending',
      });
      if (!payment) return sendError(res, 'عملية الدفع غير موجودة أو عولجت مسبقاً', 404);
      const response = await geidea.getOrder(orderId);
      const order = response.order || response;
      const transaction = Array.isArray(order.transactions) ? order.transactions[0] || {} : {};
      const responseCode = String(transaction.responseCode || order.responseCode || '');
      const merchantReference = String(order.merchantReferenceId || order.merchantReference || '');
      const paidAmount = Number(order.amount ?? transaction.amount);
      const currency = String(order.currency || transaction.currency || '');
      const status = String(transaction.status || order.status || order.orderStatus || '').toLowerCase();
      const paid = responseCode === '000' &&
        ['paid', 'success', 'succeeded', 'completed'].includes(status) &&
        merchantReference === payment.merchant_reference_id &&
        Math.abs(paidAmount - Number(payment.amount)) < 0.01 &&
        currency.toUpperCase() === payment.currency;
      if (!paid) {
        await db.updateDoc('payment_transactions', { id: paymentId }, {
          status: 'verification_failed', geidea_order_id: orderId, response_code: responseCode,
          updated_at: new Date().toISOString(),
        });
        return sendError(res, 'لم تؤكد جيديا نجاح الدفع. لم يتم تفعيل الاشتراك.', 409);
      }
      const now = new Date();
      const currentExpiry = Date.parse(req.user.plan_expires_at || '');
      const startsAt = Number.isFinite(currentExpiry) && currentExpiry > now.getTime()
        ? new Date(currentExpiry) : now;
      startsAt.setMonth(startsAt.getMonth() + 1);
      const expiresAt = startsAt.toISOString();
      await db.updateDoc('payment_transactions', { id: paymentId }, {
        status: 'paid', geidea_order_id: orderId, response_code: responseCode,
        paid_at: now.toISOString(), updated_at: now.toISOString(),
      });
      await db.updateDoc('users', { id: Number(req.user.id) }, {
        plan: payment.plan, plan_expires_at: expiresAt,
        trial_plan: null, trial_ends_at: null,
      });
      return sendOk(res, { plan: payment.plan, expires_at: expiresAt }, 'تم تأكيد الدفع وتفعيل الاشتراك');
    }
    return sendError(res, 'إجراء غير معروف', 400);
  } catch (error) {
    return failFromError(res, error);
  }
});

module.exports = router;
