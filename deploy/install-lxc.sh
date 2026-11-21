#!/usr/bin/env bash
# =============================================================================
#  giustomanetti.uz — toza Debian 12 / Ubuntu 22.04 / 24.04 LXC ga o'rnatish
#
#  Ishga tushirish (root, arxiv ochilgan papkadan):
#     bash deploy/install-lxc.sh                 # savollar beradi
#     DOMAIN=giustomanetti.uz \
#     TELEGRAM_BOT_TOKEN='123456789:AA...' \
#     TELEGRAM_CHAT_IDS='111111111,-1002222222222' \
#     bash deploy/install-lxc.sh --https EMAIL=siz@example.com
#
#  Parametrlar:
#     --https        DOMAIN bo'lsa, certbot bilan HTTPS (Let's Encrypt) oladi
#     --reconfig     config.php mavjud bo'lsa ham qaytadan yozadi
#     --no-tg-test   oxirida Telegram tokenini tekshirmaydi
#     --prune        sayt papkasidan eski (arxivda yo'q) fayllarni o'chiradi
#                    (config.php va assets/video/ saqlanadi)
#  Muhit o'zgaruvchilari:
#     DOMAIN             masalan giustomanetti.uz (bo'lmasa "_" — istalgan nom/IP)
#     TELEGRAM_BOT_TOKEN @BotFather tokeni
#     TELEGRAM_CHAT_IDS  vergul bilan: 111111111,-1002222222222
#     TELEGRAM_API_BASE  ixtiyoriy, faqat sinov uchun (standart api.telegram.org)
#     EMAIL              certbot uchun (ixtiyoriy)
#     WEBROOT            standart /var/www/giustomanetti
#
#  Qayta ishga tushirsa bo'ladi: hech narsa ikki marta qo'shilmaydi,
#  config.php saqlanadi (--reconfig bo'lmasa).
# =============================================================================
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBROOT="${WEBROOT:-/var/www/giustomanetti}"
DOMAIN="${DOMAIN:-_}"
EMAIL="${EMAIL:-}"
HTTPS=0; RECONFIG=0; TGTEST=1; PRUNE=0
SITE=giustomanetti
NGX_CONF="/etc/nginx/sites-available/${SITE}.conf"

for a in "$@"; do
  case "$a" in
    --https)      HTTPS=1 ;;
    --reconfig)   RECONFIG=1 ;;
    --no-tg-test) TGTEST=0 ;;
    --prune)      PRUNE=1 ;;
    DOMAIN=*|EMAIL=*|WEBROOT=*|TELEGRAM_BOT_TOKEN=*|TELEGRAM_CHAT_IDS=*|TELEGRAM_API_BASE=*)
                  export "${a?}"; declare "$a" ;;
    -h|--help)    sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Noma'lum parametr: $a (yordam: --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32mOK\033[0m %s\n' "$*"; }
warn() { printf '    \033[31m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[31mXATO:\033[0m %s\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------ tekshiruv
[ "$(id -u)" -eq 0 ] || die "root bilan ishga tushiring (sudo bash deploy/install-lxc.sh)"
[ -f "$SRC/index.html" ] && [ -f "$SRC/send.php" ] && [ -d "$SRC/assets" ] \
  || die "$SRC sayt papkasiga o'xshamaydi (index.html, send.php, assets/ topilmadi)"
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}:${ID_LIKE:-}" in
    debian:*|ubuntu:*|*:*debian*) ok "Tizim: ${PRETTY_NAME:-$ID}" ;;
    *) warn "Sinalgan tizimlar: Debian 12, Ubuntu 22.04/24.04. Sizda: ${PRETTY_NAME:-?}. Davom etamiz." ;;
  esac
