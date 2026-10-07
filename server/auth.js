'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { APP_ENV, PLANS, SESSION_LIFETIME } = require('./config');

const ROLE_VALUES = new Set(['admin', 'employee', 'client']);

function jsonError(res, message, status = 400, code) {
  const body = { success: false, error: message };
  if (code) body.code = code;
  return res.status(status).json(body);
}

function jsonOk(res, data = [], message = 'نجح الطلب') {
  return res.json({ success: true, message, data });
}

function safeUser(user) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.password_hash;
  safe.plan_info = PLANS[safe.plan] || PLANS.free;
  return safe;
}

function effectivePlan(user) {
  const plan = user?.plan || 'free';
  const expires = user?.plan_expires_at;
  if (plan === 'free' || !expires) return plan;
  const timestamp = Date.parse(expires);
  if (!Number.isFinite(timestamp) || timestamp < Date.now()) return 'free';
  return plan;
}

function planAllows(user, feature) {
  if (user?.role === 'admin') return true;
  const plan = PLANS[effectivePlan(user)];
  if (plan?.tool_limit && Array.isArray(user?.selected_tools)) {
    const toolMap = require('./tools');
    return user.selected_tools.slice(0, plan.tool_limit).some(slug => toolMap[slug]?.plan === feature);
  }
  const tools = PLANS[effectivePlan(user)]?.tools || [];
  return tools.includes(feature) || tools.includes('all');
}

async function canCreateQuote(user) {
  if (user?.role === 'admin') return true;
  const plan = PLANS[effectivePlan(user)] || PLANS.free;
  if (plan.max_quotes === -1) return true;
  const field = user?.role === 'client' ? 'client_id' : 'employee_id';
  const month = new Date().toISOString().slice(0, 7);
  const count = await db.count('quotes', {
    [field]: Number(user.id),
    created_at: { $regex: `^${month}` },
  });
  return count < Number(plan.max_quotes ?? PLANS.free.max_quotes);
}

async function currentUser(req) {
  const id = Number(req.session?.userId);
  if (!Number.isInteger(id) || id < 1) return null;
  return (await db.findOne('users', { id, is_active: 1 })) || null;
}

async function loadUser(req, res, next) {
  try {
    req.user = await currentUser(req);
    res.locals.user = req.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return jsonError(res, 'غير مصرح', 401, 'UNAUTHORIZED');
  return next();
}

function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.user) return jsonError(res, 'غير مصرح', 401, 'UNAUTHORIZED');
    if (!allowed.has(req.user.role)) return jsonError(res, 'غير مسموح', 403);
    return next();
  };
}

function csrfToken(req) {
  if (!req.session) throw new Error('جلسة المستخدم غير متاحة');
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session?.csrfToken;
  const supplied = req.get('X-CSRF-Token') || '';
  if (typeof expected !== 'string' || !expected || !supplied) {
    return jsonError(res, 'طلب غير صالح (CSRF)', 403, 'CSRF_INVALID');
  }
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !crypto.timingSafeEqual(expectedBytes, suppliedBytes)) {
    return jsonError(res, 'طلب غير صالح (CSRF)', 403, 'CSRF_INVALID');
  }
  return next();
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return reject(new Error('جلسة المستخدم غير متاحة'));
    const token = req.session.csrfToken;
    req.session.regenerate((error) => {
      if (error) return reject(error);
      if (token) req.session.csrfToken = token;
      resolve();
    });
  });
}

async function setAuthenticatedUser(req, userId) {
  await regenerateSession(req);
  req.session.userId = Number(userId);
}

async function login(email, password) {
  const user = await db.findOne('users', {
    email: String(email || '').trim().toLowerCase(),
    is_active: 1,
  });
  if (!user || !user.password_hash || typeof password !== 'string') return false;

  // PHP password_hash() produces the $2y$ bcrypt prefix; bcryptjs accepts $2a$.
  const hash = String(user.password_hash).replace(/^\$2y\$/, '$2a$');
  const matches = await bcrypt.compare(password, hash);
  return matches ? user : false;
}

async function register(name, email, password, req) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = typeof password === 'string' ? password : '';

  if (cleanName.length < 2) return { error: 'الاسم قصير جداً' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: 'البريد الإلكتروني غير صحيح' };
  if (cleanPassword.length < 8) return { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  if (await db.findOne('users', { email: cleanEmail })) return { error: 'البريد مسجل مسبقاً' };

  const passwordHash = await bcrypt.hash(cleanPassword, 10);
  const id = await db.insertDoc('users', {
    name: cleanName,
    email: cleanEmail,
    password_hash: passwordHash,
    role: 'client',
    plan: 'free',
    plan_expires_at: null,
    is_active: 1,
  });
  await setAuthenticatedUser(req, id);
  await db.insertDoc('activity_log', {
    user_id: Number(id),
    action: 'register',
    ip: req.ip || '',
  });
  return await db.findOne('users', { id: Number(id) });
}

async function logout(req) {
  const id = Number(req.session?.userId || 0);
  if (id) {
    await db.insertDoc('activity_log', { user_id: id, action: 'logout' });
  }
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve();
    req.session.destroy((error) => error ? reject(error) : resolve());
  });
}

module.exports = {
  APP_ENV,
  ROLE_VALUES,
  safeUser,
  effectivePlan,
  planAllows,
  canCreateQuote,
  currentUser,
  loadUser,
  requireAuth,
  requireRole,
  requireUser: requireAuth,
  requireAdmin: requireRole('admin'),
  csrfToken,
  verifyCsrf,
  csrfMiddleware: verifyCsrf,
  login,
  register,
  logout,
  setAuthenticatedUser,
  jsonError,
  jsonOk,
  SESSION_LIFETIME,
};