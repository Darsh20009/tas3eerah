'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const db = require('../db');
const config = require('../config');
const auth = require('../auth');
const mail = require('../email');
const notifications = require('../notification-email');
const phoneAuth = require('../whatsapp-auth');
const {
  actionOf, methodError, sendOk, sendError, failFromError, text,
} = require('./_helpers');

const router = express.Router();
const phoneCodeCooldowns = new Map();
const loginFailureWindows = new Map();
const EMAIL_AUTH_ACTIONS = new Set([
  'login', 'request_phone_link', 'verify_phone_email_link',
  'request_login_code', 'verify_login_code', 'register', 'resend_verification',
  'verify_email', 'forgot_password', 'validate_reset_code', 'reset_password',
]);

function loginFailureCount(key) {
  const now = Date.now();
  const entry = loginFailureWindows.get(key);
  if (!entry || entry.expiresAt <= now) {
    loginFailureWindows.delete(key);
    return 0;
  }
  return entry.count;
}

function recordLoginFailure(key) {
  const count = loginFailureCount(key);
  if (loginFailureWindows.size > 10_000) {
    for (const [storedKey, entry] of loginFailureWindows) {
      if (entry.expiresAt <= Date.now()) loginFailureWindows.delete(storedKey);
    }
    if (loginFailureWindows.size > 10_000) loginFailureWindows.delete(loginFailureWindows.keys().next().value);
  }
  loginFailureWindows.set(key, { count: count + 1, expiresAt: Date.now() + 15 * 60_000 });
}

function phoneCodeCooling(ip, phone) {
  const now = Date.now();
  for (const [key, sentAt] of phoneCodeCooldowns) {
    if (now - sentAt > 10 * 60_000) phoneCodeCooldowns.delete(key);
  }
  const key = `${ip || 'unknown'}:${phone}`;
  return now - Number(phoneCodeCooldowns.get(key) || 0) < 60_000;
}

async function sendCode(user, purpose) {
  const prefix = { verify: 'email_otp', reset: 'reset_otp', login: 'login_otp' }[purpose];
  if (!prefix) throw new Error('Unsupported email code purpose');
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
  const subject = {
    verify: 'رمز توثيق بريدك الإلكتروني',
    reset: 'رمز استعادة كلمة المرور',
    login: 'رمز تسجيل الدخول',
  }[purpose];
  const purposeText = {
    verify: 'توثيق بريدك الإلكتروني',
    reset: 'استعادة كلمة المرور',
    login: 'تسجيل الدخول',
  }[purpose];
  try {
    const settings = Object.fromEntries((await db.findAll('settings'))
      .filter(row => row.key).map(row => [row.key, row.value || '']));
    await mail.sendHtml(user.email, subject,
      mail.simpleMessage(`رمز ${purposeText}: ${code}\n\nينتهي الرمز خلال 10 دقائق. إذا لم تطلبه فتجاهل هذه الرسالة.`, subject),
      settings);
    return { sent: true };
  } catch (error) {
    await db.updateDoc('users', { id: Number(user.id) }, {
      [`${prefix}_hash`]: null, [`${prefix}_expires_at`]: null, [`${prefix}_sent_at`]: null,
    });
    console.error(`[${purpose} email failed]`, error.code || error.name || 'MAIL_ERROR');
    return { sent: false };
  }
}