fi
case "$DOMAIN" in
  _|"") DOMAIN="_" ;;
  *) [[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "DOMAIN noto'g'ri: $DOMAIN"; DOMAIN="${DOMAIN#www.}" ;;
esac
if [ "$HTTPS" -eq 1 ] && [ "$DOMAIN" = "_" ]; then
  die "--https uchun DOMAIN kerak: DOMAIN=giustomanetti.uz bash deploy/install-lxc.sh --https"
fi

# ------------------------------------------------------------------ paketlar
say "Paketlar: nginx, php-fpm, php-curl, php-mbstring"
export DEBIAN_FRONTEND=noninteractive
PKGS=(nginx php-fpm php-cli php-curl php-mbstring rsync ca-certificates curl)
need=()
for p in "${PKGS[@]}"; do dpkg -s "$p" >/dev/null 2>&1 || need+=("$p"); done
if [ "${#need[@]}" -gt 0 ]; then
  apt-get update -q
  apt-get install -y -q --no-install-recommends "${need[@]}"
fi
ok "o'rnatilgan"

PHPV="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
FPM_SVC="php${PHPV}-fpm"
FPM_SOCK="/run/php/php${PHPV}-fpm.sock"
ok "PHP $PHPV, $FPM_SVC"

# ---------------------------------------------------------- saytni ko'chirish
say "Sayt -> $WEBROOT (faqat ochiq fayllar)"
mkdir -p "$WEBROOT"
# shellcheck disable=SC2054  # --chmod qiymatidagi vergul ataylab
RSYNC_OPTS=(-rlt --chmod=D755,F644 --omit-dir-times
  --exclude='.DS_Store' --exclude='Thumbs.db' --exclude='desktop.ini'
  --exclude='/assets/products.json' --exclude='/assets/product-texts.json'
  --exclude='*.md' --exclude='*.mjs'
  --include='/*.html' --include='/send.php' --include='/robots.txt' --include='/sitemap.xml'
  --include='/favicon.ico'
  --include='/assets/***' --include='/engine/***' --include='/mahsulot/***'
  --exclude='*')
if [ "$PRUNE" -eq 1 ]; then
  RSYNC_OPTS=(--delete --filter='P /config.php' --filter='P /assets/video/***' "${RSYNC_OPTS[@]}")
fi
rsync "${RSYNC_OPTS[@]}" "$SRC/" "$WEBROOT/"
chown -R root:root "$WEBROOT"
ok "$(find "$WEBROOT" -type f | wc -l) fayl, $(du -sh "$WEBROOT" | cut -f1)"

# ------------------------------------------------------------------ config.php
say "Telegram sozlamasi (config.php)"
CFG="$WEBROOT/config.php"
write_cfg=1
if [ -f "$CFG" ] && [ "$RECONFIG" -eq 0 ] && [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  write_cfg=0
  ok "config.php bor, saqlanadi (qayta yozish: --reconfig yoki TELEGRAM_BOT_TOKEN=...)"
fi

if [ "$write_cfg" -eq 1 ]; then
  TOKEN="${TELEGRAM_BOT_TOKEN:-}"
  CHATS="${TELEGRAM_CHAT_IDS:-}"
  TTY=""
  if [ -t 0 ]; then TTY=/dev/stdin; elif [ -r /dev/tty ] && { : </dev/tty; } 2>/dev/null; then TTY=/dev/tty; fi
  if [ -z "$TOKEN" ] && [ -n "$TTY" ]; then
    echo "    @BotFather bergan token (yozganingiz ko'rinmaydi; o'tkazib yuborish uchun Enter):"
    read -r -s -p "    TELEGRAM_BOT_TOKEN: " TOKEN <"$TTY"; echo
  fi
  if [ -n "$TOKEN" ] && [ -z "$CHATS" ] && [ -n "$TTY" ]; then
    echo "    Ariza keladigan chat ID lar, vergul bilan (guruh: -100...)."
    echo "    Bilmasangiz Enter bosing va keyin: php deploy/tg-test.php --updates"
    read -r -p "    TELEGRAM_CHAT_IDS: " CHATS <"$TTY"
  fi
  TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"
  CHATS="$(printf '%s' "$CHATS" | tr -d '[:space:]')"

  if [ -z "$TOKEN" ]; then
    if [ -f "$CFG" ]; then
      write_cfg=0; warn "Token berilmadi: mavjud config.php o'zgarmadi."
    else
      write_cfg=0
      warn "Token berilmadi: config.php yozilmadi. Forma zaxira yo'lga o'tadi (Telegram ilovasini ochadi)."
      warn "Keyin: TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_IDS=... bash deploy/install-lxc.sh"
    fi
  else
    [[ "$TOKEN" =~ ^[0-9]{5,}:[A-Za-z0-9_-]{20,}$ ]] || die "Token formati noto'g'ri (kutilgan: 123456789:AA...)."
    if [ -n "$CHATS" ]; then
      IFS=',' read -r -a arr <<<"$CHATS"
      for c in "${arr[@]}"; do
        [ -z "$c" ] && continue
        [[ "$c" =~ ^-?[0-9]{3,}$|^@[A-Za-z0-9_]{4,}$ ]] || die "Chat ID noto'g'ri: $c (raqam, -100... yoki @kanal)"
      done
    else
      warn "Chat ID berilmadi. Token yoziladi, chat ID ni keyin qo'shing: php deploy/tg-test.php --updates"
    fi
    if [ -n "${TELEGRAM_API_BASE:-}" ]; then
      [[ "$TELEGRAM_API_BASE" =~ ^https?://[^[:space:]]+$ ]] || die "TELEGRAM_API_BASE noto'g'ri"
      warn "TELEGRAM_API_BASE=$TELEGRAM_API_BASE (sinov manzili!)"
    fi
  fi
fi

if [ "$write_cfg" -eq 1 ]; then
  tmp="$(umask 077; mktemp)"
  # Qiymatlar PHP ga muhit orqali beriladi: buyruq qatorida (ps) ko'rinmaydi,
  # var_export esa qo'shtirnoq va boshqa belgilarni xavfsiz yozadi.
  # shellcheck disable=SC2016  # PHP kodi: $ belgilarini bash ochmasin
  GM_TOKEN="$TOKEN" GM_CHATS="$CHATS" GM_API="${TELEGRAM_API_BASE:-}" php -d display_errors=stderr -r '
    $c = ["token" => getenv("GM_TOKEN"),
          "chats" => array_values(array_filter(array_map("trim", explode(",", (string)getenv("GM_CHATS"))), "strlen"))];
    if (getenv("GM_API")) $c["api_base"] = getenv("GM_API");
    echo "<?php\n// deploy/install-lxc.sh yozdi: " . date("Y-m-d H:i") . ". Sir! HTTP orqali ochilmaydi (nginx).\n"
       . "// Tekshirish: php deploy/tg-test.php\nreturn " . var_export($c, true) . ";\n";' >"$tmp"
  php -l "$tmp" >/dev/null || { rm -f "$tmp"; die "config.php yaratib bo'lmadi"; }
  install -m 0640 -o root -g www-data "$tmp" "$CFG"
  rm -f "$tmp"
  ok "config.php yozildi (root:www-data, 0640)"
fi
if [ -f "$CFG" ]; then chown root:www-data "$CFG"; chmod 0640 "$CFG"; fi

# ------------------------------------------------------------------ nginx
say "nginx sayt bloki ($NGX_CONF)"
if [ "$DOMAIN" = "_" ]; then
  SERVER_NAME="_"; LISTEN_OPTS=" default_server"
else
  SERVER_NAME="$DOMAIN www.$DOMAIN"; LISTEN_OPTS=""
fi

# Sertifikat allaqachon olingan bo'lsa (--https bilan), blok 443 bilan yoziladi.
# Shuning uchun skriptni qayta ishga tushirish HTTPS ni buzmaydi.
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
HAVE_CERT=0
[ "$DOMAIN" != "_" ] && [ -f "$CERT_DIR/fullchain.pem" ] && HAVE_CERT=1

body() {
cat <<EOF
    root $WEBROOT;
    index index.html;
    charset utf-8;
    server_tokens off;
    client_max_body_size 64k;

    access_log /var/log/nginx/${SITE}.access.log;
    error_log  /var/log/nginx/${SITE}.error.log;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 512;
    gzip_types text/css text/plain text/javascript application/javascript application/json image/svg+xml application/xml;

    # Let's Encrypt tekshiruvi
    location ^~ /.well-known/acme-challenge/ { root $WEBROOT; default_type text/plain; }

    # ---- yopiq: sirlar, manba va ishchi fayllar (404, borligini ham bildirmaymiz)
    location ~ /\.                                   { return 404; }
    location ~* ^/(config|config\.example)\.php\$     { return 404; }
    location ~* ^/(src|deploy|node_modules|scrollcraft|hero-ideas|_legacy)(/|\$) { return 404; }
    location ~* \.(md|mjs|sh|bak|old|orig|swp|log|ini|lock|zip|tar|gz|sql|env)\$ { return 404; }
    # JSON: sahifalar faqat video ro'yxatini o'qiydi (m.js -> assets/poster/clips.json)
    location ~* ^/assets/(poster|video)/clips\.json\$ { add_header Cache-Control "no-cache"; try_files \$uri =404; }
    location ~* \.json\$                              { return 404; }

    # ---- PHP: faqat ariza yuboradigan send.php
    location = /send.php {
        limit_except POST GET { deny all; }
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:$FPM_SOCK;
        fastcgi_read_timeout 30s;
    }
    location ~ \.php\$ { return 404; }

    # ---- kesh: katalog sahifalari hech qachon o'zgarmaydi
    location ^~ /assets/katalog/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Content-Type-Options "nosniff" always;
        access_log off;
        try_files \$uri =404;
    }
    # rasm, video, shrift, PDF: 30 kun
    location ~* \.(?:webp|avif|jpe?g|png|gif|svg|ico|woff2?|ttf|mp4|webm|pdf)\$ {
        add_header Cache-Control "public, max-age=2592000";
        add_header X-Content-Type-Options "nosniff" always;
        access_log off;
        try_files \$uri =404;
    }
    # CSS/JS nomida versiya yo'q: yangilanish tez ko'rinsin, 2 soat
    location ~* \.(?:css|js)\$ {
        add_header Cache-Control "public, max-age=7200";
        add_header X-Content-Type-Options "nosniff" always;
        try_files \$uri =404;
    }

    # /katalog -> katalog.html (sayt .html bilan ishlaydi, lekin qisqasi ham ochilsin)
    location / {
        try_files \$uri \$uri/ \$uri.html =404;
    }
EOF
}

tmpn="$(mktemp)"
{
  echo "# deploy/install-lxc.sh yozdi. Qayta ishga tushirilsa yangilanadi."
  if [ "$HAVE_CERT" -eq 1 ]; then
    cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;
    location ^~ /.well-known/acme-challenge/ { root $WEBROOT; default_type text/plain; }
    location / { return 301 https://$DOMAIN\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $SERVER_NAME;
    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:gmSSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=31536000" always;
EOF
  else
    cat <<EOF
server {
    listen 80$LISTEN_OPTS;
    listen [::]:80$LISTEN_OPTS;
    server_name $SERVER_NAME;
EOF
  fi
  body
  echo "}"
} >"$tmpn"

# "http2 on;" faqat nginx 1.25.1+ da; eskisida "listen 443 ssl http2" yoziladi
NGXV="$(nginx -v 2>&1 | sed -n 's|.*nginx/\([0-9.]*\).*|\1|p')"
if [ "$HAVE_CERT" -eq 1 ] && [ "$(printf '%s\n1.25.1\n' "$NGXV" | sort -V | head -n1)" != "1.25.1" ]; then
  sed -i -e '/^    http2 on;$/d' -e 's|listen 443 ssl;|listen 443 ssl http2;|; s|listen \[::\]:443 ssl;|listen [::]:443 ssl http2;|' "$tmpn"
fi

install -m 0644 "$tmpn" "$NGX_CONF"; rm -f "$tmpn"
ln -sfn "$NGX_CONF" "/etc/nginx/sites-enabled/${SITE}.conf"
# Debian'ning "Welcome to nginx" sayti ham default_server: to'qnashmasin
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 | sed 's/^/    /' || die "nginx sozlamasida xato"

if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  systemctl enable -q --now "$FPM_SVC" nginx
  systemctl reload "$FPM_SVC" nginx
else
  service "$FPM_SVC" restart; service nginx restart
fi
ok "nginx + $FPM_SVC ishlayapti"

# ------------------------------------------------------------------ HTTPS
if [ "$HTTPS" -eq 1 ]; then
  say "HTTPS (Let's Encrypt) — $DOMAIN"
  dpkg -s certbot >/dev/null 2>&1 || { apt-get update -q; apt-get install -y -q --no-install-recommends certbot; }
  DOMS=(-d "$DOMAIN")
  if getent ahosts "www.$DOMAIN" >/dev/null 2>&1; then DOMS+=(-d "www.$DOMAIN"); else warn "www.$DOMAIN DNS da yo'q: faqat $DOMAIN uchun sertifikat"; fi
  if [ -n "$EMAIL" ]; then MAILOPT=(-m "$EMAIL"); else MAILOPT=(--register-unsafely-without-email); fi
  if certbot certonly --webroot -w "$WEBROOT" "${DOMS[@]}" --cert-name "$DOMAIN" \
       --non-interactive --agree-tos "${MAILOPT[@]}" --keep-until-expiring; then
    # yangilangan sertifikatdan keyin nginx o'zi qayta o'qisin (certbot.timer)
    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    printf '#!/bin/sh\nsystemctl reload nginx 2>/dev/null || service nginx reload\n' >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    ok "sertifikat olindi; nginx 443 bilan qayta yoziladi"
    # skriptni --https siz qayta ishga tushiramiz: endi sertifikat bor, blok 443 bilan yoziladi
    extra=(); [ "$TGTEST" -eq 0 ] && extra+=(--no-tg-test)
    exec bash "$0" "${extra[@]}" DOMAIN="$DOMAIN" WEBROOT="$WEBROOT"
  else
    warn "Sertifikat olinmadi. DNS A-yozuvi shu serverga qaraganini va 80-port ochiqligini tekshiring."
  fi
fi

# ------------------------------------------------------------------ tekshiruv
say "Tekshiruv"
HOSTH="$DOMAIN"; [ "$DOMAIN" = "_" ] && HOSTH="localhost"
SCHEME=http; [ "$HAVE_CERT" -eq 1 ] && SCHEME=https
code() { curl -sk -o /dev/null -w '%{http_code}' --resolve "$HOSTH:80:127.0.0.1" --resolve "$HOSTH:443:127.0.0.1" "$SCHEME://$HOSTH$1"; }
for u in / /katalog.html /katalog /assets/catalog.js /assets/katalog/gmb-2024/p001.webp; do
  c="$(code "$u")"; if [ "$c" = 200 ]; then ok "$u -> 200"; else warn "$u -> $c (200 kutilgan)"; fi
done
for u in /config.php /config.example.php /README.md /build.mjs /src/katalog.html /deploy/tg-test.php /.git/config /assets/products.json /img-map.json; do
  c="$(code "$u")"; if [ "$c" = 404 ]; then ok "$u -> 404 (yopiq)"; else warn "$u -> $c (404 kutilgan!)"; fi
done
# send.php ni GET bilan chaqiramiz: sozlama to'g'ri bo'lsa "method" qaytaradi
sp="$(curl -sk --resolve "$HOSTH:80:127.0.0.1" --resolve "$HOSTH:443:127.0.0.1" "$SCHEME://$HOSTH/send.php" || true)"
case "$sp" in
  *'"error":"method"'*) ok "send.php: PHP ishlaydi, config.php to'g'ri" ;;
  *no_config*)  warn "send.php: config.php yo'q -> arizalar Telegramga bormaydi" ;;
  *bad_config*) warn "send.php: config.php to'liq emas (token/chat). Sabab: tail /var/log/nginx/${SITE}.error.log" ;;
  *) warn "send.php javobi kutilmagan: ${sp:0:120}" ;;
esac

if [ "$TGTEST" -eq 1 ] && [ -f "$CFG" ]; then
  say "Telegram: token tekshiruvi (getMe)"
  php "$SRC/deploy/tg-test.php" --getme --config="$CFG" | sed 's/^/    /' || warn "Token tekshiruvi o'tmadi (yuqoriga qarang)"
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
say "Tayyor"
cat <<EOF
    Sayt:      $SCHEME://${DOMAIN/#_/${IP:-SERVER_IP}}/
    Papka:     $WEBROOT
    Loglar:    /var/log/nginx/${SITE}.error.log  (send.php xatolari shu yerda)
    Sinov:     php $SRC/deploy/tg-test.php --config=$CFG          (sinov xabari)
               php $SRC/deploy/tg-test.php --updates --config=$CFG (chat ID topish)
    Yangilash: yangi arxivni oching va shu skriptni qayta ishga tushiring.
EOF
