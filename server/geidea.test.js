'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const geidea = require('./geidea');

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
      returnUrl: 'https://example.test/dashboard',
      customer: { email: 'client@example.test', name: 'Test Client' },
    });
    assert.equal(result.sessionId, 'session-test-id');
    assert.equal(result.publicKey, 'public-test-key');
    assert.match(received.url, /api\.ksamerchant\.geidea\.net\/payment-intent\/api\/v2\/direct\/session$/);
    const payload = JSON.parse(received.options.body);
    assert.equal(payload.amount, 49);
    assert.equal(payload.currency, 'SAR');
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
