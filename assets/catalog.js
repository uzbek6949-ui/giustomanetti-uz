/* ============================================================================
   Giusto Manetti Battiloro UZ · Manetti kataloglari varaqlagichi
   ----------------------------------------------------------------------------
   Sahifalar rasm ko'rinishida turadi: assets/katalog/<katalog>/pNNN.webp (katta)
   va tNNN.webp (kichik, "barcha sahifalar" va xira o'rinbosar uchun).
   Har qanday element  data-cat="gmb-2024" data-page="13"  bosilsa varaqlagich
   shu sahifada ochiladi. Havola orqali ham ochiladi:
       katalog.html?catalog=gmb-2024&page=13
   Klaviatura: <- -> PageUp PageDown Home End Esc. Telefonda surish, ikki
   marta tegish — kattalashtirish. Tik turgan telefonda 2024 katalogining
   ikki betli yoyilmalari yarmidan ko'rsatiladi.
   Matnlar assets/m-copy.js da (cat.*, ch.*, v.*).
   ========================================================================== */
(function () {
"use strict";

/* ------------------------------------------------------------ ma'lumot -- */
var CATS = {
  "gmb-2024": {
    id: "gmb-2024", title: "Catalogo 2024", dir: "gmb-2024", count: 80,
    pdf: "assets/katalog/pdf/giusto-manetti-catalogo-2024.pdf",
    /* 1-rasm old muqova, 80-rasm orqa muqova; qolganlari ikki betli yoyilma */
    size: function (i) { return (i === 1 || i === 80) ? [800, 1131] : [1600, 1131]; },
    toc: [["ch.prec", 8], ["ch.imit", 27], ["ch.guazzo", 37], ["ch.missione", 41], ["ch.fin", 47],
          ["ch.prot", 51], ["ch.tools", 59], ["ch.kolner", 74], ["ch.academy", 76]]
  },
  "belle-arti-2025": {
    id: "belle-arti-2025", title: "Belle Arti 2025", dir: "belle-arti-2025", count: 65,
    pdf: "assets/katalog/pdf/giusto-manetti-belle-arti-2025.pdf",
    size: function () { return [1000, 1414]; },
    toc: [["ch.prec", 9], ["ch.imit", 15], ["ch.guazzo", 23], ["ch.missione", 29], ["ch.fin", 35],
          ["ch.prot", 41], ["ch.brushes", 47], ["ch.burnish", 53], ["ch.academy", 63]]
  }
};

function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
function pageSrc(c, i) { return "assets/katalog/" + c.dir + "/p" + pad(i, 3) + ".webp"; }
function thumbSrc(c, i) { return "assets/katalog/" + c.dir + "/t" + pad(i, 3) + ".webp"; }
function isSpread(c, i) { var s = c.size(i); return s[0] > s[1]; }

/* ---------------------------------------------------------------- til --- */
function t(k) {
  var T = window.TXT || {}, l = document.documentElement.lang;
  var d = T[l] || T.ru || {};
  var v = d[k] !== undefined ? d[k] : ((T.ru || {})[k] || "");
  return String(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function translate(root) {
  [].forEach.call(root.querySelectorAll("[data-t]"), function (el) { el.textContent = t(el.getAttribute("data-t")); });
  [].forEach.call(root.querySelectorAll("[data-tl]"), function (el) {
    var v = t(el.getAttribute("data-tl"));
    el.setAttribute("aria-label", v); el.setAttribute("title", v);
  });
}

var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
var reduce = mm("(prefers-reduced-motion: reduce)").matches;
var narrowQ = mm("(max-width: 767px) and (orientation: portrait)");

/* ------------------------------------------------------------- DOM ------ */
var I = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
};

var E = null;      /* DOM havolalari (bir marta quriladi) */
var V = null;      /* ochiq katalog holati */
var hiTimer = 0, closeTimer = 0;

function build() {
  var r = document.createElement("div");
  r.className = "cv";
  r.hidden = true;
  r.setAttribute("role", "dialog");
  r.setAttribute("aria-modal", "true");
  r.innerHTML =
    '<div class="cv__bar">' +
      '<p class="cv__h"><span class="cv__t"></span><span class="cv__c" aria-live="polite"></span></p>' +
      '<div class="cv__tools">' +
        '<button type="button" class="cv__tool cv__tool--grid" aria-pressed="false">' + I.grid + '<span data-t="v.all"></span></button>' +
        '<button type="button" class="cv__tool cv__tool--zoom"><span class="cv__zi">' + I.plus + '</span><span class="cv__zl" data-t="v.zoom"></span></button>' +
        '<a class="cv__tool cv__tool--pdf" download>' + I.down + '<span>PDF</span></a>' +
        '<button type="button" class="cv__tool cv__tool--x" data-tl="v.close">' + I.x + '<span data-t="v.close"></span></button>' +
      '</div>' +
    '</div>' +
    '<div class="cv__main">' +
      '<div class="cv__stage"><div class="cv__box"><div class="cv__sheet">' +
        '<img class="cv__lo" alt="" aria-hidden="true" draggable="false">' +
        '<img class="cv__hi" alt="" draggable="false" decoding="async">' +
      '</div></div></div>' +
      '<button type="button" class="cv__arr cv__arr--p" data-tl="v.prev">' + I.prev + '</button>' +
      '<button type="button" class="cv__arr cv__arr--n" data-tl="v.next">' + I.next + '</button>' +
      '<div class="cv__grid" hidden></div>' +
    '</div>' +
    '<div class="cv__foot">' +
      '<button type="button" class="cv__mb cv__mb--p" data-tl="v.prev">' + I.prev + '</button>' +
      '<input class="cv__range" type="range" min="1" value="1" step="1" data-tl="v.page">' +
      '<button type="button" class="cv__mb cv__mb--n" data-tl="v.next">' + I.next + '</button>' +
      '<span class="cv__hint" data-t="v.hint"></span>' +
    '</div>';
  document.body.appendChild(r);

  var q = function (s) { return r.querySelector(s); };
  E = {
    root: r, title: q(".cv__t"), count: q(".cv__c"),
    gridBtn: q(".cv__tool--grid"), zoomBtn: q(".cv__tool--zoom"), zoomIcon: q(".cv__zi"), zoomLbl: q(".cv__zl"),
    pdf: q(".cv__tool--pdf"), close: q(".cv__tool--x"),
    stage: q(".cv__stage"), box: q(".cv__box"), sheet: q(".cv__sheet"), lo: q(".cv__lo"), hi: q(".cv__hi"),
    prev: q(".cv__arr--p"), next: q(".cv__arr--n"), mprev: q(".cv__mb--p"), mnext: q(".cv__mb--n"),
    range: q(".cv__range"), grid: q(".cv__grid")
  };

  E.close.addEventListener("click", function () { close(false); });
  E.gridBtn.addEventListener("click", function () { if (V) (V.grid ? hideGrid : showGrid)(); });
  E.zoomBtn.addEventListener("click", function () { toggleZoom(null); });
  E.prev.addEventListener("click", function () { go(-1); });
  E.next.addEventListener("click", function () { go(1); });
  E.mprev.addEventListener("click", function () { go(-1); });
  E.mnext.addEventListener("click", function () { go(1); });
  E.range.addEventListener("input", function () { if (V) jump(+E.range.value, true); });

  E.hi.addEventListener("load", function () {
    if (V && E.hi.getAttribute("src") === pageSrc(V.c, V.page)) E.hi.classList.add("on");
  });

  /* surish — varaqlash; sichqoncha bosishi yoki ikki marta tegish — zoom;
     zoom holatida sichqoncha bilan sudrab suriladi */
  var p = { x: 0, y: 0, sl: 0, st: 0, down: false, moved: false, last: 0 };
  E.stage.addEventListener("pointerdown", function (e) {
    if (e.button && e.button !== 0) return;
    p.x = e.clientX; p.y = e.clientY; p.sl = E.stage.scrollLeft; p.st = E.stage.scrollTop;
    p.down = true; p.moved = false;
  });
  E.stage.addEventListener("pointermove", function (e) {
    if (!p.down || !V) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) p.moved = true;
    if (V.zoom && e.pointerType === "mouse") {
      E.stage.scrollLeft = p.sl - dx; E.stage.scrollTop = p.st - dy;
      E.root.classList.add("drag");
    }
  });
  E.stage.addEventListener("pointercancel", function () { p.down = false; E.root.classList.remove("drag"); });
  E.stage.addEventListener("pointerup", function (e) {
    if (!p.down || !V) return;
    p.down = false; E.root.classList.remove("drag");
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!V.zoom && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) { go(dx < 0 ? 1 : -1); return; }
    if (p.moved) return;
    if (!E.sheet.contains(e.target)) return;
    if (e.pointerType === "mouse") { toggleZoom(e); return; }
    var now = Date.now();
    if (now - p.last < 320) { p.last = 0; toggleZoom(e); } else p.last = now;
  });
  E.stage.addEventListener("dragstart", function (e) { e.preventDefault(); });

  var onResize = function () { if (V) { if (!narrowQ.matches) V.half = 0; render(); } };
  window.addEventListener("resize", onResize);
  if (narrowQ.addEventListener) narrowQ.addEventListener("change", onResize);
  else if (narrowQ.addListener) narrowQ.addListener(onResize);
}

/* --------------------------------------------------------- chizish ------ */
function isSplit() { return !!V && narrowQ.matches && isSpread(V.c, V.page); }

function render() {
  if (!V) return;
  var c = V.c, pg = V.page, split = isSplit(), side = split ? V.half : 0;
  var s = c.size(pg), ratio = (split ? s[0] / 2 : s[0]) / s[1];

  E.root.classList.toggle("zoom", V.zoom);
  var cs = getComputedStyle(E.stage);
  var bw = E.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  var bh = E.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  var fitW = Math.max(0, Math.min(bw, bh * ratio));
  var z = V.zoom ? (narrowQ.matches ? 2.6 : 2) : 1;
  var sw = Math.round(fitW * z), sh = Math.round(fitW / ratio * z);
  E.sheet.style.width = sw + "px";
  E.sheet.style.height = sh + "px";
  E.box.style.width = V.zoom ? Math.max(sw, bw) + "px" : "";
  E.box.style.height = V.zoom ? Math.max(sh, bh) + "px" : "";
  E.sheet.classList.toggle("split", split);
  E.sheet.classList.toggle("r", split && side === 1);

  var lo = thumbSrc(c, pg), hi = pageSrc(c, pg);
  if (E.lo.getAttribute("src") !== lo) E.lo.src = lo;
  if (E.hi.getAttribute("src") !== hi) {
    E.hi.classList.remove("on");
    clearTimeout(hiTimer);
    /* surgich tortilayotganda har bir sahifaning katta rasmini yuklamaymiz */
    hiTimer = setTimeout(function () {
      if (!V || V.page !== pg) return;
      E.hi.src = hi;
      if (E.hi.complete && E.hi.naturalWidth) E.hi.classList.add("on");
    }, V.scrub ? 160 : 0);
  }
  E.hi.alt = c.title + " — " + t("v.page") + " " + pg;

  E.count.textContent = pad(pg, 2) + " / " + pad(c.count, 2);
  E.range.max = c.count;
  E.range.value = pg;
  E.range.style.setProperty("--p", ((pg - 1) / Math.max(1, c.count - 1) * 100) + "%");
  var canPrev = pg > 1 || (split && side === 1);
  var canNext = pg < c.count || (split && side === 0);
  E.prev.disabled = E.mprev.disabled = !canPrev;
  E.next.disabled = E.mnext.disabled = !canNext;
  E.zoomIcon.innerHTML = V.zoom ? I.minus : I.plus;
  E.zoomLbl.setAttribute("data-t", V.zoom ? "v.unzoom" : "v.zoom");
  E.zoomLbl.textContent = t(V.zoom ? "v.unzoom" : "v.zoom");
}

function preload() {
  [V.page + 1, V.page - 1, V.page + 2].forEach(function (n) {
    if (n < 1 || n > V.c.count) return;
    var im = new Image(); im.decoding = "async"; im.src = pageSrc(V.c, n);
  });
}

function turn(dir) {
  if (reduce || !E.sheet.animate) return;
  E.sheet.animate(
    [{ opacity: 0, transform: "translateX(" + (dir * 44) + "px)" }, { opacity: 1, transform: "none" }],
    { duration: 480, easing: "cubic-bezier(.22,.61,.36,1)" });
}

/* ------------------------------------------------------------- URL ------ */
function urlFor(id, pg) {
  var u = new URL(location.href);
  if (id) { u.searchParams.set("catalog", id); u.searchParams.set("page", String(pg)); }
  else { u.searchParams.delete("catalog"); u.searchParams.delete("page"); }
  u.hash = "";
  return u.pathname + u.search;
}
function fromUrl() {
  var sp = new URLSearchParams(location.search), id = sp.get("catalog");
  if (!id || !CATS[id]) return null;
  return { id: id, page: parseInt(sp.get("page"), 10) || 1 };
}
function remember() {
  if (!V) return;
  try { history.replaceState(history.state, "", urlFor(V.c.id, V.page)); } catch (e) {}
}

/* --------------------------------------------------------- harakat ------ */
function setPage(np, dir, half) {
  V.page = np; V.half = half || 0; V.zoom = false;
  render(); turn(dir); preload(); remember();
}

function go(d) {
  if (!V || V.grid) return;
  var split = isSplit();
  V.scrub = false;
  if (split && d === 1 && V.half === 0) { V.half = 1; V.zoom = false; render(); turn(1); return; }
  if (split && d === -1 && V.half === 1) { V.half = 0; V.zoom = false; render(); turn(-1); return; }
  var np = V.page + d;
  if (np < 1 || np > V.c.count) return;
  setPage(np, d, (d === -1 && narrowQ.matches && isSpread(V.c, np)) ? 1 : 0);
}

function jump(np, scrub) {
  if (!V) return;
  np = Math.max(1, Math.min(V.c.count, np | 0));
  V.scrub = !!scrub;
  if (V.grid) hideGrid();
  if (np === V.page) return;
  setPage(np, np > V.page ? 1 : -1, 0);
}

function toggleZoom(e) {
  if (!V) return;
  var fx = 0.5, fy = 0.5;
  if (!V.zoom && e && e.clientX !== undefined) {
    var r = E.sheet.getBoundingClientRect();
    fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  }
  V.zoom = !V.zoom;
  render();
  if (V.zoom) {
    E.stage.scrollLeft = fx * E.stage.scrollWidth - E.stage.clientWidth / 2;
    E.stage.scrollTop = fy * E.stage.scrollHeight - E.stage.clientHeight / 2;
  } else { E.stage.scrollLeft = 0; E.stage.scrollTop = 0; }
}

/* --------------------------------------------------- barcha sahifalar --- */
function showGrid() {
  var c = V.c;
  if (E.grid.getAttribute("data-for") !== c.id) {
    var spreads = isSpread(c, 2), h = '<div class="cv__chs">';
    c.toc.forEach(function (ch) {
      h += '<button type="button" data-go="' + ch[1] + '" data-t="' + ch[0] + '"></button>';
    });
    h += '</div><div class="cv__th' + (spreads ? " cv__th--wide" : "") + '">';
    for (var i = 1; i <= c.count; i++) {
      var s = c.size(i), w = s[0] > s[1] ? 360 : 180;
      h += '<button type="button" data-go="' + i + '"><span class="cv__ti' + (spreads && s[0] <= s[1] ? " cv__ti--one" : "") + '">' +
           '<img src="' + thumbSrc(c, i) + '" alt="" loading="lazy" decoding="async" width="' + w + '" height="' + Math.round(w * s[1] / s[0]) + '"></span>' +
           '<span class="cv__tn">' + pad(i, 2) + '</span></button>';
    }
    E.grid.innerHTML = h + "</div>";
    E.grid.setAttribute("data-for", c.id);
    translate(E.grid);
    [].forEach.call(E.grid.querySelectorAll(".cv__th img"), function (im, k) { im.alt = t("v.page") + " " + (k + 1); });
    E.grid.onclick = function (ev) {
      var b = ev.target.closest("[data-go]");
      if (b) jump(+b.getAttribute("data-go"));
    };
  }
  [].forEach.call(E.grid.querySelectorAll(".cv__th button"), function (b) {
    if (+b.getAttribute("data-go") === V.page) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  V.grid = true;
  E.grid.hidden = false;
  E.gridBtn.setAttribute("aria-pressed", "true");
  var cur = E.grid.querySelector('[aria-current="page"]');
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "center" });
  if (cur) cur.focus({ preventScroll: true });
}
function hideGrid() {
  if (!V) return;
  V.grid = false;
  E.grid.hidden = true;
  E.gridBtn.setAttribute("aria-pressed", "false");
}

/* -------------------------------------------------- ochish / yopish ----- */
function open(id, pg, opts) {
  var c = CATS[id];
  if (!c) return;
  opts = opts || {};
  if (!E) build();
  clearTimeout(closeTimer);
  var wasOpen = !!V;
  V = {
    c: c, page: Math.max(1, Math.min(c.count, Math.round(pg) || 1)), half: 0, zoom: false, grid: false, scrub: false,
    opener: wasOpen ? V.opener : (opts.opener || document.activeElement),
    pushed: wasOpen ? V.pushed : !!opts.pushed
  };
  E.root.setAttribute("aria-label", c.title);
  E.title.textContent = c.title;
  E.pdf.href = c.pdf;
  E.hi.removeAttribute("src"); E.hi.classList.remove("on");
  hideGrid();
  translate(E.root);
  E.root.hidden = false;
  document.body.classList.add("lock");
  void E.root.offsetWidth;
  E.root.classList.add("on");
  render(); preload();
  if (!wasOpen) E.close.focus({ preventScroll: true });
}

function close(fromPop) {
  if (!V) return;
  var opener = V.opener, pushed = V.pushed;
  V = null;
  E.root.classList.remove("on", "zoom");
  document.body.classList.remove("lock");
  closeTimer = setTimeout(function () {
    if (V) return;
    E.root.hidden = true;
    E.hi.removeAttribute("src"); E.lo.removeAttribute("src");
  }, reduce ? 0 : 320);
  if (!fromPop) {
    try {
      if (pushed && history.state && history.state.cv) history.back();
      else history.replaceState(null, "", urlFor(null));
    } catch (e) {}
  }
  if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
}

/* ------------------------------------------------------------ hodisalar - */
document.addEventListener("click", function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var a = e.target.closest && e.target.closest("[data-cat]");
  if (!a || !CATS[a.getAttribute("data-cat")]) return;
  e.preventDefault();
  var id = a.getAttribute("data-cat"), pg = parseInt(a.getAttribute("data-page"), 10) || 1;
  var already = !!V;
  open(id, pg, { opener: a, pushed: true });
  if (!already) {
    try { history.pushState({ cv: 1 }, "", urlFor(id, V.page)); } catch (err) { V.pushed = false; }
  } else remember();
});

