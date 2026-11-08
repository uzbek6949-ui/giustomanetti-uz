/* ============================================================
   Giusto Manetti Battiloro UZ — interface
   ============================================================ */
(function(){
"use strict";

document.documentElement.classList.add("js");

var U = "https://giustomanetti.uz/wp-content/uploads/";
var TG = "https://t.me/manettiuz";

/* ---------------- gallery data ---------------- */
var GALLERY = [
  {f:"2023/04/318441970_659079272609311_5423250635213597326_n.jpg", c:"art",
   t:{ru:"Золочёный свод",uz:"Zarhal gumbaz",en:"Gilded vault"}},
  {f:"2023/03/FamilyandFriends_BricioleOro_125mg_GoldChef.jpg", c:"meal",
   t:{ru:"Family & Friends · крошка золота",uz:"Family & Friends · oltin kukuncha",en:"Family & Friends · gold crumbs"}},
  {f:"2023/04/doratura-guazzo-09b.jpg", c:"art",
   t:{ru:"Золочение на гуаши",uz:"Guash ustiga zarhallash",en:"Water gilding"}},
  {f:"2023/03/YouandMe_FiocchiOro_70mg_GoldChef-2.jpg", c:"meal",
   t:{ru:"You & Me · хлопья золота",uz:"You & Me · oltin parcha",en:"You & Me · gold flakes"}},
  {f:"2023/04/339082312_556441016580232_7505775647288178963_n.jpg", c:"meal",
   t:{ru:"Лист золота",uz:"Oltin varaq",en:"Gold leaf"}},
  {f:"2023/04/338945148_701283681743039_5602948183976581643_n.jpg", c:"art",
   t:{ru:"Золочёный декор",uz:"Zarhal bezak",en:"Gilded moulding"}},
  {f:"2023/03/FamilyandFriends_FiocchiArgento_125mg_GoldChef.jpg", c:"meal",
   t:{ru:"Серебро · хлопья",uz:"Kumush · parcha",en:"Silver · flakes"}},
  {f:"2023/04/335619433_602474445083349_8487305094300901548_n.jpg", c:"art",
   t:{ru:"Работа с листом",uz:"Varaq bilan ish",en:"Handling the leaf"}},
  {f:"2023/03/HoReCa_FogliaOro_86x86_GoldChef-250x250-1.jpg", c:"meal",
   t:{ru:"HoReCa · листовое золото",uz:"HoReCa · varaq oltin",en:"HoReCa · gold leaf"}},
  {f:"2023/03/Painting-19.jpg", c:"art",
   t:{ru:"Живопись и золото",uz:"Rangtasvir va oltin",en:"Painting and gold"}},
  {f:"2023/03/YouandMe_PolvereOro_70mg_GoldChef.jpg", c:"meal",
   t:{ru:"You & Me · золотая пудра",uz:"You & Me · oltin kukun",en:"You & Me · gold powder"}},
  {f:"2023/04/281206986_494217679095472_6650986242160134581_n.jpg", c:"art",
   t:{ru:"Рулон золота",uz:"Oltin rulon",en:"Roll of gold"}},
  {f:"2023/03/YouandMe_PolvereArgento_70mg_GoldChef.jpg", c:"meal",
   t:{ru:"You & Me · серебряная пудра",uz:"You & Me · kumush kukun",en:"You & Me · silver powder"}},
  {f:"2023/04/339085209_246632281062227_5718447731985706737_n.jpg", c:"art",
   t:{ru:"Кисть мастера",uz:"Usta moʻyqalami",en:"The gilder's brush"}},
  {f:"2023/03/FamilyandFriends_PolvereOro_125mg_GoldChef-1.jpg", c:"meal",
   t:{ru:"Family & Friends · пудра",uz:"Family & Friends · kukun",en:"Family & Friends · powder"}},
  {f:"2023/04/img_2204-web-scaled-1.jpg", c:"art",
   t:{ru:"Листы в книжке",uz:"Daftardagi varaqlar",en:"Leaves in the booklet"}},
  {f:"2023/04/325457552_870209980846479_2453210287706325859_n.jpg", c:"meal",
   t:{ru:"Фирменные книжки",uz:"Firma daftarlari",en:"Branded booklets"}},
  {f:"2023/03/25.jpg", c:"art",
   t:{ru:"Фактура золота",uz:"Oltin faktura",en:"Texture of gold"}}
];

/* ---------------- i18n ---------------- */
var lang = (function(){
  try{ var s = localStorage.getItem("gm-lang"); if(s && window.I18N[s]) return s; }catch(e){}
  return "ru";
})();

function t(k){ var d = window.I18N[lang] || window.I18N.ru; return (k in d) ? d[k] : (window.I18N.ru[k] || ""); }

function applyLang(){
  var d = window.I18N[lang];
  if(!d) return;
  document.documentElement.lang = lang;
  if(d["doc.title"]) document.title = d["doc.title"];

  document.querySelectorAll("[data-t]").forEach(function(el){
    var v = d[el.getAttribute("data-t")];
    if(v === undefined) return;
    if(v.indexOf("<") > -1) el.innerHTML = v; else el.textContent = v;
  });

  document.querySelectorAll("#lang button").forEach(function(b){
    b.classList.toggle("is-on", b.getAttribute("data-lang") === lang);
  });

  buildMarquee();
  renderGrid(curFilter);
  try{ localStorage.setItem("gm-lang", lang); }catch(e){}
}

document.getElementById("lang").addEventListener("click", function(e){
  var b = e.target.closest("button[data-lang]");
  if(!b) return;
  lang = b.getAttribute("data-lang");
  applyLang();
});

/* ---------------- marquee ---------------- */
function buildMarquee(){
  var words = ["Gold Chef","Foglia Oro","Argento","HoReCa","Doratura","Luxury","24K","Made in Italy","Firenze 1600","E175"];
  var one = words.map(function(w){ return "<span>" + w + "</span>"; }).join("");
  document.getElementById("marq").innerHTML = one + one;
}

/* ---------------- gallery ---------------- */
var curFilter = "all";
var visible = [];

function renderGrid(f){
  curFilter = f;
  var g = document.getElementById("grid");
  visible = GALLERY.filter(function(it){ return f === "all" || it.c === f; });
  g.innerHTML = visible.map(function(it, i){
    var cls = "gi";
    if(f === "all" && i === 0) cls += " gi--tall";
    if(f === "all" && i === 6) cls += " gi--wide";
    var cap = it.t[lang] || it.t.ru;
    return '<figure class="' + cls + '" data-i="' + i + '" style="animation-delay:' + (i * 35) + 'ms">' +
             '<img src="' + U + it.f + '" alt="' + cap + '" loading="lazy">' +
             '<span class="gi__z"><i><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5M11 8v6M8 11h6"/></svg></i></span>' +
           '</figure>';
  }).join("");
}

document.getElementById("filters").addEventListener("click", function(e){
  var b = e.target.closest("button[data-f]");
  if(!b) return;
  this.querySelectorAll("button").forEach(function(x){ x.classList.remove("is-on"); });
  b.classList.add("is-on");
  renderGrid(b.getAttribute("data-f"));
});

/* ---------------- lightbox ---------------- */
var lb = document.getElementById("lb"),
    lbImg = document.getElementById("lbImg"),
    lbC = document.getElementById("lbC"),
    idx = 0;

function openLb(i){
  idx = i;
  var it = visible[idx];
  if(!it) return;
  lbImg.src = U + it.f;
  lbC.textContent = (it.t[lang] || it.t.ru) + "  ·  " + (idx + 1) + "/" + visible.length;
  lb.classList.add("is-on");
  document.body.classList.add("no-scroll");
}
function closeLb(){ lb.classList.remove("is-on"); document.body.classList.remove("no-scroll"); lbImg.removeAttribute("src"); }
function step(d){ openLb((idx + d + visible.length) % visible.length); }

document.getElementById("grid").addEventListener("click", function(e){
  var fig = e.target.closest(".gi");
  if(fig) openLb(+fig.getAttribute("data-i"));
});
document.getElementById("lbX").onclick = closeLb;
document.getElementById("lbP").onclick = function(){ step(-1); };
document.getElementById("lbN").onclick = function(){ step(1); };
lb.addEventListener("click", function(e){ if(e.target === lb) closeLb(); });
document.addEventListener("keydown", function(e){
  if(!lb.classList.contains("is-on")) return;
  if(e.key === "Escape") closeLb();
  if(e.key === "ArrowLeft") step(-1);
  if(e.key === "ArrowRight") step(1);
});

/* ---------------- header / drawer ---------------- */
var hdr = document.getElementById("hdr"),
    toTop = document.getElementById("toTop"),
    burger = document.getElementById("burger"),
    drawer = document.getElementById("drawer");

function onScroll(){
  var y = window.scrollY;
  hdr.classList.toggle("is-stuck", y > 40);
  toTop.classList.toggle("is-on", y > 700);
}
window.addEventListener("scroll", onScroll, {passive:true});
onScroll();

function setMenu(on){
  document.body.classList.toggle("menu-open", on);
  document.body.classList.toggle("no-scroll", on);
  burger.setAttribute("aria-expanded", on ? "true" : "false");
}
burger.addEventListener("click", function(){ setMenu(!document.body.classList.contains("menu-open")); });
drawer.addEventListener("click", function(e){ if(e.target.closest("a")) setMenu(false); });

toTop.addEventListener("click", function(){ window.scrollTo({top:0, behavior:"smooth"}); });

/* ---------------- scrollspy ---------------- */
var spy = [].slice.call(document.querySelectorAll(".nav a[href^='#']"));
var secs = spy.map(function(a){ return document.querySelector(a.getAttribute("href")); });

function checkSpy(){
  var best = -1;
  for(var i = 0; i < secs.length; i++){
    var s = secs[i];
    if(s && s.getBoundingClientRect().top <= window.innerHeight * .4) best = i;
  }
  spy.forEach(function(a){ a.classList.remove("is-active"); });
  if(best > -1) spy[best].classList.add("is-active");
}

/* ---------------- reveal ----------------
   Проверка по скроллу, а не IntersectionObserver:
   работает и тогда, когда наблюдатель не срабатывает при загрузке. */
var rvEls = [].slice.call(document.querySelectorAll(".rv"));

function checkRv(){
  var h = window.innerHeight || 800;
  for(var i = rvEls.length - 1; i >= 0; i--){
    var r = rvEls[i].getBoundingClientRect();
    if(r.top < h * .94 && r.bottom > -40){
      rvEls[i].classList.add("in");
      rvEls.splice(i, 1);
    }
  }
}

var tick = false;
function onFrame(){
  if(tick) return;
  tick = true;
  requestAnimationFrame(function(){ tick = false; checkRv(); checkSpy(); });
}
window.addEventListener("scroll", onFrame, {passive:true});
window.addEventListener("resize", onFrame);
window.addEventListener("load", function(){ checkRv(); checkSpy(); });
document.addEventListener("visibilitychange", function(){ checkRv(); checkSpy(); });
[0, 120, 400, 1000].forEach(function(ms){ setTimeout(function(){ checkRv(); checkSpy(); }, ms); });

/* -------- «Запросить прайс» / «Academy» → подставить тему в форму -------- */
document.querySelectorAll("[data-ask]").forEach(function(a){
  a.addEventListener("click", function(){
    var want = a.getAttribute("data-ask") === "academy" ? 4 : 3; // 4 = Другое, 3 = Опт / HoReCa
    var sel = document.getElementById("fi");
    if(sel && sel.options[want]) sel.selectedIndex = want;
  });
});

/* ---------------- form ---------------- */
var form = document.getElementById("form"),
    fok  = document.getElementById("fok"),
    btn  = document.getElementById("fsend"),
    busy = false;

function say(key){ fok.textContent = t(key); fok.classList.add("is-on"); }

/* Запасной путь, если send.php недоступен: копируем заявку и открываем Telegram. */
function fallback(text){
  try{ if(navigator.clipboard) navigator.clipboard.writeText(text); }catch(err){}
  say("c.ok2");
  window.open(TG, "_blank", "noopener");
}

form.addEventListener("submit", function(e){
  e.preventDefault();
  if(busy) return;

  var el = form.elements;
  var data = {
    name:     el.name.value.trim(),
    phone:    el.phone.value.trim(),
    interest: el.interest.value,
    message:  el.message.value.trim(),
    website:  el.website ? el.website.value : "",
    lang:     lang,
    page:     location.hostname || "local"
  };

  if(!data.name || !data.phone){ say("c.err"); return; }

  var text = "Giusto Manetti — " +
             (lang === "uz" ? "yangi ariza" : lang === "en" ? "new request" : "новая заявка") + "\n" +
             "— " + data.name + "\n— " + data.phone + "\n— " + data.interest +
             (data.message ? "\n— " + data.message : "");

  busy = true;
  btn.style.opacity = ".55";

  function done(ok){
    if(!busy) return;
    busy = false;
    btn.style.opacity = "";
    if(ok){ say("c.ok"); form.reset(); } else { fallback(text); }
  }

  if(!window.fetch){ done(false); return; }

  var timer = setTimeout(function(){ done(false); }, 12000);

  fetch("send.php", {
    method:  "POST",
    headers: {"Content-Type": "application/json"},
    body:    JSON.stringify(data)
  })
  .then(function(r){ return r.ok ? r.json() : null; })
  .then(function(j){ clearTimeout(timer); done(!!(j && j.ok)); })
  .catch(function(){ clearTimeout(timer); done(false); });
});

/* ---------------- init ---------------- */
document.getElementById("yr").textContent = new Date().getFullYear();
applyLang();

})();
