/* Mahsulotlar bo'limini ma'lumotdan yig'adi:
     assets/products.json       ->  src/mahsulotlar.html  (ro'yxat, filtr)
     assets/product-texts.json  ->  mahsulot/<id>.html     (har mahsulot sahifasi; build.mjs yozadi)

   YANGI MAHSULOT QO'SHISH:
   1) Asosiy rasmni assets/img/shop/<id>.jpg qilib qo'ying (webp ixtiyoriy).
      Galereya rasmlari: assets/img/shop/g/<raqam>.jpg
   2) assets/products.json ga bitta yangi qator qo'shing:
      { "id":"900", "metal":"gold", "form":"Хлопья", "weight":"5 г",
        "series":"Gold Chef", "title":"...",
        "size":"Средний диаметр частицы золота 4 мм.",       (ixtiyoriy)
        "pack":"Стеклянная солонка, высота 75 мм, диаметр 34 мм", (ixtiyoriy)
        "desc":["d15"], "feats":["d44","d21"],               (product-texts.json kalitlari)
        "gallery":["901","902"] }                            (g/ papkadagi rasmlar)
      metal: "gold" yoki "silver"
      form:  Хлопья | Крошка | Порошок | Листовое | Трансферный лист
   3) node build.mjs  — ro'yxat ham, mahsulot sahifalari ham yangilanadi. */

import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const LANGS = ['ru', 'uz', 'en'];

const formKey = {
  'Хлопья':'pf.flakes', 'Крошка':'pf.crumbs', 'Порошок':'pf.powder',
  'Листовое':'pf.leaf', 'Трансферный лист':'pf.transfer',
};
/* filtr uchun: varaq va transfer varaq bitta guruh */
const formGroup = f => ({ 'Хлопья':'flakes', 'Крошка':'crumbs', 'Порошок':'powder' }[f] || 'leaf');

function serNorm(s){
  const m = {
    'INDUSTRIAL':'Industrial','Industrial':'Industrial','BUSINESS':'Business','LUXURY':'Luxury',
    'Gold Chef':'Gold Chef','Gold Chef Professional':'Gold Chef · Professional',
    'Gold Chef Family & Friends':'Gold Chef · Family & Friends','Gold Chef You & Me':'Gold Chef · You & Me',
  };
  return m[s] || s;
}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
const ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4M11 8v6M8 11h6"/></svg>';

/* JPEG o'lchami (rasm yuklanguncha joy to'g'ri ajralsin) */
function jpgSize(file){
  try {
    const b = readFileSync(file); let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i+1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b.readUInt16BE(i+7), b.readUInt16BE(i+5)];
      i += 2 + b.readUInt16BE(i+2);
    }
  } catch (e) {}
  return [800, 800];
}

/* Og'irlik / fasovka: 3 tilda */
function wt(w, l){
  w = String(w||'');
  if (l === 'ru') return w;
  const n = w.replace(/\s*(г|лист\.)\s*$/,'').trim();
  const sheets = /лист/.test(w);
  if (l === 'uz') return n + (sheets ? ' varaq' : ' g');
  return n.replace(',', '.') + (sheets ? ' sheets' : ' g');
}
const wKey = w => 'w.' + String(w).replace(/[^0-9a-zа-я]+/gi,'_');
function weightKeys(prods){
  const o = { ru:{}, uz:{}, en:{} };
  for (const p of prods) for (const l of LANGS) o[l][wKey(p.weight)] = wt(p.weight, l);
  return o;
}

