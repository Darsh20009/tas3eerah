'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const geidea = require('./geidea');

test('Geidea defaults to test mode and rejects live mode outside production', () => {
  const previous = process.env.GEIDEA_ENV;
  try {
    delete process.env.GEIDEA_ENV;
    assert.equal(geidea.getEnvironment(), 'test');
    process.env.GEIDEA_ENV = 'invalid';
    assert.throws(() => geidea.getEnvironment(), /GEIDEA_ENV/);
    process.env.GEIDEA_ENV = 'live';
    assert.throws(() => geidea.getEnvironment(), /فقط في بيئة الإنتاج/);
  } finally {
    if (previous === undefined) delete process.env.GEIDEA_ENV;
    else process.env.GEIDEA_ENV = previous;
  }
});

test('Geidea session creation signs the server-side amount and returns only the hosted session reference', async () => {
  const previous = {
    publicKey: process.env.GEIDEA_TEST_PUBLIC_KEY,
    password: process.env.GEIDEA_TEST_API_PASSWORD,
    fetch: global.fetch,
  };
  process.env.GEIDEA_TEST_PUBLIC_KEY = 'public-test-key';
  process.env.GEIDEA_TEST_API_PASSWORD = 'private-test-password';
  let received;
  global.fetch = async (url, options) => {
    received = { url, options };
    return { ok: true, json: async () => ({ session: { id: 'session-test-id' } }) };
  };
  try {
    const result = await geidea.createSession({
      amount: 49, reference: 'TAS-test-reference',
      callbackUrl: 'https://example.test/api/payments/geidea-callback',
      returnUrl: 'https://example.test/dashboard',
      customer: { email: 'client@example.test', name: 'Test Client' },
    });
    assert.equal(result.sessionId, 'session-test-id');
    assert.equal(result.publicKey, 'public-test-key');
    assert.match(received.url, /api\.ksamerchant\.geidea\.net\/payment-intent\/api\/v2\/direct\/session$/);
    const payload = JSON.parse(received.options.body);
    assert.equal(payload.amount, 49);
    assert.equal(payload.currency, 'SAR');
    assert.equal(payload.callbackUrl, 'https://example.test/api/payments/geidea-callback');
    const signed = `public-test-key49.00SARTAS-test-reference${payload.timestamp}`;
    assert.equal(
      payload.signature,
      crypto.createHmac('sha256', 'private-test-password').update(signed).digest('base64'),
    );
    assert.equal(received.options.headers.Authorization.startsWith('Basic '), true);
  } finally {
    global.fetch = previous.fetch;
    if (previous.publicKey === undefined) delete process.env.GEIDEA_TEST_PUBLIC_KEY;
    else process.env.GEIDEA_TEST_PUBLIC_KEY = previous.publicKey;
    if (previous.password === undefined) delete process.env.GEIDEA_TEST_API_PASSWORD;
    else process.env.GEIDEA_TEST_API_PASSWORD = previous.password;
  }
});

test('Geidea order lookup uses the KSA endpoint and reports provider failures without leaking response bodies', async () => {
  const previous = {
    publicKey: process.env.GEIDEA_TEST_PUBLIC_KEY,
    password: process.env.GEIDEA_TEST_API_PASSWORD,
    fetch: global.fetch,
  };
  process.env.GEIDEA_TEST_PUBLIC_KEY = 'public-test-key';
  process.env.GEIDEA_TEST_API_PASSWORD = 'private-test-password';
  global.fetch = async (url) => ({
    ok: true,
    json: async () => ({ order: { id: 'order-test-id' } }),
  });
  try {
    const result = await geidea.getOrder('order-test-id');
    assert.equal(result.order.id, 'order-test-id');
  } finally {
    global.fetch = previous.fetch;
    if (previous.publicKey === undefined) delete process.env.GEIDEA_TEST_PUBLIC_KEY;
    else process.env.GEIDEA_TEST_PUBLIC_KEY = previous.publicKey;
    if (previous.password === undefined) delete process.env.GEIDEA_TEST_API_PASSWORD;
    else process.env.GEIDEA_TEST_API_PASSWORD = previous.password;
  }
});

