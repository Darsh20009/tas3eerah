'use strict';

const db = require('./db');
const mail = require('./email');

async function settingsMap() {
  const rows = await db.findAll('settings');
  return Object.fromEntries(rows.filter(row => row.key).map(row => [row.key, row.value || '']));
}

async function deliver(to, subject, message) {
  try {
    const settings = await settingsMap();
    await mail.sendHtml(to, subject, mail.simpleMessage(message, subject), settings);
    return { sent: true };
  } catch (error) {
    console.error('[automatic email failed]', error.code || error.name || 'MAIL_ERROR');
    return { sent: false };
  }
}

async function welcome(user) {
  try {
    const settings = await settingsMap();
    const subject = 'مرحباً بك في تسعيرة';
    const body = settings.welcome_message || `مرحباً ${user.name}، تم إنشاء حسابك في تسعيرة بنجاح. يمكنك تسجيل الدخول والبدء باستخدام أدوات التسعير.`;
    await mail.sendHtml(user.email, subject, mail.simpleMessage(body, subject), settings);
    return { sent: true };
  } catch (error) {
    console.error('[welcome email failed]', error.code || error.name || 'MAIL_ERROR');
    return { sent: false };
  }
}

function quoteReceipt(user, quote) {
  return deliver(user.email, `تم حفظ تسعيرتك رقم ${quote.number}`,
    `مرحباً ${user.name}، تم حفظ تسعيرتك «${quote.title}» برقم ${quote.number}. يمكنك الاطلاع عليها من لوحة التحكم. هذه رسالة تأكيد للحفظ وليست عرضاً مرسلاً من الموظف.`);
}

module.exports = { welcome, quoteReceipt };