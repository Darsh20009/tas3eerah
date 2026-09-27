'use strict';

const express = require('express');
const db = require('../db');
const { PLANS } = require('../config');
const auth = require('../auth');
const {
  actionOf, methodError, sendOk, sendError, failFromError, text, number, timestamp,
} = require('./_helpers');

const router = express.Router();
router.use(auth.loadUser, auth.requireUser);
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

router.all('/', async (req, res) => {
  const action = actionOf(req);
  const body = req.body || {};
  const getActions = new Set(['inbox', 'thread', 'contacts', 'unread_count']);
  if (getActions.has(action) !== (req.method === 'GET')) return methodError(res);

  try {
    switch (action) {
      case 'inbox':
        return await inbox(req, res);
      case 'thread':
        return await thread(req, res, number(body.id ?? req.query.id));
      case 'send':
        return await sendMessage(req, res, body);
      case 'upgrade_request':
        return await upgradeRequest(req, res, body);
      case 'read':
        return await markRead(req, res, body);
      case 'contacts':
        return await contacts(req, res);
      case 'unread_count':
        return await unreadCount(req, res);
      default:
        return sendError(res, 'إجراء غير معروف', 400);
    }
  } catch (error) {
    return failFromError(res, error);
  }
});

async function addNames(messages, fields) {
  const ids = [...new Set(messages.flatMap((message) => fields.map((field) => Number(message[field] || 0)).filter((id) => id > 0)))];
  const users = ids.length ? await db.findAll('users', { id: { $in: ids } }, { projection: { id: 1, name: 1 } }) : [];
  const names = new Map(users.map((user) => [Number(user.id), user.name]));
  return messages.map((message) => {
    const result = { ...message };
    if (fields.includes('sender_id')) result.sender_name = names.get(Number(message.sender_id)) || null;
    if (fields.includes('receiver_id')) result.receiver_name = names.get(Number(message.receiver_id)) || null;
    return result;
  });
}

async function inbox(req, res) {
  const uid = Number(req.user.id);
  let messages = await db.findAll('messages', {
    $or: [{ receiver_id: uid }, { sender_id: uid }],
    parent_id: { $eq: null },
  }, { sort: { created_at: -1 }, limit: 50 });
  messages = messages.filter((message) => message.parent_id == null);
  messages = await addNames(messages, ['sender_id', 'receiver_id']);
  for (const message of messages) {
    message.unread = await db.count('messages', {
      $or: [{ id: Number(message.id) }, { parent_id: Number(message.id) }],
      receiver_id: uid,
      is_read: 0,
    });
  }
  return sendOk(res, messages);
}

async function thread(req, res, id) {
  if (!Number.isInteger(id) || id < 1) return sendError(res, 'معرف المحادثة مطلوب');
  const uid = Number(req.user.id);
  const root = await db.findOne('messages', { id });
  if (!root) return sendError(res, 'المحادثة غير موجودة', 404);
  if (Number(root.sender_id) !== uid && Number(root.receiver_id) !== uid) {
    return sendError(res, 'غير مسموح', 403);
  }
  let messages = await db.findAll('messages', {
    $or: [{ id }, { parent_id: id }],
  }, { sort: { created_at: 1 } });
  messages = await addNames(messages, ['sender_id']);
  await db.updateDoc('messages', {
    $or: [{ id }, { parent_id: id }],
    receiver_id: uid,
  }, { is_read: 1 });
  return sendOk(res, messages);
}

