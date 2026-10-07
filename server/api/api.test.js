'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tas3eerah-api-test-'));
process.env.APP_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.DB_TEST_SQLITE = '1';
process.env.DB_PATH = path.join(temporaryDirectory, 'isolated.sqlite');

const db = require('../db');
const email = require('../email');
const authRouter = require('./auth');
const quotesRouter = require('./quotes');
const adminRouter = require('./admin');
const messagesRouter = require('./messages');
const contactRouter = require('./contact');

let server;
let origin;

function updateCookieJar(jar, response) {
  const headerCookies = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  for (const cookie of headerCookies) {
    const pair = cookie.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(pathname, { jar = new Map(), method = 'GET', body, token } = {}) {
  const headers = {};
  const cookie = [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-CSRF-Token'] = token;
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  updateCookieJar(jar, response);
  return { response, json: await response.json() };
}

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await db.close();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('auth, CSRF, quote quotas, and admin guards use isolated SQLite data', async () => {
  const sentMail = [];
  email.sendHtml = async (...args) => { sentMail.push(args); };
  await db.init();
  const passwordHash = await bcrypt.hash('TestPassword@123', 10);
  const clientId = await db.insertDoc('users', {
    name: 'عميل اختبار',
    email: 'client@example.test',
    password_hash: passwordHash.replace(/^\$2a\$/, '$2y$'),
    role: 'client',
    plan: 'free',
    plan_expires_at: null,
    is_active: 1,
  });
  await db.insertDoc('users', {
    name: 'مدير اختبار',
    email: 'admin@example.test',
    password_hash: passwordHash,
    role: 'admin',
    plan: 'pro',
    plan_expires_at: null,
    is_active: 1,
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(session({
    name: 'TAS3_SESS',
    secret: 'isolated-api-test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }));
  app.use('/api/auth', authRouter);
  app.use('/api/quotes', quotesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/contact', contactRouter);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;

  const clientJar = new Map();
  const csrf = await request('/api/auth?action=csrf', { jar: clientJar });
  assert.equal(csrf.response.status, 200);
  assert.equal(csrf.json.success, true);
  assert.ok(csrf.json.data.csrf_token);
  assert.ok(clientJar.has('TAS3_CSRF'));
  const csrfToken = csrf.json.data.csrf_token;

  const missingCsrf = await request('/api/contact', {
    jar: new Map(),
    method: 'POST',
    body: { name: 'عميل اختبار', email: 'client@example.test', message: 'رسالة اختبار صالحة' },
  });
  assert.equal(missingCsrf.response.status, 403);

  const login = await request('/api/auth', {
    jar: clientJar,
    method: 'POST',
    token: csrfToken,
    body: { action: 'login', email: 'client@example.test', password: 'TestPassword@123' },
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.json.success, true);
  assert.equal(login.json.data.role, 'client');
  assert.equal(Object.hasOwn(login.json.data, 'password_hash'), false);

  const me = await request('/api/auth?action=me', { jar: clientJar });
  assert.equal(me.json.data.email, 'client@example.test');

  const quotePayload = {
    action: 'create',
    title: 'عرض اختبار',
    client_id: clientId,
    items: [{ description: 'بند الاختبار', qty: 1, unit_price: 100 }],
    tax_rate: 15,
    discount: 0,
    currency_code: 'USD',
  };
  const firstQuote = await request('/api/quotes', {
    jar: clientJar, method: 'POST', token: csrfToken, body: quotePayload,
  });
  assert.equal(firstQuote.response.status, 200, JSON.stringify(firstQuote.json));
  assert.equal(firstQuote.json.success, true);
  assert.ok(firstQuote.json.data.number);
  assert.equal((await db.findOne('quotes', { id: firstQuote.json.data.id })).currency_code, 'USD');
  assert.equal(firstQuote.json.data.email_sent, true);
  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0][0], 'client@example.test');
  assert.match(sentMail[0][1], /حفظ تسعيرتك/);

  const overQuota = await request('/api/quotes', {
    jar: clientJar, method: 'POST', token: csrfToken, body: quotePayload,
  });
  assert.equal(overQuota.json.success, false);
  assert.ok(overQuota.json.error.includes('ترقية الخطة'));

  const rating = await request('/api/quotes', {
    jar: clientJar,
    method: 'POST',
    token: csrfToken,
    body: { action: 'rate', id: firstQuote.json.data.id, rating: 4 },
  });
  assert.equal(rating.json.success, true);
  assert.equal(rating.json.data.rating_average, 4);

  const contact = await request('/api/contact', {
    jar: clientJar,
    method: 'POST',
    token: csrfToken,
    body: { name: 'عميل اختبار', email: 'client@example.test', message: 'رسالة تواصل اختبار صالحة' },
  });
  assert.equal(contact.json.success, true);

  const forbiddenAdmin = await request('/api/admin?action=stats', { jar: clientJar });
  assert.equal(forbiddenAdmin.response.status, 403);

  const adminJar = new Map();
  const adminCsrf = await request('/api/auth?action=csrf', { jar: adminJar });
  const adminLogin = await request('/api/auth', {
    jar: adminJar,
    method: 'POST',
    token: adminCsrf.json.data.csrf_token,
    body: { action: 'login', email: 'admin@example.test', password: 'TestPassword@123' },
  });
  assert.equal(adminLogin.json.success, true);
  const adminStats = await request('/api/admin?action=stats', { jar: adminJar });
  assert.equal(adminStats.response.status, 200);
  assert.equal(adminStats.json.success, true);
  assert.equal(adminStats.json.data.quotes_total, 1);
  assert.equal(adminStats.json.data.rating_count, 1);

  const registerJar = new Map();
  const registerCsrf = await request('/api/auth?action=csrf', { jar: registerJar });
  const registration = await request('/api/auth', {
    jar: registerJar, method: 'POST', token: registerCsrf.json.data.csrf_token,
    body: { action: 'register', name: 'عميل جديد', email: 'new@example.test', password: 'TestPassword@123' },
  });
  assert.equal(registration.json.success, true);
  assert.equal(registration.json.data.email_sent, true);
  assert.equal(sentMail.at(-1)[0], 'new@example.test');
  assert.match(sentMail.at(-1)[1], /مرحباً بك/);

  const adminQuote = await request('/api/quotes', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { ...quotePayload, title: 'عرض للعميل من الإدارة' },
  });
  assert.equal(adminQuote.json.success, true, JSON.stringify(adminQuote.json));
  const quoteId = adminQuote.json.data.id;
  const mailCountBeforeSend = sentMail.length;
  assert.equal((await db.findOne('quotes', { id: quoteId })).status, 'draft');
  assert.equal(sentMail.length, mailCountBeforeSend, 'saving a draft must not email the client');
  const updatedCurrency = await request('/api/quotes', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { action: 'update', id: quoteId, currency_code: 'EUR' },
  });
  assert.equal(updatedCurrency.json.success, true);
  assert.equal((await db.findOne('quotes', { id: quoteId })).currency_code, 'EUR');
  for (const invalidItem of [
    { description: 'كمية صفرية', qty: 0, unit_price: 100 },
    { description: 'كمية غير رقمية', qty: 'invalid', unit_price: 100 },
    { description: 'سعر غير رقمي', qty: 1, unit_price: 'invalid' },
    { description: 'تجاوز رقمي', qty: 1e200, unit_price: 1e200 },
  ]) {
    const invalidQuote = await request('/api/quotes', {
      jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
      body: { ...quotePayload, items: [invalidItem] },
    });
    assert.equal(invalidQuote.json.success, false, invalidItem.description);
  }
  const weakPasswordUpdate = await request('/api/admin', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { action: 'user_update', id: clientId, password: '1234567' },
  });
  assert.equal(weakPasswordUpdate.json.success, false);
  const invalidCurrency = await request('/api/quotes', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { action: 'update', id: quoteId, currency_code: 'INVALID' },
  });
  assert.equal(invalidCurrency.json.success, false);
  assert.equal((await db.findOne('quotes', { id: quoteId })).currency_code, 'EUR');

  email.sendHtml = async () => { throw Object.assign(new Error('test SMTP failure'), { code: 'ECONNREFUSED' }); };
  const failedSend = await request('/api/quotes', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { action: 'status', id: quoteId, status: 'sent' },
  });
  assert.equal(failedSend.response.status, 502);
  assert.equal((await db.findOne('quotes', { id: quoteId })).status, 'draft');

  const failedReceipt = await request('/api/quotes', {
    jar: registerJar, method: 'POST', token: registerCsrf.json.data.csrf_token,
    body: { ...quotePayload, title: 'تسعيرة بعد فشل البريد' },
  });
  assert.equal(failedReceipt.json.success, true);
  assert.equal(failedReceipt.json.data.email_sent, false);
  assert.equal((await db.findOne('quotes', { id: failedReceipt.json.data.id })).status, 'draft');

  const failedRegisterJar = new Map();
  const failedRegisterCsrf = await request('/api/auth?action=csrf', { jar: failedRegisterJar });
  const failedWelcome = await request('/api/auth', {
    jar: failedRegisterJar, method: 'POST', token: failedRegisterCsrf.json.data.csrf_token,
    body: { action: 'register', name: 'عميل بلا بريد', email: 'no-mail@example.test', password: 'TestPassword@123' },
  });
  assert.equal(failedWelcome.json.success, true);
  assert.equal(failedWelcome.json.data.email_sent, false);

  email.sendHtml = async (...args) => { sentMail.push(args); };
  const successfulSend = await request('/api/quotes', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { action: 'status', id: quoteId, status: 'sent' },
  });
  assert.equal(successfulSend.json.success, true, JSON.stringify(successfulSend.json));
  assert.equal((await db.findOne('quotes', { id: quoteId })).status, 'sent');
  assert.equal(sentMail.length, mailCountBeforeSend + 1);
  assert.equal(sentMail.at(-1)[0], 'client@example.test');
  assert.match(sentMail.at(-1)[2], /عرض للعميل من الإدارة/);
  const duplicateSend = await request('/api/quotes', {
    jar: adminJar, method: 'POST', token: adminCsrf.json.data.csrf_token,
    body: { action: 'status', id: quoteId, status: 'sent' },
  });
  assert.equal(duplicateSend.json.success, true);
  assert.equal(sentMail.length, mailCountBeforeSend + 1);

  const message = await request('/api/messages', {
    jar: adminJar,
    method: 'POST',
    token: adminCsrf.json.data.csrf_token,
    body: { action: 'send', receiver_id: clientId, subject: 'رسالة اختبار', body: 'رسالة داخلية للاختبار' },
  });
  assert.equal(message.json.success, true);
  const inbox = await request('/api/messages?action=inbox', { jar: clientJar });
  assert.equal(inbox.json.success, true, JSON.stringify(inbox.json));
  assert.equal(inbox.json.data.length, 1);
  const thread = await request(`/api/messages?action=thread&id=${message.json.data.id}`, { jar: clientJar });
  assert.equal(thread.json.success, true);
  assert.equal(thread.json.data.length, 1);

  const contactInbox = await request('/api/admin?action=contact_messages', { jar: adminJar });
  assert.equal(contactInbox.json.success, true);
  assert.equal(contactInbox.json.data.length, 1);
});

test('user management, quote lifecycle, messaging and settings are isolated and permission-checked', async () => {
  email.sendHtml = async () => {};
  async function signIn(emailAddress) {
    const jar = new Map();
    const csrf = await request('/api/auth?action=csrf', { jar });
    const token = csrf.json.data.csrf_token;
    const login = await request('/api/auth', {
      jar, token, method: 'POST',
      body: { action: 'login', email: emailAddress, password: 'TestPassword@123' },
    });
    assert.equal(login.json.success, true);
    return { jar, token, user: login.json.data };
  }
  function post(session, path, body) {
    return request(path, { ...session, method: 'POST', body });
  }
  const admin = await signIn('admin@example.test');
  const employeeCreated = await post(admin, '/api/admin', {
    action: 'user_create', name: 'موظف مراجعة', email: 'review-employee@example.test',
    password: 'TestPassword@123', role: 'employee', plan: 'pro',
  });
  assert.equal(employeeCreated.json.success, true);
  const employeeId = employeeCreated.json.data.id;
  const employee = await signIn('review-employee@example.test');
  const client = await signIn('client@example.test');
  const changedPlan = await post(admin, '/api/admin', {
    action: 'set_plan', id: client.user.id, plan: 'pro',
  });
  assert.equal(changedPlan.json.success, true);
  const otherCreated = await post(admin, '/api/admin', {
    action: 'user_create', name: 'عميل آخر', email: 'review-other@example.test',
    password: 'TestPassword@123', role: 'client', plan: 'pro',
  });
  assert.equal(otherCreated.json.success, true);
  const other = await signIn('review-other@example.test');
  for (const session of [employee, client, other]) {
    const denied = await request('/api/admin?action=users', session);
    assert.equal(denied.response.status, 403);
  }
  const clients = await request('/api/quotes?action=clients', employee);
  assert.equal(clients.json.success, true);
  assert.ok(clients.json.data.every(user => !Object.hasOwn(user, 'password_hash')));
  const draft = await post(employee, '/api/quotes', {
    action: 'create', title: 'عرض دورة المراجعة', client_id: client.user.id,
    currency_code: 'KWD', items: [{ description: 'خدمة', qty: 2, unit_price: 50 }],
    tax_rate: 15, discount: 10,
  });
  assert.equal(draft.json.success, true);
  const quoteId = draft.json.data.id;
  assert.equal((await db.findOne('quotes', { id: quoteId })).total, 103.5);
  assert.equal((await request(`/api/quotes?action=get&id=${quoteId}`, other)).response.status, 403);
  assert.equal((await post(client, '/api/quotes', {
    action: 'update', id: quoteId, title: 'تعديل غير مسموح',
  })).response.status, 403);
  const updated = await post(employee, '/api/quotes', {
    action: 'update', id: quoteId, currency_code: 'EUR', tax_rate: 0, discount: 0,
  });
  assert.equal(updated.json.success, true);
  assert.equal((await db.findOne('quotes', { id: quoteId })).total, 100);
  const sent = await post(employee, '/api/quotes', { action: 'status', id: quoteId, status: 'sent' });
  assert.equal(sent.json.success, true);
  const cannotEdit = await post(employee, '/api/quotes', { action: 'update', id: quoteId });
  assert.equal(cannotEdit.json.success, false);
  const accepted = await post(client, '/api/quotes', { action: 'status', id: quoteId, status: 'accepted' });
  assert.equal(accepted.json.success, true);
  for (const rating of [3, 5]) {
    assert.equal((await post(client, '/api/quotes', {
      action: 'rate', id: quoteId, rating,
    })).json.success, true);
  }
  assert.equal(await db.count('quote_ratings', { quote_id: quoteId, user_id: client.user.id }), 1);
  const message = await post(employee, '/api/messages', {
    action: 'send', receiver_id: client.user.id, subject: 'مراجعة', body: 'رسالة مراجعة',
  });
  assert.equal(message.json.success, true);
  const messageId = message.json.data.id;
  assert.equal((await request(`/api/messages?action=thread&id=${messageId}`, other)).response.status, 403);
  const reply = await post(client, '/api/messages', {
    action: 'send', parent_id: messageId, receiver_id: employeeId, body: 'رد مراجعة',
  });
  assert.equal(reply.json.success, true);
  const wrongReceiver = await post(client, '/api/messages', {
    action: 'send', parent_id: messageId, receiver_id: other.user.id, body: 'رد إلى طرف آخر',
  });
  assert.equal(wrongReceiver.response.status, 403);
  const thread = await request(`/api/messages?action=thread&id=${messageId}`, employee);
  assert.equal(thread.json.data.length, 2);
  assert.equal((await db.findOne('messages', { id: reply.json.data.id })).is_read, 1);
  assert.equal((await post(admin, '/api/admin', {
    action: 'save_settings', site_name: 'نظام اختبار',
  })).json.success, true, 'new setting keys must be insertable');
  assert.equal((await request('/api/admin?action=get_settings', admin)).json.data.site_name, 'نظام اختبار');
  const contactId = (await db.findAll('contact_messages'))[0].id;
  assert.equal((await post(admin, '/api/admin', { action: 'contact_mark_read', id: contactId })).json.success, true);
  assert.equal((await post(admin, '/api/admin', { action: 'contact_delete', id: contactId })).json.success, true);
  assert.equal(await db.count('contact_messages', { id: contactId }), 0);
  assert.equal((await post(admin, '/api/admin', { action: 'user_toggle', id: admin.user.id })).json.success, false);
  assert.equal((await post(admin, '/api/admin', { action: 'user_toggle', id: other.user.id })).json.success, true);
  assert.equal((await request('/api/auth?action=me', other)).response.status, 401);
  assert.equal((await post(admin, '/api/admin', { action: 'user_delete', id: other.user.id })).json.success, true);
  assert.equal((await post(employee, '/api/quotes', { action: 'delete', id: quoteId })).json.success, true);
  assert.equal(await db.count('quotes', { id: quoteId }), 0);
});