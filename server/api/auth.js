'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const db = require('../db');
const config = require('../config');
const auth = require('../auth');
const mail = require('../email');
const notifications = require('../notification-email');
const {
  actionOf, methodError, sendOk, sendError, failFromError, text,
} = require('./_helpers');

const router = express.Router();

async function sendCode(user, purpose) {
  const prefix = purpose === 'verify' ? 'email_otp' : 'reset_otp';
  const sentAt = Date.parse(user[`${prefix}_sent_at`] || '');
  if (Number.isFinite(sentAt) && Date.now() - sentAt < 60_000) {
    return { sent: false, cooldown: true };
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60_000).toISOString();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  await db.updateDoc('users', { id: Number(user.id) }, {
    [`${prefix}_hash`]: hash,
    [`${prefix}_expires_at`]: expires,
    [`${prefix}_attempts`]: 0,
    [`${prefix}_sent_at`]: now.toISOString(),
  });
  const subject = purpose === 'verify' ? 'رمز توثيق بريدك الإلكتروني' : 'رمز استعادة كلمة المرور';
  const purposeText = purpose === 'verify' ? 'توثيق بريدك الإلكتروني' : 'استعادة كلمة المرور';
  try {
    const settings = Object.fromEntries((await db.findAll('settings'))
      .filter(row => row.key).map(row => [row.key, row.value || '']));
    await mail.sendHtml(user.email, subject,
      mail.simpleMessage(`رمز ${purposeText}: ${code}\n\nينتهي الرمز خلال 10 دقائق. إذا لم تطلبه فتجاهل هذه الرسالة.`, subject),
      settings);
    return { sent: true };
  } catch (error) {
    await db.updateDoc('users', { id: Number(user.id) }, {
      [`${prefix}_hash`]: null, [`${prefix}_expires_at`]: null,
    });
    console.error(`[${purpose} email failed]`, error.code || error.name || 'MAIL_ERROR');
    return { sent: false };
  }
}

