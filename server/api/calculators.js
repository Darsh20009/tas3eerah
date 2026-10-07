'use strict';

const express = require('express');
const db = require('../db');
const auth = require('../auth');
const account = require('../calculator-account');
const tools = require('../tools');
const { currencyFor } = require('../currencies');
const { sendOk, sendError, failFromError, actionOf, text } = require('./_helpers');
const router = express.Router();
router.use(auth.loadUser, auth.requireUser);
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

function validState(state, tool) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  if (state.version !== 1 || state.tool !== tool) return false;
  if (!Array.isArray(state.fields) || !Array.isArray(state.actions)) return false;
  if (state.fields.length > 1200 || state.actions.length > 600) return false;
  if (state.fields.some(field => !field || typeof field.selector !== 'string' ||
      field.selector.length > 700 || typeof field.value !== 'string' || field.value.length > 10000)) return false;
  if (state.actions.some(action => !action || typeof action.selector !== 'string' ||
      action.selector.length > 700 || typeof action.signature !== 'string' || action.signature.length > 1000)) return false;
  return Buffer.byteLength(JSON.stringify(state), 'utf8') <= 200000;
}

router.all('/', async (req, res) => {
  const action = actionOf(req);
  const body = req.body || {};
  const userId = Number(req.user.id);
  const tool = String((req.method === 'GET' ? req.query.tool : body.tool) || '');
  const gets = ['list', 'get', 'state', 'access'];
  if ((gets.includes(action) && req.method !== 'GET') || (!gets.includes(action) && req.method !== 'POST')) {
    return sendError(res, 'طريقة الطلب غير مسموحة', 405);
  }
  try {
    if (action === 'access') return sendOk(res, await account.access(req.user));
    if (action === 'list') {
      if (tool && !Object.hasOwn(tools, tool)) return sendError(res, 'قطاع غير صحيح');
      const records = await db.findAll('calculator_results', { user_id: userId, ...(tool ? { tool } : {}) },
        { sort: { id: -1 }, projection: { state: 0 } });
      return sendOk(res, records.map(({ state, ...record }) => record));
    }
    if (['get', 'delete', 'restore'].includes(action)) {
      const id = Number(req.method === 'GET' ? req.query.id : body.id);
      if (!Number.isSafeInteger(id) || id < 1) return sendError(res, 'معرف غير صحيح');
      const record = await db.findOne('calculator_results', { id, user_id: userId });
      if (!record) return sendError(res, 'النتيجة غير موجودة', 404);
      if (action === 'get') return sendOk(res, record);
      if (action === 'delete') {
        await db.deleteDoc('calculator_results', { id, user_id: userId });
        return sendOk(res, { id });
      }
      if (!account.allowed(req.user, record.tool)) return sendError(res, 'الأداة غير مشمولة في اختيار باقتك', 403);
      await account.serial(userId, () => account.writeState(userId, record.tool, record.state));
      return sendOk(res, { tool: record.tool });
    }
    if (action === 'select_tools') {
      const limit = account.limits(req.user).tool_limit;
      if (!limit) return sendError(res, 'لا تحتاج هذه الباقة لاختيار الأدوات');
      if (!Array.isArray(body.tools) || body.tools.length !== limit ||
          new Set(body.tools).size !== limit || body.tools.some(slug => !Object.hasOwn(tools, slug))) {
        return sendError(res, `اختر ${limit} أدوات مختلفة`);
      }
      await db.updateDoc('users', { id: userId }, { selected_tools: body.tools });
      return sendOk(res, { selected_tools: body.tools });
    }
    if (!account.allowed(req.user, tool)) return sendError(res, 'الأداة غير مشمولة في اختيار باقتك', 403);
    if (action === 'reserve_pdf') {
      const limit = account.limits(req.user).pdf_limit;
      if (!await db.reservePdfReport(userId, limit)) return sendError(res, 'وصلت إلى حد تقارير PDF لهذا الشهر', 429);
      return sendOk(res, { used: await db.pdfReportUsage(userId), limit });
    }
    if (action === 'state') {
      const saved = await db.findOne('calculator_states', { user_id: userId, tool });
      return sendOk(res, { state: saved?.state || null });
    }
    if (!['save', 'save_state'].includes(action)) return sendError(res, 'إجراء غير صحيح');
    if (!validState(body.state, tool)) return sendError(res, 'بيانات الحاسبة غير صالحة أو كبيرة جداً');
    if (action === 'save_state') {
      await account.serial(userId, () => account.writeState(userId, tool, body.state));
      return sendOk(res);
    }
    const title = text(body.title, 160);
    const price = Number(body.price);
    const currency = currencyFor(String(body.currency_code || 'SAR'));
    if (!title || !Number.isFinite(price) || price < 0 || !currency) return sendError(res, 'اسم أو قيمة أو عملة غير صحيحة');
    return await account.serial(userId, async () => {
      const limit = account.limits(req.user).history_limit;
      if (limit !== -1 && await db.count('calculator_results', { user_id: userId }) >= limit) {
        return sendError(res, `وصلت إلى حد السجل (${limit}). احذف نتيجة قديمة أو قم بترقية الباقة.`, 429);
      }
      const id = await db.insertDoc('calculator_results', {
        user_id: userId, tool, title, price, currency_code: currency.code, state: body.state,
      });
      await account.writeState(userId, tool, body.state);
      return sendOk(res, { id });
    });
  } catch (error) { return failFromError(res, error); }
});
module.exports = router;
