'use strict';

const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { PLANS } = require('../config');
const auth = require('../auth');
const mail = require('../email');
const {
  actionOf, methodError, sendOk, sendError, failFromError, text, number,
  timestamp, escapeHtml,
} = require('./_helpers');

const router = express.Router();
const GET_ACTIONS = new Set([
  'stats', 'users', 'all_quotes', 'activity_log', 'plan_settings',
  'contact_messages', 'mailbox_status', 'mailbox_inbox', 'mailbox_folders',
  'get_settings',
]);

router.use(auth.loadUser, auth.requireAdmin);
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

router.all('/', async (req, res) => {
  const action = actionOf(req);
  const body = req.body || {};
  if (GET_ACTIONS.has(action) !== (req.method === 'GET')) return methodError(res);
  try {
    switch (action) {
      case 'stats': return await stats(res);
      case 'users': return await users(req, res);
      case 'user_create': return await userCreate(req, res, body);
      case 'user_update': return await userUpdate(req, res, body);
      case 'user_toggle': return await userToggle(req, res, body);
      case 'user_delete': return await userDelete(req, res, body);
      case 'set_plan': return await setPlan(req, res, body);
      case 'all_quotes': return await allQuotes(req, res);
      case 'activity_log': return await activityLog(req, res);
      case 'plan_settings': return sendOk(res, PLANS);
      case 'contact_messages': return await contactMessages(res);
      case 'contact_mark_read': return await contactMarkRead(res, body);
      case 'contact_delete': return await contactDelete(res, body);
      case 'mailbox_status': return sendOk(res, mail.publicConfig(await settingsMap()));
      case 'mailbox_inbox': return await mailboxFolder(res, { folder: 'inbox' });
      case 'mailbox_folder': return await mailboxFolder(res, body);
      case 'mailbox_folders': return await mailboxFolders(res);
      case 'mailbox_mark_read': return await mailboxMarkRead(res, body);
      case 'mailbox_move': return await mailboxMove(res, body);
      case 'mailbox_delete': return await mailboxDelete(res, body);
      case 'mailbox_save_draft': return await mailboxSaveDraft(res, body);
      case 'mailbox_send': return await mailboxSend(res, body);
      case 'get_settings': return await getSettings(res);
      case 'save_settings': return await saveSettings(req, res, body);
      default: return sendError(res, 'إجراء غير معروف', 400);
    }
  } catch (error) {
    return failFromError(res, error);
  }
});

async function ratingStats() {
  const ratings = await db.findAll('quote_ratings');
  const sum = ratings.reduce((total, row) => total + Number(row.rating || 0), 0);
  return { average: ratings.length ? sum / ratings.length : 0, count: ratings.length };
}

async function stats(res) {
  const month = new Date().toISOString().slice(0, 7);
  const rating = await ratingStats();
  return sendOk(res, {
    users_total: await db.count('users'),
    users_active: await db.count('users', { is_active: 1 }),
    clients: await db.count('users', { role: 'client' }),
    employees: await db.count('users', { role: 'employee' }),
    quotes_total: await db.count('quotes'),
    quotes_month: await db.count('quotes', { created_at: { $regex: `^${month}` } }),
    messages_total: await db.count('messages'),
    plan_free: await db.count('users', { plan: 'free' }),
    plan_plus: await db.count('users', { plan: 'plus' }),
    plan_pro: await db.count('users', { plan: 'pro' }),
    rating_average: rating.average,
    rating_count: rating.count,
  });
}

async function users(req, res) {
  const filter = {};
  const query = text(req.query.q, 160);
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }
  if (req.query.role) filter.role = text(req.query.role, 40);
  if (req.query.plan) filter.plan = text(req.query.plan, 40);
  const results = await db.findAll('users', filter, {
    sort: { created_at: -1 },
    projection: {
      id: 1, name: 1, email: 1, role: 1, plan: 1,
      plan_expires_at: 1, is_active: 1, created_at: 1,
    },
  });
  return sendOk(res, results);
}

