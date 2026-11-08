/* Sahifalarni yig'ish: src/ + umumiy qismlar  ->  ildizdagi .html fayllar.
   Ishga tushirish:  node build.mjs
   Matnni o'zgartirish uchun bu fayl EMAS, assets/m-copy.js tahrirlanadi. */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFile(join(ROOT, 'src', f), 'utf8');

const PAGES = [
  { file: 'index.html',    tkey: 't.index',
    title: "Giusto Manetti Battiloro · сусальное и съедобное золото в Узбекистане",
    desc:  "Официальный представитель Giusto Manetti Battiloro (Firenze, с 1600 года) в Узбекистане. Сусальное золото, материалы для золочения, съедобное золото и серебро. Ташкент." },
  { file: 'katalog.html',  tkey: 't.kat',
    title: "Каталог для золочения · Giusto Manetti Battiloro",
    desc:  "Сусальное золото 24K, серебро, палладий, платина, болюс, миссии, защитные составы и инструменты для золочения. Поставки по Узбекистану." },
  { file: 'goldchef.html', tkey: 't.gc',
    title: "Gold Chef · съедобное золото и серебро · Manetti",
    desc:  "Съедобное золото и серебро 24K: лист, хлопья, крошка, пудра. E175 и E174. Для ресторанов, кондитерских и баров в Узбекистане." },
  { file: 'academy.html',  tkey: 't.ac',
    title: "Gilding Academy · школа золочения · Manetti",
    desc:  "Техники золочения: на полименте, на миссии, патина и старение, защита поверхности. Руководство от мастеров Giusto Manetti Battiloro." },
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
