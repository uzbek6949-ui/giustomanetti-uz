<?php
/* ============================================================
   giustomanetti.uz — saytdagi arizani Telegramga yuborish
   Token shu faylda qoladi, saytni ochgan odam uni KO'RMAYDI.
   ============================================================ */

// --- SOZLAMA -------------------------------------------------
// Token va chat ID shu faylda EMAS, config.php da turadi.
// config.php GitHub'ga yuborilmaydi, shuning uchun token sir qoladi.
// Birinchi marta: config.example.php ni config.php deb nusxalang
// (LXC serverda buni deploy/install-lxc.sh o'zi qiladi).
//
// Xato bo'lsa sababi brauzerga EMAS, server logiga yoziladi
// (nginx: /var/log/nginx/giustomanetti.error.log). Logda token hech qachon
// ko'rinmaydi. Brauzer faqat qisqa kodni oladi: no_config, bad_config, telegram.
// Tekshirish: php deploy/tg-test.php

/* Server logiga yozish: token bo'lsa yashiramiz */
function gm_log($msg) {
    global $TOKEN;
    $msg = (string)$msg;
    if (!empty($TOKEN)) $msg = str_replace($TOKEN, '***', $msg);
    error_log('[giustomanetti send.php] ' . $msg);
}
function gm_out($code, $arr) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

$TOKEN = '';
$CFG_PATH = __DIR__ . '/config.php';
if (!is_file($CFG_PATH)) {
    gm_log('config.php topilmadi (' . $CFG_PATH . '). config.example.php dan nusxa oling yoki deploy/install-lxc.sh ni ishga tushiring.');
    gm_out(500, ['ok' => false, 'error' => 'no_config']);
}
if (!is_readable($CFG_PATH)) {
    gm_log('config.php o\'qib bo\'lmadi: huquqlarni tekshiring (php-fpm foydalanuvchisi, masalan www-data, o\'qiy olishi kerak: chown root:www-data, chmod 0640).');
    gm_out(500, ['ok' => false, 'error' => 'no_config']);
}
$CFG = require $CFG_PATH;
if (!is_array($CFG)) {
    gm_log('config.php massiv qaytarmadi: fayl "return [ ... ];" bilan tugashi kerak.');
    gm_out(500, ['ok' => false, 'error' => 'bad_config']);
}
$TOKEN    = trim((string)(isset($CFG['token']) ? $CFG['token'] : ''));
$CHAT_IDS = isset($CFG['chats']) ? $CFG['chats'] : [];
if (is_string($CHAT_IDS)) $CHAT_IDS = explode(',', $CHAT_IDS);   // "111,-100222" ham bo'ladi
$CHAT_IDS = array_values(array_filter(array_map('trim', array_map('strval', (array)$CHAT_IDS)), function ($c) {
    return $c !== '' && $c !== 'CHAT_ID_BU_YERGA' && !preg_match('/^0+$/', $c);
}));
// Sinov uchun: Telegram API manzilini almashtirish mumkin (standart: https://api.telegram.org)
$API_BASE = rtrim(trim((string)(isset($CFG['api_base']) ? $CFG['api_base'] : 'https://api.telegram.org')), '/');

if ($TOKEN === '' || strpos($TOKEN, '0000000000:') === 0 || !preg_match('/^\d{5,}:[A-Za-z0-9_-]{20,}$/', $TOKEN)) {
    gm_log('config.php: token yo\'q, namunadagi qiymat qolgan yoki formati noto\'g\'ri (kutilgan: 123456789:AA...). @BotFather bergan tokenni yozing.');
    gm_out(500, ['ok' => false, 'error' => 'bad_config']);
}
if (!$CHAT_IDS) {
    gm_log('config.php: "chats" bo\'sh yoki namunadagi qiymat qolgan. Chat ID ni yozing (topish: php deploy/tg-test.php --updates).');
    gm_out(500, ['ok' => false, 'error' => 'bad_config']);
}
if (!preg_match('~^https?://[^\s/]+(/[^\s]*)?$~i', $API_BASE)) {
    gm_log('config.php: api_base noto\'g\'ri: ' . $API_BASE);
    gm_out(500, ['ok' => false, 'error' => 'bad_config']);
}
// -------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('method', 405);
}

$raw = file_get_contents('php://input');
if (strlen($raw) > 8000) fail('too_long', 413);

$in = json_decode($raw, true);
if (!is_array($in)) $in = $_POST;

