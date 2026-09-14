<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/DB.php';
require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/OAuth.php';
require_once __DIR__ . '/src/Response.php';

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$uri    = strtok($_SERVER['REQUEST_URI'], '?');
$method = $_SERVER['REQUEST_METHOD'];

// Static assets
if (preg_match('#^/assets/.+#', $uri)) {
    $file = __DIR__ . $uri;
    if (file_exists($file) && is_file($file)) {
        $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'css'  => 'text/css; charset=UTF-8',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg','jpeg' => 'image/jpeg',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon',
            'woff2'=> 'font/woff2',
            'woff' => 'font/woff',
            'ttf'  => 'font/ttf',
            'otf'  => 'font/otf',
            'eot'  => 'application/vnd.ms-fontobject',
            default => 'application/octet-stream',
        };
        header("Content-Type: $mime");
        header('Cache-Control: public, max-age=3600');
        readfile($file);
        exit;
    }
    http_response_code(404); exit;
}

// Browsers request a root favicon for the standalone detailed tools document.
// Serve the existing brand mark instead of producing a noisy 404 in previews.
if ($uri === '/favicon.ico') {
    $favicon = __DIR__ . '/assets/logo.png';
    if (file_exists($favicon) && is_file($favicon)) {
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=3600');
        readfile($favicon);
        exit;
    }
    http_response_code(404);
    exit;
}

// Legacy calculator
if ($uri === '/legacy-calculator.html') {
    $f = __DIR__ . '/legacy-calculator.html';
    if (file_exists($f)) { readfile($f); exit; }
    http_response_code(404); exit;
}

// Each calculator gets its own authenticated route. The calculator document
// is rendered by the classic source below, but the browser stays on the
// sector-specific URL instead of keeping all tools inside the dashboard DOM.
$calculatorRouteMap = [
    'services' => 'services',
    'packages' => 'packages',
    'menu'     => 'menu',
    'retail'   => 'retail',
    'tech'     => 'tech',
    'saas'     => 'saas',
    'design'   => 'design',
];
$calculatorPlanKey = [
    'services' => 'calc_basic',
    'packages' => 'calc_pkg',
    'menu'     => 'calc_menu',
    'retail'   => 'calc_store',
    'tech'     => 'calc_labor',
    'saas'     => 'calc_custom',
    'design'   => 'calc_office',
];
if (preg_match('#^/calculator/([a-z]+)$#', $uri, $routeMatch)) {
    $routeSlug = $routeMatch[1];
    if (!isset($calculatorRouteMap[$routeSlug])) {
        http_response_code(404);
        echo '404';
        exit;
    }

    $calculatorUser = Auth::require();
    $effectivePlan = $calculatorUser['plan'] ?? 'free';
    if (!empty($calculatorUser['plan_expires_at']) && $effectivePlan !== 'free'
        && strtotime($calculatorUser['plan_expires_at']) <= time()) {
        $effectivePlan = 'free';
    }
    $planTools = PLANS[$effectivePlan]['tools'] ?? [];
    if (!in_array('all', $planTools, true) && !in_array($calculatorPlanKey[$routeSlug], $planTools, true)) {
        header('Location: /dashboard?tool_locked=1');
        exit;
    }

    $_GET['embed'] = '1';
    $_GET['tool'] = $calculatorRouteMap[$routeSlug];
    $uri = '/classic-tools';
}