async function sendMessage(req, res, body) {
  const user = req.user;
  const to = number(body.receiver_id);
  const subject = text(body.subject, 300);
  const messageBody = text(body.body, 10000);
  const parent = body.parent_id == null ? null : number(body.parent_id);
  if (!messageBody) return sendError(res, 'نص الرسالة مطلوب');
  if (!Number.isInteger(to) || to < 1) return sendError(res, 'يرجى تحديد المستلم');

  const plan = PLANS[auth.effectivePlan(user)] || PLANS.free;
  const maxMessages = user.role === 'admin' ? -1 : Number(plan.max_msgs ?? PLANS.free.max_msgs);
  if (maxMessages !== -1) {
    const month = new Date().toISOString().slice(0, 7);
    const sent = await db.count('messages', {
      sender_id: Number(user.id),
      created_at: { $regex: `^${month}` },
    });
    if (sent >= maxMessages) {
      return sendError(res, `وصلت للحد الأقصى من الرسائل لهذا الشهر (${maxMessages}). يرجى ترقية الخطة.`);
    }
  }
  if (to === Number(user.id)) return sendError(res, 'لا يمكنك إرسال رسالة لنفسك');
  if (!(await db.findOne('users', { id: to, is_active: 1 }))) return sendError(res, 'المستلم غير موجود');

  if (parent !== null) {
    if (!Number.isInteger(parent) || parent < 1) return sendError(res, 'معرف المحادثة غير صحيح');
    const parentMessage = await db.findOne('messages', { id: parent });
    if (!parentMessage || parentMessage.parent_id != null) return sendError(res, 'المحادثة الأصلية غير موجودة', 404);
    const senderId = Number(parentMessage.sender_id);
    const receiverId = Number(parentMessage.receiver_id);
    if (senderId !== Number(user.id) && receiverId !== Number(user.id)) {
      return sendError(res, 'غير مسموح بالرد على هذه المحادثة', 403);
    }
    const expectedReceiver = senderId === Number(user.id) ? receiverId : senderId;
    if (to !== expectedReceiver) return sendError(res, 'المستلم لا يطابق طرفي المحادثة', 403);
  }

  const id = await db.insertDoc('messages', {
    sender_id: Number(user.id),
    receiver_id: to,
    subject: subject || null,
    body: messageBody,
    parent_id: parent,
    is_read: 0,
  });
  await db.insertDoc('activity_log', {
    user_id: Number(user.id),
    action: 'message_sent',
    details: `إلى المستخدم: ${to}`,
  });
  return sendOk(res, { id }, 'تم الإرسال');
}

async function upgradeRequest(req, res, body) {
  const user = req.user;
  if (user.role !== 'client') return sendError(res, 'طلبات الترقية متاحة للعملاء فقط', 403);
  const to = number(body.receiver_id);
  const plan = text(body.plan, 40);
  const planName = text(body.plan_name || plan, 100);
  const month = new Date().toISOString().slice(0, 7);
  if (!to || !plan) return sendError(res, 'بيانات طلب الترقية ناقصة');
  if (!Object.hasOwn(PLANS, plan)) return sendError(res, 'الخطة المطلوبة غير صحيحة');
  const admin = await db.findOne('users', { id: to, role: 'admin', is_active: 1 });
  if (!admin) return sendError(res, 'حساب الإدارة غير موجود');
  const subject = `طلب ترقية إلى خطة ${planName}`;
  const alreadyRequested = await db.count('messages', {
    sender_id: Number(user.id),
    receiver_id: to,
    subject,
    created_at: { $regex: `^${month}` },
  });
  if (alreadyRequested) return sendError(res, 'تم إرسال طلب ترقية لهذه الخطة هذا الشهر مسبقاً');
  const id = await db.insertDoc('messages', {
    sender_id: Number(user.id),
    receiver_id: to,
    subject,
    body: `يرغب العميل في الترقية إلى خطة ${planName} (${plan}). يرجى التواصل معه لاستكمال الطلب.`,
    parent_id: null,
    is_read: 0,
  });
  await db.insertDoc('activity_log', {
    user_id: Number(user.id),
    action: 'upgrade_request',
    details: `طلب ترقية إلى خطة ${planName}`,
  });
  return sendOk(res, { id }, 'تم إرسال طلب الترقية');
}

async function markRead(req, res, body) {
  const id = number(body.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 'معرف المحادثة مطلوب');
  await db.updateDoc('messages', {
    $or: [{ id }, { parent_id: id }],
    receiver_id: Number(req.user.id),
  }, { is_read: 1 });
  return sendOk(res, [], 'تم');
}

async function contacts(req, res) {
  const user = req.user;
  const filter = { is_active: 1 };
  if (user.role === 'admin') filter.id = { $ne: Number(user.id) };
  else if (user.role === 'employee') filter.role = { $in: ['client', 'admin'] };
  else filter.role = { $in: ['employee', 'admin'] };
  const users = await db.findAll('users', filter, {
    sort: { name: 1 },
    projection: { id: 1, name: 1, email: 1, role: 1, plan: 1 },
  });
  return sendOk(res, users);
}

async function unreadCount(req, res) {
  const count = await db.count('messages', {
    receiver_id: Number(req.user.id),
    is_read: 0,
  });
  return sendOk(res, { count });
}

module.exports = router;