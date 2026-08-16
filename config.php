<?php
define('APP_NAME_AR', 'تسعيرة');
define('APP_NAME_EN', 'Tas3eerah');

// Read from environment variable; fall back to localhost for local dev
define('APP_URL', rtrim($_ENV['APP_URL'] ?? getenv('APP_URL') ?: 'http://localhost:5000', '/'));
define('APP_ENV', $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'development');

define('APP_LOGO', '/assets/brand-logo-transparent.png');
define('DB_PATH', __DIR__ . '/database/tas3eerah.db');
define('SESSION_LIFETIME', 60 * 60 * 24 * 30);

define('PLANS', [
    'free' => [
        'name_ar'    => 'مجاني',
        'name_en'    => 'Free',
        'price'      => 0,
        'max_quotes' => 5,
        'max_msgs'   => 30,
        'tools'      => ['calc_basic'],
        'badge'      => '#7890a6',
        'features_ar'=> ['5 عروض أسعار شهرياً','أداة التسعير الأساسية','30 رسالة شهرياً'],
    ],
    'pro' => [
        'name_ar'    => 'محترف',
        'name_en'    => 'Pro',
        'price'      => 99,
        'max_quotes' => -1,
        'max_msgs'   => -1,
        'tools'      => ['calc_basic','calc_pkg','calc_store','calc_office','calc_labor'],
        'badge'      => '#79d5e6',
        'features_ar'=> ['عروض أسعار غير محدودة','جميع أدوات التسعير','رسائل غير محدودة','طباعة PDF'],
    ],
    'enterprise' => [
        'name_ar'    => 'مؤسسة',
        'name_en'    => 'Enterprise',
        'price'      => 299,
        'max_quotes' => -1,
        'max_msgs'   => -1,
        'tools'      => ['calc_basic','calc_pkg','calc_store','calc_office','calc_labor','calc_custom'],
        'badge'      => '#d7ae61',
        'features_ar'=> ['كل ما في المحترف','أداة تسعير حر مخصصة','علامة تجارية مخصصة','أولوية الدعم الفني','تقارير متقدمة'],
    ],
]);

error_reporting(E_ALL);
ini_set('display_errors', 0);