/* Eski saytdagi "Размер" va "Упаковка" qiymatlari: 3 tilda */
const dec = (s, l) => l === 'en' ? s.replace(',', '.') : s;
function sizeT(v){
  if (!v) return null;
  let m = v.match(/Размер листа:\s*(\d+)\s*[хx×]\s*(\d+)\s*мм/i);
  if (m) return { key:'pd.leafsize', ru:`${m[1]} × ${m[2]} мм`, uz:`${m[1]} × ${m[2]} mm`, en:`${m[1]} × ${m[2]} mm` };
  m = v.match(/(\d+(?:,\d+)?)\s*мм/);
  if (m) return { key:'pd.particle', ru:`в среднем ${m[1]} мм`, uz:`oʻrtacha ${m[1]} mm`, en:`avg. ${dec(m[1],'en')} mm` };
  return { key:'pd.size', ru:v, uz:v, en:v };
}
function packT(v){
  if (!v) return null;
  if (/^1 книжка/i.test(v)) return { ru:'1 книжка', uz:'1 ta kitobcha', en:'1 booklet' };
  let m = v.match(/Пакеты?,\s*высота\s*([\d,]+)\s*см,\s*ширина\s*([\d,]+)\s*см/i);
  if (m) return { ru:`Пакет, ${m[1]} × ${m[2]} см`, uz:`Paket, ${m[1]} × ${m[2]} sm`, en:`Bag, ${dec(m[1],'en')} × ${dec(m[2],'en')} cm` };
  m = v.match(/Стеклянная\s+(солонка|[её]мкость),\s*высота\s*(\d+)\s*мм,\s*диаметр\s*(\d+)\s*мм/i);
  if (m) {
    const salt = /солонка/i.test(m[1]);
    return { ru:`${salt ? 'Стеклянная солонка' : 'Стеклянная банка'}, ${m[2]} × ⌀${m[3]} мм`,
             uz:`${salt ? 'Shisha tuzdon' : 'Shisha idish'}, ${m[2]} × ⌀${m[3]} mm`,
             en:`${salt ? 'Glass shaker' : 'Glass jar'}, ${m[2]} × ⌀${m[3]} mm` };
  }
  return { ru:v, uz:v, en:v };
}

/* --------------------------------------------------------- kartochka ---- */
function card(p){
  const alt = esc(p.title || '');
  const href = `mahsulot/${p.id}.html`;
  const g2 = (p.gallery || [])[1];
  const hover = g2 && existsSync(join(ROOT, 'assets', 'img', 'shop', 'g', g2 + '.jpg'))
    ? `<img class="pcard__alt" decoding="async" src="assets/img/shop/g/${g2}.jpg" alt="" loading="lazy">` : '';
  return `        <article class="pcard rv" data-form="${formGroup(p.form)}">
          <a class="pcard__i" href="${href}" tabindex="-1" aria-hidden="true"><picture><source srcset="assets/img/shop/${p.id}.webp" type="image/webp"><img decoding="async" src="assets/img/shop/${p.id}.jpg" alt="${alt}" loading="lazy"></picture>${hover}</a>
          <div class="pcard__b">
            <span class="pcard__s">${esc(serNorm(p.series))}</span>
            <h3><a href="${href}" data-t="${formKey[p.form]||'pf.leaf'}">${p.form}</a></h3>
            <p class="pcard__m" data-t="${wKey(p.weight)}">${p.weight||''}</p>
            <a class="pcard__more" href="${href}"><span data-t="pr.more">Подробнее</span>${ARROW}</a>
          </div>
        </article>`;
}

/* ---------------------------------------------- mahsulot sahifasi matni -- */
const M = {
  gold:   { ruGen:'съедобного золота',  uz:'oltin',  en:'gold',   E:'E175' },
  silver: { ruGen:'съедобного серебра', uz:'kumush', en:'silver', E:'E174' },
};
const FORM_UZ = { 'Хлопья':'parcha', 'Крошка':'kukuncha', 'Порошок':'kukun', 'Листовое':'varaq', 'Трансферный лист':'transfer varaq' };
const FORM_EN = { 'Хлопья':'flakes', 'Крошка':'crumbs', 'Порошок':'powder', 'Листовое':'leaf', 'Трансферный лист':'transfer leaf' };

