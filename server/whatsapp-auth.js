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
  let result = null;
  try {
    const body = await response.text();
    if (body) result = JSON.parse(body);
  } catch {
    // Some successful providers return an empty or non-JSON acknowledgement.
  }
  const providerStatus = String(result?.status || '').toLowerCase();
  const providerRejected = result && (
    result.success === false ||
    result.ok === false ||
    ['error', 'failed', 'rejected'].includes(providerStatus) ||
    (result.error !== undefined && result.error !== null && result.error !== false && result.error !== '')
  );
  const providerCode = typeof result?.code === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(result.code)
    ? `_${result.code}`
    : '';
  if (!response.ok || providerRejected) {
    throw new Error(`WHATSAPP_DELIVERY_${response.status}${providerCode}`);
  }
  return true;
}

module.exports = { normalizePhone, hashCode, sendCode };