async function userCreate(req, res, body) {
  const name = text(body.name, 120);
  const email = text(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const role = text(body.role || 'client', 40);
  const plan = text(body.plan || 'free', 40);
  if (!name || !email) return sendError(res, 'الاسم والبريد مطلوبان');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'البريد الإلكتروني غير صحيح');
  if (await db.findOne('users', { email })) return sendError(res, 'البريد مسجل مسبقاً');
  if (!auth.ROLE_VALUES.has(role)) return sendError(res, 'دور غير صحيح');
  if (!Object.hasOwn(PLANS, plan)) return sendError(res, 'خطة غير صحيحة');
  if (password && password.length < 8) return sendError(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  const initialPassword = password || crypto.randomBytes(12).toString('base64url');
  const id = await db.insertDoc('users', {
    name,
    email,
    password_hash: await bcrypt.hash(initialPassword, 10),
    role,
    plan,
    plan_expires_at: null,
    is_active: 1,
  });
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: 'admin_user_create',
    details: `مستخدم جديد: ${email}`,
  });
  return sendOk(
    res,
    { id },
    password ? 'تم إنشاء المستخدم' : `تم إنشاء المستخدم. كلمة المرور المؤقتة: ${initialPassword}`,
  );
}

async function userUpdate(req, res, body) {
  const id = number(body.id);
  const name = text(body.name, 120);
  const role = text(body.role, 40);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!Number.isInteger(id) || id < 1) return sendError(res, 'معرف المستخدم مطلوب');
  const user = await db.findOne('users', { id });
  if (!user) return sendError(res, 'المستخدم غير موجود', 404);
  if (role && !auth.ROLE_VALUES.has(role)) return sendError(res, 'دور غير صحيح');
  if (role && role !== 'admin' && user.role === 'admin') {
    if (await db.count('users', { role: 'admin', is_active: 1 }) <= 1) {
      return sendError(res, 'لا يمكن تغيير دور المدير الوحيد في النظام');
    }
  }
  if (password && password.length < 8) return sendError(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  const update = {};
  if (name) update.name = name;
  if (role) update.role = role;
  if (password) update.password_hash = await bcrypt.hash(password, 10);
  if (Object.keys(update).length) await db.updateDoc('users', { id }, update);
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: 'admin_user_update',
    details: `مستخدم: ${id}`,
  });
  return sendOk(res, [], 'تم التحديث');
}

async function userToggle(req, res, body) {
  const id = number(body.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 'معرف مطلوب');
  if (id === Number(req.user.id)) return sendError(res, 'لا يمكنك تعطيل حسابك');
  const user = await db.findOne('users', { id });
  if (!user) return sendError(res, 'غير موجود', 404);
  const isActive = Number(user.is_active) ? 0 : 1;
  await db.updateDoc('users', { id }, { is_active: isActive });
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: isActive ? 'user_activated' : 'user_deactivated',
    details: `مستخدم: ${id}`,
  });
  return sendOk(res, { is_active: isActive }, isActive ? 'تم التفعيل' : 'تم التعطيل');
}

async function userDelete(req, res, body) {
  const id = number(body.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 'معرف مطلوب');
  if (id === Number(req.user.id)) return sendError(res, 'لا يمكنك حذف حسابك');
  const user = await db.findOne('users', { id });
  if (!user) return sendError(res, 'المستخدم غير موجود', 404);
  if (user.role === 'admin' && await db.count('users', { role: 'admin', is_active: 1 }) <= 1) {
    return sendError(res, 'لا يمكن حذف المدير الأخير في النظام', 409);
  }
  const quoteCount = await db.count('quotes', {
    $or: [{ employee_id: id }, { client_id: id }],
  });
  if (quoteCount > 0) {
    return sendError(res, `لا يمكن حذف المستخدم لأن لديه ${quoteCount} عرض/عروض أسعار. قم بتعطيل الحساب عوضاً عن ذلك.`, 409);
  }
  await db.deleteDoc('messages', { $or: [{ sender_id: id }, { receiver_id: id }] });
  await db.deleteDoc('activity_log', { user_id: id });
  await db.deleteDoc('users', { id });
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: 'admin_user_delete',
    details: `حذف: ${user.email}`,
  });
  return sendOk(res, [], 'تم حذف المستخدم');
}

