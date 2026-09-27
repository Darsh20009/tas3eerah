'use strict';

const express = require('express');
const db = require('../db');
const { APP_URL, PLANS } = require('../config');
const auth = require('../auth');
const email = require('../email');
const notifications = require('../notification-email');
const {
  actionOf, methodError, sendOk, sendError, failFromError, text, number,
  timestamp, escapeHtml,
} = require('./_helpers');

const router = express.Router();
const activeDeliveries = new Set();
router.use(auth.loadUser, auth.requireUser);
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

router.all('/', async (req, res) => {
  const action = actionOf(req);
  const body = req.body || {};
  const isGet = req.method === 'GET';
  const getActions = new Set(['list', 'get', 'clients']);

  if (getActions.has(action) !== isGet) return methodError(res);

  try {
    switch (action) {
      case 'list':
        return await listQuotes(req, res);
      case 'get':
        return await getQuote(req, res);
      case 'clients':
        return await listClients(req, res);
      case 'create':
        return await createQuote(req, res, body);
      case 'update':
        return await updateQuote(req, res, body);
      case 'delete':
        return await deleteQuote(req, res, body);
      case 'status':
        return await changeStatus(req, res, body);
      case 'rate':
        return await rateQuote(req, res, body);
      case 'email_quote':
        return await emailQuote(req, res, body);
      default:
        return sendError(res, 'إجراء غير صحيح', 400);
    }
  } catch (error) {
    return failFromError(res, error);
  }
});

function canAccessQuote(user, quote) {
  if (user.role === 'admin') return true;
  if (user.role === 'employee' && Number(quote.employee_id) === Number(user.id)) return true;
  if (user.role === 'client' && Number(quote.client_id) === Number(user.id)) return true;
  return false;
}

async function requireQuoteAccess(user, quote) {
  if (!canAccessQuote(user, quote)) {
    const error = new Error('غير مسموح');
    error.status = 403;
    error.expose = true;
    throw error;
  }
}

function buildItems(items) {
  return items.map((item, index) => {
    const qtyInput = number(item?.qty, 1);
    const priceInput = number(item?.unit_price, 0);
    return {
      id: index + 1,
      description: text(item?.description, 500),
      qty: Math.max(0.001, qtyInput),
      unit_price: Math.max(0, priceInput),
      total: Math.round(Math.max(0.001, qtyInput) * Math.max(0, priceInput) * 10000) / 10000,
    };
  });
}

async function withNames(quotes) {
  if (!quotes.length) return quotes;
  const ids = [...new Set(quotes.flatMap((quote) => [
    Number(quote.client_id || 0), Number(quote.employee_id || 0),
  ]).filter((id) => id > 0))];
  const users = ids.length
    ? await db.findAll('users', { id: { $in: ids } }, { projection: { id: 1, name: 1, role: 1 } })
    : [];
  const names = new Map(users.map((user) => [Number(user.id), user.name]));
  return quotes.map((quote) => ({
    ...quote,
    client_name: names.get(Number(quote.client_id)) || null,
    employee_name: names.get(Number(quote.employee_id)) || null,
  }));
}

async function withQuoteRatings(quotes, user) {
  if (!quotes.length) return quotes;
  const ids = quotes.map((quote) => Number(quote.id)).filter((id) => id > 0);
  const ratings = await db.findAll('quote_ratings', { quote_id: { $in: ids } });
  const byQuote = new Map();
  for (const rating of ratings) {
    const id = Number(rating.quote_id);
    const list = byQuote.get(id) || [];
    list.push(rating);
    byQuote.set(id, list);
  }
  return quotes.map((quote) => {
    const list = byQuote.get(Number(quote.id)) || [];
    const mine = list.find((rating) => Number(rating.user_id) === Number(user.id));
    const sum = list.reduce((total, rating) => total + Number(rating.rating || 0), 0);
    return {
      ...quote,
      rating_average: list.length ? sum / list.length : 0,
      rating_count: list.length,
      my_rating: mine ? Number(mine.rating) : null,
    };
  });
}