/* til almashsa varaqlagich matnlari ham almashadi */
document.addEventListener("click", function (e) {
  if (!E || !e.target.closest || !e.target.closest("[data-lang]")) return;
  setTimeout(function () { translate(E.root); if (V) render(); }, 0);
});

window.addEventListener("popstate", function () {
  var q = fromUrl();
  if (q && (!V || V.c.id !== q.id)) {
    open(q.id, q.page, { pushed: !!(history.state && history.state.cv) });
  } else if (q && V && q.page !== V.page) {
    setPage(Math.max(1, Math.min(V.c.count, q.page)), q.page > V.page ? 1 : -1, 0);
  } else if (!q && V) close(true);
});

document.addEventListener("keydown", function (e) {
  if (!V) return;
  var k = e.key;
  if (k === "Escape") {
    if (V.grid) hideGrid(); else if (V.zoom) toggleZoom(null); else close(false);
    e.preventDefault(); return;
  }
  if (k === "Tab") {           /* fokus varaqlagich ichida aylansin */
    var f = [].filter.call(E.root.querySelectorAll("button,a[href],input"), function (x) {
      return !x.disabled && x.offsetParent !== null;
    });
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
    else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { f[0].focus(); e.preventDefault(); }
    return;
  }
  if (V.grid) return;
  if (e.target === E.range && /^Arrow|^Page|^Home$|^End$/.test(k)) return;  /* surgich o'zi boshqaradi */
  if (k === "ArrowRight" || k === "PageDown") go(1);
  else if (k === "ArrowLeft" || k === "PageUp") go(-1);
  else if (k === "Home") jump(1);
  else if (k === "End") jump(V.c.count);
  else return;
  e.preventDefault();
});

/* havola orqali kelgan bo'lsa (…?catalog=gmb-2024&page=13) darhol ochamiz */
var start = fromUrl();
if (start) open(start.id, start.page, { pushed: false });

window.GMCatalog = { open: function (id, pg) { open(id, pg, {}); }, close: function () { close(false); } };
})();
