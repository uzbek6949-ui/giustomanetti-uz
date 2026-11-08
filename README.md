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
| `katalog.html` | B2B: zarhallash materiallari, 6 guruh |
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

## Hostingga yuklash

`public_html` (yoki `www`) papkasiga yuklang:

```
*.html
assets/
engine/
send.php
config.php      <- buni QOʻLDA yaratasiz, GitHub'da yoʻq
```

Kerak emas: `src/`, `build.mjs`, `make-clips.mjs`, `serve.mjs`,
`README.md`, `config.example.php`, `.gitignore`.

`send.php` uchun hostingda **PHP** boʻlishi shart. Boʻlmasa forma
avtomatik zaxira yoʻlga oʻtadi: arizani nusxalaydi va Telegram ochadi.

---

## Eslatmalar

1. **Rasmlar eski saytdan olinmoqda** (`giustomanetti.uz/wp-content/uploads/`).
   Eski WordPress oʻchirilsa, rasmlarni yuklab olib `assets/img/` ga qoʻyish
   va manzillarni almashtirish kerak. Videolar va posterlar repo ichida.
2. **Raqamlar manetti.com dan olingan**: 400+ yil, 15 avlod, 70+ davlat, 29 tus.
3. **Onlayn doʻkon (savat, toʻlov) yoʻq.** manetti.com da ESHOP bor, bizda
   uning oʻrniga "ariza qoldirish" ishlaydi. Haqiqiy doʻkon alohida ish.
