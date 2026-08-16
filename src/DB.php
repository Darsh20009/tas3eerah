<?php
use MongoDB\Client;
use MongoDB\Operation\FindOneAndUpdate;

class DB {
    private static ?Client $client       = null;
    private static ?\MongoDB\Database $database = null;
    private static ?int $lastId          = null;

    // ── Connection ────────────────────────────────────────────────────
    private static function db(): \MongoDB\Database {
        if (self::$database !== null) return self::$database;

        $uri = MONGODB_URI;
        if (!$uri) {
            throw new \RuntimeException(
                'MONGODB_URI غير محدد — أضف المتغير في إعدادات المشروع (Secrets)'
            );
        }
        self::$client   = new Client($uri);
        self::$database = self::$client->selectDatabase('tas3eerah');

        // Init indexes and seed (calling col() here is safe: db() returns early now)
        self::doInit();
        return self::$database;
    }

    private static function doInit(): void {
        // Indexes (ignore if already exist)
        try {
            self::$database->users->createIndex(['email' => 1], ['unique' => true, 'sparse' => false]);
            self::$database->users->createIndex(['id'    => 1], ['unique' => true, 'sparse' => false]);
            self::$database->quotes->createIndex(['id'   => 1], ['unique' => true, 'sparse' => false]);
        } catch (\Throwable) {}

        // Seed only if no admin exists yet
        $adminExists = self::$database->users->countDocuments(['role' => 'admin']) > 0;
        if ($adminExists) return;
        self::doSeed();
    }

    private static function doSeed(): void {
        $h = fn(string $p) => password_hash($p, PASSWORD_BCRYPT);

        self::insertDoc('users', [
            'name'            => 'مدير النظام',
            'email'           => 'admin@tas3eerah.com',
            'password_hash'   => $h('Admin@2025'),
            'role'            => 'admin',
            'plan'            => 'enterprise',
            'plan_expires_at' => null,
            'is_active'       => 1,
        ]);

        if (defined('APP_ENV') && APP_ENV === 'production') return;

        self::insertDoc('users', [
            'name'            => 'أحمد الموظف',
            'email'           => 'employee@tas3eerah.com',
            'password_hash'   => $h('Demo@2025'),
            'role'            => 'employee',
            'plan'            => 'pro',
            'plan_expires_at' => null,
            'is_active'       => 1,
        ]);
        self::insertDoc('users', [
            'name'            => 'سارة العميلة',
            'email'           => 'client@tas3eerah.com',
            'password_hash'   => $h('Demo@2025'),
            'role'            => 'client',
            'plan'            => 'free',
            'plan_expires_at' => null,
            'is_active'       => 1,
        ]);
    }

    // ── Collection accessor ───────────────────────────────────────────
    public static function col(string $name): \MongoDB\Collection {
        return self::db()->selectCollection($name);
    }

    // ── Auto-increment IDs ────────────────────────────────────────────
    private static function nextSeq(string $collection): int {
        $result = self::col('_counters')->findOneAndUpdate(
            ['_id' => $collection],
            ['$inc' => ['seq' => 1]],
            [
                'upsert'         => true,
                'returnDocument' => FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
                'typeMap'        => ['root' => 'array', 'document' => 'array'],
            ]
        );
        return (int)($result['seq'] ?? 1);
    }

    public static function id(): ?int { return self::$lastId; }

    // ── BSON → plain PHP array ────────────────────────────────────────
    private static function clean($doc): array {
        $arr = json_decode(json_encode($doc), true) ?? [];
        unset($arr['_id']);
        return $arr;
    }

    // ── Default query options (typeMap) ───────────────────────────────
    private static function tm(): array {
        return ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];
    }

    // ── CRUD helpers ──────────────────────────────────────────────────

    public static function insertDoc(string $col, array $data): int {
        $id         = self::nextSeq($col);
        $data['id'] = $id;
        if (!isset($data['created_at'])) {
            $data['created_at'] = date('Y-m-d H:i:s');
        }
        self::col($col)->insertOne($data);
        self::$lastId = $id;
        return $id;
    }

    public static function findOne(string $col, array $filter, array $opts = []): ?array {
        $doc = self::col($col)->findOne($filter, $opts + self::tm());
        return $doc === null ? null : self::clean($doc);
    }

    public static function findAll(string $col, array $filter = [], array $opts = []): array {
        $cursor = self::col($col)->find($filter, $opts + self::tm());
        $result = [];
        foreach ($cursor as $doc) {
            $result[] = self::clean($doc);
        }
        return $result;
    }

    public static function count(string $col, array $filter = []): int {
        return (int)self::col($col)->countDocuments($filter);
    }

    public static function updateDoc(string $col, array $filter, array $update): void {
        self::col($col)->updateMany($filter, ['$set' => $update]);
    }

    public static function deleteDoc(string $col, array $filter): void {
        self::col($col)->deleteMany($filter);
    }

    public static function aggregate(string $col, array $pipeline): array {
        $cursor = self::col($col)->aggregate($pipeline, self::tm());
        $result = [];
        foreach ($cursor as $doc) {
            $result[] = self::clean($doc);
        }
        return $result;
    }

    /** SUM a numeric field across matching documents */
    public static function sumField(string $col, array $filter, string $field): float {
        $res = self::aggregate($col, [
            ['$match' => $filter ?: (object)[]],
            ['$group' => ['_id' => null, 'total' => ['$sum' => '$' . $field]]],
        ]);
        return (float)($res[0]['total'] ?? 0);
    }

    /** Quote counter — atomic increment */
    public static function nextQuoteNumber(): string {
        $result = self::col('_counters')->findOneAndUpdate(
            ['_id' => 'quote_counter'],
            ['$inc' => ['seq' => 1]],
            [
                'upsert'         => true,
                'returnDocument' => FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
                'typeMap'        => ['root' => 'array', 'document' => 'array'],
            ]
        );
        $num = (int)($result['seq'] ?? 1);
        return 'QT-' . str_pad($num, 4, '0', STR_PAD_LEFT);
    }
}
