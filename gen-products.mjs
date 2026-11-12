/* Mahsulotlar sahifasini ma'lumotdan yig'adi:
   assets/products.json  ->  src/mahsulotlar.html

   YANGI MAHSULOT QO'SHISH:
   1) Rasmni assets/img/shop/ ga qo'ying, nomi <id>.jpg (masalan 900.jpg).
      (webp'ni ham qo'ying yoki node gen-products.mjs --img bilan yasang.)
   2) assets/products.json ga bitta yangi qator qo'shing:
      { "id":"900", "metal":"gold", "form":"Хлопья", "weight":"5 г",
        "series":"Gold Chef", "title":"..." }
      metal: "gold" yoki "silver"
      form:  Хлопья | Крошка | Порошок | Листовое | Трансферный лист
   3) node gen-products.mjs   (yoki node build.mjs — u o'zi chaqiradi)

   Ishga tushirish: node gen-products.mjs */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));

const formKey = {
  'Хлопья':'pf.flakes', 'Крошка':'pf.crumbs', 'Порошок':'pf.powder',
  'Листовое':'pf.leaf', 'Трансферный лист':'pf.transfer',
};
function serNorm(s){
  const m = {
    'INDUSTRIAL':'Industrial','Industrial':'Industrial','BUSINESS':'Business','LUXURY':'Luxury',
    'Gold Chef':'Gold Chef','Gold Chef Professional':'Gold Chef · Professional',
    'Gold Chef Family & Friends':'Gold Chef · Family & Friends','Gold Chef You & Me':'Gold Chef · You & Me',
  };
  return m[s] || s;
}
function card(p){
  const alt = (p.title || '').replace(/"/g,'');
  return `        <article class="pcard rv">
          <div class="pcard__i"><picture><source srcset="assets/img/shop/${p.id}.webp" type="image/webp"><img decoding="async" src="assets/img/shop/${p.id}.jpg" alt="${alt}" loading="lazy"></picture></div>
          <div class="pcard__b">
            <h3 data-t="${formKey[p.form]||'pf.leaf'}">${p.form}</h3>
            <p class="pcard__m">${p.weight||''}</p>
            <span class="pcard__s">${serNorm(p.series)}</span>
          </div>
        </article>`;
}
const order = p => (p.form==='Листовое'||p.form==='Трансферный лист')
  ? -1 : parseFloat(String(p.weight||'0').replace(',','.'));
const sortByWeight = a => a.slice().sort((x,y)=>order(y)-order(x));

export async function buildProducts() {
  const prods = JSON.parse(await readFile(join(ROOT, 'assets', 'products.json'), 'utf8'));
  const gold = sortByWeight(prods.filter(x=>x.metal==='gold'));
  const silver = sortByWeight(prods.filter(x=>x.metal==='silver'));

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
      <p class="lede rv" data-t="pr.p">Съедобное золото и серебро 24K Giusto Manetti Battiloro: лист, хлопья, крошка и пудра в сериях от профессиональной кухни до подарочного формата. Без вкуса и запаха, сертифицировано как краситель E175 (золото) и E174 (серебро).</p>
      <p class="pr-note rv d-1" data-t="pr.note">Цены — по запросу. Напишите, какие позиции и объём нужны, и мы подготовим предложение.</p>
    </div>
  </section>

  <section class="sec sec--mist sec--tight">
    <div class="wrap">
      <span class="eyebrow rv" data-t="pr.gold">Пищевое золото</span>
      <span class="flour rv"></span>
      <div class="pgrid" style="margin-top:clamp(1.6rem,3vw,2.4rem)">
${gold.map(card).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec sec--tight">
    <div class="wrap">
      <span class="eyebrow rv" data-t="pr.silver">Пищевое серебро</span>
      <span class="flour rv"></span>
      <div class="pgrid" style="margin-top:clamp(1.6rem,3vw,2.4rem)">
${silver.map(card).join('\n')}
      </div>
    </div>
  </section>

  <section class="sec sec--navy sec--tight">
    <div class="wrap center">
      <p class="lede rv" style="color:rgba(243,235,217,.84)" data-t="pr.ask">Нужны съедобное золото или серебро для ресторана, кондитерской или бара? Напишите — подберём серию и формат, назовём цену.</p>
      <p class="rv d-1" style="margin-top:1.8rem"><a class="btn btn--light" href="aloqa.html" data-t="cta.quote">Запросить прайс</a></p>
    </div>
  </section>

</main>
`;
  await writeFile(join(ROOT, 'src', 'mahsulotlar.html'), body, 'utf8');
  return { gold: gold.length, silver: silver.length, total: prods.length };
}

// to'g'ridan-to'g'ri ishga tushirilsa
if (import.meta.url === `file://${process.argv[1].replace(/\\/g,'/')}`) {
  const r = await buildProducts();
  console.log(`src/mahsulotlar.html yangilandi: ${r.gold} oltin + ${r.silver} kumush = ${r.total} karta`);
}