async function setPlan(req, res, body) {
  const id = number(body.id);
  const plan = text(body.plan, 40);
  const expiresAt = body.expires_at || null;
  if (!id || !plan) return sendError(res, 'البيانات ناقصة');
  if (!Object.hasOwn(PLANS, plan)) return sendError(res, 'خطة غير صحيحة');
  if (!(await db.findOne('users', { id }))) return sendError(res, 'المستخدم غير موجود', 404);
  await db.updateDoc('users', { id }, { plan, plan_expires_at: expiresAt });
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: 'plan_changed',
    details: `مستخدم ${id} → خطة ${plan}`,
  });
  return sendOk(res, [], 'تم تغيير الخطة');
}

async function allQuotes(req, res) {
  const filter = req.query.status ? { status: text(req.query.status, 40) } : {};
  let quotes = await db.findAll('quotes', filter, { sort: { created_at: -1 }, limit: 200 });
  const userIds = [...new Set(quotes.flatMap((quote) => [Number(quote.client_id || 0), Number(quote.employee_id || 0)]).filter((id) => id > 0))];
  const users = userIds.length
    ? await db.findAll('users', { id: { $in: userIds } }, { projection: { id: 1, name: 1 } })
    : [];
  const names = new Map(users.map((user) => [Number(user.id), user.name]));
  const ratings = quotes.length ? await db.findAll('quote_ratings', { quote_id: { $in: quotes.map((q) => Number(q.id)) } }) : [];
  const ratingMap = new Map();
  for (const rating of ratings) {
    const group = ratingMap.get(Number(rating.quote_id)) || [];
    group.push(Number(rating.rating || 0));
    ratingMap.set(Number(rating.quote_id), group);
  }
  quotes = quotes.map((quote) => {
    const quoteRatings = ratingMap.get(Number(quote.id)) || [];
    return {
      ...quote,
      client_name: names.get(Number(quote.client_id)) || null,
      employee_name: names.get(Number(quote.employee_id)) || null,
      rating_average: quoteRatings.length ? quoteRatings.reduce((sum, value) => sum + value, 0) / quoteRatings.length : 0,
      rating_count: quoteRatings.length,
    };
  });
  return sendOk(res, quotes);
}

async function activityLog(req, res) {
  const limit = Math.max(1, Math.min(200, Math.floor(number(req.query.limit, 50))));
  const logs = await db.findAll('activity_log', {}, { sort: { created_at: -1 }, limit });
  const ids = [...new Set(logs.map((log) => Number(log.user_id || 0)).filter((id) => id > 0))];
  const users = ids.length ? await db.findAll('users', { id: { $in: ids } }, { projection: { id: 1, name: 1, role: 1 } }) : [];
  const byId = new Map(users.map((user) => [Number(user.id), user]));
  return sendOk(res, logs.map((log) => ({
    ...log,
    user_name: byId.get(Number(log.user_id))?.name || null,
    user_role: byId.get(Number(log.user_id))?.role || null,
  })));
}

async function contactMessages(res) {
  return sendOk(res, await db.findAll('contact_messages', {}, { sort: { created_at: -1 }, limit: 200 }));
}

async function contactMarkRead(res, body) {
  const id = number(body.id);
  if (!id) return sendError(res, 'معرف مطلوب');
  await db.updateDoc('contact_messages', { id }, { is_read: 1 });
  return sendOk(res, [], 'تم التحديث');
}

async function contactDelete(res, body) {
  const id = number(body.id);
  if (!id) return sendError(res, 'معرف مطلوب');
  await db.deleteDoc('contact_messages', { id });
  return sendOk(res, [], 'تم الحذف');
}

async function settingsMap() {
  const rows = await db.findAll('settings');
  return Object.fromEntries(rows.filter((row) => row.key).map((row) => [row.key, row.value || '']));
}

async function mailboxFolder(res, body) {
  const settings = await settingsMap();
  const folder = text(body.folder || 'inbox', 40).toLowerCase();
  try {
    return sendOk(res, {
      messages: await mail.folderMessages(folder, settings, 60),
      folders: await mail.folders(settings),
      folder,
      mailbox: mail.publicConfig(settings),
    });
  } catch (error) {
    console.error('[mailbox read failed]', error.code || error.name || 'MAIL_ERROR');
    return sendError(res, 'تعذر الاتصال بصندوق البريد. تحقق من الإعدادات وحاول مرة أخرى.', 502);
  }
}

