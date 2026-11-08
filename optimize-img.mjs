/* Rasmlarni optimizatsiya qiladi:
     - eski saytdagi (WordPress) rasmlarni yuklab oladi, saytning ichiga ko'chiradi
     - hammasini kerakli o'lchamgacha kichraytiradi
     - WebP qiladi (JPEG ham qoladi, eski brauzerlar uchun)

   Ishga tushirish:  node optimize-img.mjs
   ffmpeg kerak:     FFMPEG=C:/yo'l/ffmpeg.exe node optimize-img.mjs          */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run  = promisify(execFile);
const ROOT = dirname(fileURLToPath(import.meta.url));
const IMG  = join(ROOT, 'assets', 'img');
const WP   = join(IMG, 'wp');

/* To'liq kenglikdagi bloklar uchun kattaroq, kartochkalar uchun kichikroq. */
const WIDE = 1400;   // banner, hero, katta figura
const CARD = 1000;   // kartochka, galereya katagi, mahsulot fotosi

async function findFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  try { await run('ffmpeg', ['-version']); return 'ffmpeg'; } catch {}
  const base = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  try {
    const stack = (await readdir(base)).filter(d => /ffmpeg/i.test(d)).map(d => join(base, d));
    while (stack.length) {
      const cur = stack.pop();
      for (const e of await readdir(cur, { withFileTypes: true })) {
        const p = join(cur, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.name.toLowerCase() === 'ffmpeg.exe') return p;
      }
    }
  } catch {}
  return null;
}

const FF = await findFfmpeg();
if (!FF) { console.error("ffmpeg topilmadi. FFMPEG=<yo'l> bilan ko'rsating."); process.exit(1); }

const kb = async (p) => Math.round((await stat(p)).size / 1024);

/* -q:v 78 WebP uchun yaxshi muvozanat; kattaroq son = yaxshiroq sifat.
   scale 'min(W,iw)' asl rasmdan kattalashtirmaydi. */
async function shrink(src, out, w, webp) {
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', src,
    '-vf', `scale='min(${w},iw)':-2:flags=lanczos`,
    ...(webp ? ['-c:v', 'libwebp', '-quality', '72', '-compression_level', '6']
             : ['-q:v', '5']),
    out
  ];
  await run(FF, args, { maxBuffer: 1 << 26 });
  return kb(out);
}

/* ---- 1. eski saytdagi rasmlarni yuklab olamiz ------------------------- */
await mkdir(WP, { recursive: true });

const pages = ['index.html', 'katalog.html', 'goldchef.html', 'academy.html', 'galereya.html', 'aloqa.html'];
const remote = new Set();
for (const p of pages) {
  const h = await readFile(join(ROOT, 'src', p), 'utf8').catch(() => '');
  for (const m of h.matchAll(/https:\/\/giustomanetti\.uz\/wp-content\/uploads\/[^"']+/g)) remote.add(m[0]);
}
console.log(`eski saytdan ${remote.size} ta rasm topildi\n`);

/* qisqa, tushunarli nom */
const nameOf = (u) => basename(u).replace(/\.[a-z]+$/i, '')
  .replace(/^(\d{6,})_.*$/, 'ig-$1')
  .replace(/-scaled-1$|-web-scaled-1$/, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 40);

const map = {};   /* eski URL -> yangi yo'l */
let before = 0, after = 0;

for (const url of remote) {
  const nm  = nameOf(url);
  const tmp = join(WP, nm + '.src' + (extname(url) || '.jpg'));
  const res = await fetch(url);
  if (!res.ok) { console.log(`  ${nm}: yuklanmadi (${res.status})`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(tmp, buf);
  before += buf.length;

  const w = /goldchef|argento|horeca|youandme|familyandfriends/i.test(nm) ? CARD : WIDE;
  const jpg  = join(WP, nm + '.jpg');
  const webp = join(WP, nm + '.webp');
  const a = await shrink(tmp, jpg, w, false);
  const b = await shrink(tmp, webp, w, true);
  after += b * 1024;
  map[url] = 'assets/img/wp/' + nm;
  console.log(`  ${nm.padEnd(34)} ${String(Math.round(buf.length / 1024)).padStart(5)} KB -> ${String(b).padStart(4)} KB webp (${a} KB jpg)`);
}

/* ---- 2. manetti.com bloklari ------------------------------------------ */
console.log('\nmanetti.com blok rasmlari:');
for (const nm of ['eshop', 'catalogo', 'vetrina', 'academy', 'gallery', 'goldchef']) {
  const src = join(IMG, nm + '.jpg');
  if (!existsSync(src)) continue;
  const was = await kb(src);
  const w = (nm === 'eshop' || nm === 'catalogo') ? 1100 : 1600;
  await shrink(src, join(IMG, nm + '.webp'), w, true);
  const tmp = join(IMG, nm + '.min.jpg');
  await shrink(src, tmp, w, false);
  console.log(`  ${nm.padEnd(12)} ${String(was).padStart(5)} KB -> ${String(await kb(join(IMG, nm + '.webp'))).padStart(4)} KB webp`);
}

/* ---- 3. video posterlari ---------------------------------------------- */
console.log('\nvideo posterlari:');
const VID = join(ROOT, 'assets', 'video');
for (const f of (await readdir(VID)).filter(f => f.endsWith('-poster.jpg'))) {
  const src = join(VID, f);
  const was = await kb(src);
  const out = src.replace(/\.jpg$/, '.webp');
  await shrink(src, out, 1440, true);
  console.log(`  ${f.padEnd(24)} ${String(was).padStart(5)} KB -> ${String(await kb(out)).padStart(4)} KB webp`);
}

await writeFile(join(ROOT, 'img-map.json'), JSON.stringify(map, null, 1), 'utf8');
console.log(`\nimg-map.json yozildi (${Object.keys(map).length} ta manzil).`);
console.log(`eski rasmlar: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB webp`);
