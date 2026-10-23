'use strict';

const crypto = require('node:crypto');

const SESSION_ENDPOINT = 'https://api.merchant.geidea.net/payment-intent/api/v2/direct/session';
const ORDER_ENDPOINT = 'https://api.ksamerchant.geidea.net/pgw/api/v1/direct/order/';

function credentials() {
  const publicKey = String(process.env.GEIDEA_TEST_PUBLIC_KEY || '');
  const password = String(process.env.GEIDEA_TEST_API_PASSWORD || '');
  if (!publicKey || !password) throw new Error('بيانات جيديا التجريبية غير مكتملة.');
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
    const error = new Error('تعذر إنشاء جلسة الدفع أو التحقق منها لدى جيديا.');
    error.status = response.status;
    throw error;
  }
  return body;
}

async function createSession({ amount, reference, returnUrl, customer }) {
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
      amount: Number(amount).toFixed(2),
      currency,
      timestamp,
      merchantReferenceId: reference,
      signature: makeSignature(publicKey, amount, currency, reference, timestamp, password),
      paymentOperation: 'Pay',
      language: 'ar',
      returnUrl,
      customer: {
        email: customer.email,
        firstName: String(customer.name || 'Customer').slice(0, 80),
      },
      order: { description: 'اشتراك منصة تسعيرة' },
    }),
  });
  const body = await readResponse(response);
  const sessionId = body.session?.id || body.sessionId;
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new Error('لم تُرجع جيديا معرّف جلسة دفع صالحاً.');
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

module.exports = { createSession, getOrder };
