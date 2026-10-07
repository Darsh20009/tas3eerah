'use strict';

// Explicit live-development check: never run against production, and remove
// only the newly created fixture account's records in finally.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { request } = require('playwright-core');
const config = require('../server/config');
const db = require('../server/db');

async function main() {
  if (config.APP_ENV === 'production' || config.MONGODB_DB_NAME !== 'tas3eerah_dev') {
    throw new Error('Live mutation checks are restricted to tas3eerah_dev');
  }
  if (!process.env.REPLIT_DEV_DOMAIN) throw new Error('Development preview is required');
  let api, userId;
  await db.init();
  try {
    const password = crypto.randomUUID();
    const email = `calculator-check-${crypto.randomUUID()}@example.invalid`;
    userId = await db.insertDoc('users', {
      name: 'حساب تحقق مؤقت', email, password_hash: await bcrypt.hash(password, 10),
      role: 'client', plan: 'free', is_active: 1, plan_expires_at: null,
    });
    api = await request.newContext({ baseURL: 'https://' + process.env.REPLIT_DEV_DOMAIN });
    const token = (await (await api.get('/api/auth?action=csrf')).json()).data.csrf_token;
    const post = async (path, data) => {
      const response = await api.post(path, { headers: { 'X-CSRF-Token': token }, data });
      const result = await response.json();
      assert.ok(response.ok() && result.success, 'Development API operation must succeed');
      return result.data;
    };
    await post('/api/auth', { action: 'login', email, password });
    const state = { version: 1, tool: 'services', actions: [], fields: [{ selector: '#verification', value: '123' }] };
    const saved = await post('/api/calculators', {
      action: 'save', tool: 'services', title: 'تحقق حفظ مؤقت', price: 123, currency_code: 'USD', state,
    });
    const result = (await (await api.get('/api/calculators?action=get&id=' + saved.id)).json()).data;
    assert.equal(result.state.fields[0].value, '123');
    assert.equal(result.currency_code, 'USD');
    const restored = (await (await api.get('/api/calculators?action=state&tool=services')).json()).data;
    assert.equal(restored.state.fields[0].value, '123');
    await post('/api/calculators', {
      action: 'share_price', tool: 'services', participant_type: 'consumer',
      product: 'تحقق مشاركة مؤقت', sector: 'خدمات', city: 'الرياض', unit: 'للخدمة', price: 123, currency_code: 'USD',
    });
    const shares = (await (await api.get('/api/calculators?action=shares')).json()).data;
    assert.equal(shares.points, 1);
    assert.equal(shares.entries[0].currency_code, 'USD');
    assert.equal(shares.entries[0].unit, 'للخدمة');
    await post('/api/calculators', { action: 'delete', id: saved.id });
    assert.equal(await db.count('calculator_results', { user_id: userId }), 0);
    console.log('Live MongoDB save/state/read/delete and price-sharing checks passed.');
  } finally {
    if (api) {
      try { await api.get('/logout'); } finally { await api.dispose(); }
    }
    if (userId) {
      for (const collection of ['calculator_results', 'calculator_states', 'price_shares', 'activity_log']) {
        while (await db.count(collection, { user_id: userId })) await db.deleteDoc(collection, { user_id: userId });
      }
      await db.deleteDoc('users', { id: userId });
      console.log('Temporary development fixture records removed.');
    }
    await db.close();
  }
}
main().catch(() => { console.error('Live MongoDB calculator check failed.'); process.exitCode = 1; });
