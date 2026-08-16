<?php
/**
 * Dual-mode DB:
 *   MongoDB  → when ext-mongodb is loaded AND MONGODB_URI is set  (production)
 *   SQLite   → otherwise (local development)
 *
 * Public interface is identical in both modes.
 */

use MongoDB\Client;
use MongoDB\Operation\FindOneAndUpdate;

class DB {

    // ── mode ─────────────────────────────────────────────────────────
    private static ?bool $mongo = null;

    public static function isMongo(): bool {
        if (self::$mongo === null) {
            self::$mongo = extension_loaded('mongodb') && !empty(MONGODB_URI);
        }
        return self::$mongo;
    }

    // ══════════════════════════════════════════════════════════════════
    //  MONGODB BACKEND
    // ══════════════════════════════════════════════════════════════════
    private static ?Client $mclient  = null;
    private static ?\MongoDB\Database $mdb = null;

    private static function mdb(): \MongoDB\Database {
        if (self::$mdb !== null) return self::$mdb;
        self::$mclient = new Client(MONGODB_URI);
        self::$mdb     = self::$mclient->selectDatabase('tas3eerah');
        self::mInit();
        return self::$mdb;
    }

    private static function mInit(): void {
        try {
            self::$mdb->users->createIndex(['email' => 1], ['unique' => true, 'sparse' => false]);
            self::$mdb->users->createIndex(['id'    => 1], ['unique' => true, 'sparse' => false]);
            self::$mdb->quotes->createIndex(['id'   => 1], ['unique' => true, 'sparse' => false]);
        } catch (\Throwable) {}
        if (self::$mdb->users->countDocuments(['role' => 'admin']) === 0) {
            self::mSeed();
        }
    }

    private static function mSeed(): void {
        $h = fn(string $p) => password_hash($p, PASSWORD_BCRYPT);
        self::insertDoc('users', ['name' => 'مدير النظام', 'email' => 'admin@tas3eerah.com',
            'password_hash' => $h('Admin@2025'), 'role' => 'admin', 'plan' => 'enterprise',
            'plan_expires_at' => null, 'is_active' => 1]);
        if (!defined('APP_ENV') || APP_ENV !== 'production') {
            self::insertDoc('users', ['name' => 'أحمد الموظف', 'email' => 'employee@tas3eerah.com',
                'password_hash' => $h('Demo@2025'), 'role' => 'employee', 'plan' => 'pro',
                'plan_expires_at' => null, 'is_active' => 1]);
            self::insertDoc('users', ['name' => 'سارة العميلة', 'email' => 'client@tas3eerah.com',
                'password_hash' => $h('Demo@2025'), 'role' => 'client', 'plan' => 'free',
                'plan_expires_at' => null, 'is_active' => 1]);
        }
    }

    public static function col(string $name): \MongoDB\Collection {
        return self::mdb()->selectCollection($name);
    }

    private static ?int $lastId = null;
    public static function id(): ?int { return self::$lastId; }

    private static function mNextSeq(string $collection): int {
        $r = self::col('_counters')->findOneAndUpdate(
            ['_id' => $collection],
            ['$inc' => ['seq' => 1]],
            ['upsert' => true, 'returnDocument' => FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
             'typeMap' => ['root' => 'array', 'document' => 'array']]
        );
        return (int)($r['seq'] ?? 1);
    }

