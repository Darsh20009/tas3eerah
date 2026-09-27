'use strict';

const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('./config');
const auth = require('./auth');

const router = express.Router();
const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PROFILE_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
let appleJwks = null;

function googleCredentials() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  };
}

function appleCredentials() {
  return {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKey: String(process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
}

function redirectUri(provider) {
  return `${String(config.APP_URL).replace(/\/+$/, '')}/auth/${provider}/callback`;
}

function redirectError(res, error) {
  const messages = {
    google_not_configured: 'لم يتم إعداد تسجيل الدخول عبر Google',
    apple_not_configured: 'لم يتم إعداد تسجيل الدخول عبر Apple',
    cancelled: 'تم إلغاء تسجيل الدخول',
    invalid_oauth_state: 'رابط تسجيل الدخول غير صالح — يرجى المحاولة مجدداً',
    google_auth_failed: 'تعذر تسجيل الدخول عبر Google — حاول مرة أخرى',
    apple_auth_failed: 'تعذر تسجيل الدخول عبر Apple — حاول مرة أخرى',
    apple_no_data: 'لم تصل بيانات تسجيل الدخول من Apple',
    apple_no_id_token: 'لم يصل رمز التحقق من Apple',
    oauth_email_missing: 'لم يوفّر مزوّد تسجيل الدخول بريداً إلكترونياً',
    account_disabled: 'الحساب معطّل — تواصل مع الدعم',
  };
  const message = messages[error] || 'تعذر إتمام تسجيل الدخول — حاول مرة أخرى';
  return res.redirect(`/?oauth_error=${encodeURIComponent(message)}`);
}

function csrfState() {
  return crypto.randomBytes(24).toString('hex');
}

router.get('/google', (req, res) => {
  const { clientId, clientSecret } = googleCredentials();
  if (!clientId || !clientSecret) return redirectError(res, 'google_not_configured');
  const state = csrfState();
  req.session.oauthState = state;
  req.session.oauthProvider = 'google';
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri('google'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return res.redirect(`${GOOGLE_AUTHORIZE_URL}?${query}`);
});

router.get('/google/callback', async (req, res) => {
  if (req.query.error || !req.query.code) {
    return redirectError(res, req.query.error === 'access_denied' || !req.query.error ? 'cancelled' : 'google_auth_failed');
  }
  const state = String(req.query.state || '');
  if (!state || !req.session.oauthState || state !== req.session.oauthState || req.session.oauthProvider !== 'google') {
    return redirectError(res, 'invalid_oauth_state');
  }
  delete req.session.oauthState;
  delete req.session.oauthProvider;

  try {
    const identity = await googleProfile(String(req.query.code));
    const user = await loginOrRegister(req, identity, 'google');
    if (user?.error) return redirectError(res, user.error);
    return res.redirect('/dashboard');
  } catch {
    return redirectError(res, 'google_auth_failed');
  }
});

router.get('/apple', (req, res) => {
  const credentials = appleCredentials();
  if (!credentials.clientId || !credentials.teamId || !credentials.keyId || !credentials.privateKey) {
    return redirectError(res, 'apple_not_configured');
  }
  const { clientId } = credentials;
  const state = csrfState();
  const nonce = csrfState();
  req.session.oauthState = state;
  req.session.oauthNonce = nonce;
  req.session.oauthProvider = 'apple';
  // Apple's form_post callback is cross-site. Lax cookies are not sent on that POST.
  req.session.cookie.sameSite = 'none';
  req.session.cookie.secure = true;
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri('apple'),
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce: crypto.createHash('sha256').update(nonce).digest('hex'),
  });
  return res.redirect(`${APPLE_AUTHORIZE_URL}?${query}`);
});

router.get('/apple/callback', (req, res) => handleAppleCallback(req, res, req.query || {}));
router.post('/apple/callback', (req, res) => handleAppleCallback(req, res, req.body || {}));

async function handleAppleCallback(req, res, body) {
  if (!body.code && !body.id_token) return redirectError(res, 'apple_no_data');
  const state = String(body.state || '');
  if (!state || !req.session.oauthState || state !== req.session.oauthState || req.session.oauthProvider !== 'apple') {
    return redirectError(res, 'invalid_oauth_state');
  }
  req.session.cookie.sameSite = 'lax';
  const expectedNonce = req.session.oauthNonce;
  delete req.session.oauthState;
  delete req.session.oauthNonce;
  delete req.session.oauthProvider;

  try {
    const credentials = appleCredentials();
    if (body.code && (!credentials.teamId || !credentials.keyId || !credentials.privateKey)) {
      return redirectError(res, 'apple_not_configured');
    }
    const tokens = body.code ? await exchangeAppleCode(String(body.code), credentials) : {};
    const token = tokens.id_token || String(body.id_token || '');
    if (!token) return redirectError(res, 'apple_no_id_token');
    const identity = await verifyAppleToken(token, credentials.clientId, expectedNonce);
    const userInfo = parseAppleUser(body.user);
    identity.name = userInfo.name || identity.name || identity.email;
    const user = await loginOrRegister(req, identity, 'apple');
    if (user?.error) return redirectError(res, user.error);
    return res.redirect('/dashboard');
  } catch {
    return redirectError(res, 'apple_auth_failed');
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json', ...(options?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('OAuth provider request failed');
  return data;
}

async function googleProfile(code) {
  const { clientId, clientSecret } = googleCredentials();
  const form = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri('google'),
    grant_type: 'authorization_code',
  });
  const tokens = await fetchJson(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!tokens.access_token) throw new Error('Google access token was not returned');
  const profile = await fetchJson(GOOGLE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profile.email || profile.email_verified !== true) throw new Error('Google email is not verified');
  return {
    email: String(profile.email).trim().toLowerCase(),
    name: String(profile.name || profile.email).trim(),
  };
}

