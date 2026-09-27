'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');
const auth = require('../auth');
const {
  actionOf, methodError, sendOk, sendError, failFromError, text,
} = require('./_helpers');

const router = express.Router();

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
      return sendOk(res, auth.safeUser(result), 'تم إنشاء الحساب بنجاح');
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