async function mailboxFolders(res) {
  const settings = await settingsMap();
  try {
    return sendOk(res, {
      folders: await mail.folders(settings),
      mailbox: mail.publicConfig(settings),
    });
  } catch {
    return sendError(res, 'تعذر الاتصال بصندوق البريد. تحقق من الإعدادات وحاول مرة أخرى.', 502);
  }
}

async function mailboxMarkRead(res, body) {
  try {
    await mail.markFolderRead(number(body.uid), text(body.folder || 'inbox', 40).toLowerCase(), await settingsMap());
    return sendOk(res, [], 'تم تعليم الرسالة كمقروءة');
  } catch {
    return sendError(res, 'تعذر تحديث حالة الرسالة في صندوق البريد', 502);
  }
}

async function mailboxMove(res, body) {
  try {
    await mail.move(
      number(body.uid),
      text(body.from || 'inbox', 40).toLowerCase(),
      text(body.to || 'trash', 40).toLowerCase(),
      await settingsMap(),
    );
    return sendOk(res, [], 'تم نقل الرسالة');
  } catch {
    return sendError(res, 'تعذر نقل الرسالة في صندوق البريد', 502);
  }
}

async function mailboxDelete(res, body) {
  try {
    await mail.delete(number(body.uid), text(body.folder || 'inbox', 40).toLowerCase(), await settingsMap());
    return sendOk(res, [], 'تم حذف الرسالة');
  } catch {
    return sendError(res, 'تعذر حذف الرسالة من صندوق البريد', 502);
  }
}

async function mailboxSaveDraft(res, body) {
  const to = text(body.to, 254);
  const subject = text(body.subject, 500);
  const message = text(body.message, 20000);
  if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return sendError(res, 'البريد المستلم غير صحيح');
  if (!subject && !message) return sendError(res, 'أدخل موضوعاً أو نصاً قبل حفظ المسودة');
  try {
    await mail.saveDraft(to, subject || '(بدون موضوع)', mail.simpleMessage(message || '(مسودة فارغة)', subject || '(بدون موضوع)'), await settingsMap());
    return sendOk(res, [], 'تم حفظ المسودة');
  } catch {
    return sendError(res, 'تعذر حفظ المسودة. تحقق من إعدادات صندوق البريد.', 502);
  }
}

async function mailboxSend(res, body) {
  const to = text(body.to, 254);
  const subject = text(body.subject, 500);
  const message = text(body.message, 20000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return sendError(res, 'البريد المستلم غير صحيح');
  if (!subject) return sendError(res, 'موضوع الرسالة مطلوب');
  if (!message) return sendError(res, 'نص الرسالة مطلوب');
  try {
    await mail.sendHtml(to, subject, mail.simpleMessage(message, subject), await settingsMap());
    return sendOk(res, [], 'تم إرسال الرسالة من صندوق البريد');
  } catch {
    return sendError(res, 'تعذر إرسال البريد. تحقق من إعدادات صندوق البريد وحاول مرة أخرى.', 502);
  }
}

async function getSettings(res) {
  const map = await settingsMap();
  return sendOk(res, map);
}

async function upsertSetting(key, value) {
  const existing = await db.findOne('settings', { key });
  if (existing) await db.updateDoc('settings', { key }, { value });
  else await db.insertDoc('settings', { key, value });
}

async function saveSettings(req, res, body) {
  const allowed = [
    'contact_email', 'whatsapp', 'site_name', 'welcome_message',
    'mailbox_email', 'mailbox_receive_email', 'mailbox_name',
  ];
  for (const key of allowed) {
    if (Object.hasOwn(body, key)) await upsertSetting(key, text(body[key], 1000));
  }
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: 'settings_saved',
    details: 'تعديل إعدادات النظام',
  });
  return sendOk(res, [], 'تم حفظ الإعدادات');
}

module.exports = router;