function titles(p){
  const m = M[p.metal], S = serNorm(p.series);
  const leaf = p.form === 'Листовое', tr = p.form === 'Трансферный лист';
  let uz, en;
  if (leaf || tr) {
    uz = `Giusto Manetti Battiloro yeyiladigan ${m.uz}: ${tr ? 'transfer varaq, ' : ''}kitobchada ${wt(p.weight,'uz')}, «${S}» seriyasi`;
    en = `Giusto Manetti Battiloro edible ${m.en} ${tr ? 'transfer leaf' : 'leaf'}: booklet of ${wt(p.weight,'en')}, “${S}” series`;
  } else {
    uz = `Giusto Manetti Battiloro yeyiladigan ${m.uz}: ${FORM_UZ[p.form]} ${wt(p.weight,'uz')}, «${S}» seriyasi`;
    en = `Giusto Manetti Battiloro edible ${m.en}: ${FORM_EN[p.form]} ${wt(p.weight,'en')}, “${S}” series`;
  }
  return { ru: p.title, uz, en };
}

/* qisqa kirish matni (shakl bo'yicha) va pastki eslatma */
function lead(p){
  const m = M[p.metal];
  const U = m.uz[0].toUpperCase() + m.uz.slice(1), E = m.en[0].toUpperCase() + m.en.slice(1);
  const T = {
    'Хлопья': {
      ru:`Тонкие хлопья ${m.ruGen}. Ими посыпают торты, десерты, шоколад, канапе и коктейли: хлопья ложатся неровно и красиво блестят на свету.`,
      uz:`${U}ning yupqa parchalari. Tort, desert, shokolad, kanape va kokteyllar ustiga sepiladi: parchalar notekis tushib, yorugʻda chiroyli yaltiraydi.`,
      en:`Thin flakes of edible ${m.en}. Scatter them over cakes, desserts, chocolate, canapés and cocktails: they fall irregularly and catch the light.` },
    'Крошка': {
      ru:`Мелкая крошка ${m.ruGen} для точечного декора: края десертов, пралине, макаронс, глазурь. Ложится ровнее хлопьев и хорошо держится на влажной поверхности.`,
      uz:`${U}ning mayda kukunchasi nuqtali bezak uchun: desert chetlari, pralin, makaron, glazur. Parchaga qaraganda tekisroq tushadi va nam yuzada yaxshi turadi.`,
      en:`Fine crumbs of edible ${m.en} for detailed decoration: dessert edges, pralines, macarons, glazes. Settles more evenly than flakes and holds well on moist surfaces.` },
    'Порошок': {
      ru:`Пудра ${m.ruGen} для сплошного мерцающего покрытия. Наносится сухой кистью или распылением, подходит для шоколада, глазури, напитков и коктейлей.`,
      uz:`${U} kukuni yaxlit yaltiroq qoplama uchun. Quruq moʻyqalam yoki purkash bilan suriladi; shokolad, glazur, ichimlik va kokteyllarga mos.`,
      en:`${E} powder for an even, shimmering coat. Apply with a dry brush or by spraying; suits chocolate, glazes, drinks and cocktails.` },
    'Листовое': {
      ru:`Листы ${m.ruGen} в книжке для покрытия целых поверхностей: торты, конфеты, фрукты, блюда высокой кухни. Лист переносят пинцетом или кистью.`,
      uz:`Kitobchadagi ${m.uz} varaqlari butun yuzani qoplash uchun: tort, konfet, meva, yuqori oshxona taomlari. Varaq qisqich yoki moʻyqalam bilan koʻchiriladi.`,
      en:`A booklet of edible ${m.en} leaf to cover whole surfaces: cakes, sweets, fruit, fine-dining dishes. Lift each sheet with tweezers or a brush.` },
    'Трансферный лист': {
      ru:`Трансферные листы ${m.ruGen} на бумажной подложке: лист прижимают к поверхности и снимают бумагу. Ровное покрытие даже без опыта работы с сусальным металлом.`,
      uz:`Qogʻoz asosdagi ${m.uz} transfer varaqlari: varaqni yuzaga bosib, qogʻozini olib tashlaysiz. Zarhal bilan ishlash tajribasi boʻlmasa ham tekis qoplama beradi.`,
      en:`Transfer sheets of edible ${m.en} on backing paper: press the sheet onto the surface and peel the paper away. An even coat with no leaf-gilding experience needed.` },
  }[p.form];
  const note = p.metal === 'gold'
    ? { ru:'Чистое пищевое золото 23 карата, без вкуса и запаха. Сертифицировано как пищевой краситель E175.',
        uz:'Toza 23 karatli yeyiladigan oltin, taʼmi va hidi yoʻq. E175 oziq-ovqat boʻyogʻi sifatida sertifikatlangan.',
        en:'Pure 23-carat edible gold, tasteless and odourless. Certified as food colouring E175.' }
    : { ru:'Чистое серебро, без вкуса и запаха. Сертифицировано как пищевой краситель E174.',
        uz:'Toza kumush, taʼmi va hidi yoʻq. E174 oziq-ovqat boʻyogʻi sifatida sertifikatlangan.',
        en:'Pure silver, tasteless and odourless. Certified as food colouring E174.' };
  return { T, note };
}