// Robotlar uchun tuzoq: bu maydon to'ldirilgan bo'lsa — spam.
if (trim((string)($in['website'] ?? '')) !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

function clean($v, $max) {
    $v = (string)$v;
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    $v = trim($v);
    if (function_exists('mb_substr')) return mb_substr($v, 0, $max, 'UTF-8');
    return substr($v, 0, $max);
}

$name     = clean($in['name']     ?? '', 80);
$phone    = clean($in['phone']    ?? '', 40);
$interest = clean($in['interest'] ?? '', 120);
$message  = clean($in['message']  ?? '', 1500);
$lang     = clean($in['lang']     ?? '', 4);
$page     = clean($in['page']     ?? '', 200);

if ($name === '' || $phone === '') fail('empty');
if (!preg_match('/\d{7,}/', preg_replace('/\D/', '', $phone))) fail('phone');

// Oddiy chastota chegarasi: bitta IP daqiqasiga 5 ta ariza.
$ip   = $_SERVER['REMOTE_ADDR'] ?? '0';
$lock = sys_get_temp_dir() . '/gm_' . md5($ip) . '.txt';
$hits = @file_exists($lock) ? (array)@json_decode(@file_get_contents($lock), true) : [];
$now  = time();
$hits = array_values(array_filter($hits, function ($t) use ($now) { return $t > $now - 60; }));
if (count($hits) >= 5) fail('too_many', 429);
$hits[] = $now;
@file_put_contents($lock, json_encode($hits));

function esc($s) {
    return htmlspecialchars($s, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Vaqt Toshkent bo'yicha (serverda UTC bo'lsa ham). config.php da 'timezone' bilan o'zgartirsa bo'ladi.
@date_default_timezone_set(isset($CFG['timezone']) ? (string)$CFG['timezone'] : 'Asia/Tashkent');

$text  = "🟡 <b>giustomanetti.uz — yangi ariza</b>\n\n";
$text .= "👤 <b>Ism:</b> " . esc($name) . "\n";
$text .= "📞 <b>Telefon:</b> " . esc($phone) . "\n";
if ($interest !== '') $text .= "📦 <b>Qiziqish:</b> " . esc($interest) . "\n";
if ($message  !== '') $text .= "💬 <b>Xabar:</b> " . esc($message) . "\n";
$text .= "\n🌐 " . esc($lang !== '' ? strtoupper($lang) : '—');
if ($page !== '') $text .= "  ·  " . esc($page);
$text .= "\n🕒 " . date('d.m.Y H:i');

$sent = 0;
$url  = $API_BASE . '/bot' . $TOKEN . '/sendMessage';

if (!function_exists('curl_init') && !ini_get('allow_url_fopen')) {
    gm_log('Telegramga ulanib bo\'lmaydi: php-curl o\'rnatilmagan va allow_url_fopen o\'chiq. O\'rnating: apt install php-curl');
    fail('telegram', 502);
}

foreach ($CHAT_IDS as $chat) {
    $payload = http_build_query([
        'chat_id'    => $chat,
        'text'       => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true,
    ]);

    $res = false; $code = 0; $neterr = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT        => 12,
        ]);
        $res  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) $neterr = curl_error($ch);
        if (PHP_VERSION_ID < 80000) curl_close($ch);   // 8.0+ da kerak emas, 8.5 da eskirgan
    } else {
        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => $payload,
            'timeout'       => 12,
            'ignore_errors' => true,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        // PHP 8.4+ da http_get_last_response_headers(), eskilarida $http_response_header
        $hdrs = function_exists('http_get_last_response_headers') ? http_get_last_response_headers()
              : (isset(get_defined_vars()['http_response_header']) ? get_defined_vars()['http_response_header'] : null);
        if (isset($hdrs[0]) && preg_match('~\s(\d{3})\s~', $hdrs[0], $m)) $code = (int)$m[1];
        if ($res === false) { $e = error_get_last(); $neterr = $e ? $e['message'] : 'ulanish xatosi'; }
    }

    $j = is_string($res) ? json_decode($res, true) : null;
    if ($code === 200 && is_array($j) && !empty($j['ok'])) { $sent++; continue; }

    // Sababni server logiga yozamiz (token yashiriladi)
    if ($res === false) {
        gm_log('chat ' . $chat . ': Telegramga ulanib bo\'lmadi: ' . $neterr . ' (serverdan api.telegram.org ga chiqish, DNS va vaqtni tekshiring)');
    } else {
        $desc = is_array($j) && isset($j['description']) ? $j['description'] : substr((string)$res, 0, 200);
        $hint = '';
        if ($code === 401 || $code === 404) $hint = ' -> token noto\'g\'ri yoki bekor qilingan (@BotFather)';
        elseif ($code === 400 && stripos($desc, 'chat not found') !== false) $hint = ' -> chat ID noto\'g\'ri yoki bot bu chatga qo\'shilmagan';
        elseif ($code === 403) $hint = ' -> bot bloklangan yoki guruhdan chiqarilgan; shaxsiy chatda botga /start yozing';
        gm_log('chat ' . $chat . ': Telegram HTTP ' . $code . ': ' . $desc . $hint);
    }
}

if (!$sent) fail('telegram', 502);
if ($sent < count($CHAT_IDS)) gm_log('ariza ' . $sent . '/' . count($CHAT_IDS) . ' chatga yetdi (qolganlari yuqorida)');

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
