<?php
define('APP_NAME_AR', 'تسعيرة');
define('APP_NAME_EN', 'Tas3eerah');

define('APP_URL',     rtrim($_ENV['APP_URL']     ?? getenv('APP_URL')     ?: getenv('RENDER_EXTERNAL_URL') ?: 'http://localhost:5000', '/'));
define('APP_ENV',     $_ENV['APP_ENV']     ?? getenv('APP_ENV')     ?: 'development');
define('MONGODB_URI', $_ENV['MONGODB_URI'] ?? getenv('MONGODB_URI') ?: '');
define('DB_PATH',     __DIR__ . '/database/tas3eerah.db');

define('APP_LOGO', '/assets/brand-logo-transparent.png');
define('SESSION_LIFETIME', 60 * 60 * 24 * 30);
// The launch offer is now represented by the published plan limits.
define('OPEN_ACCESS_MODE', false);

define('PLANS', [
    'free' => [
        'name_ar'     => 'مجاني',
        'name_en'     => 'Free',
        'price'       => 0,
        'max_quotes'  => 5,
        'max_msgs'    => 0,
        'max_pdf_reports' => 3,
        'history_limit'  => 3,
        'max_users'      => 1,
        'tools'       => ['all'],
        'badge'       => '#6B7C73',
        'features_ar' => ['٥ تسعيرات للخدمات أو المنتجات شهرياً', 'تصدير ٣ تقارير PDF', 'سجل يعرض ٣ خدمات أو منتجات', 'مستخدم واحد', 'دعم عبر البريد خلال ٣ أيام'],
    ],
    'plus' => [
        'name_ar'     => 'Plus',
        'name_en'     => 'Plus',
        'price'       => 49,
        'max_quotes'  => 15,
        'max_msgs'    => 0,
        'max_pdf_reports' => 15,
        'history_limit'  => -1,
        'max_users'      => 2,
        'tools'       => ['calc_basic', 'calc_store'],
        'tool_limit'  => 2,
        'badge'       => '#2471A3',
        'features_ar' => ['اختيار أداتي تسعير حسب احتياجك', '١٥ تسعيراً للخدمات أو المنتجات شهرياً', 'تصدير ١٥ تقرير PDF', 'سجل مشاريع كامل', 'مستخدمان', 'دعم عبر البريد خلال ٤٨ ساعة'],
    ],
    'pro' => [
        'name_ar'     => 'Pro',
        'name_en'     => 'Pro',
        'price'       => 79,
        'max_quotes'  => -1,
        'max_msgs'    => -1,
        'max_pdf_reports' => -1,
        'history_limit'  => -1,
        'max_users'      => 4,
        'tools'       => ['calc_basic', 'calc_store', 'calc_menu'],
        'tool_limit'  => 3,
        'badge'       => '#C9A741',
        'features_ar' => ['اختيار ٣ أدوات تسعير حسب احتياجك', 'تسعير غير محدود للخدمات أو المنتجات', 'حتى ٤ مستخدمين للفريق', 'رسائل داخلية بين أعضاء الفريق', 'تقارير PDF غير محدودة مع شعار العميل', 'أولوية الدعم خلال ٢٤ ساعة عبر البريد وواتساب'],
    ],
]);

error_reporting(E_ALL);
ini_set('display_errors', 0);

// OAuth credentials
define('GOOGLE_CLIENT_ID',     $_ENV['GOOGLE_CLIENT_ID']     ?? getenv('GOOGLE_CLIENT_ID')     ?: '');
define('GOOGLE_CLIENT_SECRET', $_ENV['GOOGLE_CLIENT_SECRET'] ?? getenv('GOOGLE_CLIENT_SECRET') ?: '');
define('APPLE_CLIENT_ID',      $_ENV['APPLE_CLIENT_ID']      ?? getenv('APPLE_CLIENT_ID')      ?: '');
define('APPLE_TEAM_ID',        $_ENV['APPLE_TEAM_ID']        ?? getenv('APPLE_TEAM_ID')        ?: '');
define('APPLE_KEY_ID',         $_ENV['APPLE_KEY_ID']         ?? getenv('APPLE_KEY_ID')         ?: '');
define('APPLE_PRIVATE_KEY',    $_ENV['APPLE_PRIVATE_KEY']    ?? getenv('APPLE_PRIVATE_KEY')    ?: '');

// Composer autoloader (MongoDB PHP library)
$_autoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($_autoload)) {
    require_once $_autoload;
}
unset($_autoload);
