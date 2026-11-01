'use strict';

const crypto = require('node:crypto');

const WHATSAPP_ENDPOINT = 'https://qiroxstudio.online/api/v1/projects/6a6a913b15f52205956f681b/whatsapp';

function normalizePhone(raw) {
  const phone = String(raw || '').replace(/[^\d+]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return '';
  return phone;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function sendCode(phone, code, name = '') {
  const key = process.env.QIROX_WHATSAPP_API_KEY;
  if (!key) throw new Error('WHATSAPP_AUTH_NOT_CONFIGURED');
  const response = await fetch(WHATSAPP_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      recipient: { phone, name: name || 'عميل تسعيرة' },
      platformName: 'تسعيرة',
      clientName: name || 'عميل تسعيرة',
      code,
      message: `رمز الدخول إلى تسعيرة: ${code}. ينتهي خلال 10 دقائق. لا تشارك الرمز مع أحد.`,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`WHATSAPP_DELIVERY_${response.status}`);
  return true;
}

module.exports = { normalizePhone, hashCode, sendCode };
