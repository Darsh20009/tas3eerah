'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const db = require('./server/db');
const config = require('./server/config');
const auth = require('./server/auth');
const dashboardData = require('./server/dashboard-data');
const tools = require('./server/tools');
const classicTools = require('./server/classic-tools');
const policies = require('./server/policies');
const DatabaseSessionStore = require('./server/session-store');

const root = __dirname;
const legacyDocument = path.join(root, 'attached_assets', 'index_1789370030522.html');
const secret = process.env.SESSION_SECRET ||
  (config.isProduction() ? null : crypto.randomBytes(32).toString('hex'));
if (!secret) throw new Error('SESSION_SECRET is required in production.');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('views', path.join(root, 'views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(session({
  name: 'TAS3_SESS',
  secret,
  store: new DatabaseSessionStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction() ? 'auto' : false,
    maxAge: config.SESSION_LIFETIME * 1000,
    path: '/',
  },
}));
app.use('/assets', express.static(path.join(root, 'assets'), {
  fallthrough: false, maxAge: '1h',
}));

const assetVersion = () => String(Math.floor(fs.statSync(path.join(root, 'assets/css/app.css')).mtimeMs));

app.use('/api/auth', require('./server/api/auth'));
app.use('/api/quotes', require('./server/api/quotes'));
app.use('/api/messages', require('./server/api/messages'));
app.use('/api/admin', require('./server/api/admin'));
app.use('/api/contact', require('./server/api/contact'));
app.use('/auth', require('./server/oauth'));
app.all('/api/{*path}', (req, res) => res.status(404).json({
  success: false, error: 'المسار المطلوب غير موجود',
}));

app.get('/favicon.ico', (req, res) => res.sendFile(path.join(root, 'assets/icons/icon-192.png')));
app.get('/policies', (req, res) => res.render('policies', { ...policies, assetVersion: assetVersion() }));
app.get('/legacy-calculator.html', (req, res) =>
  res.sendFile(path.join(root, 'legacy-calculator.html')));
app.get('/classic-tools', (req, res) => {
  let html = fs.readFileSync(legacyDocument, 'utf8');
  if (req.query.embed === '1') {
    html = html.replace('</head>', '<script src="/assets/js/currency.js?v=2"></script></head>');
    const selected = String(req.query.tool || '');
    if (selected && Object.hasOwn(tools, selected)) {
      html = html.replace('</body>', `<script>window.goHome=function(){location.href='/dashboard'};document.addEventListener('DOMContentLoaded',function(){openTool(${JSON.stringify(selected)})});</script></body>`);
    }
  }
  res.type('html').set('Cache-Control', 'no-store').send(html);
});

app.use(auth.loadUser);
app.get('/', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  return res.render('landing', {
    plans: config.PLANS,
    csrfToken: auth.csrfToken(req),
    openAccessMode: false,
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    appleEnabled: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
    oauthError: String(req.query.oauth_error || ''),
    assetVersion: assetVersion(),
  });
});

function requirePage(req, res, next) {
  if (!req.user) return res.redirect('/');
  return next();
}

app.get('/dashboard', requirePage, async (req, res, next) => {
  try {
    const data = await dashboardData(req.user);
    res.render('dashboard', { ...data, csrfToken: auth.csrfToken(req), assetVersion: assetVersion() });
  } catch (error) {
    next(error);
  }
});

async function calculatorPage(req, res, next) {
  try {
    const slug = req.params.slug || String(req.query.tool || '');
    const tool = tools[slug];
    if (!tool) return res.redirect('/dashboard');
    if (!auth.planAllows(req.user, tool.plan)) return res.redirect('/dashboard?tool_locked=1');
    const effectivePlan = auth.effectivePlan(req.user);
    return res.render('calculator', {
      user: req.user,
      plan: config.PLANS[effectivePlan] || config.PLANS.free,
      effectivePlan,
      plans: config.PLANS,
      isAdmin: req.user.role === 'admin',
      csrfToken: auth.csrfToken(req),
      tool: { ...tool, slug },
      toolMap: tools,
      classicTools,
      openAccessMode: false,
      assetVersion: assetVersion(),
    });
  } catch (error) {
    return next(error);
  }
}
app.get('/calculator/:slug', requirePage, calculatorPage);
app.get('/calculator', requirePage, calculatorPage);
app.get('/logout', requirePage, async (req, res, next) => {
  try {
    await auth.logout(req);
    res.clearCookie('TAS3_SESS', { path: '/' });
    res.redirect('/');
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => res.status(404).type('html').send(
  '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>الصفحة غير موجودة | تسعيرة</title><body style="font-family:Arial,sans-serif;padding:48px"><h1>الصفحة غير موجودة</h1><a href="/">العودة للرئيسية</a></body></html>'
));
app.use((error, req, res, next) => {
  console.error('[request failed]', error);
  if (res.headersSent) return next(error);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, error: 'تعذر إتمام الطلب حالياً' });
  }
  return res.status(500).type('html').send(
    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>خطأ | تسعيرة</title><body style="font-family:Arial,sans-serif;padding:48px"><h1>تعذر عرض الصفحة حالياً</h1><a href="/">العودة للرئيسية</a></body></html>'
  );
});

async function start() {
  await db.init();
  const port = Number(process.env.PORT) || 5000;
  return app.listen(port, '0.0.0.0', () => {
    console.log(`Tas3eerah JavaScript server listening on ${port}`);
  });
}

if (require.main === module) {
  start().catch(error => {
    console.error('[startup failed]', error);
    process.exitCode = 1;
  });
}

module.exports = { app, start };