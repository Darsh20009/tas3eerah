'use strict';

// One-time, non-destructive import into an empty development MongoDB database.
// Run without arguments to inspect, then --apply after stopping the app, --verify after.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { MongoClient } = require('mongodb');
const Database = require('better-sqlite3');
const config = require('../server/config');

const TABLES = [
  'users', 'quotes', 'quote_ratings', 'messages', 'activity_log',
  'contact_messages', 'settings',
];
const META_COLLECTION = '_migration_meta';
const MARKER = 'sqlite-initial';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function digest(documents) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(documents))).digest('hex');
}

function loadSource() {
  const source = new Database(config.DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const documents = Object.fromEntries(TABLES.map((table) => [
      table,
      source.prepare(`SELECT * FROM "${table}" ORDER BY "${table === 'settings' ? 'key' : 'id'}"`).all(),
    ]));
    const legacyItems = source.prepare('SELECT * FROM quote_items ORDER BY id').all();
    const itemsByQuote = new Map();
    for (const { quote_id, ...item } of legacyItems) {
      if (!itemsByQuote.has(quote_id)) itemsByQuote.set(quote_id, []);
      itemsByQuote.get(quote_id).push(item);
    }
    const quoteIds = new Set(documents.quotes.map((quote) => quote.id));
    if (legacyItems.some((item) => !quoteIds.has(item.quote_id))) {
      throw new Error('توجد بنود عرض قديمة دون عرض سعر مرتبط بها؛ أوقف النقل لحمايتها.');
    }
    for (const quote of documents.quotes) {
      const items = JSON.parse(quote.items);
      if (!Array.isArray(items)) throw new Error('بنود عرض السعر ليست مصفوفة.');
      if (items.length && itemsByQuote.has(quote.id)) {
        throw new Error('عرض السعر يحتوي بنوداً في تنسيقي SQLite القديم والجديد؛ يتطلب دمجاً يدوياً.');
      }
      quote.items = items.length ? items : (itemsByQuote.get(quote.id) || []);
    }
    const userIds = new Set(documents.users.map((user) => user.id));
    for (const quote of documents.quotes) {
      for (const id of [quote.client_id, quote.employee_id]) {
        if (id && !userIds.has(id)) throw new Error('عرض سعر يشير إلى مستخدم غير موجود.');
      }
    }
    for (const message of documents.messages) {
      if (!userIds.has(message.sender_id) || !userIds.has(message.receiver_id)) {
        throw new Error('رسالة تشير إلى مستخدم غير موجود.');
      }
    }
    for (const rating of documents.quote_ratings) {
      if (!quoteIds.has(rating.quote_id) || !userIds.has(rating.user_id)) {
        throw new Error('تقييم يشير إلى عرض أو مستخدم غير موجود.');
      }
    }

    const oldCounters = new Map(source.prepare('SELECT id, seq FROM _counters').all().map((r) => [r.id, r.seq]));
    const legacyQuoteCounter = source.prepare('SELECT MAX(last_num) AS value FROM quote_counter').get().value || 0;
    const counters = TABLES.filter((table) => table !== 'settings').map((table) => ({
      _id: table,
      seq: Math.max(oldCounters.get(table) || 0, ...documents[table].map((row) => row.id), 0),
    }));
    const quoteNumbers = documents.quotes.map((quote) => {
      const match = /^QT-(\d+)$/.exec(quote.number);
      return match ? Number(match[1]) : 0;
    });
    counters.push({
      _id: 'quote_counter',
      seq: Math.max(oldCounters.get('quote_counter') || 0, legacyQuoteCounter, ...quoteNumbers),
    });
    return {
      documents,
      counters,
      signature: digest({ documents, counters }),
      sessionsSkipped: source.prepare('SELECT COUNT(*) AS total FROM sessions').get().total,
      legacyItems: legacyItems.length,
    };
  } finally {
    source.close();
  }
}

async function compareTarget(db, source) {
  const actual = {};
  for (const table of TABLES) {
    const field = table === 'settings' ? 'key' : 'id';
    actual[table] = source.documents[table].length
      ? await db.collection(table).find(
        { [field]: { $in: source.documents[table].map((row) => row[field]) } },
        { projection: { _id: 0 } },
      ).sort({ [field]: 1 }).toArray()
      : [];
    if (digest(actual[table]) !== digest(source.documents[table])) {
      throw new Error(`السجلات المنقولة إلى ${table} لا تطابق المصدر.`);
    }
  }
  const actualCounters = await db.collection('_counters')
    .find({}, { projection: { seq: 1 } }).sort({ _id: 1 }).toArray();
  for (const counter of source.counters) {
    const current = actualCounters.find((row) => row._id === counter._id);
    if (!current || current.seq < counter.seq) {
      throw new Error('أحد عدّادات MongoDB أصغر من القيمة المنقولة.');
    }
  }
  assert.equal(digest({ documents: actual, counters: source.counters }), source.signature);
}

async function main() {
  const action = process.argv[2] || '--inspect';
  if (!['--inspect', '--apply', '--verify'].includes(action) || process.argv.length > 3) {
    throw new Error('استخدم: node scripts/migrate-sqlite-to-mongo.js [--inspect|--apply|--verify]');
  }
  if (!config.MONGODB_URI) throw new Error('MONGODB_URI مطلوب.');
  if (config.APP_ENV !== 'development' || config.MONGODB_DB_NAME !== 'tas3eerah_dev') {
    throw new Error('النقل مسموح فقط في بيئة التطوير إلى قاعدة tas3eerah_dev المحددة.');
  }

  const source = loadSource();
  const client = new MongoClient(config.MONGODB_URI, {
    appName: 'tas3eerah-sqlite-migration',
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    await client.connect();
    const db = client.db(config.MONGODB_DB_NAME);
    await db.command({ ping: 1 });
    const marker = await db.collection(META_COLLECTION).findOne({ _id: MARKER });
    if (marker) {
      if (marker.signature !== source.signature) throw new Error('بيانات SQLite تغيّرت منذ النقل السابق.');
      await compareTarget(db, source);
      console.log('تم التحقق: بيانات MongoDB للتطوير مطابقة لملف SQLite المنقول.');
      return;
    }

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    if (collections.length) {
      throw new Error('قاعدة التطوير ليست فارغة؛ لن تُدمج البيانات أو تُستبدل تلقائياً.');
    }
    console.log('قاعدة التطوير فارغة. سجلات النقل:', Object.fromEntries(
      TABLES.map((table) => [table, source.documents[table].length]),
    ));
    console.log('بنود عروض قديمة محفوظة:', source.legacyItems, '| جلسات ستُستثنى:', source.sessionsSkipped);
    if (action === '--verify') throw new Error('لم يُنفّذ النقل بعد.');
    if (action !== '--apply') return;

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const table of TABLES) {
          if (source.documents[table].length) {
            await db.collection(table).insertMany(
              source.documents[table].map((row) => ({ ...row })),
              { session },
            );
          }
        }
        await db.collection('_counters').insertMany(source.counters, { session });
        await db.collection(META_COLLECTION).insertOne({
          _id: MARKER,
          signature: source.signature,
          importedAt: new Date(),
        }, { session });
      });
    } finally {
      await session.endSession();
    }
    await compareTarget(db, source);
    console.log('اكتمل النقل والتحقق؛ قاعدة الإنتاج لم تُمس.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('تعذر نقل البيانات:', error.message);
  process.exitCode = 1;
});