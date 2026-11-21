# giustomanetti.uz

Giusto Manetti Battiloro kompaniyasining Oʻzbekistondagi rasmiy vakili sayti.
manetti.com uslubida: yorugʻ fon, Zilla Slab + Montserrat shriftlari,
oltin (`#C39F5F`) va koʻk (`#182340`) ranglar. 6 sahifa, 3 til, video fonlar.

WordPress, maʼlumotlar bazasi yoki build jarayoni kerak emas: oddiy HTML.

---

## Sahifalar

| Fayl | Nima |
|---|---|
| `index.html` | Bosh sahifa: hero, Katalog/Gold Chef, Vitrina, Academy, Galereya, Biz haqimizda |
| `katalog.html` | B2B: zarhallash materiallari, 6 guruh + **Manetti kataloglari** (varaqlagich, PDF), katalogning 6 boʻlimi, katalogdan 12 mahsulot |
| `goldchef.html` | Yeyiladigan oltin va kumush, 6 mahsulot, qoʻllash yoʻriqnomasi |
| `academy.html` | Zarhallash maktabi, 4 ta usul |
| `galereya.html` | Galereya, rasm kattalashadi (← → Esc) |
| `aloqa.html` | Aloqa, ariza formasi, karta |
| `scroll.html` | Zaxira: qora, 3D scroll versiya |
| `classic.html` | Zaxira: eng birinchi tinch versiya |

## Papkalar

```
assets/m.css       dizayn
assets/m-copy.js   BARCHA matnlar, 3 tilda   <- matnni shu yerda oʻzgartiring
assets/m.js        menyu, til, galereya, forma, video
assets/catalog.js  kataloglar varaqlagichi (katalog.html, qurilish.html)
assets/katalog/    Manetti kataloglari: pdf/ va har sahifa rasmi (pNNN katta, tNNN kichik)
assets/img/katalog/ katalogdan kesib olingan mahsulot rasmlari
deploy/            LXC/VPS ga oʻrnatish skripti va Telegram tekshiruvi
assets/video/      fon videolari + posterlar
engine/            scroll.html uchun kutubxona
src/               sahifa manbalari (build.mjs shulardan yigʻadi)
send.php           ariza -> Telegram
config.example.php sozlama namunasi
```

---

## ⚠️ Birinchi oʻrnatishda: config.php

Telegram tokeni kodda **yoʻq**. Saytni ishga tushirishdan oldin:

```bash
copy config.example.php config.php
```

Soʻng `config.php` ni oching va token hamda chat ID ni yozing.
Bu fayl `.gitignore` da, shuning uchun GitHub'ga hech qachon tushmaydi.

Hozirgi bot: **@giustomanetti_bot**, arizalar Jahongir (@Xikmatilloyev) ga keladi.

---

## Video fonlar

Manbadan kesilgan 4 ta qisqa klip. Har biri uchun kompyuter nusxasi,
telefon nusxasi (`-m.mp4`) va poster (klipning oʻz birinchi kadri).

| Klip | Nima koʻrinadi | Qayerda |
|---|---|---|
| `hero` | Dunyo boʻylab zarhal yodgorliklar | bosh sahifa |
| `vetrina` | Oltin gumbaz, Versal favvorasi | bosh sahifa |
| `academy` | Varaqni kesish, quyma | bosh sahifa, Akademiya |
| `katalog` | Firma daftari, Florentsiya | Katalog |

Kliplar **ekranga yaqinlashgandagina** yuklanadi, telefonda yengil nusxa olinadi.
Video boʻlmasa sayt posterni sekin surib koʻrsatadi va hech narsa buzilmaydi.

**Yangi video qoʻshish:** faylni `assets/video/` ga qoʻying va nomini
`assets/video/clips.json` ga yozing. Batafsil: `assets/video/README.txt`.

**Klipni qayta kesish:** `make-clips.mjs` ichidagi soniyalarni oʻzgartiring, soʻng:

```bash
node make-clips.mjs
```

ffmpeg kerak. Agar PATH da boʻlmasa: `FFMPEG=C:/yo'l/ffmpeg.exe node make-clips.mjs`

---

## Rasmlar optimizatsiyasi

Barcha rasmlar sayt ichida (`assets/img/`), tashqi serverga bogʻliqlik yoʻq.
Har biri ikki shaklda: **WebP** (zamonaviy brauzerlar) va **JPEG** (eskilari).
HTML da `<picture>` ishlatiladi, brauzer oʻzi tanlaydi.