async function appleClientSecret(credentials) {
  const { SignJWT } = await import('jose');
  const privateKey = crypto.createPrivateKey(credentials.privateKey);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' })
    .setIssuer(credentials.teamId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(credentials.clientId)
    .sign(privateKey);
}

async function exchangeAppleCode(code, credentials) {
  if (!code) throw new Error('Apple authorization code is missing');
  const clientSecret = await appleClientSecret(credentials);
  const form = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri('apple'),
  });
  return fetchJson(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
}

async function verifyAppleToken(token, clientId, expectedNonce) {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  if (!appleJwks) appleJwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  const verified = await jwtVerify(token, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: clientId,
    algorithms: ['RS256'],
  });
  const payload = verified.payload;
  const expected = crypto.createHash('sha256').update(String(expectedNonce || '')).digest('hex');
  if (!expectedNonce || payload.nonce !== expected) throw new Error('Apple nonce verification failed');
  if (!payload.email || payload.email_verified === false) throw new Error('Apple email is not verified');
  return {
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.email).trim(),
    providerId: String(payload.sub || ''),
  };
}

function parseAppleUser(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const name = parsed?.name || {};
    return { name: [name.firstName, name.lastName].filter(Boolean).join(' ').trim() };
  } catch {
    return {};
  }
}

async function loginOrRegister(req, identity, provider) {
  const email = String(identity.email || '').trim().toLowerCase();
  if (!email) return { error: 'oauth_email_missing' };
  let user = await db.findOne('users', { email });
  if (user) {
    if (!Number(user.is_active)) return { error: 'account_disabled' };
    await auth.setAuthenticatedUser(req, user.id);
    await db.insertDoc('activity_log', {
      user_id: Number(user.id),
      action: 'oauth_login',
      details: provider,
      ip: req.ip || '',
    });
    return user;
  }

  const id = await db.insertDoc('users', {
    name: String(identity.name || email).trim(),
    email,
    password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
    role: 'client',
    plan: 'free',
    plan_expires_at: null,
    is_active: 1,
  });
  await auth.setAuthenticatedUser(req, id);
  await db.insertDoc('activity_log', {
    user_id: Number(id),
    action: 'oauth_register',
    details: provider,
    ip: req.ip || '',
  });
  return await db.findOne('users', { id: Number(id) });
}

module.exports = router;