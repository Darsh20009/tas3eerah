'use strict';

const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const config = require('./config');

const COLLECTION_FIELDS = Object.freeze({
  users: new Set([
    'id', 'name', 'email', 'password_hash', 'role', 'plan', 'plan_expires_at',
    'is_active', 'created_at',
  ]),
  quotes: new Set([
    'id', 'number', 'client_id', 'employee_id', 'title', 'status', 'subtotal',
    'tax_rate', 'discount', 'total', 'notes', 'items', 'created_at', 'updated_at',
  ]),
  quote_ratings: new Set([
    'id', 'quote_id', 'user_id', 'rating', 'created_at', 'updated_at',
  ]),
  messages: new Set([
    'id', 'sender_id', 'receiver_id', 'subject', 'body', 'is_read', 'parent_id',
    'created_at',
  ]),
  activity_log: new Set([
    'id', 'user_id', 'action', 'details', 'ip', 'created_at',
  ]),
  contact_messages: new Set([
    'id', 'name', 'email', 'message', 'ip', 'is_read', 'created_at',
  ]),
  settings: new Set(['key', 'value']),
  _counters: new Set(['id', 'seq']),
  sessions: new Set(['sid', 'sess', 'expires_at', 'updated_at']),
});

const LEGACY_COLLECTIONS = new Set(['quote_items']);
const MUTATION_SELECTORS = new Set([
  'id', 'email', 'key', 'user_id', 'quote_id', 'sender_id', 'receiver_id',
  'client_id', 'employee_id', 'parent_id',
]);

let sqlite = null;
let mongoClient = null;
let mongoDatabase = null;
let selectedMode = null;
let initPromise = null;
let lastInsertedId = null;

function fail(message) {
  throw new Error(message);
}

function collectionName(value) {
  if (typeof value !== 'string' || !Object.hasOwn(COLLECTION_FIELDS, value) && !LEGACY_COLLECTIONS.has(value)) {
    fail(`مجموعة بيانات غير معروفة: ${String(value)}`);
  }
  return value;
}

function fieldsFor(collection) {
  collectionName(collection);
  return COLLECTION_FIELDS[collection] || null;
}

function assertField(collection, field) {
  if (typeof field !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
    fail('اسم الحقل غير صالح.');
  }
  const known = fieldsFor(collection);
  if (known && !known.has(field)) {
    fail(`حقل غير معروف في ${collection}: ${field}`);
  }
  if (!known && sqlite) {
    const columns = sqlite.prepare(`PRAGMA table_info(${quoteIdentifier(collection)})`).all();
    if (!columns.some((column) => column.name === field)) {
      fail(`حقل غير معروف في ${collection}: ${field}`);
    }
  }
  return quoteIdentifier(field);
}

function quoteIdentifier(identifier) {
  if (typeof identifier !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    fail('اسم جدول أو حقل غير صالح.');
  }
  return `"${identifier}"`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function requireFilter(filter) {
  if (!isPlainObject(filter)) fail('يجب أن يكون عامل التصفية كائناً.');
}

function hasMutationSelector(filter) {
  if (!isPlainObject(filter)) return false;
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(value) || value.length === 0) return false;
      if (!value.every((branch) => hasMutationSelector(branch))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(value) || value.length === 0) continue;
      if (value.some((branch) => hasMutationSelector(branch))) return true;
      continue;
    }
    if (key.startsWith('$') || !MUTATION_SELECTORS.has(key)) continue;
    if (isPlainObject(value)) {
      if (Array.isArray(value.$in) && value.$in.length > 0) return true;
    } else {
      return true;
    }
  }
  return false;
}

function assertSafeMutationFilter(filter) {
  requireFilter(filter);
  if (Object.keys(filter).length === 0 || !hasMutationSelector(filter)) {
    fail('تم رفض تعديل أو حذف واسع: أضف محدِّداً آمناً مثل id أو email أو user_id.');
  }
}

function normalizeSqlValue(value) {
  if (value === undefined) fail('لا يمكن تخزين قيمة غير معرّفة.');
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || isPlainObject(value)) return JSON.stringify(value);
  if (typeof value === 'bigint') return Number(value);
  return value;
}

function decodeRow(row) {
  if (row && typeof row.items === 'string') {
    try {
      row.items = JSON.parse(row.items);
    } catch {
      row.items = [];
    }
  }
  return normalizeLegacyPlan(row);
}

function normalizeLegacyPlan(document) {
  if (document && document.plan === 'enterprise') {
    return { ...document, plan: 'pro' };
  }
  return document;
}

function cleanMongoDocument(document) {
  if (!document) return null;
  const cleaned = { ...document };
  delete cleaned._id;
  return normalizeLegacyPlan(cleaned);
}

function mongoFilter(collection, filter) {
  requireFilter(filter);

  function canonicalRegex(pattern) {
    if (typeof pattern !== 'string' || pattern.length > 256) {
      fail('نمط البحث غير صالح أو أطول من الحد المسموح.');
    }
    let output = '';
    for (let index = 0; index < pattern.length; index += 1) {
      const current = pattern[index];
      if (current === '\\' && index + 1 < pattern.length) {
        output += `\\${pattern[index + 1]}`;
        index += 1;
      } else if (current === '.') {
        if (pattern[index + 1] === '*') {
          output += '.*';
          index += 1;
        } else {
          output += '.';
        }
      } else if ((current === '^' && index === 0) || (current === '$' && index === pattern.length - 1)) {
        output += current;
      } else if ('^$*+?()[]{}|'.includes(current)) {
        output += `\\${current}`;
      } else {
        output += current;
      }
    }
    return output;
  }

  function visit(value, parentKey = null) {
    if (Array.isArray(value)) return value.map((item) => visit(item, parentKey));
    if (!isPlainObject(value)) return value;
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === '$or' || key === '$and') {
        if (!Array.isArray(child) || child.length === 0) fail(`${key} يجب أن تحتوي شرطاً واحداً على الأقل.`);
        result[key] = child.map((branch) => visit(branch));
      } else if (key.startsWith('$')) {
        if (!parentKey) fail(`عامل تصفية غير مدعوم: ${key}`);
        if (!new Set([
          '$in', '$nin', '$ne', '$eq', '$regex', '$options',
          '$gte', '$lte', '$gt', '$lt', '$exists',
        ]).has(key)) {
          fail(`عامل تصفية غير مدعوم: ${key}`);
        }
        if (key === '$regex') result[key] = canonicalRegex(child);
        else result[key] = visit(child, parentKey);
      } else {
        assertField(collection, key);
        result[key] = visit(child, key);
      }
    }
    return result;
  }

  return visit(filter);
}