async function loadAll(){
  const prods = JSON.parse(await readFile(join(ROOT, 'assets', 'products.json'), 'utf8'));
  let texts = {};
  try { texts = JSON.parse(await readFile(join(ROOT, 'assets', 'product-texts.json'), 'utf8')); } catch (e) {}
  return { prods, texts };
}

/* ------------------------------------------------- ro'yxat sahifasi ----- */
const order = p => (p.form==='Листовое'||p.form==='Трансферный лист')
  ? -1 : parseFloat(String(p.weight||'0').replace(',','.'));
const sortByWeight = a => a.slice().sort((x,y)=>order(y)-order(x));

const QUALITY = [
  ['q1', '<path d="M12 3l8 4v5c0 4.6-3.3 8-8 9-4.7-1-8-4.4-8-9V7l8-4z"/><path d="M9.3 12.2l1.9 1.9 3.6-3.8"/>'],
  ['q2', '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 9.5h.01M15.5 9.5h.01M8.5 15h7"/>'],
  ['q3', '<path d="M4 12c2.5-4 5.2-6 8-6s5.5 2 8 6c-2.5 4-5.2 6-8 6s-5.5-2-8-6z"/><path d="M4 4l16 16"/>'],
  ['q4', '<path d="M12 3c3 4 6 6.6 6 10a6 6 0 01-12 0c0-3.4 3-6 6-10z"/>'],
  ['q5', '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>'],
  ['q6', '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-2.4 5 2.4-1.5-7.5"/>'],
];

