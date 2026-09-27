'use strict';

const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { APP_URL } = require('./config');

const HOST = process.env.PRIVATE_EMAIL_HOST || 'mail.privateemail.com';
const SMTP_PORT = Number(process.env.PRIVATE_EMAIL_SMTP_PORT || 465);
const IMAP_PORT = Number(process.env.PRIVATE_EMAIL_IMAP_PORT || 993);

function address(settings = {}) {
  return String(settings.mailbox_email || process.env.PRIVATE_EMAIL_ADDRESS || 'info@tas3eerah.com').trim();
}

function receiveAddress(settings = {}) {
  return String(settings.mailbox_receive_email || address(settings)).trim();
}

function displayName(settings = {}) {
  return String(settings.mailbox_name || 'تسعيرة').trim();
}

function sendPassword() {
  return process.env.PRIVATE_EMAIL_PASSWORD || '';
}

function receivePassword(settings = {}) {
  return receiveAddress(settings) !== address(settings)
    ? (process.env.PRIVATE_EMAIL_RECEIVE_PASSWORD || '')
    : sendPassword();
}

function isSendConfigured(settings = {}) {
  return Boolean(sendPassword() && emailLooksValid(address(settings)));
}

function isReceiveConfigured(settings = {}) {
  return Boolean(receivePassword(settings) && emailLooksValid(receiveAddress(settings)));
}

function emailLooksValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicConfig(settings = {}) {
  return {
    address: address(settings),
    send_address: address(settings),
    receive_address: receiveAddress(settings),
    name: displayName(settings),
    host: HOST,
    smtp_port: SMTP_PORT,
    imap_port: IMAP_PORT,
    configured: isSendConfigured(settings) && isReceiveConfigured(settings),
    send_configured: isSendConfigured(settings),
    receive_configured: isReceiveConfigured(settings),
    separate_accounts: address(settings) !== receiveAddress(settings),
  };
}

function smtpTransport(settings = {}) {
  if (!isSendConfigured(settings)) throw new Error('لم يتم إعداد كلمة مرور صندوق البريد في Secrets');
  return nodemailer.createTransport({
    host: HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: address(settings), pass: sendPassword() },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 12000,
  });
}

async function verifySend(settings = {}) {
  const transporter = smtpTransport(settings);
  try {
    await transporter.verify();
    return true;
  } finally {
    transporter.close();
  }
}

async function sendHtml(to, subject, html, settings = {}, replyTo = null, inlineImages = []) {
  const recipient = String(to || '').trim();
  if (!emailLooksValid(recipient)) throw new Error('البريد المستلم غير صحيح');
  const from = address(settings);
  const transporter = smtpTransport(settings);
  const attachments = (Array.isArray(inlineImages) ? inlineImages : [])
    .filter((asset) => asset?.path && asset?.cid)
    .map((asset) => ({
      filename: asset.name || 'asset',
      path: asset.path,
      cid: asset.cid,
      contentType: asset.type || undefined,
      contentDisposition: 'inline',
    }));
  try {
    const result = await transporter.sendMail({
      from: { name: displayName(settings), address: from },
      to: recipient,
      subject: String(subject || ''),
      html: String(html || ''),
      replyTo: emailLooksValid(String(replyTo || '')) ? String(replyTo) : from,
      attachments,
    });
    // SMTP delivery succeeds independently from the optional Sent-folder copy.
    try {
      await appendMessage('sent', buildRawMessage({
        from,
        to: recipient,
        subject: String(subject || ''),
        html: String(html || ''),
        replyTo: emailLooksValid(String(replyTo || '')) ? String(replyTo) : from,
        settings,
      }), settings, true);
    } catch {
      // A failed archival copy must not report a successful delivery as failed.
    }
    return result;
  } finally {
    transporter.close();
  }
}

function encodeHeader(value) {
  const content = String(value || '');
  return /^[\x00-\x7f]*$/.test(content)
    ? content
    : `=?UTF-8?B?${Buffer.from(content, 'utf8').toString('base64')}?=`;
}