async function checkCode(user, purpose, rawCode) {
  const prefix = { verify: 'email_otp', reset: 'reset_otp', login: 'login_otp' }[purpose];
  if (!prefix) return false;
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
    if (config.APP_ENV !== 'test' && EMAIL_AUTH_ACTIONS.has(action)) {
      return sendError(res, 'تسجيل الدخول وإدارة الحساب بالبريد غير متاحين. استخدم رقم الجوال.', 410, 'EMAIL_AUTH_DISABLED');
    }

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
      const accountKey = `account:${email.toLowerCase()}`;
      const ipKey = `ip:${req.ip || 'unknown'}`;
      if (loginFailureCount(accountKey) >= 8 || loginFailureCount(ipKey) >= 30) {
        return sendError(res, 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً.', 429, 'LOGIN_RATE_LIMITED');
      }
      const user = await auth.login(email, password);
      if (!user) {
        recordLoginFailure(accountKey);
        recordLoginFailure(ipKey);
        return sendError(res, 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
      }
      if (user.unverified) return sendError(res, 'تحقق من بريدك الإلكتروني برمز التوثيق قبل تسجيل الدخول', 403, 'EMAIL_NOT_VERIFIED');
      loginFailureWindows.delete(accountKey);
      await auth.setAuthenticatedUser(req, user.id);
      await db.insertDoc('activity_log', {
        user_id: Number(user.id),
        action: 'login',
        ip: req.ip || '',
      });
      return sendOk(res, auth.safeUser(user), 'تم تسجيل الدخول');
    }

    if (action === 'request_phone_code') {
      const phone = phoneAuth.normalizePhone(body.phone);
      const requestedPurpose = body.purpose === 'auto' ? 'auto' : body.purpose === 'signup' ? 'signup' : 'login';
      if (!phone) return sendError(res, 'أدخل رقم جوال دولياً صحيحاً');
      const user = await db.findOne('users', { phone, is_active: 1, phone_verified: 1 });
      const purpose = requestedPurpose === 'auto' ? (user ? 'login' : 'signup') : requestedPurpose;
      if (requestedPurpose === 'auto' && !user && await db.findOne('users', { phone, is_active: 1 })) {
        return sendError(res, 'هذا الرقم مسجل لكنه غير موثق. تواصل مع الدعم لإكمال التحقق.');
      }
      if (purpose === 'signup' && user) return sendError(res, 'هذا الرقم مرتبط بحساب. سجّل الدخول أو اربط حسابك الحالي.');
      if (purpose === 'login' && !user) {
        return sendOk(res, [], 'إذا كان الرقم مرتبطاً بحساب فسيصلك رمز الدخول.');
      }
      const previous = req.session.phoneChallenge;
      if (phoneCodeCooling(req.ip, phone) ||
          (previous?.phone === phone && Date.now() - Number(previous.sentAt || 0) < 60_000)) {
        return sendError(res, 'انتظر دقيقة قبل طلب رمز جديد', 429);
      }
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      try {
        const delivery = await phoneAuth.sendCode(phone, code, user?.name || '');
        console.info('[WhatsApp auth provider response]', JSON.stringify(delivery));
      } catch (error) {
        console.error('[WhatsApp auth delivery failed]', error.message || 'WHATSAPP_ERROR');
        return sendError(res, 'تعذر إرسال الرمز عبر WhatsApp. حاول لاحقاً.', 502);
      }
      phoneCodeCooldowns.set(`${req.ip || 'unknown'}:${phone}`, Date.now());
      req.session.phoneChallenge = {
        phone, purpose, userId: user ? Number(user.id) : null,
        hash: phoneAuth.hashCode(code), expiresAt: Date.now() + 10 * 60_000,
        sentAt: Date.now(), attempts: 0,
      };
      return sendOk(res, [], 'قبل مزود WhatsApp طلب الإرسال، لكن وصول الرمز إلى هاتفك غير مؤكد.');
    }

    if (action === 'request_phone_link') {
      const phone = phoneAuth.normalizePhone(body.phone);
      const email = text(body.email, 254).toLowerCase();
      const user = req.user || await auth.login(email, typeof body.password === 'string' ? body.password : '');
      if (!phone || !user || user.unverified || user.email_verified !== 1) {
        return sendError(res, 'تعذر التحقق من الحساب أو رقم الجوال', 401);
      }
      const owner = await db.findOne('users', { phone, is_active: 1 });
      if (owner && Number(owner.id) !== Number(user.id)) return sendError(res, 'رقم الجوال مرتبط بحساب آخر');
      if (phoneCodeCooling(req.ip, phone)) return sendError(res, 'انتظر دقيقة قبل طلب رمز جديد', 429);
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      try {
        const delivery = await phoneAuth.sendCode(phone, code, user.name);
        console.info('[WhatsApp link provider response]', JSON.stringify(delivery));
      } catch (error) {
        console.error('[WhatsApp link delivery failed]', error.message || 'WHATSAPP_ERROR');
        return sendError(res, 'تعذر إرسال الرمز عبر WhatsApp. حاول لاحقاً.', 502);
      }
      phoneCodeCooldowns.set(`${req.ip || 'unknown'}:${phone}`, Date.now());
      req.session.phoneChallenge = {
        phone, purpose: 'link', userId: Number(user.id),
        hash: phoneAuth.hashCode(code), expiresAt: Date.now() + 10 * 60_000,
        sentAt: Date.now(), attempts: 0,
      };
      return sendOk(res, [], 'قبل مزود WhatsApp طلب الإرسال، لكن وصول رمز الربط إلى هاتفك غير مؤكد.');
    }

    if (action === 'verify_phone_code') {
      const phone = phoneAuth.normalizePhone(body.phone);
      const challenge = req.session.phoneChallenge;
      const supplied = phoneAuth.hashCode(String(body.code || '').trim());
      if (!challenge || challenge.phone !== phone || challenge.expiresAt <= Date.now() ||
          challenge.attempts >= 5 || !/^\d{6}$/.test(String(body.code || '').trim())) {
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      const expected = Buffer.from(challenge.hash, 'hex');
      const actual = Buffer.from(supplied, 'hex');
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        challenge.attempts += 1;
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      if (challenge.purpose === 'signup') {
        req.session.phoneSignupVerified = { phone, verifiedAt: Date.now() };
        req.session.phoneChallenge = null;
        return sendOk(res, { flow: 'signup' }, 'تم التحقق من الرقم. أكمل اسمك لإنشاء الحساب.');
      }
      const user = await db.findOne('users', {
        id: Number(challenge.userId), is_active: 1,
      });
      if (!user) return sendError(res, 'الحساب غير موجود', 404);
      if (challenge.purpose === 'link') {
        const owner = await db.findOne('users', { phone, is_active: 1 });
        if (owner && Number(owner.id) !== Number(user.id)) return sendError(res, 'رقم الجوال مرتبط بحساب آخر');
        await db.updateDoc('users', { id: Number(user.id) }, { phone, phone_verified: 1 });
      } else if (user.phone !== phone || user.phone_verified !== 1) {
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      req.session.phoneChallenge = null;
      await auth.setAuthenticatedUser(req, user.id);
      await db.insertDoc('activity_log', { user_id: Number(user.id), action: 'login', ip: req.ip || '' });
      return sendOk(res, auth.safeUser({ ...user, phone, phone_verified: 1 }), 'تم تسجيل الدخول');
    }

    if (action === 'complete_phone_signup') {
      const pending = req.session.phoneSignupVerified;
      if (!pending || Date.now() - pending.verifiedAt > 10 * 60_000) {
        return sendError(res, 'انتهت صلاحية التحقق. اطلب رمزاً جديداً.');
      }
      const name = text(body.name, 120);
      if (name.length < 2) return sendError(res, 'الاسم قصير جداً');
      if (await db.findOne('users', { phone: pending.phone })) return sendError(res, 'الرقم مرتبط بحساب آخر');
      const newUser = {
        name, password_hash: null,
        phone: pending.phone, phone_verified: 1, role: 'client', plan: 'free',
        is_active: 1, email_verified: 0,
      };
      const id = await db.insertDoc('users', newUser);
      const user = await db.findOne('users', { id: Number(id) });
      req.session.phoneSignupVerified = null;
      await auth.setAuthenticatedUser(req, id);
      await db.insertDoc('activity_log', { user_id: Number(id), action: 'register', ip: req.ip || '' });
      return sendOk(res, auth.safeUser(user), 'تم إنشاء الحساب برقم الجوال.');
    }

    if (action === 'verify_phone_email_link') {
      const pending = req.session.phoneEmailLinkPending;
      const email = text(body.email, 254).toLowerCase();
      if (!pending || pending.email !== email || pending.expiresAt <= Date.now()) {
        return sendError(res, 'انتهت صلاحية الربط. تحقق من رقم الجوال مجدداً.');
      }
      const user = await db.findOne('users', { id: pending.userId, is_active: 1 });
      if (!user || !(await checkCode(user, pending.purpose, body.code))) {
        return sendError(res, 'رمز البريد غير صحيح أو منتهي الصلاحية');
      }
      const owner = await db.findOne('users', { phone: pending.phone, is_active: 1 });
      if (owner && Number(owner.id) !== Number(user.id)) return sendError(res, 'رقم الجوال مرتبط بحساب آخر');
      const emailCodePrefix = pending.purpose === 'verify' ? 'email_otp' : 'login_otp';
      const update = {
        phone: pending.phone, phone_verified: 1,
        [`${emailCodePrefix}_hash`]: null, [`${emailCodePrefix}_expires_at`]: null,
        [`${emailCodePrefix}_attempts`]: 0,
      };
      if (pending.purpose === 'verify') update.email_verified = 1;
      await db.updateDoc('users', { id: Number(user.id) }, update);
      req.session.phoneEmailLinkPending = null;
      await auth.setAuthenticatedUser(req, user.id);
      await db.insertDoc('activity_log', { user_id: Number(user.id), action: 'phone_link', ip: req.ip || '' });
      return sendOk(res, auth.safeUser({ ...user, phone: pending.phone, phone_verified: 1, email_verified: 1 }),
        'تم ربط رقم الجوال بالحساب');
    }

    if (action === 'request_login_code') {
      const email = text(body.email, 254).toLowerCase();
      const user = await db.findOne('users', { email, is_active: 1 });
      if (!user) {
        return sendOk(res, [], 'إذا كان البريد مرتبطاً بحساب فسيصلك رمز تسجيل الدخول.');
      }
      if (user.email_verified !== 1) {
        const delivery = await sendCode(user, 'verify');
        if (delivery.cooldown) return sendError(res, 'انتظر دقيقة قبل طلب رمز جديد', 429);
        if (!delivery.sent) return sendError(res, 'تعذر إرسال رمز التوثيق. حاول لاحقاً.', 502);
        return sendError(res, 'تحقق من بريدك الإلكتروني أولاً. أرسلنا رمز التوثيق.', 403, 'EMAIL_NOT_VERIFIED');
      }
      const delivery = await sendCode(user, 'login');
      if (delivery.cooldown) return sendError(res, 'انتظر دقيقة قبل طلب رمز جديد', 429);
      if (!delivery.sent) return sendError(res, 'تعذر إرسال رمز تسجيل الدخول. حاول لاحقاً.', 502);
      return sendOk(res, [], 'إذا كان البريد مرتبطاً بحساب فسيصلك رمز تسجيل الدخول.');
    }

    if (action === 'verify_login_code') {
      const email = text(body.email, 254).toLowerCase();
      const user = await db.findOne('users', { email, is_active: 1, email_verified: 1 });
      if (!user || !(await checkCode(user, 'login', body.code))) {
        return sendError(res, 'الرمز غير صحيح أو منتهي الصلاحية');
      }
      await db.updateDoc('users', { id: Number(user.id) }, {
        login_otp_hash: null, login_otp_expires_at: null, login_otp_attempts: 0,
      });
      await auth.setAuthenticatedUser(req, user.id);
      await db.insertDoc('activity_log', {
        user_id: Number(user.id), action: 'login', ip: req.ip || '',
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
      await db.sessionDestroyUser(user.id);
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
      if (update.password_hash) await db.sessionDestroyUser(req.user.id, req.sessionID);
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