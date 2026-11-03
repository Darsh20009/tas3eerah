'use strict';

const crypto = require('node:crypto');

const SESSION_ENDPOINT = 'https://api.ksamerchant.geidea.net/payment-intent/api/v2/direct/session';
const ORDER_ENDPOINT = 'https://api.ksamerchant.geidea.net/pgw/api/v1/direct/order/';
const ORDERS_BY_REFERENCE_ENDPOINT = 'https://api.ksamerchant.geidea.net/pgw/api/v1/direct/order';
const REFUND_ENDPOINT = 'https://api.ksamerchant.geidea.net/pgw/api/v1/direct/refund';

function getEnvironment() {
  const environment = String(process.env.GEIDEA_ENV || 'test').trim().toLowerCase();
  if (!['test', 'live'].includes(environment)) {
    throw new Error('GEIDEA_ENV يجب أن يكون test أو live.');
  }
  if (environment === 'live' && !require('./config').isProduction()) {
    throw new Error('الدفع الحقيقي متاح فقط في بيئة الإنتاج.');
  }
  return environment;
}

function credentials() {
  const environment = getEnvironment();
  const prefix = environment === 'live' ? 'GEIDEA_LIVE' : 'GEIDEA_TEST';
  const publicKey = String(process.env[`${prefix}_PUBLIC_KEY`] || '');
  const password = String(process.env[`${prefix}_API_PASSWORD`] || '');
  if (!publicKey || !password) {
    throw new Error(`بيانات Geidea لـ ${environment} غير مكتملة.`);
  }
  return { publicKey, password };
}

function authHeader(publicKey, password) {
  return `Basic ${Buffer.from(`${publicKey}:${password}`).toString('base64')}`;
}

function makeTimestamp() {
  return new Date().toISOString().slice(0, 19).replace(/-/g, '/').replace('T', ' ');
}

function makeSignature(publicKey, amount, currency, reference, timestamp, password) {
  const payload = `${publicKey}${Number(amount).toFixed(2)}${currency}${reference}${timestamp}`;
  return crypto.createHmac('sha256', password).update(payload).digest('base64');
}

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(body.responseCode || body.code || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
    const detail = String(body.detailedResponseMessage || body.responseMessage || body.message || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[A-Za-z0-9_-]{24,}/g, '[محذوف]')
      .replace(/\s+/g, ' ').trim().slice(0, 120);
    const diagnostics = [code && `رمز ${code}`, detail].filter(Boolean).join('، ');
    const error = new Error(`تعذر تنفيذ الطلب لدى Geidea${diagnostics ? `: ${diagnostics}` : ''}.`);
    error.status = 502;
    error.expose = true;
    error.code = code || undefined;
    throw error;
  }
  return body;
}

async function createSession({ amount, reference, callbackUrl, returnUrl, customer }) {
  const { publicKey, password } = credentials();
  const timestamp = makeTimestamp();
  const currency = 'SAR';
  const response = await fetch(SESSION_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: authHeader(publicKey, password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Number(Number(amount).toFixed(2)),
      currency,
      timestamp,
      merchantReferenceId: reference,
      signature: makeSignature(publicKey, amount, currency, reference, timestamp, password),
      paymentOperation: 'Pay',
      language: 'ar',
      callbackUrl,
      returnUrl,
      customer: {
        email: customer.email,
        firstName: String(customer.name || 'Customer').slice(0, 80),
      },
      order: { description: 'Tas3eerah monthly subscription' },
    }),
  });
  const body = await readResponse(response);
  const sessionId = body.session?.id || body.sessionId;
  if (typeof sessionId !== 'string' || !sessionId) {
    const fields = Object.keys(body).join(', ') || 'none';
    const code = String(body.responseCode || body.code || 'unknown');
    const detail = String(body.detailedResponseMessage || body.responseMessage || '')
      .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 120);
    const error = new Error(`لم تُرجع Geidea معرّف جلسة دفع صالحاً (رمز ${code}; الحقول ${fields}; ${detail}).`);
    error.status = 502;
    error.expose = true;
    throw error;
  }
  return { sessionId, publicKey };
}

async function getOrder(orderId) {
  const { publicKey, password } = credentials();
  const response = await fetch(`${ORDER_ENDPOINT}${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authHeader(publicKey, password) },
  });
  return readResponse(response);
}

async function getOrdersByReference(reference) {
  const { publicKey, password } = credentials();
  const url = new URL(ORDERS_BY_REFERENCE_ENDPOINT);
  url.searchParams.set('MerchantReferenceId', reference);
  const response = await fetch(url, {
    headers: { Authorization: authHeader(publicKey, password) },
  });
  return readResponse(response);
}

async function refundPayment({ orderId, amount }) {
  const { publicKey, password } = credentials();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh', month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const timestamp = `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second} ${parts.dayPeriod}`;
  const refundAmount = Number(Number(amount).toFixed(2));
  const signatureData = `${timestamp}${publicKey}${refundAmount}${orderId}`;
  const signature = crypto.createHmac('sha256', password).update(signatureData).digest('base64');
  const response = await fetch(REFUND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: authHeader(publicKey, password),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ orderId, refundAmount, timestamp, signature }),
  });
  return readResponse(response);
}

module.exports = { createSession, getOrder, getOrdersByReference, refundPayment, getEnvironment };