function mongoOptions(collection, options = {}) {
  if (!isPlainObject(options)) fail('خيارات الاستعلام غير صالحة.');
  const allowed = new Set(['projection', 'sort', 'limit', 'skip']);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) fail(`خيار استعلام غير مدعوم: ${key}`);
  }
  const normalized = { ...options };
  for (const key of ['projection', 'sort']) {
    if (options[key] === undefined) continue;
    if (!isPlainObject(options[key])) fail(`خيار ${key} غير صالح.`);
    for (const [field, value] of Object.entries(options[key])) {
      assertField(collection, field);
      if (key === 'sort' && value !== 1 && value !== -1) fail('اتجاه الترتيب يجب أن يكون 1 أو -1.');
    }
  }
  if (options.limit !== undefined &&
      (!Number.isSafeInteger(Number(options.limit)) || Number(options.limit) < 0 || Number(options.limit) > 10_000)) {
    fail('قيمة limit غير صالحة.');
  }
  if (options.skip !== undefined &&
      (!Number.isSafeInteger(Number(options.skip)) || Number(options.skip) < 0 || Number(options.skip) > 1_000_000)) {
    fail('قيمة skip غير صالحة.');
  }
  return normalized;
}

function safeRegex(pattern, options = '') {
  if (typeof pattern !== 'string' || pattern.length > 256) {
    fail('نمط البحث غير صالح أو أطول من الحد المسموح.');
  }
  if (typeof options !== 'string' || !/^[imxs]*$/.test(options)) {
    fail('خيارات البحث غير مدعومة.');
  }

  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    if (current === '\\' && index + 1 < pattern.length) {
      source += pattern[index + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      index += 1;
    } else if (current === '.' && pattern[index + 1] === '*') {
      source += '.*';
      index += 1;
    } else if (current === '.') {
      source += '.';
    } else if ((current === '^' && index === 0) || (current === '$' && index === pattern.length - 1)) {
      source += current;
    } else {
      source += current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  try {
    return new RegExp(source, options.includes('i') ? 'i' : '');
  } catch {
    fail('نمط البحث غير صالح.');
  }
}

function validateOperatorObject(value) {
  const allowed = new Set([
    '$in', '$nin', '$ne', '$eq', '$regex', '$options',
    '$gte', '$lte', '$gt', '$lt', '$exists',
  ]);
  for (const operator of Object.keys(value)) {
    if (!allowed.has(operator)) fail(`عامل تصفية غير مدعوم: ${operator}`);
  }
  if (value.$options !== undefined && value.$regex === undefined) {
    fail('لا تُستخدم $options دون $regex.');
  }
}

function compileCondition(column, value, params) {
  if (!isPlainObject(value)) {
    params.push(normalizeSqlValue(value));
    return value === null ? `${column} IS NULL` : `${column} = ?`;
  }

  validateOperatorObject(value);
  const clauses = [];

  if (Object.hasOwn(value, '$eq')) {
    if (value.$eq === null) clauses.push(`${column} IS NULL`);
    else {
      clauses.push(`${column} = ?`);
      params.push(normalizeSqlValue(value.$eq));
    }
  }
  if (Object.hasOwn(value, '$ne')) {
    if (value.$ne === null) clauses.push(`${column} IS NOT NULL`);
    else {
      clauses.push(`${column} != ?`);
      params.push(normalizeSqlValue(value.$ne));
    }
  }
  for (const [operator, sqlOperator] of [
    ['$gte', '>='], ['$lte', '<='], ['$gt', '>'], ['$lt', '<'],
  ]) {
    if (Object.hasOwn(value, operator)) {
      clauses.push(`${column} ${sqlOperator} ?`);
      params.push(normalizeSqlValue(value[operator]));
    }
  }
  if (Object.hasOwn(value, '$in') || Object.hasOwn(value, '$nin')) {
    const isNegated = Object.hasOwn(value, '$nin');
    const values = isNegated ? value.$nin : value.$in;
    if (!Array.isArray(values) || values.length > 10000) {
      fail(`${isNegated ? '$nin' : '$in'} يجب أن تكون قائمة محدودة.`);
    }
    if (values.length === 0) clauses.push(isNegated ? '1 = 1' : '0 = 1');
    else {
      clauses.push(`${column} ${isNegated ? 'NOT IN' : 'IN'} (${values.map(() => '?').join(', ')})`);
      params.push(...values.map(normalizeSqlValue));
    }
  }
  if (Object.hasOwn(value, '$regex')) {
    params.push(JSON.stringify([value.$regex, value.$options || '']));
    clauses.push(`REGEXP(?, ${column})`);
  }
  if (Object.hasOwn(value, '$exists')) {
    if (typeof value.$exists !== 'boolean') fail('$exists يجب أن تكون قيمة منطقية.');
    clauses.push(value.$exists ? '1 = 1' : `${column} IS NULL`);
  }

  if (clauses.length === 0) fail('عامل التصفية لا يحتوي شرطاً مدعوماً.');
  return `(${clauses.join(' AND ')})`;
}

function compileSqlFilter(collection, filter, params = [], alias = '') {
  requireFilter(filter);
  const clauses = [];
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' || key === '$and') {
      if (!Array.isArray(value) || value.length === 0) {
        fail(`${key} يجب أن تحتوي شرطاً واحداً على الأقل.`);
      }
      const nested = value.map((part) => compileSqlFilter(collection, part, params, alias));
      clauses.push(`(${nested.join(key === '$or' ? ' OR ' : ' AND ')})`);
      continue;
    }
    if (key.startsWith('$')) fail(`عامل تصفية غير مدعوم: ${key}`);
    const field = assertField(collection, key);
    const column = alias ? `${alias}.${field}` : field;
    clauses.push(compileCondition(column, value, params));
  }
  return clauses.length ? clauses.join(' AND ') : '1 = 1';
}