async function listQuotes(req, res) {
  const user = req.user;
  const filter = {};
  if (user.role === 'client') filter.client_id = Number(user.id);
  if (user.role === 'employee') filter.employee_id = Number(user.id);
  if (req.query.status) filter.status = text(req.query.status, 40);
  const query = text(req.query.q, 160);
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { number: { $regex: escaped, $options: 'i' } },
    ];
  }
  let quotes = await db.findAll('quotes', filter, { sort: { created_at: -1 }, limit: 100 });
  quotes = await withNames(quotes);
  quotes = await withQuoteRatings(quotes, user);
  return sendOk(res, quotes);
}

async function getQuote(req, res) {
  const id = number(req.query.id);
  const quote = id > 0 ? await db.findOne('quotes', { id }) : null;
  if (!quote) return sendError(res, 'عرض السعر غير موجود', 404);
  if (!canAccessQuote(req.user, quote)) return sendError(res, 'غير مسموح', 403);
  const [withUserNames] = await withNames([quote]);
  const [rated] = await withQuoteRatings([withUserNames], req.user);
  if (!Array.isArray(rated.items)) rated.items = [];
  return sendOk(res, rated);
}

function quoteTotals(items, taxInput, discountInput, allowEmptyDiscount = false) {
  if (!Array.isArray(items) || !items.length) return { error: 'يرجى إضافة بند واحد على الأقل' };
  for (const item of items) {
    if (!text(item?.description, 500)) return { error: 'وصف البند مطلوب لكل بند' };
    const qty = number(item?.qty, 1);
    const price = number(item?.unit_price, 0);
    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty < 0 || price < 0) {
      return { error: 'قيمة غير صالحة في أحد البنود' };
    }
  }
  const cleanItems = buildItems(items);
  const subtotal = cleanItems.reduce((sum, item) => sum + item.total, 0);
  let discount = Math.max(0, number(discountInput, 0));
  if (discount > subtotal && !(allowEmptyDiscount && subtotal === 0)) {
    return { error: 'الخصم لا يمكن أن يتجاوز الإجمالي الفرعي' };
  }
  const taxRate = Math.min(100, Math.max(0, number(taxInput, 15)));
  const total = (subtotal - discount) * (1 + taxRate / 100);
  return {
    items: cleanItems,
    subtotal: Math.round(subtotal * 10000) / 10000,
    discount,
    taxRate,
    total: Math.round(total * 10000) / 10000,
  };
}

async function createQuote(req, res, body) {
  const user = req.user;
  if (!(await auth.canCreateQuote(user))) {
    const plan = PLANS[auth.effectivePlan(user)] || PLANS.free;
    return sendError(res, `وصلت للحد الأقصى (${plan.max_quotes} عروض هذا الشهر). يرجى ترقية الخطة.`);
  }
  const title = text(body.title, 240);
  const clientId = user.role === 'client' ? Number(user.id) : number(body.client_id);
  const notes = text(body.notes, 10000);
  if (!title) return sendError(res, 'عنوان العرض مطلوب');
  if (!clientId) return sendError(res, 'يرجى اختيار العميل');
  if (!Array.isArray(body.items) || !body.items.length) return sendError(res, 'يرجى إضافة بند واحد على الأقل');

  let client = null;
  if (user.role !== 'client') {
    client = await db.findOne('users', { id: clientId, role: 'client', is_active: 1 });
    if (!client) return sendError(res, 'العميل غير موجود');
  }

  const totals = quoteTotals(body.items, body.tax_rate, body.discount);
  if (totals.error) return sendError(res, totals.error);
  const quoteNumber = await db.nextQuoteNumber();
  const id = await db.insertDoc('quotes', {
    number: quoteNumber,
    client_id: clientId,
    employee_id: user.role === 'client' ? 0 : Number(user.id),
    title,
    status: 'draft',
    subtotal: totals.subtotal,
    tax_rate: totals.taxRate,
    discount: totals.discount,
    total: totals.total,
    notes,
    items: totals.items,
    updated_at: timestamp(),
  });
  await db.insertDoc('activity_log', {
    user_id: Number(user.id),
    action: 'quote_created',
    details: `رقم العرض: ${quoteNumber} | العنوان: ${title} | العميل: ${client?.name || user.name || clientId} | الإجمالي: ${totals.total.toFixed(2)} ر.س | ${notes ? 'توجد ملاحظات' : 'بدون ملاحظات'}`,
  });
  if (user.role === 'client') {
    const delivery = await notifications.quoteReceipt(user, { title, number: quoteNumber });
    return sendOk(res, { id, number: quoteNumber, email_sent: delivery.sent },
      delivery.sent
        ? 'تم حفظ التسعيرة وإرسال تأكيد إلى بريدك'
        : 'تم حفظ التسعيرة، لكن تعذر إرسال تأكيد البريد. تحقق من إعدادات البريد أو تواصل مع الإدارة.');
  }
  return sendOk(res, { id, number: quoteNumber }, 'تم حفظ العرض كمسودة. اضغط «إرسال» لإرساله للعميل بالبريد.');
}