Qayta ishlash kerak boʻlsa:

```bash
node optimize-img.mjs    # kichraytiradi va WebP qiladi
node rewrite-img.mjs     # src/ dagi manzillarni yangilaydi
node build.mjs           # sahifalarni qayta yigʻadi
```

ffmpeg kerak: `FFMPEG=C:/yoʻl/ffmpeg.exe node optimize-img.mjs`

Hozirgi ogʻirlik: bosh sahifa ~5 MB (shundan 4 MB video), telefonda ~2,5 MB.
Boshqa sahifalar 0,5–1,5 MB.

## Matnni oʻzgartirish

Hamma matn `assets/m-copy.js` ichida, `ru` / `uz` / `en` boʻlimlariga ajratilgan.
Masalan `"h.h1"` — bosh sahifadagi katta sarlavha. HTML ga tegish shart emas.

## Sahifa tuzilmasini oʻzgartirish

`src/` dagi fayllarni tahrirlang, soʻng:

```bash
node build.mjs
```

Sarlavha va pastki qism `src/_header.html` va `src/_footer.html` da:
bir marta oʻzgartirsangiz, 6 sahifada ham oʻzgaradi.

## Kompyuterda ochish

```bash
node serve.mjs
```

Brauzerda: `http://localhost:4180`

---

## Manetti kataloglari (varaqlagich)

`katalog.html` da ikkala katalog (Catalogo 2024, Belle Arti 2025) muqova, mundarija va
PDF bilan turadi. Bosilsa toʻliq ekranli varaqlagich ochiladi: ← → / Home / End / Esc,
telefonda surish, bosish yoki ikki marta tegish — kattalashtirish, "Barcha sahifalar".
Havola bilan maʼlum sahifani ochish mumkin: `katalog.html?catalog=gmb-2024&page=13`.
Har qanday elementga `data-cat="gmb-2024" data-page="13"` qoʻysangiz, bosilganda
katalog shu sahifada ochiladi (`assets/catalog.js` ulangan sahifalarda).
Katalog maʼlumotlari (sahifalar soni, mundarija) `assets/catalog.js` boshida.

---

## Oʻz serveriga (Proxmox LXC / VPS) oʻrnatish

Batafsil: [`deploy/LXC-ORNATISH.md`](deploy/LXC-ORNATISH.md). Qisqasi:

```bash
DOMAIN=giustomanetti.uz TELEGRAM_BOT_TOKEN='...' TELEGRAM_CHAT_IDS='...' bash deploy/install-lxc.sh
php deploy/tg-test.php          # Telegramga sinov xabari
```

Ariza Telegramga yetmasa, sababi server logida: `/var/log/nginx/giustomanetti.error.log`
(brauzerga faqat qisqa kod qaytadi: `no_config`, `bad_config`, `telegram`).

---

## Hostingga yuklash

`public_html` (yoki `www`) papkasiga yuklang:

```
*.html
assets/
engine/
send.php
config.php      <- buni QOʻLDA yaratasiz, GitHub'da yoʻq
```

Kerak emas: `src/`, `deploy/`, `*.mjs`, `README.md`, `config.example.php`,
`.gitignore`, `img-map.json`, `assets/products.json`, `assets/product-texts.json`.

`send.php` uchun hostingda **PHP** boʻlishi shart. Boʻlmasa forma
avtomatik zaxira yoʻlga oʻtadi: arizani nusxalaydi va Telegram ochadi.

---

## Eslatmalar

1. **Bosh sahifadagi blok rasmlari manetti.com dan olingan** (`assets/img/`).
   Bular bosh kompaniyaning oʻz marketing fotolari; rasmiy vakil sifatida
   ishlatish odatiy, lekin Manetti'dan bir ogʻiz tasdiq olib qoʻyish maʼqul.
2. **Eski saytdagi rasmlar koʻchirildi** (`assets/img/wp/`). Endi sayt
   `giustomanetti.uz/wp-content/` ga bogʻliq emas: eski WordPress oʻchirilsa
   ham hech narsa buzilmaydi.
3. **Raqamlar manetti.com dan olingan**: 400+ yil, 15 avlod, 70+ davlat, 29 tus.
4. **Onlayn doʻkon (savat, toʻlov) yoʻq.** manetti.com da ESHOP bor, bizda
   uning oʻrniga "ariza qoldirish" ishlaydi. Haqiqiy doʻkon alohida ish.
