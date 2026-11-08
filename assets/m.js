/* ============================================================================
   Giusto Manetti Battiloro UZ · umumiy mantiq (barcha sahifalar uchun)
   ========================================================================== */
(function () {
"use strict";

document.documentElement.classList.remove("nojs");

var TG = "https://t.me/manettiuz";

/* ------------------------------------------------------------ 1. til ----- */
var lang = (function () {
  try { var s = localStorage.getItem("gm-lang"); if (s && window.TXT && window.TXT[s]) return s; } catch (e) {}
  return "ru";
})();

function t(k) {
  var d = (window.TXT && window.TXT[lang]) || (window.TXT && window.TXT.ru) || {};
  if (k in d) return d[k];
  return (window.TXT && window.TXT.ru && window.TXT.ru[k]) || "";
}

function applyLang() {
  if (!window.TXT || !window.TXT[lang]) return;
  var d = window.TXT[lang];
  document.documentElement.lang = lang;

  var pageKey = document.body.getAttribute("data-page-title");
  if (pageKey && d[pageKey]) document.title = d[pageKey];

  document.querySelectorAll("[data-t]").forEach(function (el) {
    var v = d[el.getAttribute("data-t")];
    if (v === undefined) return;
    if (v.indexOf("<") > -1) el.innerHTML = v; else el.textContent = v;
  });
  document.querySelectorAll("[data-tph]").forEach(function (el) {
    var v = d[el.getAttribute("data-tph")];
    if (v !== undefined) el.placeholder = v;
  });

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
  });

  try { localStorage.setItem("gm-lang", lang); } catch (e) {}
}

document.addEventListener("click", function (e) {
  var b = e.target.closest(".lang button[data-lang]");
  if (!b) return;
  lang = b.getAttribute("data-lang");
  applyLang();
});

/* ------------------------------------------------------- 2. sarlavha ---- */
var hdr = document.querySelector(".hdr");
function onScroll() { if (hdr) hdr.classList.toggle("stuck", window.scrollY > 10); }
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

var burger = document.querySelector(".burger");
if (burger) {
  burger.addEventListener("click", function () {
    var on = !document.body.classList.contains("menu");
    document.body.classList.toggle("menu", on);
    document.body.classList.toggle("lock", on);
    burger.setAttribute("aria-expanded", on ? "true" : "false");
  });
  var dr = document.querySelector(".drawer");
  if (dr) dr.addEventListener("click", function (e) {
    if (e.target.closest("a")) {
      document.body.classList.remove("menu", "lock");
      burger.setAttribute("aria-expanded", "false");
    }
  });
}

/* joriy sahifani menyuda belgilash */
(function () {
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a, .drawer a").forEach(function (a) {
    var h = (a.getAttribute("href") || "").split("#")[0];
    if (h && h === here) a.setAttribute("aria-current", "page");
  });
})();

/* ------------------------------------------------------- 3. ko'rinish --- */
/* Skroll bo'yicha tekshiramiz: kuzatuvchi ba'zan sahifa ochilganda
   ishlamaydi va matn ko'rinmay qoladi. */
var rv = [].slice.call(document.querySelectorAll(".rv"));
function checkRv() {
  var h = window.innerHeight || 800;
  for (var i = rv.length - 1; i >= 0; i--) {
    var r = rv[i].getBoundingClientRect();
    if (r.top < h * 0.93 && r.bottom > -40) { rv[i].classList.add("in"); rv.splice(i, 1); }
  }
}
var queued = false;
function tick() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(function () { queued = false; checkRv(); });
}
window.addEventListener("scroll", tick, { passive: true });
window.addEventListener("resize", tick);
window.addEventListener("load", checkRv);
document.addEventListener("visibilitychange", checkRv);
[0, 120, 400, 1000].forEach(function (ms) { setTimeout(checkRv, ms); });

/* ----------------------------------------------------------- 4. film ---- */
/* Har bir .film ichida poster bor va u sekin suriladi. Agar yonida
   haqiqiy video fayl bo'lsa, u yuklanib posterning ustiga chiqadi.
   Video fayl yo'q bo'lsa, hech narsa buzilmaydi. */
/* Telefonlar video haqida o'jar: iOS "canplay" ni umuman bermasligi,
   Android esa birinchi play() ni rad etishi mumkin. Shuning uchun:
   darhol o'ynatishga urinamiz, bir necha hodisada qayta urinamiz va
   oxirgi chora sifatida odamning birinchi tegishini kutamiz. */
var waiting = [];   /* autoplay rad etilgan videolar */