export async function buildProducts() {
  const { prods } = await loadAll();
  const gold = sortByWeight(prods.filter(x=>x.metal==='gold'));
  const silver = sortByWeight(prods.filter(x=>x.metal==='silver'));
  const chip = (f, key, ru, on) => `<button type="button" class="chip" data-f="${f}" aria-pressed="${on?'true':'false'}"><span data-t="${key}">${ru}</span><i>${f==='all' ? prods.length : prods.filter(p=>formGroup(p.form)===f).length}</i></button>`;

  const body = `<main>

  <section class="film phero phero--light">
    <picture><source srcset="assets/img/wp/1.webp" type="image/webp"><img class="film__m film__m--poster"
         src="assets/img/wp/1.jpg" alt="" fetchpriority="high"></picture>
    <div class="film__veil"></div>
    <div class="wrap film__in">
      <span class="eyebrow" data-t="pr.eye">Пищевое золото и серебро</span>
      <h1 class="d2" data-t="pr.h">Продукция</h1>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <p class="lede rv" data-t="pr.p">Съедобное золото и серебро Giusto Manetti Battiloro: лист, хлопья, крошка и пудра в сериях от профессиональной кухни до подарочного формата. Без вкуса и запаха, сертифицировано как краситель E175 (золото) и E174 (серебро).</p>
      <p class="pr-note rv d-1" data-t="pr.note">Цены — по запросу. Напишите, какие позиции и объём нужны, и мы подготовим предложение.</p>

      <div class="qual rv">
        <span class="eyebrow" data-t="ql.eye">Параметры качества</span>
        <ul class="qual__g">
${QUALITY.map(([k, svg]) => `          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${svg}</svg><span data-t="ql.${k}"></span></li>`).join('\n')}
        </ul>
      </div>
    </div>
  </section>

  <div class="pfil" id="filtr">
    <div class="wrap pfil__in">
      <span class="pfil__l" data-t="pr.filter">Форма</span>
      <div class="pfil__c" role="group">
        ${chip('all','pr.all','Все',true)}
        ${chip('flakes','pf.flakes','Хлопья')}
        ${chip('crumbs','pf.crumbs','Крошка')}
        ${chip('powder','pf.powder','Порошок')}
        ${chip('leaf','pf.leaf','Листовое')}
      </div>
    </div>
  </div>

  <section class="sec sec--mist sec--tight psec" data-metal="gold">
    <div class="wrap">
      <div class="psec__h">
        <span class="eyebrow rv" id="gold" data-t="pr.gold">Пищевое золото</span>
        <span class="psec__n rv"><b>${gold.length}</b> <span data-t="pr.items">позиций</span></span>
      </div>
      <span class="flour rv"></span>
      <div class="pgrid" style="margin-top:clamp(1.6rem,3vw,2.4rem)">
${gold.map(card).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec sec--tight psec" data-metal="silver">
    <div class="wrap">
      <div class="psec__h">
        <span class="eyebrow rv" id="silver" data-t="pr.silver">Пищевое серебро</span>
        <span class="psec__n rv"><b>${silver.length}</b> <span data-t="pr.items">позиций</span></span>
      </div>
      <span class="flour rv"></span>
      <div class="pgrid" style="margin-top:clamp(1.6rem,3vw,2.4rem)">
${silver.map(card).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec sec--navy sec--tight">
    <div class="wrap center">
      <p class="lede rv" style="color:rgba(243,235,217,.84);margin-inline:auto" data-t="pr.ask">Нужны съедобное золото или серебро для ресторана, кондитерской или бара? Напишите — подберём серию и формат, назовём цену.</p>
      <p class="rv d-1" style="margin-top:1.8rem"><a class="btn btn--light" href="aloqa.html" data-t="cta.quote">Запросить прайс</a></p>
    </div>
  </section>

</main>
<script>window.TXT_X=${JSON.stringify(weightKeys(prods)).replace(/</g,'\\u003c')}</script>
`;
  await writeFile(join(ROOT, 'src', 'mahsulotlar.html'), body, 'utf8');
  return { gold: gold.length, silver: silver.length, total: prods.length };
}

