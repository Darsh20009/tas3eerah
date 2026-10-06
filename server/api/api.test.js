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