    private static function mClean($doc): array {
        $arr = json_decode(json_encode($doc), true) ?? [];
        unset($arr['_id']);
        return $arr;
    }
    private static function tm(): array {
        return ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];
    }

    // ══════════════════════════════════════════════════════════════════
    //  SQLITE BACKEND
    // ══════════════════════════════════════════════════════════════════
    private static ?PDO $pdo = null;

    public static function get(): PDO {
        if (self::$pdo !== null) return self::$pdo;
        $dir = dirname(defined('DB_PATH') ? DB_PATH : __DIR__ . '/../database/tas3eerah.db');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $path = defined('DB_PATH') ? DB_PATH : $dir . '/tas3eerah.db';
        self::$pdo = new PDO('sqlite:' . $path);
        self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        self::$pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
        self::sMigrate();
        return self::$pdo;
    }

    private static function sMigrate(): void {
        self::$pdo->exec("
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
        ");
        // Ensure admin exists
        $has = self::$pdo->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetch();
        if ($has) return;
        $h = fn($p) => password_hash($p, PASSWORD_BCRYPT);
        $ins = self::$pdo->prepare("INSERT INTO users (name,email,password_hash,role,plan,is_active) VALUES (?,?,?,?,?,1)");
        $ins->execute(['مدير النظام', 'admin@tas3eerah.com', $h('Admin@2025'), 'admin', 'enterprise']);
        if (!defined('APP_ENV') || APP_ENV !== 'production') {
            $ins->execute(['أحمد الموظف',  'employee@tas3eerah.com', $h('Demo@2025'), 'employee', 'pro']);
            $ins->execute(['سارة العميلة', 'client@tas3eerah.com',   $h('Demo@2025'), 'client',   'free']);
        }
    }

    private static function sNextSeq(string $collection): int {
        $db = self::get();
        $db->prepare("INSERT INTO _counters (id, seq) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET seq = seq + 1")
           ->execute([$collection]);
        return (int)$db->query("SELECT seq FROM _counters WHERE id = " . $db->quote($collection))->fetchColumn();
    }

    /** Convert a MongoDB-style filter to SQL WHERE fragments */
    private static function filterToSQL(array $filter, string $alias = ''): array {
        $wheres = [];
        $params = [];
        $pf     = $alias ? "{$alias}." : '';

        foreach ($filter as $key => $value) {
            if ($key === '$or') {
                $parts = [];
                foreach ($value as $sub) {
                    [$w, $p] = self::filterToSQL($sub, $alias);
                    $parts[]  = '(' . (implode(' AND ', $w) ?: '1=1') . ')';
                    $params   = array_merge($params, $p);
                }
                $wheres[] = '(' . implode(' OR ', $parts) . ')';
            } elseif ($key === '$and') {
                foreach ($value as $sub) {
                    [$w, $p] = self::filterToSQL($sub, $alias);
                    $wheres  = array_merge($wheres, $w);
                    $params  = array_merge($params, $p);
                }
            } elseif (is_array($value)) {
                if (isset($value['$in'])) {
                    $ph      = implode(',', array_fill(0, count($value['$in']), '?'));
                    $wheres[]  = "{$pf}{$key} IN ({$ph})";
                    $params  = array_merge($params, $value['$in']);
                } elseif (isset($value['$ne'])) {
                    $wheres[]  = "{$pf}{$key} != ?";
                    $params[] = $value['$ne'];
                } elseif (isset($value['$regex'])) {
                    // Approximate with LIKE (strip anchors)
                    $pat = str_replace(['^', '$', '.*'], ['', '', '%'], $value['$regex']);
                    $wheres[] = "{$pf}{$key} LIKE ?";
                    $params[] = '%' . $pat . '%';
                } elseif (isset($value['$gte']) || isset($value['$lte']) || isset($value['$lt'])) {
                    if (isset($value['$gte'])) { $wheres[] = "{$pf}{$key} >= ?"; $params[] = $value['$gte']; }
                    if (isset($value['$lte'])) { $wheres[] = "{$pf}{$key} <= ?"; $params[] = $value['$lte']; }
                    if (isset($value['$lt']))  { $wheres[] = "{$pf}{$key} < ?";  $params[] = $value['$lt'];  }
                } elseif (isset($value['$exists'])) {
                    // ignore for SQLite (columns always exist)
                } else {
                    // treat plain array as JSON equality (unusual)
                    $wheres[] = '1=1';
                }
            } elseif ($value === null) {
                $wheres[] = "{$pf}{$key} IS NULL";
            } else {
                $wheres[] = "{$pf}{$key} = ?";
                $params[] = $value;
            }
        }
        return [$wheres ?: ['1=1'], $params];
    }

    /** Translate a MongoDB aggregation pipeline to SQL and fetch rows */
    private static function sAggregate(string $col, array $pipeline): array {
        $matchFilter = [];
        $joins       = [];
        $extraSel    = [];
        $orderClauses = [];
        $limitClause = '';

        foreach ($pipeline as $stage) {
            $key = array_key_first($stage);
            $val = $stage[$key];

            if ($key === '$match') {
                $matchFilter = $val;
            } elseif ($key === '$lookup') {
                $from    = $val['from'];
                $local   = $val['localField'];
                $foreign = $val['foreignField'];
                $as      = $val['as'];
                $joins[] = "LEFT JOIN {$from} AS {$as} ON {$as}.{$foreign} = t.{$local}";
            } elseif ($key === '$addFields') {
                foreach ($val as $fname => $expr) {
                    if (is_array($expr) && isset($expr['$arrayElemAt'])) {
                        $path = ltrim($expr['$arrayElemAt'][0], '$'); // e.g. "client.name"
                        [$tbl, $col2] = array_pad(explode('.', $path, 2), 2, 'id');
                        $extraSel[] = "{$tbl}.{$col2} AS {$fname}";
                    }
                }
            } elseif ($key === '$sort') {
                foreach ($val as $f => $dir) {
                    $orderClauses[] = "t.{$f} " . ($dir === -1 ? 'DESC' : 'ASC');
                }
            } elseif ($key === '$limit') {
                $limitClause = 'LIMIT ' . (int)$val;
            }
            // $project, $group (partial) handled below
        }

        // Special: $group for sumField
        foreach ($pipeline as $stage) {
            if (array_key_first($stage) === '$group') {
                $grp = $stage['$group'];
                unset($grp['_id']);
                $aggSel = [];
                foreach ($grp as $fname => $expr) {
                    if (isset($expr['$sum'])) {
                        $field  = ltrim($expr['$sum'], '$');
                        $aggSel[] = "SUM(t.{$field}) AS {$fname}";
                    }
                }
                [$whereArr, $params] = self::filterToSQL($matchFilter, 't');
                $where = implode(' AND ', $whereArr);
                $sql   = "SELECT " . implode(', ', $aggSel) . " FROM {$col} t WHERE {$where}";
                $stmt  = self::get()->prepare($sql);
                $stmt->execute($params);
                $row = $stmt->fetch();
                return $row ? [array_filter($row, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY)] : [];
            }
        }

        [$whereArr, $params] = self::filterToSQL($matchFilter, 't');
        $where = implode(' AND ', $whereArr);
        $joinSql  = implode(' ', $joins);
        $selExtra = $extraSel ? ', ' . implode(', ', $extraSel) : '';
        $orderSql = $orderClauses ? 'ORDER BY ' . implode(', ', $orderClauses) : '';
        $sql = "SELECT t.* {$selExtra} FROM {$col} t {$joinSql} WHERE {$where} {$orderSql} {$limitClause}";

        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        // Decode JSON items column if present
        return array_map(fn($r) => self::sDecodeRow($r), $rows);
    }

    private static function sDecodeRow(array $row): array {
        if (isset($row['items']) && is_string($row['items'])) {
            $row['items'] = json_decode($row['items'], true) ?? [];
        }
        return $row;
    }

    // ══════════════════════════════════════════════════════════════════
    //  UNIFIED PUBLIC INTERFACE
    // ══════════════════════════════════════════════════════════════════

    public static function insertDoc(string $col, array $data): int {
        if (!isset($data['created_at'])) $data['created_at'] = date('Y-m-d H:i:s');

        if (self::isMongo()) {
            $id         = self::mNextSeq($col);
            $data['id'] = $id;
            self::col($col)->insertOne($data);
            self::$lastId = $id;
            return $id;
        }

        // SQLite
        $id         = self::sNextSeq($col);
        $data['id'] = $id;
        // JSON-encode array fields (e.g. items)
        foreach ($data as $k => $v) {
            if (is_array($v)) $data[$k] = json_encode($v, JSON_UNESCAPED_UNICODE);
        }
        $cols  = implode(',', array_keys($data));
        $ph    = implode(',', array_fill(0, count($data), '?'));
        self::get()->prepare("INSERT INTO {$col} ({$cols}) VALUES ({$ph})")->execute(array_values($data));
        self::$lastId = $id;
        return $id;
    }

    public static function findOne(string $col, array $filter, array $opts = []): ?array {
        if (self::isMongo()) {
            $doc = self::col($col)->findOne($filter, $opts + self::tm());
            return $doc === null ? null : self::mClean($doc);
        }
        [$where, $params] = self::filterToSQL($filter);
        $projection = '';
        if (!empty($opts['projection'])) {
            $fields = array_keys(array_filter($opts['projection']));
            $projection = implode(',', $fields);
        }
        $sel  = $projection ?: '*';
        $stmt = self::get()->prepare("SELECT {$sel} FROM {$col} WHERE " . implode(' AND ', $where) . " LIMIT 1");
        $stmt->execute($params);
        $row  = $stmt->fetch();
        return $row ? self::sDecodeRow($row) : null;
    }

    public static function findAll(string $col, array $filter = [], array $opts = []): array {
        if (self::isMongo()) {
            $cursor = self::col($col)->find($filter, $opts + self::tm());
            $result = [];
            foreach ($cursor as $doc) { $result[] = self::mClean($doc); }
            return $result;
        }
        [$where, $params] = self::filterToSQL($filter);
        $projection = '';
        if (!empty($opts['projection'])) {
            $fields = array_keys(array_filter($opts['projection']));
            $projection = implode(',', $fields);
        }
        $sel   = $projection ?: '*';
        $order = '';
        if (!empty($opts['sort'])) {
            $parts = [];
            foreach ($opts['sort'] as $f => $d) $parts[] = "{$f} " . ($d === -1 ? 'DESC' : 'ASC');
            $order = 'ORDER BY ' . implode(', ', $parts);
        }
        $limit = isset($opts['limit']) ? 'LIMIT ' . (int)$opts['limit'] : '';
        $stmt  = self::get()->prepare("SELECT {$sel} FROM {$col} WHERE " . implode(' AND ', $where) . " {$order} {$limit}");
        $stmt->execute($params);
        return array_map(fn($r) => self::sDecodeRow($r), $stmt->fetchAll());
    }

    public static function count(string $col, array $filter = []): int {
        if (self::isMongo()) return (int)self::col($col)->countDocuments($filter);
        [$where, $params] = self::filterToSQL($filter);
        $stmt = self::get()->prepare("SELECT COUNT(*) FROM {$col} WHERE " . implode(' AND ', $where));
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    public static function updateDoc(string $col, array $filter, array $update): void {
        if (self::isMongo()) {
            self::col($col)->updateMany($filter, ['$set' => $update]);
            return;
        }
        [$where, $wParams] = self::filterToSQL($filter);
        $sets   = [];
        $uParams = [];
        foreach ($update as $k => $v) {
            $sets[]   = "{$k} = ?";
            $uParams[] = is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : $v;
        }
        self::get()->prepare("UPDATE {$col} SET " . implode(', ', $sets) . " WHERE " . implode(' AND ', $where))
             ->execute(array_merge($uParams, $wParams));
    }

    public static function deleteDoc(string $col, array $filter): void {
        if (self::isMongo()) { self::col($col)->deleteMany($filter); return; }
        [$where, $params] = self::filterToSQL($filter);
        self::get()->prepare("DELETE FROM {$col} WHERE " . implode(' AND ', $where))->execute($params);
    }

    public static function aggregate(string $col, array $pipeline): array {
        if (self::isMongo()) {
            $cursor = self::col($col)->aggregate($pipeline, self::tm());
            $result = [];
            foreach ($cursor as $doc) { $result[] = self::mClean($doc); }
            return $result;
        }
        return self::sAggregate($col, $pipeline);
    }

    public static function sumField(string $col, array $filter, string $field): float {
        if (self::isMongo()) {
            $res = self::aggregate($col, [
                ['$match' => $filter ?: (object)[]],
                ['$group' => ['_id' => null, 'total' => ['$sum' => '$' . $field]]],
            ]);
            return (float)($res[0]['total'] ?? 0);
        }
        [$where, $params] = self::filterToSQL($filter);
        $stmt = self::get()->prepare("SELECT COALESCE(SUM({$field}), 0) FROM {$col} WHERE " . implode(' AND ', $where));
        $stmt->execute($params);
        return (float)$stmt->fetchColumn();
    }

    public static function nextQuoteNumber(): string {
        if (self::isMongo()) {
            $r = self::col('_counters')->findOneAndUpdate(
                ['_id' => 'quote_counter'],
                ['$inc' => ['seq' => 1]],
                ['upsert' => true, 'returnDocument' => FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
                 'typeMap' => ['root' => 'array', 'document' => 'array']]
            );
            $num = (int)($r['seq'] ?? 1);
        } else {
            $db = self::get();
            $db->prepare("INSERT INTO _counters (id, seq) VALUES ('quote_counter', 1) ON CONFLICT(id) DO UPDATE SET seq = seq + 1")->execute();
            $num = (int)$db->query("SELECT seq FROM _counters WHERE id='quote_counter'")->fetchColumn();
        }
        return 'QT-' . str_pad($num, 4, '0', STR_PAD_LEFT);
    }
}
