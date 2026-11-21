# Saytni Proxmox LXC konteynerga oʻrnatish

Natija: Debian 12 konteynerda nginx + PHP, sayt `/var/www/giustomanetti` da,
saytdagi ariza formasi Telegram botga keladi. Hammasini `install-lxc.sh` qiladi.

---

## 1. Telegram bot (bir marta)

1. Telegramda **@BotFather** -> `/newbot` (yoki mavjud bot: `/mybots` -> bot -> *API Token*).
   Token shunga oʻxshaydi: `123456789:AAH...`. **Uni hech kimga bermang, GitHub'ga yozmang.**
2. Arizalar kimga kelsin:
   - **Bir odamga:** oʻsha odam botni ochib `/start` bossin.
   - **Guruhga:** botni guruhga qoʻshing va guruhga biror xabar yozing (`/start@BotNomi`).
3. Chat ID ni bilmasangiz, hozircha boʻsh qoldiring: 6-qadamda skript oʻzi topib beradi.

## 2. Konteyner yaratish (Proxmox)

Shablonni yuklab olish (Proxmox hostida, bir marta):

```bash
pveam update
pveam available | grep debian-12
pveam download local debian-12-standard_12.12-1_amd64.tar.zst   # roʻyxatdagi aniq nomni yozing
```

**Create CT** (veb-panel):

| Maydon | Qiymat |
|---|---|
| Hostname | `giustomanetti` |
| Unprivileged container | ✔ |
| Password / SSH key | oʻzingizniki |
| Template | `debian-12-standard_…` |
| Disk | 4 GB (sayt ~55 MB) |
| CPU / RAM | 1 yadro / 512 MB |
| Network | `vmbr0`, IPv4: **Static** `192.168.1.50/24`, Gateway `192.168.1.1` (oʻz tarmogʻingizniki) |
| DNS | hostdagidek yoki `1.1.1.1` |

Yoki buyruq bilan (ID `120` — boʻsh raqam tanlang):

```bash
pct create 120 local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname giustomanetti --unprivileged 1 --cores 1 --memory 512 --rootfs local-lvm:4 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.50/24,gw=192.168.1.1 \
  --nameserver 1.1.1.1 --onboot 1 --password
pct start 120
```

## 3. Arxivni konteynerga yuborish

Proxmox hostidan:

```bash
pct push 120 giustomanetti-uz-lxc.zip /root/giustomanetti-uz-lxc.zip
pct enter 120
```

(yoki kompyuterdan: `scp giustomanetti-uz-lxc.zip root@192.168.1.50:/root/`)

Konteyner ichida:

```bash
apt-get update && apt-get install -y unzip
cd /root && unzip -o giustomanetti-uz-lxc.zip && cd giustomanetti-uz
```

## 4. Oʻrnatish

```bash
DOMAIN=giustomanetti.uz bash deploy/install-lxc.sh
```

Skript token va chat ID ni soʻraydi (token yozilganda koʻrinmaydi). Savolsiz:

```bash
DOMAIN=giustomanetti.uz \
TELEGRAM_BOT_TOKEN='123456789:AAH...' \
TELEGRAM_CHAT_IDS='111111111,-1002222222222' \
bash deploy/install-lxc.sh
```

Skript: nginx, php-fpm, php-curl, php-mbstring oʻrnatadi; saytning faqat ochiq
fayllarini koʻchiradi; `config.php` ni `0640` huquq bilan yozadi; nginx ni sozlaydi
(gzip, kesh, `config.php`, `src/`, `deploy/`, `*.md`, `.git` yopiq) va oxirida oʻzini tekshiradi.
`OK` qatorlari yashil, muammo boʻlsa `!!` qizil chiqadi.

`DOMAIN` berilmasa sayt istalgan nom/IP bilan ochiladi (`http://192.168.1.50/`) — sinov uchun qulay.

## 5. Domen va internet

1. Konteyner tashqaridan koʻrinsin: routerda **80 va 443** portlarni `192.168.1.50` ga yoʻnaltiring
   (yoki konteynerga oq IP bering).
2. Domen panelida **A-yozuv**: `giustomanetti.uz` -> serverning tashqi IP si,
   `www` -> oʻsha IP (yoki `CNAME giustomanetti.uz`). Tarqalishi 5 daqiqadan bir necha soatgacha.
   Tekshirish: `getent hosts giustomanetti.uz`
3. HTTPS (bepul Let's Encrypt sertifikati, oʻzi yangilanadi):

```bash
DOMAIN=giustomanetti.uz EMAIL=siz@example.com bash deploy/install-lxc.sh --https
```

## 6. Telegramni tekshirish

```bash
php deploy/tg-test.php --getme     # token toʻgʻrimi
php deploy/tg-test.php --updates   # botga yozganlar roʻyxati -> chat ID shu yerda
php deploy/tg-test.php             # config.php dagi har bir chatga sinov xabari
```

Chat ID ni keyin qoʻshish yoki almashtirish:

```bash
TELEGRAM_BOT_TOKEN='123456789:AAH...' TELEGRAM_CHAT_IDS='-1002222222222' bash deploy/install-lxc.sh --reconfig
```

## 7. Formani sinash

Saytda **Kontaktlar** (`aloqa.html`) -> ism, telefon -> *Yuborish*.
"Ariza yuborildi" chiqsa va Telegramga xabar kelsa — tayyor.

Kelmasa, sababi logda (token hech qachon yozilmaydi):

```bash
tail -n 20 /var/log/nginx/giustomanetti.error.log
```

| Logdagi yozuv | Nima qilish |
|---|---|
| `config.php topilmadi` | skriptni token bilan qayta ishga tushiring |
| `token yo'q, namunadagi qiymat` | haqiqiy tokenni yozing (`--reconfig`) |
| `"chats" bo'sh` | chat ID qoʻshing (`tg-test.php --updates`) |
| `HTTP 401: Unauthorized` | token notoʻgʻri yoki @BotFather'da yangilangan |
| `chat not found` | chat ID notoʻgʻri yoki bot guruhda yoʻq |
| `HTTP 403` | odam botni bloklagan / `/start` bosmagan, bot guruhdan chiqarilgan |
| `Telegramga ulanib bo'lmadi` | konteynerdan internet/DNS yoʻq: `curl -I https://api.telegram.org` |

## 8. Saytni yangilash

Yangi arxivni oching va shu skriptni qayta ishga tushiring. `config.php` saqlanadi,
HTTPS sozlamasi buzilmaydi. Eski (arxivda yoʻq) fayllarni oʻchirish: `--prune`.