async function checkCode(user, purpose, rawCode) {
  const prefix = purpose === 'verify' ? 'email_otp' : 'reset_otp';
  const code = String(rawCode || '').trim();
  const expiresAt = Date.parse(user[`${prefix}_expires_at`] || '');
  if (!/^\d{6}$/.test(code) || !user[`${prefix}_hash`] ||
      !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const attempts = Number(user[`${prefix}_attempts`] || 0);
  if (attempts >= 5) return false;
  const supplied = crypto.createHash('sha256').update(code).digest();
  const expected = Buffer.from(user[`${prefix}_hash`], 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    await db.updateDoc('users', { id: Number(user.id) }, { [`${prefix}_attempts`]: attempts + 1 });
    return false;
  }
  return true;
}

router.use(auth.loadUser);
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

router.all('/', async (req, res) => {
  const action = actionOf(req);
  const isRead = req.method === 'GET';
  const body = req.body || {};

  try {
    if (action === 'csrf') {
      if (!isRead) return methodError(res);
      const token = auth.csrfToken(req);
      const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
      const sessionLifetime = Number(config.SESSION_LIFETIME) || 30 * 24 * 60 * 60;
      res.cookie('TAS3_CSRF', token, {
        httpOnly: false,
        secure: req.secure || forwardedProto === 'https',
        sameSite: 'lax',
        path: '/',
        maxAge: sessionLifetime < 1000000000 ? sessionLifetime * 1000 : sessionLifetime,
      });
      return sendOk(res, { csrf_token: token });
    }

    if (action === 'me') {
      if (!isRead) return methodError(res);
      if (!req.user) return sendError(res, 'غير مسجل', 401, 'UNAUTHORIZED');
      return sendOk(res, auth.safeUser(req.user));
    }

    if (isRead) return methodError(res);
    if (action === 'login') {
      const email = text(body.email, 254);
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) return sendError(res, 'يرجى إدخال البريد وكلمة المرور');
      const user = await auth.login(email, password);
      if (!user) return sendError(res, 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
      if (user.unverified) return sendError(res, 'تحقق من بريدك الإلكتروني برمز التوثيق قبل تسجيل الدخول', 403, 'EMAIL_NOT_VERIFIED');
      await auth.setAuthenticatedUser(req, user.id);
      await db.insertDoc('activity_log', {
        user_id: Number(user.id),
        action: 'login',
        ip: req.ip || '',
      });
      return sendOk(res, auth.safeUser(user), 'تم تسجيل الدخول');
    }

    if (action === 'register') {
      const result = await auth.register(body.name, body.email, body.password, req);
      if (result?.error) return sendError(res, result.error);
      const delivery = await sendCode(result, 'verify');
      return sendOk(res, { email: result.email, email_sent: delivery.sent },
        delivery.sent ? 'أُنشئ الحساب. أدخل رمز التوثيق المرسل إلى بريدك.'
          : 'أُنشئ الحساب لكن تعذر إرسال الرمز. أعد الإرسال بعد التحقق من إعداد البريد.');
    }

    if (action === 'resend_verification') {
      const email = text(body.email, 254).toLowerCase();
      const user = await db.findOne('users', { email });
      if (user && user.email_verified !== 1) {
        const delivery = await sendCode(user, 'verify');
        if (delivery.cooldown) return sendError(res, 'انتظر دقيقة قبل طلب رمز جديد', 429);
        if (!delivery.sent) return sendError(res, 'تعذر إرسال الرمز. حاول لاحقاً.', 502);
      }
      return sendOk(res, [], 'إذا كان البريد مسجلاً وغير موثق فسيصلك رمز التوثيق.');
    }

    if (action === 'verify_email') {
      const email = text(body.email, 254).toLowerCase();
      const user = await db.findOne('users', { email });
      if (!user || user.email_verified === 1 || !(await checkCode(user, 'verify', body.code))) {
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      await db.updateDoc('users', { id: Number(user.id) }, {
        email_verified: 1, email_otp_hash: null, email_otp_expires_at: null,
      });
      await auth.setAuthenticatedUser(req, user.id);
      await notifications.welcome(user);
      return sendOk(res, auth.safeUser({ ...user, email_verified: 1 }), 'تم توثيق البريد وتسجيل الدخول');
    }

    if (action === 'forgot_password') {
      const email = text(body.email, 254).toLowerCase();
      const user = await db.findOne('users', { email, is_active: 1 });
      if (user) {
        const delivery = await sendCode(user, 'reset');
        if (delivery.cooldown) return sendError(res, 'انتظر دقيقة قبل طلب رمز جديد', 429);
        if (!delivery.sent) return sendError(res, 'تعذر إرسال رمز الاستعادة. حاول لاحقاً.', 502);
      }
      return sendOk(res, [], 'إذا كان البريد مرتبطاً بحساب فعال فسيصلك رمز استعادة.');
    }

    if (action === 'validate_reset_code') {
      const email = text(body.email, 254).toLowerCase();
      const user = await db.findOne('users', { email, is_active: 1 });
      if (!user || !(await checkCode(user, 'reset', body.code))) {
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      return sendOk(res, [], 'تم التحقق من الرمز');
    }

    if (action === 'reset_password') {
      const email = text(body.email, 254).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      const user = await db.findOne('users', { email, is_active: 1 });
      if (password.length < 8) return sendError(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      if (!user || !(await checkCode(user, 'reset', body.code))) {
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      await db.updateDoc('users', { id: Number(user.id) }, {
        password_hash: await bcrypt.hash(password, 10),
        reset_otp_hash: null, reset_otp_expires_at: null,
      });
      return sendOk(res, [], 'تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.');
    }

    if (action === 'logout') {
      await auth.logout(req);
      res.clearCookie('TAS3_SESS', {
        httpOnly: true,
        secure: req.secure || String(req.get('x-forwarded-proto') || '').split(',')[0].trim() === 'https',
        sameSite: 'lax',
        path: '/',
      });
      return sendOk(res, [], 'تم تسجيل الخروج');
    }

    if (action === 'demo') {
      if (config.APP_ENV === 'production') {
        return sendError(res, 'تسجيل الدخول التجريبي غير متاح', 404);
      }
      const demoAccounts = {
        admin: ['admin@tas3eerah.com', 'Admin@2025'],
        employee: ['employee@tas3eerah.com', 'Demo@2025'],
        client: ['client@tas3eerah.com', 'Demo@2025'],
      };
      const role = ROLE_FOR_DEMO(body.role);
      const [email, password] = demoAccounts[role];
      const user = await auth.login(email, password);
      if (!user) {
        return sendError(res, 'حساب التجربة غير متاح — تأكد من تشغيل النظام في بيئة التطوير', 401);
      }
      await auth.setAuthenticatedUser(req, user.id);
      await db.insertDoc('activity_log', {
        user_id: Number(user.id),
        action: 'login',
        ip: req.ip || '',
      });
      return sendOk(res, auth.safeUser(user), `تم تسجيل الدخول كـ ${user.role}`);
    }

    if (action === 'update_account') {
      if (!req.user) return sendError(res, 'غير مسجل', 401, 'UNAUTHORIZED');
      const name = text(body.name, 120);
      if (!name) return sendError(res, 'الاسم مطلوب');
      const update = { name };
      if (body.password) {
        if (typeof body.password !== 'string' || body.password.length < 8) {
          return sendError(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        }
        update.password_hash = await bcrypt.hash(body.password, 10);
      }
      await db.updateDoc('users', { id: Number(req.user.id) }, update);
      const updated = await db.findOne('users', { id: Number(req.user.id) });
      return sendOk(res, auth.safeUser(updated), 'تم تحديث البيانات');
    }

    return sendError(res, 'إجراء غير معروف', 400);
  } catch (error) {
    return failFromError(res, error);
  }
});

function ROLE_FOR_DEMO(value) {
  const role = String(value || 'client');
  return ['admin', 'employee', 'client'].includes(role) ? role : 'client';
}

module.exports = router;