// The detailed calculator reference is kept as a first-class app route so the
// authenticated dashboard can show the complete sector tools without
// duplicating their large, self-contained markup in the PHP page.
if ($uri === '/classic-tools') {
    $f = __DIR__ . '/attached_assets/index_1789370030522.html';
    if (file_exists($f) && is_file($f)) {
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: no-store');
        if (($_GET['embed'] ?? '') === '1') {
            $html = file_get_contents($f);
            $identityCss = <<<'CSS'
<style id="tas3eerah-current-identity">
@font-face{font-family:BritishCouncil;src:url('/assets/fonts/BritishCouncil-Arabic.ttf') format('truetype');font-display:swap}
:root{
  --bg:#F8F5ED;--surface:#EDE9DF;--card:#FFFFFF;--border:#D5CEC0;
  --gold:#C9A741;--gold-light:#A8882C;--gold-dim:#FAF3DE;
  --text:#1A2B20;--muted:#6B7C73;--soft:#2D4036;
  --green:#2E8B57;--blue:#2471A3;--red:#C0392B;--purple:#6D5AA8;
}
html,body{background:var(--bg)!important;color:var(--text)!important;font-family:BritishCouncil,Arial,sans-serif!important}
body{padding-bottom:0!important}
#platform-home{min-height:0!important;padding:0 0 28px!important;background:var(--bg)!important}
#platform-home>.platform-header,#platform-home>.site-footer,#about-modal,#contact-modal,.feedback-fab{display:none!important}
.tools-section{max-width:1040px!important;margin:0 auto!important;padding:22px 24px!important}
.tools-title{color:var(--text)!important;font-size:16px!important;font-weight:800!important}
.tool-card,.tool-card.gold,.tool-card.blue,.tool-card.green{
  background:var(--card)!important;border:1px solid var(--border)!important;
  box-shadow:none!important;color:var(--text)!important;
}
.tool-card:hover,.tool-card.gold:hover,.tool-card.blue:hover,.tool-card.green:hover{
  border-color:var(--green)!important;box-shadow:0 4px 14px rgba(26,43,32,.08)!important;transform:translateY(-1px)!important
}
.tool-icon{background:var(--surface)!important}
.tool-name,.tool-card.gold .tool-name,.tool-card.blue .tool-name,.tool-card.green .tool-name{
  color:var(--text)!important
}
.tool-desc{color:var(--muted)!important}
.tool-tag{background:var(--surface)!important;color:var(--muted)!important;border-color:var(--border)!important}
.tool-arrow{color:var(--green)!important}
.back-bar{background:var(--card)!important;border-color:var(--border)!important;color:var(--text)!important}
.back-btn{color:var(--green)!important}
.tabs{background:var(--surface)!important;border-color:var(--border)!important}
.tab{color:var(--muted)!important}.tab.active{color:var(--green)!important;border-bottom-color:var(--gold)!important}
.card,.log-item{background:var(--card)!important;border-color:var(--border)!important}
.card.purple-card,.card.gold-card{background:var(--card)!important;border-color:var(--border)!important}
.ibox.pu,.ibox.go{background:var(--surface)!important;border-color:var(--border)!important;color:var(--soft)!important}
.ibox.pu b,.ibox.go b{color:var(--green)!important}
.f input,.pricing-method-wrap select{background:var(--surface)!important;border-color:var(--border)!important;color:var(--text)!important}
.f input:focus,.pricing-method-wrap select:focus{border-color:var(--green)!important}
.step-num{background:var(--green)!important;color:#fff!important}
.step-title,.sttl{color:var(--text)!important}
.res-card,.price-out{background:var(--card)!important;border-color:var(--border)!important}
.price-out{background:var(--p-l,#E6EFE9)!important}
.save-btn{background:var(--green)!important;color:#fff!important}
.print-btn{background:rgba(46,139,87,.08)!important;color:var(--green)!important;border-color:rgba(46,139,87,.25)!important}
.share-cta{background:rgba(46,139,87,.08)!important;border-color:rgba(46,139,87,.25)!important}
.share-cta-text,.share-cta-arrow{color:var(--green)!important}
</style>
CSS;
            if (is_string($html)) {
                $html = preg_replace('/<\/head>/i', $identityCss . '</head>', $html, 1) ?? $html;
                $selectedTool = preg_replace('/[^a-z-]/', '', (string)($_GET['tool'] ?? ''));
                if ($selectedTool !== '') {
                    $autoOpen = '<script>window.goHome=function(){window.location.href="/dashboard";};document.addEventListener("DOMContentLoaded",function(){if(window.openTool){window.openTool("' . $selectedTool . '");}});</script>';
                    $html = preg_replace('/<\/body>/i', $autoOpen . '</body>', $html, 1) ?? $html;
                }
                echo $html;
            } else {
                http_response_code(404);
                echo '404';
            }
        } else {
            readfile($f);
        }
        exit;
    }
    http_response_code(404);
    echo '404';
    exit;
}

if (defined('APP_ENV') && APP_ENV === 'production') {
    set_exception_handler(static function (Throwable $e) use ($uri): never {
        error_log('[production] ' . $e->getMessage());
        if (str_starts_with($uri, '/api/')) {
            Response::json([
                'error' => 'تعذر الاتصال بقاعدة بيانات الإنتاج حالياً',
                'code' => 'PRODUCTION_DATABASE_UNAVAILABLE',
            ], 503);
        }
        http_response_code(503);
        echo '<!doctype html><meta charset="utf-8"><title>تسعيرة</title><p dir="rtl" style="font-family:Arial;padding:32px">قاعدة بيانات الإنتاج غير متاحة حالياً. تحقق من اتصال MongoDB ثم أعد المحاولة.</p>';
        exit;
    });
}

// Production must use the persistent MongoDB backend. Never fall back to
// ephemeral container SQLite when Render is missing its database settings.
if (defined('APP_ENV') && APP_ENV === 'production') {
    try {
        DB::assertProductionReady();
    } catch (Throwable $e) {
        http_response_code(503);
        if (str_starts_with($uri, '/api/')) {
            Response::json([
                'error' => 'قاعدة بيانات الإنتاج غير مهيأة',
                'details' => $e->getMessage(),
                'code' => 'PRODUCTION_DATABASE_NOT_READY',
            ], 503);
        }
        echo '<!doctype html><meta charset="utf-8"><title>تسعيرة</title><p dir="rtl" style="font-family:Arial;padding:32px">قاعدة بيانات الإنتاج غير مهيأة. أضف MONGODB_URI ثم أعد النشر.</p>';
        exit;
    }
}

// API routes
if (str_starts_with($uri, '/api/')) {
    header('Content-Type: application/json; charset=utf-8');

    // CSRF protection for all state-changing requests
    if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
        Auth::start();
        Auth::verifyCsrf();
    }

    $segment = explode('/', trim($uri, '/'))[1] ?? '';
    $apiFile = __DIR__ . "/api/$segment.php";
    if (file_exists($apiFile)) {
        require $apiFile;
    } else {
        Response::err("API not found: $segment", 404);
    }
    exit;
}

// OAuth routes (GET — no CSRF needed, handled internally via state)
if ($uri === '/auth/google') {
    Auth::start();
    if (!OAuth::googleEnabled()) { header('Location: /?oauth_error=google_not_configured'); exit; }
    header('Location: ' . OAuth::googleAuthUrl()); exit;
}
if ($uri === '/auth/google/callback') {
    Auth::start();
    $code  = $_GET['code']  ?? '';
    $state = $_GET['state'] ?? '';
    $err   = $_GET['error'] ?? '';
    if ($err || !$code) { header('Location: /?oauth_error=' . urlencode($err ?: 'cancelled')); exit; }
    $result = OAuth::googleCallback($code, $state);
    if (is_string($result)) { header('Location: /?oauth_error=' . urlencode($result)); exit; }
    $user = OAuth::loginOrRegister($result);
    if (is_string($user)) { header('Location: /?oauth_error=' . urlencode($user)); exit; }
    header('Location: /dashboard'); exit;
}
if ($uri === '/auth/apple') {
    Auth::start();
    if (!OAuth::appleEnabled()) { header('Location: /?oauth_error=apple_not_configured'); exit; }
    header('Location: ' . OAuth::appleAuthUrl()); exit;
}
// Apple sends a POST to the callback
if ($uri === '/auth/apple/callback') {
    Auth::start();
    $post = $_POST;
    if (empty($post['code']) && empty($post['id_token'])) {
        header('Location: /?oauth_error=apple_no_data'); exit;
    }
    $result = OAuth::appleCallback($post);
    if (is_string($result)) { header('Location: /?oauth_error=' . urlencode($result)); exit; }
    $user = OAuth::loginOrRegister($result);
    if (is_string($user)) { header('Location: /?oauth_error=' . urlencode($user)); exit; }
    header('Location: /dashboard'); exit;
}

// App pages
match (true) {
    $uri === '/'          => servePage('landing'),
    $uri === '/dashboard' => servePage('dashboard'),
    $uri === '/logout'    => (function(){ Auth::logout(); header('Location: /'); exit; })(),
    default               => (function() use ($uri) {
        // Try page file
        $slug = trim($uri, '/');
        $f    = __DIR__ . "/pages/$slug.php";
        if (file_exists($f)) { servePage($slug); }
        else { http_response_code(404); echo '404'; }
    })(),
};

function servePage(string $page): void {
    $file = __DIR__ . "/pages/$page.php";
    if (!file_exists($file)) { http_response_code(404); echo '404'; return; }
    require $file;
}
