'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
process.env.PRIVATE_EMAIL_PASSWORD = 'isolated-mail-test-password';
const mail = require('./email');
const settings = { mailbox_email: 'mailbox@example.invalid' };
const original = Object.fromEntries(['connect', 'logout', 'list', 'status', 'getMailboxLock']
  .map(key => [key, ImapFlow.prototype[key]]));
const originalTransport = nodemailer.createTransport;
after(() => {
  Object.assign(ImapFlow.prototype, original);
  nodemailer.createTransport = originalTransport;
});
let logoutCalls = 0;
ImapFlow.prototype.logout = async () => { logoutCalls++; };
ImapFlow.prototype.list = async () => [{ path: 'INBOX' }];
ImapFlow.prototype.status = async () => ({ messages: 4, unseen: 1 });
ImapFlow.prototype.getMailboxLock = async () => ({ release() {} });
const rejectedLogin = () => Object.assign(new Error('isolated authentication failure'), { authenticationFailed: true });

test('a mailbox list cannot report empty folders when every connection fails', async () => {
  ImapFlow.prototype.connect = async () => { throw rejectedLogin(); };
  await assert.rejects(mail.folders(settings), { code: 'IMAP_AUTH_FAILED' });
  await assert.rejects(mail.verifyReceive(settings), { code: 'IMAP_AUTH_FAILED' });
});

test('partial folder failures remain explicit while available folder counts survive', async () => {
  let calls = 0;
  ImapFlow.prototype.connect = async () => {
    if (++calls === 1) throw rejectedLogin();
  };
  const folders = await mail.folders(settings);
  assert.equal(folders.inbox.available, false);
  assert.equal(folders.inbox.count, 0);
  assert.ok(Object.values(folders).some(folder => folder.count === 4));
});

test('receive verification opens and closes an authenticated connection without fetching messages', async () => {
  ImapFlow.prototype.connect = async () => {};
  const before = logoutCalls;
  assert.equal(await mail.verifyReceive(settings), true);
  assert.equal(logoutCalls, before + 1);
});

test('SMTP verification requires encryption and closes the transport on auth rejection', async () => {
  let options, closes = 0;
  nodemailer.createTransport = config => {
    options = config;
    return {
      verify: async () => { throw Object.assign(new Error('isolated SMTP failure'), { code: 'EAUTH' }); },
      close: () => { closes++; },
      sendMail: () => { assert.fail('connection checks must not send a message'); },
    };
  };
  await assert.rejects(mail.verifySend(settings, { port: 587, authMethod: 'LOGIN' }), { code: 'EAUTH' });
  assert.equal(options.secure, false);
  assert.equal(options.requireTLS, true);
  assert.equal(options.authMethod, 'LOGIN');
  assert.equal(closes, 1);
  await assert.rejects(mail.verifySend(settings, { port: 465 }), { code: 'EAUTH' });
  assert.equal(options.secure, true);
  assert.equal(closes, 2);
});