function armGesture() {
  if (armGesture.done) return;
  armGesture.done = true;
  var retry = function () {
    waiting.splice(0).forEach(function (v) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  };
  ["touchstart", "pointerdown", "scroll", "keydown"].forEach(function (e) {
    window.addEventListener(e, retry, { once: true, passive: true });
  });
}

function attachClip(f) {
  var src = f.getAttribute("data-clip");
  if (!src) return;

  var v = document.createElement("video");
  v.className = "film__m film__m--clip";
  /* iOS uchun bular src qo'yilishidan OLDIN atribut sifatida turishi shart */
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  v.setAttribute("autoplay", "");
  v.setAttribute("loop", "");
  v.muted = true; v.defaultMuted = true; v.loop = true;
  v.playsInline = true; v.autoplay = true;
  v.preload = "auto";

  function show() { if (v.currentTime > 0 && !v.paused) f.classList.add("playing"); }

  function tryPlay() {
    var p = v.play();
    if (p && p.catch) p.catch(function (e) {
      /* AbortError = keyingi urinish uzib yubordi, bu xato emas */
      if (e && e.name === "AbortError") return;
      if (waiting.indexOf(v) < 0) waiting.push(v);
      armGesture();
    });
  }

  v.addEventListener("loadeddata", tryPlay);
  v.addEventListener("canplay", tryPlay);
  v.addEventListener("playing", show);
  v.addEventListener("timeupdate", show);
  v.addEventListener("error", function () { f.classList.remove("playing"); });

  v.src = src;
  f.insertBefore(v, f.querySelector(".film__veil"));
  tryPlay();
}

/* assets/video/clips.json dagi ro'yxatdagi fayllargina qo'yiladi, shuning
   uchun video hali yuklanmagan bo'lsa konsolda xato chiqmaydi. */
(function () {
  var films = [].slice.call(document.querySelectorAll(".film[data-clip]"));
  if (!films.length || !window.fetch) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (navigator.connection && navigator.connection.saveData) return;

  fetch("assets/video/clips.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      if (!Array.isArray(list) || !list.length) return;
      var have = {};
      list.forEach(function (n) { have[String(n).split("/").pop()] = 1; });

      /* Kichik ekranda yengil nusxa bor bo'lsa, o'shani olamiz:
         hero.mp4 -> hero-m.mp4 */
      var small = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;

      var pending = [];
      films.forEach(function (f) {
        var path = f.getAttribute("data-clip") || "";
        var name = path.split("/").pop();
        if (small) {
          var m = name.replace(/\.(mp4|webm)$/i, "-m.$1");
          if (have[m]) { f.setAttribute("data-clip", path.replace(name, m)); pending.push(f); return; }
        }
        if (have[name]) pending.push(f);
      });
      if (!pending.length) return;

      /* Bir sahifada bir nechta video bo'lishi mumkin. Hammasini birdan
         yuklash trafikni behuda yeydi, shuning uchun har biri ekranga
         yaqinlashganda yuklanadi. Birinchisi darhol. */
      function pump() {
        var h = window.innerHeight || 800;
        for (var i = pending.length - 1; i >= 0; i--) {
          var r = pending[i].getBoundingClientRect();
          if (r.top < h * 1.5 && r.bottom > -h * 0.5) {
            attachClip(pending[i]);
            pending.splice(i, 1);
          }
        }
        if (!pending.length) window.removeEventListener("scroll", onPump);
      }
      var pumping = false;
      function onPump() {
        if (pumping) return;
        pumping = true;
        requestAnimationFrame(function () { pumping = false; pump(); });
      }
      window.addEventListener("scroll", onPump, { passive: true });
      window.addEventListener("resize", onPump);
      pump();
    })
    .catch(function () {});
})();

/* ------------------------------------------------------- 5. galereya ---- */
var lb = document.querySelector(".lb");
if (lb) {
  var lbImg = lb.querySelector("img"), items = [].slice.call(document.querySelectorAll(".gi")), idx = 0;
  function open(i) {
    idx = (i + items.length) % items.length;
    var im = items[idx].querySelector("img");
    lbImg.src = im.getAttribute("data-full") || im.src;
    lbImg.alt = im.alt || "";
    lb.classList.add("on"); document.body.classList.add("lock");
  }
  function close() { lb.classList.remove("on"); document.body.classList.remove("lock"); lbImg.removeAttribute("src"); }
  items.forEach(function (el, i) { el.addEventListener("click", function () { open(i); }); });
  lb.querySelector(".lb__x").addEventListener("click", close);
  lb.querySelector(".lb__p").addEventListener("click", function () { open(idx - 1); });
  lb.querySelector(".lb__n").addEventListener("click", function () { open(idx + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("on")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") open(idx - 1);
    if (e.key === "ArrowRight") open(idx + 1);
  });
}

/* ---------------------------------------------------------- 6. forma ---- */
var form = document.getElementById("form");
if (form) {
  var ok = document.getElementById("ok"), send = document.getElementById("send"), busy = false;
  function say(k) { ok.textContent = t(k); ok.classList.add("on"); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var el = form.elements;
    var data = {
      name: el.name.value.trim(),
      phone: el.phone.value.trim(),
      interest: el.interest ? el.interest.value : "",
      message: el.message ? el.message.value.trim() : "",
      website: el.website ? el.website.value : "",
      lang: lang,
      page: (location.hostname || "local") + location.pathname
    };
    if (!data.name || !data.phone) { say("f.err"); return; }

    var text = "Giusto Manetti, " +
      (lang === "uz" ? "yangi ariza" : lang === "en" ? "new request" : "новая заявка") + "\n" +
      data.name + "\n" + data.phone + (data.interest ? "\n" + data.interest : "") +
      (data.message ? "\n" + data.message : "");

    busy = true; send.disabled = true;
    function done(sent) {
      if (!busy) return;
      busy = false; send.disabled = false;
      if (sent) { say("f.ok"); form.reset(); }
      else {
        try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (err) {}
        say("f.ok2");
        window.open(TG, "_blank", "noopener");
      }
    }
    if (!window.fetch) { done(false); return; }
    var timer = setTimeout(function () { done(false); }, 12000);
    fetch("send.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { clearTimeout(timer); done(!!(j && j.ok)); })
      .catch(function () { clearTimeout(timer); done(false); });
  });
}

/* ------------------------------------------------------------- boshla --- */
applyLang();
checkRv();

})();
