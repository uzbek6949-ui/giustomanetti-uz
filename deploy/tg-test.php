<?php
/* ============================================================================
   giustomanetti.uz — Telegram botni tekshirish (faqat buyruq qatoridan)

   php deploy/tg-test.php              config.php dagi har bir chatga sinov xabari
   php deploy/tg-test.php --getme      token to'g'rimi (bot nomi chiqadi)
   php deploy/tg-test.php --updates    botga kelgan oxirgi xabarlar: guruh/chat
                                       ID sini shu yerdan olasiz
   Qo'shimcha:  --config=/yo'l/config.php   (standart: /var/www/giustomanetti/config.php,
                                              topilmasa sayt papkasidagi config.php)
                --chat=-100123...            faqat shu chatga yuborish

   Token ekranga hech qachon to'liq chiqarilmaydi.
   ========================================================================== */

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$opt = ['config' => '', 'chat' => '', 'mode' => 'send'];
foreach (array_slice($argv, 1) as $a) {
    if ($a === '--getme' || $a === 'getme') $opt['mode'] = 'getme';
    elseif ($a === '--updates' || $a === 'updates' || $a === '--getupdates') $opt['mode'] = 'updates';
    elseif ($a === '--help' || $a === '-h') $opt['mode'] = 'help';
    elseif (strpos($a, '--config=') === 0) $opt['config'] = substr($a, 9);
    elseif (strpos($a, '--chat=') === 0) $opt['chat'] = substr($a, 7);
    else { fwrite(STDERR, "Noma'lum parametr: $a (yordam: --help)\n"); exit(2); }
}
if ($opt['mode'] === 'help') {
    $h = file(__FILE__); echo implode('', array_slice($h, 1, 15)); exit(0);
}

/* ------------------------------------------------------------ config ---- */
$cands = array_filter([
    $opt['config'],
    getenv('GM_CONFIG') ?: '',
    '/var/www/giustomanetti/config.php',
    dirname(__DIR__) . '/config.php',
]);
$path = '';
foreach ($cands as $c) { if (is_file($c)) { $path = $c; break; } }
if ($path === '') {
    fwrite(STDERR, "XATO: config.php topilmadi. Qidirilgan joylar:\n  " . implode("\n  ", $cands) . "\n"
        . "Yarating: deploy/install-lxc.sh ni ishga tushiring yoki config.example.php dan nusxa oling.\n");
    exit(1);
}
if (!is_readable($path)) { fwrite(STDERR, "XATO: $path ni o'qib bo'lmadi (root bilan ishga tushiring: sudo php ...)\n"); exit(1); }
$CFG = require $path;
if (!is_array($CFG)) { fwrite(STDERR, "XATO: $path massiv qaytarmadi (return [ ... ];)\n"); exit(1); }

$token = trim((string)($CFG['token'] ?? ''));
$chats = $CFG['chats'] ?? [];
if (is_string($chats)) $chats = explode(',', $chats);
$chats = array_values(array_filter(array_map('trim', array_map('strval', (array)$chats)), 'strlen'));
if ($opt['chat'] !== '') $chats = [$opt['chat']];
$api = rtrim((string)($CFG['api_base'] ?? 'https://api.telegram.org'), '/');
@date_default_timezone_set((string)($CFG['timezone'] ?? 'Asia/Tashkent'));

$mask = function ($s) use ($token) { return $token === '' ? $s : str_replace($token, '***', (string)$s); };
$tshow = preg_match('/^(\d+):/', $token, $m) ? $m[1] . ':***' : '(yo\'q)';

echo "config : $path\n";
echo "token  : $tshow\n";
echo "chats  : " . ($chats ? implode(', ', $chats) : '(yo\'q)') . "\n";
if ($api !== 'https://api.telegram.org') echo "api    : $api  (SINOV manzili!)\n";
echo "\n";

if ($token === '' || strpos($token, '0000000000:') === 0 || !preg_match('/^\d{5,}:[A-Za-z0-9_-]{20,}$/', $token)) {
    fwrite(STDERR, "XATO: token yo'q yoki namunadagi qiymat. @BotFather dan olingan tokenni config.php ga yozing.\n");
    exit(1);
}
if (!function_exists('curl_init') && !ini_get('allow_url_fopen')) {
    fwrite(STDERR, "XATO: php-curl yo'q va allow_url_fopen o'chiq: apt install php-curl\n");
    exit(1);
}

