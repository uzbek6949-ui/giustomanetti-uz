/* Katta manba videodan sayt uchun yengil fon kliplarini kesadi.
   Ishga tushirish:  node make-clips.mjs
   ffmpeg kerak. Har klip uchun 2 ta fayl chiqadi: kompyuter va telefon uchun. */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const run = promisify(execFile);
const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT  = join(ROOT, 'assets', 'video');

const SOURCE = process.env.SRC || 'C:/Users/Lenovo/Music/6834356.mp4';

/* Manba videodagi eng mos joylar (soniyada). */
const CLIPS = [
  { name: 'hero',     start: 76.3, dur: 14, note: 'dunyo zarhal yodgorliklari' },
  { name: 'vetrina',  start: 180.2, dur: 13, note: 'oltin gumbaz, Versal favvorasi' },
  { name: 'academy',  start: 124.4, dur: 12, note: 'varaqni kesish, quyma' },
  { name: 'katalog',  start: 200.3, dur: 12, note: 'firma daftari va Florentsiya' }
]

async function findFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  try { await run('ffmpeg', ['-version']); return 'ffmpeg'; } catch {}
  const base = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  try {
    for (const d of await readdir(base)) {
      if (!/ffmpeg/i.test(d)) continue;
      const stack = [join(base, d)];
      while (stack.length) {
        const cur = stack.pop();
        for (const e of await readdir(cur, { withFileTypes: true })) {
          const p = join(cur, e.name);
          if (e.isDirectory()) stack.push(p);
          else if (e.name.toLowerCase() === 'ffmpeg.exe') return p;
        }
      }
    }
  } catch {}
  return null;
}

const FF = await findFfmpeg();
if (!FF) { console.error('ffmpeg topilmadi. FFMPEG=<yo\u2018l> bilan ko\u2018rsating.'); process.exit(1); }
console.log('ffmpeg: ' + FF + '\n');

const mb = (b) => (b / 1048576).toFixed(2) + ' MB';

/* -crf: kichik son = yaxshiroq sifat, kattaroq fayl.
   -g 48: har 2 soniyada kalit kadr, shunda loop silliq boshlanadi.
   -an: ovoz olib tashlanadi, fon videosida ovoz bo'lmaydi.
   +faststart: metadata boshiga ko'chadi, video darhol boshlanadi. */
async function cut(src, out, start, dur, width, crf) {
  await run(FF, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', String(start), '-i', src, '-t', String(dur),
    '-an', '-sn',
    '-vf', `scale=${width}:-2:flags=lanczos`,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow',
    '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
    '-movflags', '+faststart',
    out
  ], { maxBuffer: 1 << 26 });
  return (await stat(out)).size;
}

/* Poster = klipning o'zining birinchi kadri. Shunda video yuklangan payt
   rasmdan videoga o'tish ko'rinmaydi. */
async function poster(src, out, start) {
  await run(FF, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', String(start), '-i', src, '-frames:v', '1',
    '-vf', 'scale=1440:-2:flags=lanczos',
    '-q:v', '4', out
  ], { maxBuffer: 1 << 26 });
  return (await stat(out)).size;
}

const made = [];
for (const c of CLIPS) {
  process.stdout.write(c.name.padEnd(9) + ' ' + c.note + ' ... ');
  const big   = join(OUT, c.name + '.mp4');
  const small = join(OUT, c.name + '-m.mp4');
  const pos   = join(OUT, c.name + '-poster.jpg');
  const b = await cut(SOURCE, big,   c.start, c.dur, 1440, 28);
  const s = await cut(SOURCE, small, c.start, c.dur,  854, 30);
  const p = await poster(SOURCE, pos, c.start);
  console.log(mb(b) + '  +  ' + mb(s) + ' (telefon)  +  ' + mb(p) + ' (poster)');
  made.push(c.name + '.mp4', c.name + '-m.mp4');
}

await writeFile(join(OUT, 'clips.json'), JSON.stringify(made, null, 0) + '\n', 'utf8');
console.log('\nclips.json yangilandi: ' + made.length + ' ta fayl.');
