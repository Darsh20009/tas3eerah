<?php
class DB {
    private static ?PDO $pdo = null;

    public static function get(): PDO {
        if (self::$pdo === null) {
            $dir = dirname(DB_PATH);
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            self::$pdo = new PDO('sqlite:' . DB_PATH);
            self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            self::$pdo->exec('PRAGMA journal_mode=WAL');
            self::$pdo->exec('PRAGMA foreign_keys=ON');
            self::migrate();
        }
        return self::$pdo;
    }

    private static function migrate(): void {
        $db = self::$pdo;
        $db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT    NOT NULL,
                email           TEXT    UNIQUE NOT NULL,
                password_hash   TEXT    NOT NULL,
                role            TEXT    NOT NULL DEFAULT 'client',
                plan            TEXT    NOT NULL DEFAULT 'free',
                plan_expires_at TEXT,
                is_active       INTEGER NOT NULL DEFAULT 1,
                created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS quotes (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                number      TEXT    NOT NULL,
                client_id   INTEGER,
                employee_id INTEGER,
                title       TEXT    NOT NULL,
                status      TEXT    NOT NULL DEFAULT 'draft',
                subtotal    REAL    NOT NULL DEFAULT 0,
                tax_rate    REAL    NOT NULL DEFAULT 15,
                discount    REAL    NOT NULL DEFAULT 0,
                total       REAL    NOT NULL DEFAULT 0,
                notes       TEXT,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (client_id)   REFERENCES users(id),
                FOREIGN KEY (employee_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS quote_items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_id    INTEGER NOT NULL,
                description TEXT    NOT NULL,
                qty         REAL    NOT NULL DEFAULT 1,
                unit_price  REAL    NOT NULL DEFAULT 0,
                total       REAL    NOT NULL DEFAULT 0,
                FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id   INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                subject     TEXT,
                body        TEXT    NOT NULL,
                is_read     INTEGER NOT NULL DEFAULT 0,
                parent_id   INTEGER,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (sender_id)   REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS activity_log (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER,
                action     TEXT NOT NULL,
                details    TEXT,
                ip         TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS quote_counter (
                last_num INTEGER NOT NULL DEFAULT 0
            );
            INSERT OR IGNORE INTO quote_counter (last_num)
                SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM quote_counter);
        ");
        self::seed($db);
    }

    private static function seed(PDO $db): void {
        // Always ensure the admin account exists so the system is never locked out
        $has = $db->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetch();
        if ($has) return;

        $h = fn($p) => password_hash($p, PASSWORD_BCRYPT);
        $ins = $db->prepare("INSERT INTO users (name,email,password_hash,role,plan) VALUES (?,?,?,?,?)");

        $ins->execute(['مدير النظام', 'admin@tas3eerah.com', $h('Admin@2025'), 'admin', 'enterprise']);

        // Demo users and sample data — development only
        if (defined('APP_ENV') && APP_ENV !== 'development') return;

        $ins->execute(['أحمد الموظف',   'employee@tas3eerah.com', $h('Demo@2025'),     'employee', 'pro']);
        $ins->execute(['سارة العميلة',   'client@tas3eerah.com',  $h('Demo@2025'),     'client',   'free']);

        // Sample quote
        $empId = $db->lastInsertId();
        $empId = (int)$db->query("SELECT id FROM users WHERE role='employee' LIMIT 1")->fetchColumn();
        $cliId = (int)$db->query("SELECT id FROM users WHERE role='client'   LIMIT 1")->fetchColumn();

        $db->prepare("INSERT INTO quotes (number,client_id,employee_id,title,status,subtotal,tax_rate,total)
                      VALUES (?,?,?,?,?,?,?,?)")
           ->execute(['QT-0001', $cliId, $empId, 'تصميم موقع إلكتروني', 'sent', 5000, 15, 5750]);

        $qid = (int)$db->lastInsertId();
        $ii  = $db->prepare("INSERT INTO quote_items (quote_id,description,qty,unit_price,total) VALUES (?,?,?,?,?)");
        $ii->execute([$qid,'تصميم الواجهة',1,2500,2500]);
        $ii->execute([$qid,'تطوير الصفحات',5,500,2500]);

        // Sample messages
        $adId = (int)$db->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetchColumn();
        $db->prepare("INSERT INTO messages (sender_id,receiver_id,subject,body) VALUES (?,?,?,?)")
           ->execute([$empId,$cliId,'عرض السعر جاهز','تم إعداد عرض السعر الخاص بك. يرجى مراجعته.']);
        $db->prepare("INSERT INTO messages (sender_id,receiver_id,subject,body) VALUES (?,?,?,?)")
           ->execute([$cliId,$empId,'استفسار','شكراً جزيلاً، لدي بعض الأسئلة.']);

        // Activity log
        $db->prepare("INSERT INTO activity_log (user_id,action,details) VALUES (?,?,?)")
           ->execute([$adId,'system_init','تهيئة النظام للمرة الأولى']);
    }

    public static function all(string $sql, array $p = []): array {
        $s = self::get()->prepare($sql); $s->execute($p); return $s->fetchAll();
    }
    public static function row(string $sql, array $p = []): ?array {
        $r = self::all($sql, $p); return $r[0] ?? null;
    }
    public static function val(string $sql, array $p = []) {
        $s = self::get()->prepare($sql); $s->execute($p); return $s->fetchColumn();
    }
    public static function run(string $sql, array $p = []): PDOStatement {
        $s = self::get()->prepare($sql); $s->execute($p); return $s;
    }
    public static function id(): string { return self::get()->lastInsertId(); }
}