async function updateQuote(req, res, body) {
  const id = number(body.id);
  const quote = id > 0 ? await db.findOne('quotes', { id }) : null;
  if (!quote) return sendError(res, 'غير موجود', 404);
  if (!canAccessQuote(req.user, quote)) return sendError(res, 'غير مسموح', 403);
  if (req.user.role === 'client') return sendError(res, 'العملاء لا يمكنهم تعديل العروض', 403);
  if (quote.status !== 'draft') return sendError(res, 'لا يمكن تعديل عرض تم إرساله');

  const title = text(body.title ?? quote.title, 240);
  if (!title) return sendError(res, 'عنوان العرض مطلوب');
  const items = body.items ?? quote.items;
  const totals = quoteTotals(
    Array.isArray(items) ? items : [],
    body.tax_rate ?? quote.tax_rate,
    body.discount ?? quote.discount,
    true,
  );
  if (totals.error) return sendError(res, totals.error);
  await db.updateDoc('quotes', { id }, {
    title,
    subtotal: totals.subtotal,
    tax_rate: totals.taxRate,
    discount: totals.discount,
    total: totals.total,
    notes: text(body.notes ?? quote.notes, 10000),
    items: totals.items,
    updated_at: timestamp(),
  });
  return sendOk(res, { id }, 'تم التحديث');
}

async function deleteQuote(req, res, body) {
  const id = number(body.id);
  const quote = id > 0 ? await db.findOne('quotes', { id }) : null;
  if (!quote) return sendError(res, 'غير موجود', 404);
  if (req.user.role === 'client') return sendError(res, 'العملاء لا يمكنهم حذف العروض', 403);
  if (req.user.role !== 'admin' && Number(quote.employee_id) !== Number(req.user.id)) {
    return sendError(res, 'غير مسموح', 403);
  }
  await db.deleteDoc('quotes', { id });
  await db.deleteDoc('quote_ratings', { quote_id: id });
  return sendOk(res, [], 'تم الحذف');
}