/* -------------------------------------------------------------- so'rov --- */
function tg($api, $token, $method, $params = []) {
    $url = $api . '/bot' . $token . '/' . $method;
    $body = http_build_query($params);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
                                CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20]);
        $res = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = $res === false ? curl_error($ch) : '';
        if (PHP_VERSION_ID < 80000) curl_close($ch);   // 8.0+ da kerak emas, 8.5 da eskirgan
    } else {
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'content' => $body, 'timeout' => 20, 'ignore_errors' => true,
                                                 'header' => "Content-Type: application/x-www-form-urlencoded\r\n"]]);
        $res = @file_get_contents($url, false, $ctx);
        $code = $res === false ? 0 : 200;
        $err = $res === false ? ((error_get_last()['message'] ?? 'ulanish xatosi')) : '';
    }
    return [$code, $res, $err, is_string($res) ? json_decode($res, true) : null];
}
function show($mask, $r) {
    list($code, $res, $err) = $r;
    if ($res === false) { echo "  ulanib bo'lmadi: " . $mask($err) . "\n"; return; }
    $j = json_decode($res, true);
    echo "  HTTP $code\n  " . str_replace("\n", "\n  ", $mask(is_array($j) ? json_encode($j, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $res)) . "\n";
}
function hint($r) {
    list($code, $res, , $j) = $r;
    $d = is_array($j) ? (string)($j['description'] ?? '') : '';
    if ($res === false) return "Serverdan api.telegram.org ga chiqish yo'q: internet, DNS (/etc/resolv.conf) va soatni tekshiring.";
    if ($code === 401 || $code === 404) return "Token noto'g'ri yoki bekor qilingan. @BotFather -> /mybots -> API Token.";
    if (stripos($d, 'chat not found') !== false) return "Chat ID noto'g'ri yoki bot bu chatga qo'shilmagan. Guruh ID -100 bilan boshlanadi. --updates bilan toping.";
    if ($code === 403) return "Bot bloklangan / guruhdan chiqarilgan yoki odam botga hali /start yozmagan.";
    if (stripos($d, 'webhook') !== false) return "Botda webhook yoqilgan: getUpdates ishlamaydi. Vaqtincha o'chirish: https://api.telegram.org/bot<TOKEN>/deleteWebhook";
    if (stripos($d, 'upgraded to a supergroup') !== false) return "Guruh supergroup bo'lgan: javobdagi migrate_to_chat_id ni config.php ga yozing.";
    return '';
}

/* --------------------------------------------------------------- rejim --- */
if ($opt['mode'] === 'getme') {
    echo "getMe:\n";
    $r = tg($api, $token, 'getMe'); show($mask, $r);
    if (!empty($r[3]['ok'])) { echo "\nOK: token ishlaydi, bot @" . ($r[3]['result']['username'] ?? '?') . "\n"; exit(0); }
    if ($h = hint($r)) echo "\nMaslahat: $h\n";
    exit(1);
}

if ($opt['mode'] === 'updates') {
    echo "getUpdates (botga oxirgi 24 soatda kelgan xabarlar):\n";
    $r = tg($api, $token, 'getUpdates', ['limit' => 100, 'timeout' => 0]);
    if (empty($r[3]['ok'])) { show($mask, $r); if ($h = hint($r)) echo "\nMaslahat: $h\n"; exit(1); }
    $found = [];
    foreach ((array)$r[3]['result'] as $u) {
        foreach (['message', 'edited_message', 'channel_post', 'my_chat_member', 'chat_member'] as $k) {
            if (empty($u[$k]['chat'])) continue;
            $c = $u[$k]['chat'];
            $name = $c['title'] ?? trim(($c['first_name'] ?? '') . ' ' . ($c['last_name'] ?? ''));
            if (!empty($c['username'])) $name .= ' (@' . $c['username'] . ')';
            $found[(string)$c['id']] = sprintf("  %-16s %-11s %s", $c['id'], $c['type'] ?? '?', $name);
        }
    }
    if (!$found) {
        echo "  Hech narsa yo'q.\n\n"
           . "  1) Shaxsiy chat: botni Telegramda oching va /start yozing.\n"
           . "  2) Guruh: botni guruhga qo'shing va guruhga biror xabar yozing\n"
           . "     (masalan /start@BotNomi). So'ng shu buyruqni qayta ishga tushiring.\n";
        exit(0);
    }
    echo "  ID               turi        nomi\n" . implode("\n", $found) . "\n\n"
       . "Kerakli ID ni config.php ga yozing (guruh ID -100... bilan), masalan:\n"
       . "  'chats' => ['" . implode("', '", array_slice(array_keys($found), 0, 2)) . "'],\n"
       . "yoki: TELEGRAM_CHAT_IDS=\"" . implode(',', array_slice(array_keys($found), 0, 2)) . "\" bash deploy/install-lxc.sh --reconfig\n";
    exit(0);
}

/* send */
if (!$chats) { fwrite(STDERR, "XATO: config.php da chat ID yo'q. Topish: php deploy/tg-test.php --updates\n"); exit(1); }
$host = php_uname('n');
$text = "✅ <b>giustomanetti.uz</b> — sinov xabari\n"
      . "Server: " . htmlspecialchars($host, ENT_NOQUOTES) . "\n"
      . "Vaqt: " . date('d.m.Y H:i:s') . "\n"
      . "Saytdagi arizalar shu chatga keladi.";
$okAll = true;
foreach ($chats as $chat) {
    echo "sendMessage -> $chat:\n";
    $r = tg($api, $token, 'sendMessage', ['chat_id' => $chat, 'text' => $text, 'parse_mode' => 'HTML', 'disable_web_page_preview' => 'true']);
    show($mask, $r);
    if (!empty($r[3]['ok'])) echo "  OK\n\n";
    else { $okAll = false; if ($h = hint($r)) echo "  Maslahat: $h\n"; echo "\n"; }
}
echo $okAll ? "Hammasi yetib bordi.\n" : "Ba'zi chatlarga yetmadi (yuqoriga qarang).\n";
exit($okAll ? 0 : 1);
