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
  let responseBodyType = 'empty';
  try {
    const body = await response.text();
    if (body) {
      try {
        result = JSON.parse(body);
        responseBodyType = result && typeof result === 'object' ? 'json_object' : 'json_value';
      } catch {
        responseBodyType = 'non_json';
      }
    }
  } catch {
    responseBodyType = 'unreadable';
  }
  const providerStatus = String(result?.status || '').toLowerCase();
  const delivery = result?.delivery && typeof result.delivery === 'object' ? result.delivery : null;
  const deliveryStatus = String(delivery?.status || delivery?.state || '').toLowerCase();
  const providerRejected = result && (
    result.success === false ||
    result.ok === false ||
    ['error', 'failed', 'rejected'].includes(providerStatus) ||
    ['error', 'failed', 'rejected'].includes(deliveryStatus) ||
    delivery?.success === false ||
    delivery?.ok === false ||
    (result.error !== undefined && result.error !== null && result.error !== false && result.error !== '')
  );
  const rawProviderCode = result?.code || delivery?.code;
  const providerCode = typeof rawProviderCode === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(rawProviderCode)
    ? `_${rawProviderCode}`
    : '';
  if (!response.ok || providerRejected) {
    throw new Error(`WHATSAPP_DELIVERY_${response.status}${providerCode}`);
  }
  const status = deliveryStatus || providerStatus;
  const deliverySuccess = typeof delivery?.success === 'boolean'
    ? delivery.success
    : typeof delivery?.ok === 'boolean' ? delivery.ok : null;
  return {
    httpStatus: response.status,
    responseBodyType,
    responseKeys: result && typeof result === 'object' ? Object.keys(result).slice(0, 12) : [],
    deliveryKeys: delivery ? Object.keys(delivery).slice(0, 12) : [],
    providerStatus: /^[a-z_-]{1,24}$/.test(status) ? status : (status ? 'other' : 'not_provided'),
    providerSuccess: deliverySuccess !== null
      ? deliverySuccess
      : typeof result?.success === 'boolean'
        ? result.success
        : typeof result?.ok === 'boolean' ? result.ok : 'not_provided',
    hasMessageReference: Boolean(
      result?.messageId || result?.message_id || result?.id ||
      delivery?.messageId || delivery?.message_id || delivery?.id || result?.data?.id
    ),
  };
}

module.exports = { normalizePhone, hashCode, sendCode };