function normalizeExpiry(expiresAt) {
  if (expiresAt === undefined || expiresAt === null) {
    return Date.now() + config.SESSION_LIFETIME * 1000;
  }
  if (expiresAt instanceof Date) return expiresAt.getTime();
  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
    return expiresAt < 1_000_000_000_000 ? expiresAt * 1000 : expiresAt;
  }
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) fail('تاريخ انتهاء الجلسة غير صالح.');
  return parsed;
}

function ensureInitialized() {
  if (!selectedMode) fail('قاعدة البيانات غير مهيّأة؛ استدعِ init() أولاً.');
}

function sqliteExec() {
  return sqlite;
}

function migrateColumns(table, declarations) {
  const columns = new Set(sqlite.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((row) => row.name));
  for (const [name, declaration] of Object.entries(declarations)) {
    if (columns.has(name)) continue;
    sqlite.exec(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(name)} ${declaration}`);
    columns.add(name);
  }
}

function createSqliteSchema() {
  const directory = path.dirname(config.DB_PATH);
  fs.mkdirSync(directory, { recursive: true });
  sqlite = require('better-sqlite3')(config.DB_PATH);
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.function('REGEXP', { deterministic: true }, (encodedPattern, text) => {
    if (text === null || text === undefined) return 0;
    const [pattern, options] = JSON.parse(encodedPattern);
    return safeRegex(pattern, options).test(String(text)) ? 1 : 0;
  });

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      plan TEXT NOT NULL DEFAULT 'free',
      plan_expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quotes (
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
      items TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quote_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (quote_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      parent_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      ip TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS _counters (
      id TEXT PRIMARY KEY,
      seq INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expires_at INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add only known, non-destructive compatibility columns to older SQLite files.
  migrateColumns('users', { plan_expires_at: 'TEXT' });
  migrateColumns('quotes', { items: "TEXT NOT NULL DEFAULT '[]'" });
  migrateColumns('sessions', {
    expires_at: 'INTEGER',
    updated_at: "TEXT NOT NULL DEFAULT (datetime('now'))",
  });
  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS quote_ratings_quote_user
      ON quote_ratings (quote_id, user_id);
    CREATE INDEX IF NOT EXISTS quote_ratings_quote
      ON quote_ratings (quote_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry
      ON sessions (expires_at);
  `);
}

function sqliteRows(collection, filter, options = {}) {
  const whereParams = [];
  const where = compileSqlFilter(collection, filter, whereParams);
  const projection = options.projection;
  let selected = '*';
  if (projection && isPlainObject(projection)) {
    const fields = Object.entries(projection)
      .filter(([, include]) => Boolean(include))
      .map(([field]) => assertField(collection, field));
    if (fields.length) selected = fields.join(', ');
  }

  let order = '';
  if (options.sort && isPlainObject(options.sort)) {
    const clauses = Object.entries(options.sort).map(([field, direction]) => {
      if (direction !== 1 && direction !== -1) fail('اتجاه الترتيب يجب أن يكون 1 أو -1.');
      return `${assertField(collection, field)} ${direction === -1 ? 'DESC' : 'ASC'}`;
    });
    if (clauses.length) order = ` ORDER BY ${clauses.join(', ')}`;
  }

  let skip = '';
  if (options.skip !== undefined) {
    const value = Number(options.skip);
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) fail('قيمة skip غير صالحة.');
    skip = ` OFFSET ${value}`;
  }
  let limit = '';
  if (options.limit !== undefined) {
    const value = Number(options.limit);
    if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) fail('قيمة limit غير صالحة.');
    limit = ` LIMIT ${value}`;
    if (!skip && value === 0) return [];
  }
  if (skip && !limit) limit = ' LIMIT -1';

  const sql = `SELECT ${selected} FROM ${quoteIdentifier(collection)} WHERE ${where}${order}${limit}${skip}`;
  return sqlite.prepare(sql).all(...whereParams).map((row) => decodeRow(row));
}

function getPath(value, pathExpression) {
  if (typeof pathExpression !== 'string') return undefined;
  const segments = pathExpression.replace(/^\$/, '').split('.');
  return segments.reduce((current, segment) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      return current.map((item) => item == null ? undefined : item[segment]);
    }
    return current[segment];
  }, value);
}

function matchesValue(actual, expected) {
  if (!isPlainObject(expected)) {
    if (expected === null) return actual === null || actual === undefined;
    return actual === expected || String(actual) === String(expected);
  }
  validateOperatorObject(expected);
  for (const [operator, value] of Object.entries(expected)) {
    if (operator === '$options') continue;
    if (operator === '$eq' && !matchesValue(actual, value)) return false;
    if (operator === '$ne' && matchesValue(actual, value)) return false;
    if (operator === '$in' && (!Array.isArray(value) || !value.some((item) => matchesValue(actual, item)))) return false;
    if (operator === '$nin' && Array.isArray(value) && value.some((item) => matchesValue(actual, item))) return false;
    if (operator === '$gte' && !(actual >= value)) return false;
    if (operator === '$lte' && !(actual <= value)) return false;
    if (operator === '$gt' && !(actual > value)) return false;
    if (operator === '$lt' && !(actual < value)) return false;
    if (operator === '$regex' && !safeRegex(value, expected.$options || '').test(String(actual ?? ''))) return false;
    if (operator === '$exists' && Boolean(value) !== (actual !== undefined)) return false;
  }
  return true;
}