function buildRawMessage({ from, to, subject, html, replyTo, settings }) {
  const safeName = displayName(settings).replace(/[\r\n"]/g, '');
  const safeFrom = from.replace(/[\r\n<>]/g, '');
  const safeTo = to.replace(/[\r\n<>]/g, '');
  const safeReply = String(replyTo || from).replace(/[\r\n<>]/g, '');
  const safeSubject = encodeHeader(subject);
  return [
    `From: "${safeName}" <${safeFrom}>`,
    `To: <${safeTo}>`,
    `Subject: ${safeSubject}`,
    `Reply-To: <${safeReply}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    String(html || '').replace(/\r?\n/g, '\r\n'),
  ].join('\r\n');
}

function folderDefinitions() {
  return {
    inbox: { label: 'الوارد', aliases: ['inbox'] },
    sent: { label: 'المرسل', aliases: ['sent', 'sent items', 'sent mail', 'inbox.sent'] },
    drafts: { label: 'المسودات', aliases: ['drafts', 'draft'] },
    spam: { label: 'المزعجة', aliases: ['junk', 'spam', 'inbox.junk', 'inbox.spam'] },
    trash: { label: 'المحذوفة', aliases: ['trash', 'deleted', 'deleted items', 'inbox.trash'] },
  };
}

function normalizeFolder(value) {
  const folder = String(value || 'inbox').trim().toLowerCase();
  if (!Object.hasOwn(folderDefinitions(), folder)) throw new Error('مجلد البريد غير صحيح');
  return folder;
}

function accountForFolder(folder, settings) {
  return ['sent', 'drafts'].includes(folder) ? address(settings) : receiveAddress(settings);
}

function passwordForFolder(folder, settings) {
  return ['sent', 'drafts'].includes(folder) ? sendPassword() : receivePassword(settings);
}

async function connect(folder, settings, writable = false) {
  const account = accountForFolder(folder, settings);
  const password = passwordForFolder(folder, settings);
  const configured = ['sent', 'drafts'].includes(folder) ? isSendConfigured(settings) : isReceiveConfigured(settings);
  if (!configured) throw new Error('لم يتم إعداد كلمة مرور صندوق البريد في Secrets');
  const client = new ImapFlow({
    host: HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: account, pass: password },
    logger: false,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
  });
  try {
    await client.connect();
    return client;
  } catch {
    try { await client.logout(); } catch {}
    throw new Error('تعذر الاتصال بصندوق البريد. تحقق من إعدادات البريد وحاول مرة أخرى.');
  }
}

function resolveMailbox(mailboxes, key) {
  const definition = folderDefinitions()[key];
  for (const mailbox of mailboxes) {
    const name = String(mailbox.name || mailbox.path || '').toLowerCase();
    const specialUse = String(mailbox.specialUse || '').toLowerCase();
    if (definition.aliases.includes(name) || definition.aliases.some((alias) => name.endsWith(`.${alias}`))) {
      return mailbox.path || mailbox.name;
    }
    if (key === 'sent' && specialUse === '\\sent') return mailbox.path || mailbox.name;
    if (key === 'drafts' && specialUse === '\\drafts') return mailbox.path || mailbox.name;
    if (key === 'trash' && specialUse === '\\trash') return mailbox.path || mailbox.name;
    if (key === 'spam' && specialUse === '\\junk') return mailbox.path || mailbox.name;
  }
  if (key === 'inbox') return 'INBOX';
  return definition.aliases[0];
}

async function withMailbox(folder, settings, writable, callback) {
  const key = normalizeFolder(folder);
  const client = await connect(key, settings, writable);
  let lock;
  try {
    const mailboxes = await client.list();
    const mailbox = resolveMailbox(mailboxes, key);
    lock = await client.getMailboxLock(mailbox);
    return await callback(client, mailbox);
  } finally {
    lock?.release();
    try { await client.logout(); } catch {}
  }
}

function decodeBody(source) {
  const raw = Buffer.isBuffer(source) ? source.toString('utf8') : String(source || '');
  const split = raw.search(/\r?\n\r?\n/);
  let body = split >= 0 ? raw.slice(split).replace(/^\r?\n\r?\n/, '') : raw;
  if (/content-transfer-encoding:\s*base64/i.test(raw.slice(0, split))) {
    body = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  } else if (/content-transfer-encoding:\s*quoted-printable/i.test(raw.slice(0, split))) {
    body = body.replace(/=\r?\n/g, '').replace(/=([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  return body.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim().slice(0, 12000);
}

function normalizedMessage(message, folder) {
  const envelope = message.envelope || {};
  const from = envelope.from?.[0];
  const to = envelope.to?.[0];
  return {
    uid: Number(message.uid),
    folder,
    subject: String(envelope.subject || '(بدون موضوع)'),
    from: from ? [from.name, from.mailbox && from.host ? `${from.mailbox}@${from.host}` : ''].filter(Boolean).join(' ') : '',
    to: to ? [to.name, to.mailbox && to.host ? `${to.mailbox}@${to.host}` : ''].filter(Boolean).join(' ') : '',
    date: envelope.date ? new Date(envelope.date).toISOString() : '',
    seen: Array.from(message.flags || []).includes('\\Seen'),
    body: decodeBody(message.source),
  };
}

async function folderMessages(folder, settings = {}, limit = 50) {
  const key = normalizeFolder(folder);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  return withMailbox(key, settings, false, async (client) => {
    const messages = [];
    const uids = await client.search({ all: true }, { uid: true });
    for (const uid of (uids || []).sort((a, b) => b - a).slice(0, safeLimit)) {
      const message = await client.fetchOne(uid, {
        uid: true, envelope: true, flags: true, source: true,
      }, { uid: true });
      if (message) messages.push(normalizedMessage(message, key));
    }
    return messages;
  });
}

async function folders(settings = {}) {
  const results = {};
  for (const [key, definition] of Object.entries(folderDefinitions())) {
    try {
      results[key] = await withMailbox(key, settings, false, async (client) => {
        const status = await client.status(resolveMailbox(await client.list(), key), { messages: true, unseen: true });
        return {
          key,
          label: definition.label,
          count: Number(status.messages || 0),
          unread: Number(status.unseen || 0),
        };
      });
    } catch {
      results[key] = { key, label: definition.label, count: 0, unread: 0, available: false };
    }
  }
  return results;
}

async function markFolderRead(uid, folder, settings = {}) {
  const id = Number(uid);
  if (!Number.isInteger(id) || id < 1) throw new Error('معرف الرسالة غير صحيح');
  const key = normalizeFolder(folder);
  return withMailbox(key, settings, true, (client) =>
    client.messageFlagsAdd(id, ['\\Seen'], { uid: true }));
}

async function move(uid, from, to, settings = {}) {
  const id = Number(uid);
  if (!Number.isInteger(id) || id < 1) throw new Error('معرف الرسالة غير صحيح');
  const source = normalizeFolder(from);
  const destination = normalizeFolder(to);
  if (source === destination) throw new Error('المجلد المصدر والهدف متطابقان');
  return withMailbox(source, settings, true, async (client) => {
    const target = resolveMailbox(await client.list(), destination);
    const moved = await client.messageMove(id, target, { uid: true });
    if (!moved) throw new Error('تعذر نقل الرسالة');
  });
}

async function remove(uid, folder, settings = {}) {
  const key = normalizeFolder(folder);
  if (key !== 'trash') return move(uid, key, 'trash', settings);
  const id = Number(uid);
  if (!Number.isInteger(id) || id < 1) throw new Error('معرف الرسالة غير صحيح');
  return withMailbox(key, settings, true, async (client) => {
    await client.messageFlagsAdd(id, ['\\Deleted'], { uid: true });
    await client.expunge();
  });
}

async function appendMessage(folder, content, settings = {}, sent = false) {
  const key = normalizeFolder(folder);
  return withMailbox(key, settings, true, async (client) => {
    const mailbox = resolveMailbox(await client.list(), key);
    await client.append(mailbox, content, ['\\Seen']);
  });
}

async function saveDraft(to, subject, html, settings = {}) {
  const recipient = String(to || '').trim();
  if (recipient && !emailLooksValid(recipient)) throw new Error('البريد المستلم غير صحيح');
  if (!isSendConfigured(settings)) throw new Error('لم يتم إعداد كلمة مرور صندوق البريد في Secrets');
  const raw = buildRawMessage({
    from: address(settings),
    to: recipient,
    subject: subject || '(بدون موضوع)',
    html,
    replyTo: address(settings),
    settings,
  });
  await appendMessage('drafts', raw, settings, false);
}

function simpleMessage(message, title = 'رسالة جديدة') {
  const safe = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const logo = `${String(APP_URL || '').replace(/\/$/, '')}/assets/logo.png`;
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="UTF-8"><body style="margin:0;padding:24px;background:#f8f5ed;color:#17352a;font-family:Arial,Tahoma,sans-serif"><main style="max-width:640px;margin:auto;padding:24px;background:white;border-radius:12px"><img src="${logo}" width="140" alt="تسعيرة"><h1>${safe(title)}</h1><div style="line-height:2">${safe(message).replace(/\n/g, '<br>')}</div></main></body></html>`;
}

module.exports = {
  address,
  receiveAddress,
  displayName,
  isSendConfigured,
  isReceiveConfigured,
  publicConfig,
  verifySend,
  sendHtml,
  folderMessages,
  folders,
  markFolderRead,
  move,
  delete: remove,
  saveDraft,
  simpleMessage,
};