test('Geidea looks up an order by merchant reference on the KSA endpoint', async () => {
  const previous = {
    publicKey: process.env.GEIDEA_TEST_PUBLIC_KEY,
    password: process.env.GEIDEA_TEST_API_PASSWORD,
    fetch: global.fetch,
  };
  process.env.GEIDEA_TEST_PUBLIC_KEY = 'public-test-key';
  process.env.GEIDEA_TEST_API_PASSWORD = 'private-test-password';
  let requestUrl;
  global.fetch = async (url) => {
    requestUrl = new URL(url);
    return { ok: true, json: async () => ({ orders: [{ status: 'Failed' }] }) };
  };
  try {
    const result = await geidea.getOrdersByReference('TESTREFERENCE123456');
    assert.equal(requestUrl.host, 'api.ksamerchant.geidea.net');
    assert.equal(requestUrl.pathname, '/pgw/api/v1/direct/order');
    assert.equal(requestUrl.searchParams.get('MerchantReferenceId'), 'TESTREFERENCE123456');
    assert.equal(result.orders[0].status, 'Failed');
  } finally {
    global.fetch = previous.fetch;
    if (previous.publicKey === undefined) delete process.env.GEIDEA_TEST_PUBLIC_KEY;
    else process.env.GEIDEA_TEST_PUBLIC_KEY = previous.publicKey;
    if (previous.password === undefined) delete process.env.GEIDEA_TEST_API_PASSWORD;
    else process.env.GEIDEA_TEST_API_PASSWORD = previous.password;
  }
});

test('Geidea returns safe provider diagnostics without exposing long identifiers', async () => {
  const previous = {
    publicKey: process.env.GEIDEA_TEST_PUBLIC_KEY,
    password: process.env.GEIDEA_TEST_API_PASSWORD,
    fetch: global.fetch,
  };
  process.env.GEIDEA_TEST_PUBLIC_KEY = 'public-test-key';
  process.env.GEIDEA_TEST_API_PASSWORD = 'private-test-password';
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      responseCode: '035',
      detailedResponseMessage: 'Invalid request',
      token: 'this-is-a-long-private-session-identifier-1234567890',
    }),
  });
  try {
    await assert.rejects(geidea.getOrder('order-test-id'), error => {
      assert.equal(error.status, 502);
      assert.equal(error.expose, true);
      assert.match(error.message, /035/);
      assert.match(error.message, /Invalid request/);
      assert.doesNotMatch(error.message, /private-session-identifier/);
      return true;
    });
  } finally {
    global.fetch = previous.fetch;
    if (previous.publicKey === undefined) delete process.env.GEIDEA_TEST_PUBLIC_KEY;
    else process.env.GEIDEA_TEST_PUBLIC_KEY = previous.publicKey;
    if (previous.password === undefined) delete process.env.GEIDEA_TEST_API_PASSWORD;
    else process.env.GEIDEA_TEST_API_PASSWORD = previous.password;
  }
});

test('Geidea refund uses the KSA refund endpoint and signs the full refund request', async () => {
  const previous = {
    publicKey: process.env.GEIDEA_TEST_PUBLIC_KEY,
    password: process.env.GEIDEA_TEST_API_PASSWORD,
    fetch: global.fetch,
  };
  process.env.GEIDEA_TEST_PUBLIC_KEY = 'public-test-key';
  process.env.GEIDEA_TEST_API_PASSWORD = 'private-test-password';
  let received;
  global.fetch = async (url, options) => {
    received = { url, options };
    return { ok: true, json: async () => ({ order: { status: 'Success', detailedStatus: 'Refunded' } }) };
  };
  try {
    const result = await geidea.refundPayment({ orderId: 'order-test-id', amount: 39 });
    assert.equal(result.order.detailedStatus, 'Refunded');
    assert.match(received.url, /api\.ksamerchant\.geidea\.net\/pgw\/api\/v1\/direct\/refund$/);
    const payload = JSON.parse(received.options.body);
    assert.equal(payload.orderId, 'order-test-id');
    assert.equal(payload.refundAmount, 39);
    const signed = `${payload.timestamp}public-test-key39order-test-id`;
    assert.equal(
      payload.signature,
      crypto.createHmac('sha256', 'private-test-password').update(signed).digest('base64'),
    );
  } finally {
    global.fetch = previous.fetch;
    if (previous.publicKey === undefined) delete process.env.GEIDEA_TEST_PUBLIC_KEY;
    else process.env.GEIDEA_TEST_PUBLIC_KEY = previous.publicKey;
    if (previous.password === undefined) delete process.env.GEIDEA_TEST_API_PASSWORD;
    else process.env.GEIDEA_TEST_API_PASSWORD = previous.password;
  }
});