function matchesDocument(document, filter, collection) {
  requireFilter(filter);
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') {
      if (!Array.isArray(value) || value.length === 0) fail('$or يجب أن تحتوي شرطاً واحداً على الأقل.');
      return value.some((branch) => matchesDocument(document, branch, collection));
    }
    if (key === '$and') {
      if (!Array.isArray(value) || value.length === 0) fail('$and يجب أن تحتوي شرطاً واحداً على الأقل.');
      return value.every((branch) => matchesDocument(document, branch, collection));
    }
    if (key.startsWith('$')) fail(`عامل تصفية غير مدعوم: ${key}`);
    assertField(collection, key);
    return matchesValue(document[key], value);
  });
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function ensureAdmin(admin) {
  const existing = await findOne('users', { email: admin.email });
  const passwordMatches = existing?.password_hash
    ? await bcrypt.compare(admin.password, existing.password_hash)
    : false;
  const update = {
    name: 'مدير النظام',
    email: admin.email,
    role: 'admin',
    plan: 'pro',
    plan_expires_at: null,
    is_active: 1,
  };
  if (!passwordMatches) update.password_hash = await bcrypt.hash(admin.password, 10);

  if (existing) {
    await updateDoc('users', { email: admin.email }, update);
    return;
  }
  await insertDoc('users', update);
}

async function seedIfNeeded() {
  if (config.APP_ENV === 'test') return;
  if ((await count('users', { role: 'admin' })) > 0) return;

  const configuredAdmin = config.getConfiguredAdmin();
  if (!configuredAdmin) {
    fail('لم يُعثر على مدير نظام في MongoDB. اضبط INITIAL_ADMIN_EMAIL وINITIAL_ADMIN_PASSWORD (12 حرفاً على الأقل) لتهيئة المدير الأول.');
  }
  if (await findOne('users', { email: configuredAdmin.email })) {
    fail('يوجد حساب بهذا البريد دون صلاحية المدير؛ لن تُغيَّر صلاحيته تلقائياً.');
  }
  await ensureAdmin(configuredAdmin);
}

async function initializeMongo() {
  mongoClient = new MongoClient(config.MONGODB_URI, {
    appName: 'tas3eerah-node',
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    await mongoClient.connect();
    mongoDatabase = mongoClient.db(config.MONGODB_DB_NAME);
    await mongoDatabase.command({ ping: 1 });
    await Promise.all([
      mongoDatabase.collection('users').createIndex({ email: 1 }, { unique: true }),
      mongoDatabase.collection('users').createIndex({ id: 1 }, { unique: true }),
      mongoDatabase.collection('quotes').createIndex({ id: 1 }, { unique: true }),
      mongoDatabase.collection('quote_ratings').createIndex(
        { quote_id: 1, user_id: 1 },
        { unique: true },
      ),
      mongoDatabase.collection('quote_ratings').createIndex({ quote_id: 1 }),
      mongoDatabase.collection('sessions').createIndex({ expiresAt: 1 }),
    ]);
    selectedMode = 'mongo';
  } catch {
    if (mongoClient) await mongoClient.close().catch(() => {});
    mongoClient = null;
    mongoDatabase = null;
    selectedMode = null;
    fail('تعذرت تهيئة MongoDB. تحقّق من رابط الاتصال وصلاحيات القاعدة وإمكانية الاتصال؛ لن يستخدم التطبيق SQLite.');
  }
  try {
    await seedIfNeeded();
  } catch (error) {
    if (mongoClient) await mongoClient.close().catch(() => {});
    mongoClient = null;
    mongoDatabase = null;
    selectedMode = null;
    throw error;
  }
}

async function initializeSqlite() {
  createSqliteSchema();
  selectedMode = 'sqlite';
  try {
    await seedIfNeeded();
  } catch (error) {
    sqlite?.close();
    sqlite = null;
    selectedMode = null;
    throw error;
  }
}

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    config.assertDatabaseReady();
    if (config.APP_ENV === 'test' && process.env.DB_TEST_SQLITE === '1') await initializeSqlite();
    else await initializeMongo();
    return selectedMode;
  })();
  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

async function findOne(collection, filter = {}, options = {}) {
  ensureInitialized();
  collectionName(collection);
  requireFilter(filter);
  if (selectedMode === 'mongo') {
    const result = await mongoDatabase.collection(collection).findOne(
      mongoFilter(collection, filter),
      mongoOptions(collection, options),
    );
    return cleanMongoDocument(result);
  }
  return sqliteRows(collection, filter, { ...options, limit: 1 })[0] || null;
}

async function findAll(collection, filter = {}, options = {}) {
  ensureInitialized();
  collectionName(collection);
  requireFilter(filter);
  if (selectedMode === 'mongo') {
    const cursor = mongoDatabase.collection(collection).find(
      mongoFilter(collection, filter),
      mongoOptions(collection, options),
    );
    const rows = await cursor.toArray();
    return rows.map(cleanMongoDocument);
  }
  return sqliteRows(collection, filter, options);
}

