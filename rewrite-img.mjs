/* src/*.html dagi rasm manzillarini mahalliy, optimizatsiya qilingan
   fayllarga o'tkazadi va har birini <picture> ichiga oladi:
   zamonaviy brauzer WebP oladi, eskisi JPEG.

   Ishga tushirish:  node rewrite-img.mjs   (so'ng: node build.mjs)        */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(await readFile(join(ROOT, 'img-map.json'), 'utf8'));

const PAGES = ['index.html', 'katalog.html', 'goldchef.html', 'academy.html', 'galereya.html', 'aloqa.html'];

/* <img ...> ni topadi, lekin allaqachon <picture> ichidagisiga tegmaydi */
const IMG = /<img\b[^>]*?>/g;

function webpFor(src) {
  if (/^assets\/img\/wp\//.test(src))      return src.replace(/\.jpg$/, '.webp');
  if (/^assets\/img\/[a-z]+\.jpg$/.test(src)) return src.replace(/\.jpg$/, '.webp');
  if (/-poster\.jpg$/.test(src))            return src.replace(/\.jpg$/, '.webp');
  return null;
}

let total = 0;
for (const p of PAGES) {
  const file = join(ROOT, 'src', p);
  let s = await readFile(file, 'utf8');
  let n = 0;

  /* 1. eski sayt manzillari -> mahalliy */
  for (const [url, base] of Object.entries(map)) {
    if (s.includes(url)) { s = s.split(url).join(base + '.jpg'); }
  }

  /* 2. har bir <img> ni <picture> ichiga olamiz */
  s = s.replace(IMG, (tag) => {
    const m = tag.match(/\ssrc="([^"]+)"/);
    if (!m) return tag;
    const src  = m[1];
    const webp = webpFor(src);
    if (!webp) return tag;
    if (!existsSync(join(ROOT, webp))) return tag;
    /* noto'g'ri o'lcham qolmasin: CSS baribir o'lchamni belgilaydi */
    const clean = tag.replace(/\s(width|height)="[^"]*"/g, '');
    n++;
    return `<picture><source srcset="${webp}" type="image/webp">${clean}</picture>`;
  });

  await writeFile(file, s, 'utf8');
  console.log(`${p.padEnd(16)} ${n} ta rasm <picture> ichiga olindi`);
  total += n;
}
console.log(`\njami ${total} ta rasm.`);
