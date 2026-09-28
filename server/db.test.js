'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tas3eerah-db-test-'));
const databasePath = path.join(tempDirectory, 'legacy.db');
process.env.APP_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.DB_TEST_SQLITE = '1';
process.env.DB_PATH = databasePath;

// Start from a pre-migration database: verify initialization adds columns and
// tables without replacing the file or disturbing existing user/quote rows.
const legacyDatabase = new Database(databasePath);
legacyDatabase.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    plan TEXT NOT NULL DEFAULT 'free',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL,
    client_id INTEGER,
    employee_id INTEGER,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 15,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO users (name,email,password_hash,role,plan)
    VALUES ('مستخدم محفوظ','saved@example.test','hash-preserved','client','plus');
  INSERT INTO quotes (number,client_id,title)
    VALUES ('QT-0042',1,'عرض محفوظ');
`);
legacyDatabase.close();
const originalInode = fs.statSync(databasePath).ino;

const db = require('./db');

test('SQLite facade keeps legacy rows, enforces safe filters, aggregates and persists sessions', async (t) => {
  await db.init();
  assert.equal(db.getMode(), 'sqlite');
  assert.equal(fs.statSync(databasePath).ino, originalInode, 'initialization must not replace the database file');

  await t.test('legacy rows survive additive schema initialization', async () => {
    const existingUser = await db.findOne('users', { email: 'saved@example.test' });
    assert.equal(existingUser.id, 1);
    assert.equal(existingUser.name, 'مستخدم محفوظ');
    assert.equal(existingUser.email, 'saved@example.test');
    assert.equal(existingUser.password_hash, 'hash-preserved');
    assert.equal(existingUser.role, 'client');
    assert.equal(existingUser.plan, 'plus');
    assert.equal(existingUser.is_active, 1);
    assert.equal(existingUser.plan_expires_at, null);
    assert.match(existingUser.created_at, /^\d{4}-\d{2}-\d{2}/);
    const existingQuote = await db.findOne('quotes', { number: 'QT-0042' });
    assert.equal(existingQuote.id, 1);
    assert.equal(existingQuote.title, 'عرض محفوظ');
    assert.deepEqual(existingQuote.items, []);
    assert.equal(await db.count('users'), 1, 'test mode must not create demo accounts');
  });

  await t.test('CRUD supports Mongo-style filters and safely encodes quote items', async () => {
    const first = await db.insertDoc('users', {
      name: 'موظف ١',
      email: 'employee@example.test',
      password_hash: 'hash-1',
      role: 'employee',
      plan: 'pro',
      is_active: 1,
    });
    const second = await db.insertDoc('users', {
      name: 'عميل ١',
      email: 'client@example.test',
      password_hash: 'hash-2',
      role: 'client',
      plan: 'free',
      is_active: 0,
    });
    assert.equal(first, 2);
    assert.equal(second, 3);

    const matches = await db.findAll('users', {
      $or: [
        { id: { $in: [first] } },
        { email: { $regex: '^client@', $options: 'i' }, is_active: { $eq: 0 } },
      ],
    }, { sort: { id: -1 }, limit: 2 });
    assert.deepEqual(matches.map((user) => user.id), [3, 2]);

    const quoteId = await db.insertDoc('quotes', {
      number: await db.nextQuoteNumber(),
      client_id: second,
      employee_id: first,
      title: 'عرض اختبار',
      status: 'draft',
      subtotal: 100,
      tax_rate: 15,
      discount: 0,
      total: 115,
      items: [{ description: 'خدمة', qty: 1, unit_price: 100, total: 100 }],
    });
    assert.equal(quoteId, 2);
    const savedQuote = await db.findOne('quotes', { id: quoteId });
    assert.deepEqual(savedQuote.items, [{ description: 'خدمة', qty: 1, unit_price: 100, total: 100 }]);
    assert.equal(savedQuote.number, 'QT-0001');

    assert.equal(await db.count('users', { role: 'employee', is_active: 1 }), 1);
    assert.equal(await db.sumField('quotes', 'total', { status: 'draft' }), 115);
    await db.updateDoc('users', { id: first }, { is_active: 0 });
    assert.equal((await db.findOne('users', { id: first })).is_active, 0);
    assert.equal(await db.deleteDoc('users', { id: second }), 1);
    assert.equal(await db.findOne('users', { id: second }), null);
  });

  await t.test('lookup aggregation and quote rating helpers are consistent', async () => {
    const employee = await db.findOne('users', { email: 'employee@example.test' });
    const quote = await db.findOne('quotes', { number: 'QT-0001' });
    const results = await db.aggregate('quotes', [
      { $match: { id: quote.id } },
      { $lookup: { from: 'users', localField: 'employee_id', foreignField: 'id', as: 'employee' } },
      { $addFields: { employee_name: { $arrayElemAt: ['$employee.name', 0] } } },
      { $project: { employee: 0 } },
      { $sort: { created_at: -1 } },
      { $limit: 5 },
    ]);
    assert.equal(results.length, 1);
    assert.equal(results[0].employee_name, employee.name);
    assert.equal(Object.hasOwn(results[0], 'employee'), false);

    await db.upsertQuoteRating(quote.id, employee.id, 4);
    await db.upsertQuoteRating(quote.id, employee.id, 5);
    await db.upsertQuoteRating(quote.id, 1, 3);
    assert.deepEqual(await db.quoteRatingSummaries([quote.id]), {
      [quote.id]: { average: 4, count: 2 },
    });
    assert.deepEqual(await db.quoteRatingStats(), { average: 4, count: 2 });
  });

  await t.test('mutation guards reject unsafe filters and unknown fields/operators', async () => {
    await assert.rejects(db.updateDoc('users', {}, { is_active: 0 }), /رفض تعديل أو حذف واسع/);
    await assert.rejects(db.deleteDoc('users', {}), /رفض تعديل أو حذف واسع/);
    await assert.rejects(
      db.updateDoc('users', { id: 1 }, { 'email = 1; DROP TABLE users;--': 'x' }),
      /اسم الحقل غير صالح|حقل غير معروف/,
    );
    await assert.rejects(db.findAll('users', { role: { $where: 'true' } }), /عامل تصفية غير مدعوم/);
    await assert.rejects(db.count('unlisted_collection'), /مجموعة بيانات غير معروفة/);
    await assert.rejects(db.aggregate('users', [{ $out: 'users' }]), /مرحلة تجميع غير مدعومة/);
  });

  await t.test('sessions survive database reconnection and expire without implicit deletion', async () => {
    const session = { userId: 91, role: 'admin', cookie: { secure: true } };
    const expiry = Date.now() + 60_000;
    await db.sessionSet('persisted-session', session, expiry);
    assert.deepEqual(await db.sessionGet('persisted-session'), session);
    await db.close();
    await db.init();
    assert.deepEqual(await db.sessionGet('persisted-session'), session);

    await db.sessionSet('expired-session', { userId: 7 }, Date.now() - 1000);
    assert.equal(await db.sessionGet('expired-session'), null);
    assert.equal(await db.count('sessions', { sid: 'expired-session' }), 1);
    assert.equal(await db.sessionDestroy('persisted-session'), true);
    assert.equal(await db.sessionGet('persisted-session'), null);
  });

  await t.test('production refuses to start without MongoDB instead of opening SQLite', async () => {
    const { spawnSync } = require('node:child_process');
    const blockedPath = path.join(tempDirectory, 'must-not-be-created.db');
    const result = spawnSync(process.execPath, [
      '-e',
      "require('./server/db').init().then(()=>process.exit(2)).catch((error)=>{if(!error.message.includes('MONGODB_URI'))process.exit(3);});",
    ], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, APP_ENV: 'production', MONGODB_URI: '', DB_PATH: blockedPath },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(blockedPath), false, 'production must fail before creating a SQLite file');
  });

  await t.test('development refuses to start without MongoDB instead of opening SQLite', async () => {
    const { spawnSync } = require('node:child_process');
    const blockedPath = path.join(tempDirectory, 'development-must-not-be-created.db');
    const result = spawnSync(process.execPath, [
      '-e',
      "require('./server/db').init().then(()=>process.exit(2)).catch((error)=>{if(!error.message.includes('MONGODB_URI'))process.exit(3);});",
    ], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, APP_ENV: 'development', MONGODB_URI: '', DB_PATH: blockedPath },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(blockedPath), false, 'development must fail before creating a SQLite file');
  });
});

test.after(async () => {
  await db.close();
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});