async function count(collection, filter = {}) {
  ensureInitialized();
  collectionName(collection);
  requireFilter(filter);
  if (selectedMode === 'mongo') {
    return mongoDatabase.collection(collection).countDocuments(mongoFilter(collection, filter));
  }
  const params = [];
  const where = compileSqlFilter(collection, filter, params);
  return sqlite.prepare(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(collection)} WHERE ${where}`)
    .get(...params).total;
}

async function insertDoc(collection, data) {
  ensureInitialized();
  collectionName(collection);
  if (!isPlainObject(data) || Object.keys(data).length === 0) fail('بيانات المستند غير صالحة.');

  const document = { ...data };
  if (!Object.hasOwn(document, 'created_at')) {
    document.created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
  for (const field of Object.keys(document)) assertField(collection, field);

  if (selectedMode === 'mongo') {
    const sequence = await nextSequence(collection);
    document.id = sequence;
    await mongoDatabase.collection(collection).insertOne(document);
    lastInsertedId = sequence;
    return sequence;
  }

  delete document.id;
  const fields = Object.keys(document);
  if (fields.length === 0) fail('لا توجد حقول صالحة للإضافة.');
  const values = fields.map((field) => normalizeSqlValue(document[field]));
  const columns = fields.map((field) => assertField(collection, field)).join(', ');
  const placeholders = fields.map(() => '?').join(', ');
  const result = sqlite.prepare(
    `INSERT INTO ${quoteIdentifier(collection)} (${columns}) VALUES (${placeholders})`,
  ).run(...values);
  lastInsertedId = Number(result.lastInsertRowid);
  return lastInsertedId;
}

async function updateDoc(collection, filter, update) {
  ensureInitialized();
  collectionName(collection);
  assertSafeMutationFilter(filter);
  if (!isPlainObject(update) || Object.keys(update).length === 0) fail('بيانات التحديث غير صالحة.');
  for (const field of Object.keys(update)) assertField(collection, field);

  if (selectedMode === 'mongo') {
    const result = await mongoDatabase.collection(collection).updateMany(
      mongoFilter(collection, filter),
      { $set: update },
    );
    return result.modifiedCount;
  }

  const assignments = [];
  const values = [];
  for (const [field, value] of Object.entries(update)) {
    assignments.push(`${assertField(collection, field)} = ?`);
    values.push(normalizeSqlValue(value));
  }
  const whereParams = [];
  const where = compileSqlFilter(collection, filter, whereParams);
  const result = sqlite.prepare(
    `UPDATE ${quoteIdentifier(collection)} SET ${assignments.join(', ')} WHERE ${where}`,
  ).run(...values, ...whereParams);
  return result.changes;
}

async function deleteDoc(collection, filter) {
  ensureInitialized();
  collectionName(collection);
  assertSafeMutationFilter(filter);
  if (selectedMode === 'mongo') {
    const result = await mongoDatabase.collection(collection).deleteMany(mongoFilter(collection, filter));
    return result.deletedCount;
  }
  const params = [];
  const where = compileSqlFilter(collection, filter, params);
  const result = sqlite.prepare(
    `DELETE FROM ${quoteIdentifier(collection)} WHERE ${where}`,
  ).run(...params);
  return result.changes;
}

function readAggregateField(document, expression) {
  if (typeof expression === 'string' && expression.startsWith('$')) {
    return getPath(document, expression);
  }
  return expression;
}

function setNestedValue(target, key, value) {
  const segments = key.split('.');
  let node = target;
  for (const segment of segments.slice(0, -1)) {
    if (!isPlainObject(node[segment])) node[segment] = {};
    node = node[segment];
  }
  node[segments.at(-1)] = value;
}

function applyProject(documents, specification) {
  if (!isPlainObject(specification)) fail('$project يتطلب كائناً.');
  const inclusions = Object.entries(specification)
    .filter(([key, value]) => key !== '_id' && Boolean(value))
    .map(([key]) => key);
  const exclusions = Object.entries(specification)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (inclusions.length) {
    return documents.map((document) => {
      const projected = {};
      for (const field of inclusions) {
        if (Object.hasOwn(document, field)) projected[field] = document[field];
      }
      return projected;
    });
  }
  return documents.map((document) => {
    const projected = { ...document };
    for (const field of exclusions) delete projected[field];
    return projected;
  });
}

function applyGroup(documents, specification) {
  if (!isPlainObject(specification) || !Object.hasOwn(specification, '_id')) {
    fail('$group يتطلب حقلاً _id.');
  }
  const groups = new Map();
  for (const document of documents) {
    const groupId = readAggregateField(document, specification._id);
    const key = JSON.stringify(groupId ?? null);
    if (!groups.has(key)) {
      const accumulators = {};
      for (const [field, expression] of Object.entries(specification)) {
        if (field === '_id') continue;
        if (!isPlainObject(expression) || Object.keys(expression).length !== 1) {
          fail(`مجمّع غير مدعوم في $group: ${field}`);
        }
        const operator = Object.keys(expression)[0];
        if (!['$sum', '$avg'].includes(operator)) fail(`مجمّع غير مدعوم في $group: ${operator}`);
        accumulators[field] = { operator, sum: 0, count: 0 };
      }
      groups.set(key, { _id: groupId ?? null, accumulators });
    }
    const group = groups.get(key);
    for (const [field, expression] of Object.entries(specification)) {
      if (field === '_id') continue;
      const accumulator = group.accumulators[field];
      const operand = expression[accumulator.operator];
      const value = operand === 1 ? 1 : Number(readAggregateField(document, operand) || 0);
      accumulator.sum += Number.isFinite(value) ? value : 0;
      accumulator.count += 1;
    }
  }

  return [...groups.values()].map(({ _id, accumulators }) => {
    const result = { _id };
    for (const [field, accumulator] of Object.entries(accumulators)) {
      result[field] = accumulator.operator === '$avg'
        ? accumulator.count ? accumulator.sum / accumulator.count : null
        : accumulator.sum;
    }
    return result;
  });
}

function validateAggregatePipeline(collection, pipeline) {
  if (!Array.isArray(pipeline) || pipeline.length > 50) {
    fail('مسار التجميع غير صالح أو أطول من الحد المسموح.');
  }
  const allowedStages = new Set([
    '$match', '$lookup', '$addFields', '$project', '$sort', '$limit', '$skip', '$group',
  ]);
  const availableFields = new Set(fieldsFor(collection) || []);
  const normalized = [];

  const assertPath = (value, label) => {
    if (typeof value !== 'string' || !value.startsWith('$')) {
      fail(`${label} يجب أن يكون مسار حقل.`);
    }
    const root = value.slice(1).split('.')[0];
    if (!availableFields.has(root)) fail(`حقل غير معروف في مسار التجميع: ${root}`);
  };

  for (const stage of pipeline) {
    if (!isPlainObject(stage) || Object.keys(stage).length !== 1) {
      fail('كل مرحلة تجميع يجب أن تحتوي عاملاً واحداً.');
    }
    const [operator, expression] = Object.entries(stage)[0];
    if (!allowedStages.has(operator)) fail(`مرحلة تجميع غير مدعومة: ${operator}`);

    if (operator === '$match') {
      const filter = expression || {};
      normalized.push({ $match: mongoFilter(collection, filter) });
    } else if (operator === '$lookup') {
      if (!isPlainObject(expression)) fail('$lookup غير صالح.');
      const foreignCollection = collectionName(expression.from);
      assertField(collection, expression.localField);
      assertField(foreignCollection, expression.foreignField);
      if (typeof expression.as !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(expression.as)) {
        fail('اسم حقل $lookup غير صالح.');
      }
      availableFields.add(expression.as);
      normalized.push({ $lookup: { ...expression } });
    } else if (operator === '$addFields') {
      if (!isPlainObject(expression)) fail('$addFields غير صالح.');
      for (const [field, value] of Object.entries(expression)) {
        if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(field)) fail('اسم حقل $addFields غير صالح.');
        if (isPlainObject(value)) {
          if (Object.keys(value).length !== 1 || !Array.isArray(value.$arrayElemAt) || value.$arrayElemAt.length !== 2) {
            fail('تعبير $addFields غير مدعوم.');
          }
          assertPath(value.$arrayElemAt[0], '$arrayElemAt');
          if (!Number.isSafeInteger(value.$arrayElemAt[1])) fail('فهرس $arrayElemAt غير صالح.');
        } else if (typeof value === 'string' && value.startsWith('$')) {
          assertPath(value, '$addFields');
        }
        availableFields.add(field.split('.')[0]);
      }
      normalized.push({ $addFields: { ...expression } });
    } else if (operator === '$project') {
      if (!isPlainObject(expression)) fail('$project غير صالح.');
      for (const [field, include] of Object.entries(expression)) {
        if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(field) || !availableFields.has(field.split('.')[0])) {
          fail(`حقل $project غير معروف: ${field}`);
        }
        if (![0, 1, true, false].includes(include)) fail('قيمة $project يجب أن تكون 0 أو 1.');
      }
      normalized.push({ $project: { ...expression } });
    } else if (operator === '$sort') {
      mongoOptions(collection, { sort: expression });
      normalized.push({ $sort: { ...expression } });
    } else if (operator === '$limit' || operator === '$skip') {
      const value = Number(expression);
      if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) fail(`${operator} غير صالح.`);
      normalized.push({ [operator]: value });
    } else if (operator === '$group') {
      if (!isPlainObject(expression) || !Object.hasOwn(expression, '_id')) fail('$group يتطلب حقلاً _id.');
      if (typeof expression._id === 'string' && expression._id.startsWith('$')) assertPath(expression._id, '$group');
      for (const [field, accumulator] of Object.entries(expression)) {
        if (field === '_id') continue;
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field) || !isPlainObject(accumulator) ||
            Object.keys(accumulator).length !== 1) {
          fail(`مجمّع غير صالح في $group: ${field}`);
        }
        const [kind, operand] = Object.entries(accumulator)[0];
        if (!['$sum', '$avg'].includes(kind)) fail(`مجمّع غير مدعوم: ${kind}`);
        if (typeof operand === 'string' && operand.startsWith('$')) assertPath(operand, '$group');
        else if (typeof operand !== 'number') fail('قيمة مجمّع $group غير صالحة.');
      }
      normalized.push({ $group: { ...expression } });
    }
  }
  return normalized;
}

async function aggregate(collection, pipeline) {
  ensureInitialized();
  collectionName(collection);
  const safePipeline = validateAggregatePipeline(collection, pipeline);
  if (selectedMode === 'mongo') {
    const cursor = mongoDatabase.collection(collection).aggregate(safePipeline);
    return (await cursor.toArray()).map(cleanMongoDocument);
  }

  let documents = await findAll(collection);
  for (const stage of safePipeline) {
    if (!isPlainObject(stage) || Object.keys(stage).length !== 1) {
      fail('كل مرحلة تجميع يجب أن تحتوي عاملاً واحداً.');
    }
    const [operator, expression] = Object.entries(stage)[0];
    if (operator === '$match') {
      documents = documents.filter((document) => matchesDocument(document, expression || {}, collection));
    } else if (operator === '$lookup') {
      if (!isPlainObject(expression)) fail('$lookup غير صالح.');
      const foreignCollection = collectionName(expression.from);
      const { localField, foreignField, as } = expression;
      assertField(collection, localField);
      assertField(foreignCollection, foreignField);
      if (typeof as !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(as)) fail('اسم حقل $lookup غير صالح.');
      const foreignDocuments = await findAll(foreignCollection);
      const matches = new Map();
      for (const foreign of foreignDocuments) {
        const key = String(foreign[foreignField]);
        if (!matches.has(key)) matches.set(key, []);
        matches.get(key).push(foreign);
      }
      documents = documents.map((document) => ({
        ...document,
        [as]: matches.get(String(document[localField])) || [],
      }));
    } else if (operator === '$addFields') {
      if (!isPlainObject(expression)) fail('$addFields غير صالح.');
      documents = documents.map((document) => {
        const result = { ...document };
        for (const [field, valueExpression] of Object.entries(expression)) {
          if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(field)) fail('اسم حقل $addFields غير صالح.');
          let value;
          if (isPlainObject(valueExpression) && Array.isArray(valueExpression.$arrayElemAt)) {
            const [pathExpression, index] = valueExpression.$arrayElemAt;
            const pathValue = getPath(document, pathExpression);
            value = Array.isArray(pathValue) ? pathValue[index] : undefined;
          } else {
            value = readAggregateField(document, valueExpression);
          }
          setNestedValue(result, field, value);
        }
        return result;
      });
    } else if (operator === '$sort') {
      if (!isPlainObject(expression)) fail('$sort غير صالح.');
      for (const field of Object.keys(expression)) assertField(collection, field);
      const sortFields = Object.entries(expression);
      documents = documents.map((value, index) => ({ value, index })).sort((left, right) => {
        for (const [field, direction] of sortFields) {
          if (direction !== 1 && direction !== -1) fail('اتجاه الترتيب يجب أن يكون 1 أو -1.');
          const a = left.value[field];
          const b = right.value[field];
          if (a === b) continue;
          if (a == null) return direction === 1 ? -1 : 1;
          if (b == null) return direction === 1 ? 1 : -1;
          if (a < b) return -direction;
          if (a > b) return direction;
        }
        return left.index - right.index;
      }).map(({ value }) => value);
    } else if (operator === '$limit' || operator === '$skip') {
      const amount = Number(expression);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 10_000) fail(`${operator} غير صالح.`);
      documents = operator === '$limit' ? documents.slice(0, amount) : documents.slice(amount);
    } else if (operator === '$project') {
      documents = applyProject(documents, expression);
    } else if (operator === '$group') {
      documents = applyGroup(documents, expression);
    } else {
      fail(`مرحلة تجميع غير مدعومة: ${operator}`);
    }
  }
  return documents.map((document) => {
    const cleaned = { ...document };
    delete cleaned._id;
    return decodeRow(cleaned);
  });
}

async function sumField(collection, field, filter = {}) {
  ensureInitialized();
  collectionName(collection);
  assertField(collection, field);
  requireFilter(filter);
  if (selectedMode === 'mongo') {
    const rows = await mongoDatabase.collection(collection).aggregate([
      { $match: mongoFilter(collection, filter) },
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ]).toArray();
    return Number(rows[0]?.total || 0);
  }
  const params = [];
  const where = compileSqlFilter(collection, filter, params);
  const row = sqlite.prepare(
    `SELECT COALESCE(SUM(${assertField(collection, field)}), 0) AS total FROM ${quoteIdentifier(collection)} WHERE ${where}`,
  ).get(...params);
  return Number(row.total || 0);
}

async function nextSequence(collection) {
  collectionName(collection);
  if (selectedMode === 'mongo') {
    const result = await mongoDatabase.collection('_counters').findOneAndUpdate(
      { _id: collection },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    if (!result || !Number.isSafeInteger(Number(result.seq))) fail('تعذرت زيادة عدّاد المستندات.');
    return Number(result.seq);
  }
  const statement = sqlite.prepare(`
    INSERT INTO _counters (id, seq) VALUES (?, 1)
    ON CONFLICT(id) DO UPDATE SET seq = seq + 1
  `);
  const transaction = sqlite.transaction((name) => {
    statement.run(name);
    return sqlite.prepare('SELECT seq FROM _counters WHERE id = ?').get(name).seq;
  });
  return Number(transaction(collection));
}

async function nextQuoteNumber() {
  ensureInitialized();
  let sequence;
  if (selectedMode === 'mongo') {
    const result = await mongoDatabase.collection('_counters').findOneAndUpdate(
      { _id: 'quote_counter' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    sequence = Number(result?.seq);
  } else {
    const transaction = sqlite.transaction(() => {
      sqlite.prepare(`
        INSERT INTO _counters (id, seq) VALUES ('quote_counter', 1)
        ON CONFLICT(id) DO UPDATE SET seq = seq + 1
      `).run();
      return sqlite.prepare("SELECT seq FROM _counters WHERE id = 'quote_counter'").get().seq;
    });
    sequence = Number(transaction());
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) fail('تعذرت زيادة عدّاد عروض الأسعار.');
  return `QT-${String(sequence).padStart(4, '0')}`;
}

async function upsertQuoteRating(quoteId, userId, rating) {
  ensureInitialized();
  const quote = Number(quoteId);
  const user = Number(userId);
  const score = Number(rating);
  if (![quote, user, score].every(Number.isSafeInteger) || quote < 1 || user < 1 || score < 1 || score > 5) {
    fail('بيانات تقييم العرض غير صالحة.');
  }
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (selectedMode === 'mongo') {
    await mongoDatabase.collection('quote_ratings').updateOne(
      { quote_id: quote, user_id: user },
      {
        $set: { rating: score, updated_at: now },
        $setOnInsert: { created_at: now },
      },
      { upsert: true },
    );
    return;
  }
  sqlite.prepare(`
    INSERT INTO quote_ratings (quote_id, user_id, rating, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(quote_id, user_id)
    DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at
  `).run(quote, user, score, now, now);
}

async function quoteRatingSummaries(quoteIds) {
  ensureInitialized();
  if (!Array.isArray(quoteIds)) fail('معرّفات العروض يجب أن تكون قائمة.');
  const ids = [...new Set(quoteIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (ids.length === 0) return {};
  const summaries = {};

  if (selectedMode === 'mongo') {
    for (let offset = 0; offset < ids.length; offset += 500) {
      const rows = await mongoDatabase.collection('quote_ratings').aggregate([
        { $match: { quote_id: { $in: ids.slice(offset, offset + 500) } } },
        { $group: { _id: '$quote_id', average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]).toArray();
      for (const row of rows) {
        summaries[Number(row._id)] = {
          average: Math.round(Number(row.average || 0) * 100) / 100,
          count: Number(row.count || 0),
        };
      }
    }
    return summaries;
  }

  for (let offset = 0; offset < ids.length; offset += 500) {
    const slice = ids.slice(offset, offset + 500);
    const rows = sqlite.prepare(`
      SELECT quote_id, AVG(rating) AS average, COUNT(*) AS count
      FROM quote_ratings
      WHERE quote_id IN (${slice.map(() => '?').join(', ')})
      GROUP BY quote_id
    `).all(...slice);
    for (const row of rows) {
      summaries[row.quote_id] = {
        average: Math.round(Number(row.average || 0) * 100) / 100,
        count: Number(row.count || 0),
      };
    }
  }
  return summaries;
}

async function quoteRatingStats() {
  ensureInitialized();
  if (selectedMode === 'mongo') {
    const [row] = await mongoDatabase.collection('quote_ratings').aggregate([
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).toArray();
    return {
      average: Math.round(Number(row?.average || 0) * 100) / 100,
      count: Number(row?.count || 0),
    };
  }
  const row = sqlite.prepare(
    'SELECT AVG(rating) AS average, COUNT(*) AS count FROM quote_ratings',
  ).get();
  return {
    average: Math.round(Number(row.average || 0) * 100) / 100,
    count: Number(row.count || 0),
  };
}

async function upsertByKey(collection, keyField, keyValue, data) {
  ensureInitialized();
  collectionName(collection);
  assertField(collection, keyField);
  if (keyValue === undefined || keyValue === null || keyValue === '') {
    fail('مفتاح التحديث غير صالح.');
  }
  if (!isPlainObject(data)) fail('بيانات التحديث غير صالحة.');
  const update = { ...data, [keyField]: keyValue };
  for (const field of Object.keys(update)) assertField(collection, field);

  if (selectedMode === 'mongo') {
    await mongoDatabase.collection(collection).updateOne(
      { [keyField]: keyValue },
      { $set: update },
      { upsert: true },
    );
    return;
  }

  const fields = Object.keys(update);
  const assignments = fields.filter((field) => field !== keyField);
  const onConflict = assignments.length
    ? assignments.map((field) => `${assertField(collection, field)} = excluded.${assertField(collection, field)}`).join(', ')
    : `${assertField(collection, keyField)} = excluded.${assertField(collection, keyField)}`;
  const sql = `
    INSERT INTO ${quoteIdentifier(collection)}
      (${fields.map((field) => assertField(collection, field)).join(', ')})
    VALUES (${fields.map(() => '?').join(', ')})
    ON CONFLICT (${assertField(collection, keyField)}) DO UPDATE SET ${onConflict}
  `;
  sqlite.prepare(sql).run(...fields.map((field) => normalizeSqlValue(update[field])));
}

async function sessionGet(id) {
  ensureInitialized();
  const sid = validateSessionId(id);
  let data;
  let expiresAt;
  if (selectedMode === 'mongo') {
    const row = await mongoDatabase.collection('sessions').findOne({ _id: sid });
    if (!row) return null;
    data = row.data;
    expiresAt = row.expiresAt instanceof Date ? row.expiresAt.getTime() : Date.parse(row.expiresAt);
  } else {
    const row = sqlite.prepare(
      'SELECT sess, expires_at FROM sessions WHERE sid = ?',
    ).get(sid);
    if (!row) return null;
    data = JSON.parse(row.sess);
    expiresAt = row.expires_at;
  }
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return null;
  return data;
}

function validateSessionId(id) {
  if (typeof id !== 'string' || id.length < 1 || id.length > 512) {
    fail('معرّف الجلسة غير صالح.');
  }
  return id;
}

function serializeSession(data) {
  if (!isPlainObject(data)) fail('بيانات الجلسة يجب أن تكون كائناً.');
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    fail('تعذر تسلسل بيانات الجلسة.');
  }
}

async function sessionSet(id, data, expiresAt) {
  ensureInitialized();
  const sid = validateSessionId(id);
  const sessionData = serializeSession(data);
  const expiry = normalizeExpiry(expiresAt);
  const updatedAt = new Date().toISOString();

  if (selectedMode === 'mongo') {
    await mongoDatabase.collection('sessions').updateOne(
      { _id: sid },
      { $set: { data: sessionData, expiresAt: new Date(expiry), updatedAt } },
      { upsert: true },
    );
    return;
  }
  sqlite.prepare(`
    INSERT INTO sessions (sid, sess, expires_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(sid) DO UPDATE SET
      sess = excluded.sess,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  `).run(sid, JSON.stringify(sessionData), expiry, updatedAt);
}

async function sessionDestroy(id) {
  ensureInitialized();
  const sid = validateSessionId(id);
  if (selectedMode === 'mongo') {
    const result = await mongoDatabase.collection('sessions').deleteOne({ _id: sid });
    return result.deletedCount > 0;
  }
  return sqlite.prepare('DELETE FROM sessions WHERE sid = ?').run(sid).changes > 0;
}

async function close() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDatabase = null;
  }
  selectedMode = null;
  initPromise = null;
}

function getMode() {
  return selectedMode;
}

function getLastInsertedId() {
  return lastInsertedId;
}

module.exports = Object.freeze({
  init,
  close,
  getMode,
  getLastInsertedId,
  findOne,
  findAll,
  count,
  insertDoc,
  updateDoc,
  deleteDoc,
  aggregate,
  sumField,
  nextQuoteNumber,
  upsertQuoteRating,
  quoteRatingSummaries,
  quoteRatingStats,
  upsertByKey,
  sessionGet,
  sessionSet,
  sessionDestroy,
});