async function changeStatus(req, res, body) {
  const id = number(body.id);
  const nextStatus = text(body.status, 40);
  const quote = id > 0 ? await db.findOne('quotes', { id }) : null;
  if (!quote) return sendError(res, 'غير موجود', 404);
  if (!canAccessQuote(req.user, quote)) return sendError(res, 'غير مسموح', 403);
  const transitions = {
    admin: { '*': ['draft', 'sent', 'accepted', 'rejected', 'cancelled'] },
    employee: {
      draft: ['sent', 'cancelled'],
      sent: ['draft', 'cancelled'],
      cancelled: ['draft'],
    },
    client: { sent: ['accepted', 'rejected'] },
  };
  const allowed = req.user.role === 'admin'
    ? transitions.admin['*']
    : (transitions[req.user.role]?.[quote.status] || []);
  if (!allowed.includes(nextStatus)) {
    return sendError(res, `لا يمكنك تغيير الحالة من «${quote.status}» إلى «${nextStatus}»`, 403);
  }
  if (nextStatus === 'sent' && quote.status === 'sent') {
    return sendOk(res, { status: 'sent' }, 'العرض مرسل بالفعل');
  }
  if (nextStatus === 'sent') {
    const delivery = await deliverQuote(req, quote);
    if (!delivery.sent) return sendError(res, delivery.error, delivery.status || 502);
    return sendOk(res, { status: 'sent' }, 'تم إرسال عرض السعر إلى بريد العميل وتحديث حالته');
  }
  await db.updateDoc('quotes', { id }, { status: nextStatus, updated_at: timestamp() });
  await db.insertDoc('activity_log', {
    user_id: Number(req.user.id),
    action: 'quote_status_changed',
    details: `العرض ${quote.number || id} (${quote.title || 'بدون عنوان'}): ${quote.status} → ${nextStatus} | الإجمالي: ${Number(quote.total || 0).toFixed(2)} ر.س`,
  });
  return sendOk(res, { status: nextStatus }, 'تم تحديث الحالة');
}

async function rateQuote(req, res, body) {
  const id = number(body.id);
  const rating = Number(body.rating);
  if (!id) return sendError(res, 'معرف العرض مطلوب');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return sendError(res, 'التقييم يجب أن يكون رقماً صحيحاً من 1 إلى 5');
  }
  const quote = await db.findOne('quotes', { id });
  if (!quote) return sendError(res, 'عرض السعر غير موجود', 404);
  if (!canAccessQuote(req.user, quote)) return sendError(res, 'غير مسموح', 403);
  const existing = await db.findOne('quote_ratings', { quote_id: id, user_id: Number(req.user.id) });
  if (existing) {
    await db.updateDoc('quote_ratings', { id: Number(existing.id) }, {
      rating,
      updated_at: timestamp(),
    });
  } else {
    await db.insertDoc('quote_ratings', {
      quote_id: id,
      user_id: Number(req.user.id),
      rating,
      updated_at: timestamp(),
    });
  }
  const ratings = await db.findAll('quote_ratings', { quote_id: id });
  const average = ratings.reduce((total, item) => total + Number(item.rating || 0), 0) / (ratings.length || 1);
  return sendOk(res, {
    rating_average: ratings.length ? average : 0,
    rating_count: ratings.length,
    my_rating: rating,
  }, 'تم حفظ تقييمك');
}

async function emailQuote(req, res, body) {
  if (req.user.role === 'client') return sendError(res, 'غير مسموح', 403);
  const id = number(body.id);
  if (!id) return sendError(res, 'معرف العرض مطلوب');
  const quote = await db.findOne('quotes', { id });
  if (!quote) return sendError(res, 'عرض السعر غير موجود', 404);
  if (!canAccessQuote(req.user, quote)) return sendError(res, 'غير مسموح', 403);
  if (quote.status === 'sent') return sendOk(res, { status: 'sent' }, 'العرض مرسل بالفعل');
  if (quote.status !== 'draft') return sendError(res, 'يمكن إرسال المسودات فقط', 409);
  const delivery = await deliverQuote(req, quote);
  if (!delivery.sent) return sendError(res, delivery.error, delivery.status || 502);
  return sendOk(res, { status: 'sent' }, 'تم إرسال عرض السعر إلى بريد العميل');
}

