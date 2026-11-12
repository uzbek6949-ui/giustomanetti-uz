# Mahsulot qo'shish / o'chirish qo'llanmasi

Mahsulotlar sahifasi (`mahsulotlar.html` — "Продукция") **qo'lda yozilmaydi**.
U bitta ma'lumot faylidan — `assets/products.json` — avtomatik quriladi.
Shuning uchun mahsulot qo'shish uchun HTML'ni bilish shart emas.

---

## Eng oson yo'l

Yangi mahsulotning **rasmi** va **ma'lumotini** (nomi, metall, shakl, og'irlik,
seriya) menga yoki dasturchiga yuboring — bir-ikki daqiqada qo'shiladi.

---

## Qadamba-qadam (dasturchi uchun)

**1. Rasmni qo'ying.** `assets/img/shop/` papkasiga ikki fayl:
`<id>.jpg` va `<id>.webp` (taxminan 600×600, kvadrat). `<id>` — ixtiyoriy
takrorlanmas raqam (masalan `900`).

**2. `assets/products.json` ga bitta qator qo'shing** (ro'yxat oxiriga):

```json
{
  "id": "900",
  "metal": "gold",
  "form": "Хлопья",
  "weight": "5 г",
  "series": "Gold Chef",
  "title": "Пищевое золото Giusto Manetti Battiloro 5 г в хлопьях"
}
```

| Maydon | Nima | Mumkin qiymatlar |
|--------|------|------------------|
| `id` | rasm fayl nomi | takrorlanmas raqam |
| `metal` | metall | `gold` yoki `silver` |
| `form` | shakl | `Хлопья` `Крошка` `Порошок` `Листовое` `Трансферный лист` |
| `weight` | og'irlik | masalan `5 г`, `0,2 г`, `25 лист.` |
| `series` | seriya | `Gold Chef`, `Luxury`, `Business`, `Industrial`, `Gold Chef Professional`, `Gold Chef Family & Friends`, `Gold Chef You & Me` |
| `title` | to'liq nom (alt) | ixtiyoriy matn |

**3. Sahifani qayta yig'ing:**

```bash
node build.mjs
```

Bu buyruq `assets/products.json` dan `mahsulotlar.html` ni qaytadan quradi
(oltin/kumush bo'yicha o'zi ajratadi, og'irlik bo'yicha tartiblaydi).

**4. GitHub'ga yuboring:**

```bash
git add -A && git commit -m "Yangi mahsulot qo'shildi" && git push origin main
```

Taxminan 1 daqiqada live saytda ko'rinadi.

---

## O'chirish

`assets/products.json` dan o'sha mahsulot qatorini o'chiring, `node build.mjs`,
keyin push. Rasm fayllarini ham o'chirsangiz bo'ladi (`assets/img/shop/<id>.*`).

## Shakl so'zlarini tarjima qilish

Kartadagi shakl (Хлопья/Крошка/…) uchta tilda ko'rsatiladi. Tarjimalar
`assets/m-copy.js` da `pf.flakes`, `pf.crumbs`, `pf.powder`, `pf.leaf`,
`pf.transfer` kalitlarida. Yangi shakl turi kerak bo'lsa, shu yerga qo'shiladi.