/* ------------------------------------- har mahsulotning alohida sahifasi -- */
export async function productPages() {
  const { prods, texts } = await loadAll();
  const famOf = s => serNorm(s).split(' · ')[0];
  return prods.map(p => {
    const t = titles(p), { T, note } = lead(p), m = M[p.metal];
    const metalKey = p.metal === 'gold' ? 'pr.gold' : 'pr.silver';
    const metalRu  = p.metal === 'gold' ? 'Пищевое золото' : 'Пищевое серебро';

    /* galereya: eski saytdagi barcha rasmlar; bo'lmasa asosiy rasm */
    let gal = (p.gallery || []).filter(g => existsSync(join(ROOT, 'assets', 'img', 'shop', 'g', g + '.jpg')))
      .map(g => ({ src: `assets/img/shop/g/${g}.jpg`, wh: jpgSize(join(ROOT, 'assets', 'img', 'shop', 'g', g + '.jpg')) }));
    if (!gal.length) gal = [{ src: `assets/img/shop/${p.id}.jpg`, wh: jpgSize(join(ROOT, 'assets', 'img', 'shop', p.id + '.jpg')) }];
    const alt = esc(p.title);
    const multi = gal.length > 1;
    const galHtml = `<div class="pg rv">
          <button class="pg__main${multi ? '' : ' pg__src'}" type="button" aria-label="Zoom">
            <img src="${gal[0].src}" width="${gal[0].wh[0]}" height="${gal[0].wh[1]}" alt="${alt}" data-full="${gal[0].src}" fetchpriority="high">
            <span class="pg__z" aria-hidden="true">${ZOOM}</span>
          </button>${multi ? `
          <div class="pg__th">
${gal.map((g, i) => `            <button class="pg__src" type="button" aria-label="${i+1}" aria-current="${i===0?'true':'false'}"><img src="${g.src}" data-full="${g.src}" data-w="${g.wh[0]}" data-h="${g.wh[1]}" alt="" loading="lazy" decoding="async"></button>`).join('\n')}
          </div>` : ''}
        </div>`;

    /* sahifaga xos matnlar (3 tilda) */
    const X = { ru:{}, uz:{}, en:{} };
    for (const l of LANGS) {
      X[l]['pd.h'] = t[l];
      X[l]['pd.title'] = t[l] + ' · Giusto Manetti Battiloro';
      X[l]['pd.d'] = T[l];
      X[l]['pd.note'] = note[l];
    }
    const sz = sizeT(p.size), pk = packT(p.pack);
    if (sz) for (const l of LANGS) X[l]['pd.sizev'] = sz[l];
    if (pk) for (const l of LANGS) X[l]['pd.packv'] = pk[l];
    const used = [...(p.desc || []), ...(p.feats || [])].filter(k => texts[k]);
    for (const k of used) for (const l of LANGS) X[l][k] = texts[k][l];

    /* o'xshashlar: shu metall, avval shu shakl, keyin shu seriya */
    const rel = prods.filter(x => x.metal === p.metal && x.id !== p.id)
      .map(x => [x, (x.form === p.form ? 2 : 0) + (famOf(x.series) === famOf(p.series) ? 1 : 0)])
      .sort((a,b) => b[1] - a[1]).slice(0, 4).map(a => a[0]);
    const wk = weightKeys([p, ...rel]);
    for (const l of LANGS) Object.assign(X[l], wk[l]);

    const row = (k, ru, v, cls='') => `            <div${cls ? ` class="${cls}"` : ''}><dt data-t="${k}">${ru}</dt>${v}</div>`;
    const spec = [
      row('pd.metal', 'Металл', `<dd data-t="${p.metal === 'gold' ? 'pd.goldm' : 'pd.silv'}">${p.metal === 'gold' ? 'Золото 23 карата' : 'Серебро'}</dd>`),
      row('pd.form', 'Форма', `<dd data-t="${formKey[p.form]||'pf.leaf'}">${p.form}</dd>`),
      row('pd.weight', 'Фасовка', `<dd data-t="${wKey(p.weight)}">${p.weight}</dd>`),
      row('pd.series', 'Серия', `<dd>${esc(serNorm(p.series))}</dd>`),
      sz ? row(sz.key, sz.key === 'pd.leafsize' ? 'Размер листа' : 'Размер частиц', `<dd data-t="pd.sizev">${sz.ru}</dd>`) : '',
      pk ? row('pd.pack', 'Упаковка', `<dd data-t="pd.packv">${pk.ru}</dd>`) : '',
      row('pd.code', 'Пищевой краситель', `<dd>${m.E}</dd>`),
      row('pd.made', 'Производитель', `<dd data-t="pd.madev">Giusto Manetti Battiloro, Флоренция, Италия</dd>`),
      p.sku ? row('pd.sku', 'Артикул', `<dd>${esc(p.sku)}</dd>`) : '',
      row('pd.price', 'Цена', `<dd data-t="pd.pricev">По запросу</dd>`, 'pd__price'),
    ].filter(Boolean).join('\n');

    const descP = (p.desc || []).filter(k => texts[k]).map(k => `          <p data-t="${k}">${esc(texts[k].ru)}</p>`).join('\n');
    const feats = (p.feats || []).filter(k => texts[k]).map(k => `            <li>${CHECK}<span data-t="${k}">${esc(texts[k].ru)}</span></li>`).join('\n');
    const about = (descP || feats) ? `
  <section class="sec sec--mist pdx">
    <div class="wrap pdx__in">
      <div class="pdx__d rv">
        <span class="eyebrow" data-t="pd.about">О продукте</span>
        <h2 class="d3" data-t="pd.abouth">Описание</h2>
        <span class="flour"></span>
        <div class="pdx__txt">
${descP}
          <p class="pdx__use"><b data-t="pd.use">Назначение</b> <span data-t="pd.usev">Для украшения поверхности кондитерских изделий, блюд, десертов и напитков.</span></p>
        </div>
      </div>${feats ? `
      <div class="pdx__f rv d-1">
        <h3 data-t="pd.feats">Особенности</h3>
        <ul class="pdx__l">
${feats}
        </ul>
      </div>` : ''}
    </div>
  </section>
` : '';

    const body = `<main>

  <section class="sec pdp">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="index.html" data-t="nav.home">Главная</a><span aria-hidden="true">/</span>
        <a href="mahsulotlar.html" data-t="nav.prod">Продукция</a><span aria-hidden="true">/</span>
        <a href="mahsulotlar.html#${p.metal}" data-t="${metalKey}">${metalRu}</a>
      </nav>

      <div class="pd">
        ${galHtml}

        <div class="pd__t rv d-1">
          <span class="eyebrow" data-t="${metalKey}">${metalRu}</span>
          <h1 class="pd__h" data-t="pd.h">${alt}</h1>
          <div class="pd__tags">
            <span class="tag tag--${p.metal}">${esc(serNorm(p.series))}</span>
            <span class="tag" data-t="${formKey[p.form]||'pf.leaf'}">${p.form}</span>
            <span class="tag" data-t="${wKey(p.weight)}">${p.weight}</span>
          </div>
          <p class="pd__lead" data-t="pd.d">${T.ru}</p>

          <dl class="pd__spec">
${spec}
          </dl>

          <div class="pd__cta">
            <a class="btn btn--fill" href="aloqa.html#form" data-prod="${p.metal}" data-t="pd.ask">Узнать цену</a>
            <a class="btn" href="https://t.me/manettiuz" target="_blank" rel="noopener" data-t="pd.tg">Написать в Telegram</a>
          </div>
          <ul class="pd__trust">
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 4.6-3.3 8-8 9-4.7-1-8-4.4-8-9V7l8-4z"/><path d="M9.3 12.2l1.9 1.9 3.6-3.8"/></svg><span data-t="mk.1">Производство Made in Italy</span></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-2.4 5 2.4-1.5-7.5"/></svg><span data-t="pd.note">${note.ru}</span></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="13" height="9" rx="1"/><path d="M15 10h4l3 3v3h-7zM6.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM18 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z"/></svg><span data-t="mk.3">Доставка по Узбекистану</span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>
${about}
  <section class="sec sec--tight">
    <div class="wrap">
      <span class="eyebrow rv" data-t="pd.rel">Похожие товары</span>
      <span class="flour rv"></span>
      <div class="pgrid pgrid--4" style="margin-top:clamp(1.6rem,3vw,2.4rem)">
${rel.map(card).join('\n')}
      </div>
    </div>
  </section>

</main>

<div class="lb" role="dialog" aria-modal="true" aria-label="Фото">
  <button class="lb__x" type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <button class="lb__p" type="button" aria-label="Prev"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
  <button class="lb__n" type="button" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
  <img decoding="async" alt="">
</div>
<script>window.TXT_X=${JSON.stringify(X).replace(/</g,'\\u003c')}</script>
`;
    return {
      id: p.id,
      title: t.ru + ' · Giusto Manetti Battiloro',
      desc: t.ru + '. ' + T.ru + ' Цена по запросу, поставки по Узбекистану.',
      ogimg: gal[0].src,
      body,
    };
  });
}

// to'g'ridan-to'g'ri ishga tushirilsa
if (import.meta.url === `file://${process.argv[1].replace(/\\/g,'/')}`) {
  const r = await buildProducts();
  console.log(`src/mahsulotlar.html yangilandi: ${r.gold} oltin + ${r.silver} kumush = ${r.total} karta`);
}