async function deliverQuote(req, quote) {
  const id = Number(quote.id);
  if (activeDeliveries.has(id)) {
    return { sent: false, status: 409, error: 'يجري إرسال العرض حالياً. انتظر قبل إعادة المحاولة.' };
  }
  activeDeliveries.add(id);
  try {
    const client = await db.findOne('users', { id: Number(quote.client_id) });
    if (!client?.email) return { sent: false, status: 400, error: 'لا يمكن إيجاد بريد العميل' };
    const employee = Number(quote.employee_id)
      ? await db.findOne('users', { id: Number(quote.employee_id) })
      : null;
    const html = quoteEmailHtml(quote, client, employee, APP_URL);
    try {
      await email.sendHtml(client.email, `عرض سعر جديد: ${quote.title} — رقم ${quote.number}`, html, await settingsMap(), req.user.email);
    } catch (error) {
      console.error('[quote email failed]', error.code || error.name || 'MAIL_ERROR');
      return { sent: false, error: 'تعذر إرسال البريد. بقي العرض مسودة؛ تحقق من إعدادات صندوق البريد وأعد المحاولة.' };
    }
    try {
      await db.updateDoc('quotes', { id }, { status: 'sent', updated_at: timestamp() });
    } catch (error) {
      console.error('[quote status update failed]', error.code || error.name || 'DB_ERROR');
      return { sent: false, status: 500, error: 'قُبل البريد، لكن تعذر تحديث حالة العرض. لا تعاود الإرسال قبل مراجعة الإدارة.' };
    }
    try {
      await db.insertDoc('activity_log', {
        user_id: Number(req.user.id),
        action: 'quote_emailed',
        details: `تم إرسال العرض ${quote.number || id} إلى ${client.email}`,
      });
      await db.insertDoc('activity_log', {
        user_id: Number(req.user.id),
        action: 'quote_status_changed',
        details: `العرض ${quote.number || id} (${quote.title || 'بدون عنوان'}): ${quote.status} → sent | الإجمالي: ${Number(quote.total || 0).toFixed(2)} ر.س`,
      });
    } catch (error) {
      console.error('[quote activity log failed]', error.code || error.name || 'DB_ERROR');
    }
    return { sent: true };
  } finally {
    activeDeliveries.delete(id);
  }
}

function quoteEmailHtml(quote, client, employee, appUrl) {
  const money = (value) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const rows = (Array.isArray(quote.items) ? quote.items : []).map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(item.description)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${escapeHtml(item.qty)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left">${money(item.unit_price)} ر.س</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left">${money(item.total)} ر.س</td>
    </tr>`).join('');
  const subtotal = Number(quote.subtotal || 0);
  const discount = Number(quote.discount || 0);
  const tax = (subtotal - discount) * Number(quote.tax_rate || 0) / 100;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:24px;background:#f8f5ed;color:#17352a;font-family:Arial,Tahoma,sans-serif">
      <main style="max-width:640px;margin:auto;padding:24px;background:#fff;border-radius:12px">
      <img src="${escapeHtml(`${String(appUrl || '').replace(/\/$/, '')}/assets/logo.png`)}" width="140" alt="تسعيرة">
      <h2>عرض سعر جديد</h2>
      <p>مرحباً ${escapeHtml(client.name || 'العميل')}، أُعدّ لك عرض السعر التالي${employee?.name ? ` من ${escapeHtml(employee.name)}` : ''}.</p>
      <p><strong>رقم العرض:</strong> ${escapeHtml(quote.number)}<br><strong>العنوان:</strong> ${escapeHtml(quote.title)}</p>
      <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#1a4b33;color:#fff">
      <th style="padding:10px;text-align:right">الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p>المجموع الفرعي: ${money(subtotal)} ر.س<br>الخصم: ${money(discount)} ر.س<br>
      الضريبة (${Number(quote.tax_rate || 0)}%): ${money(tax)} ر.س<br>
      <strong>الإجمالي: ${money(quote.total)} ر.س</strong></p>
      <p>يمكنك تسجيل الدخول إلى المنصة لقبول العرض أو رفضه.</p></main></body></html>`;
}

async function settingsMap() {
  const rows = await db.findAll('settings');
  return Object.fromEntries(rows.filter((row) => row.key).map((row) => [row.key, row.value || '']));
}

async function listClients(req, res) {
  if (req.user.role === 'client') return sendError(res, 'غير مسموح', 403);
  const clients = await db.findAll('users', { role: 'client', is_active: 1 }, {
    sort: { name: 1 },
    projection: { id: 1, name: 1, email: 1, plan: 1, created_at: 1 },
  });
  return sendOk(res, clients);
}

module.exports = router;