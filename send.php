<?php
/* ============================================================
   giustomanetti.uz — saytdagi arizani Telegramga yuborish
   Token shu faylda qoladi, saytni ochgan odam uni KO'RMAYDI.
   ============================================================ */

// --- SOZLAMA -------------------------------------------------
// Token va chat ID shu faylda EMAS, config.php da turadi.
// config.php GitHub'ga yuborilmaydi, shuning uchun token sir qoladi.
// Birinchi marta: config.example.php ni config.php deb nusxalang.
$CFG_PATH = __DIR__ . '/config.php';
if (!is_file($CFG_PATH)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'no_config'], JSON_UNESCAPED_UNICODE);
    exit;
}
$CFG      = require $CFG_PATH;
$TOKEN    = isset($CFG['token']) ? $CFG['token'] : '';
$CHAT_IDS = isset($CFG['chats']) ? (array)$CFG['chats'] : [];
// -------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

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

$text  = "🟡 <b>giustomanetti.uz — yangi ariza</b>\n\n";
$text .= "👤 <b>Ism:</b> " . esc($name) . "\n";
$text .= "📞 <b>Telefon:</b> " . esc($phone) . "\n";
if ($interest !== '') $text .= "📦 <b>Qiziqish:</b> " . esc($interest) . "\n";
if ($message  !== '') $text .= "💬 <b>Xabar:</b> " . esc($message) . "\n";
$text .= "\n🌐 " . esc($lang !== '' ? strtoupper($lang) : '—');
if ($page !== '') $text .= "  ·  " . esc($page);
$text .= "\n🕒 " . date('d.m.Y H:i');

$sent = false;
$url  = "https://api.telegram.org/bot{$TOKEN}/sendMessage";

foreach ($CHAT_IDS as $chat) {
    $chat = trim((string)$chat);
    if ($chat === '' || $chat === 'CHAT_ID_BU_YERGA') continue;

    $payload = http_build_query([
        'chat_id'    => $chat,
        'text'       => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true,
    ]);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 12,
        ]);
        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200 && strpos((string)$res, '"ok":true') !== false) $sent = true;
    } else {
        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => $payload,
            'timeout'       => 12,
            'ignore_errors' => true,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        if ($res !== false && strpos($res, '"ok":true') !== false) $sent = true;
    }
}

if (!$sent) fail('telegram', 502);

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
