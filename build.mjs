/* Sahifalarni yig'ish: src/ + umumiy qismlar  ->  ildizdagi .html fayllar.
   Ishga tushirish:  node build.mjs
   Matnni o'zgartirish uchun bu fayl EMAS, assets/m-copy.js tahrirlanadi. */

import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { buildProducts, productPages } from './gen-products.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFile(join(ROOT, 'src', f), 'utf8');

/* Mahsulotlar sahifasini avval ma'lumotdan (assets/products.json) yangilaymiz */
const pr = await buildProducts();
console.log('  mahsulotlar: ' + pr.total + ' karta (' + pr.gold + ' oltin + ' + pr.silver + ' kumush)');

const PAGES = [
  { file: 'index.html',    tkey: 't.index',
    title: "Giusto Manetti Battiloro · сусальное и съедобное золото в Узбекистане",
    desc:  "Официальный представитель Giusto Manetti Battiloro (Firenze, с 1600 года) в Узбекистане. Сусальное золото, материалы для золочения, съедобное золото и серебро. Ташкент." },
  { file: 'qurilish.html', tkey: 't.qur',
    title: "Золочение в строительстве и декоре · Giusto Manetti Battiloro",
    desc:  "Сусальное золото для куполов, минаретов, фасадов, интерьеров и лепнины. Наружное золочение, реставрация, поставки объектам и мастерским по Узбекистану." },
  { file: 'mahsulotlar.html', tkey: 't.prod',
    title: "Продукция · съедобное золото и серебро · Giusto Manetti Battiloro",
    desc:  "Съедобное золото 23 карата и серебро Giusto Manetti Battiloro: лист, хлопья, крошка, пудра. Серии Gold Chef, Luxury, Business. Поставки по Узбекистану." },
  { file: 'kosmetika.html', tkey: 't.kos',
    title: "Косметическое золото 24K · Giusto Manetti Battiloro",
    desc:  "Сусальное золото 24K для косметологии: маски для лица, патчи под глаза, салонные процедуры и производство косметики. Поставки по Узбекистану." },
  { file: 'galereya.html', tkey: 't.gal',
    title: "Галерея · Giusto Manetti Battiloro",
    desc:  "Своды и фасады, рамы и иконы, десерты и коктейли. Работы, выполненные золотом Manetti." },
  { file: 'aloqa.html',    tkey: 't.con',
    title: "Контакты · Giusto Manetti Battiloro Узбекистан",
    desc:  "Ташкент, Юнусабад, ул. Абдуллы Кадыри, 38А. Телефон +998 95 145 44 22. Заявка на прайс Giusto Manetti Battiloro." }
];

const head   = await src('_head.html');
const header = await src('_header.html');
const footer = await src('_footer.html');

for (const p of PAGES) {
  const body = await src(p.file);
  const html = head
      .replaceAll('{{TITLE}}', p.title)
      .replaceAll('{{DESC}}',  p.desc)
      .replaceAll('{{TKEY}}',  p.tkey)
      .replaceAll('{{FILE}}',  p.file === 'index.html' ? '' : p.file)
    + '\n' + header + '\n' + body + '\n' + footer;
  await writeFile(join(ROOT, p.file), html, 'utf8');
  console.log('  ' + p.file + '  ' + html.length + ' bayt');
}
console.log(PAGES.length + ' ta sahifa yig‘ildi.');

/* Har bir mahsulotning alohida sahifasi: mahsulot/<id>.html
   Papka ichida bo'lgani uchun <base href="../"> qo'yamiz: barcha havolalar
   (assets/, index.html ...) ildizdan ochiladi. */
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const items = await productPages();
await rm(join(ROOT, 'mahsulot'), { recursive: true, force: true });
await mkdir(join(ROOT, 'mahsulot'));
for (const p of items) {
  const html = head
      .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="../">')
      .replaceAll('{{TITLE}}', esc(p.title))
      .replaceAll('{{DESC}}',  esc(p.desc))
      .replaceAll('{{TKEY}}',  'pd.title')
      .replaceAll('{{FILE}}',  'mahsulot/' + p.id + '.html')
      .replace('https://giustomanetti.uz/assets/poster/hero.jpg', 'https://giustomanetti.uz/' + p.ogimg)
    + '\n' + header + '\n' + p.body + '\n' + footer;
  await writeFile(join(ROOT, 'mahsulot', p.id + '.html'), html, 'utf8');
}
console.log(items.length + ' ta mahsulot sahifasi: mahsulot/*.html');
