/* ============================================================================
   Giusto Manetti Battiloro UZ
   1. the engine mount        4. the index rail
   2. language                5. the inquiry form
   3. IL LINGOTTO, the signature move: a bar of gold beaten flat by the scroll
   ========================================================================== */
(function () {
"use strict";

var REDUCE = window.matchMedia &&
             window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var FINE   = window.matchMedia &&
             window.matchMedia("(hover: hover) and (pointer: fine)").matches;
var TG     = "https://t.me/manettiuz";

/* ------------------------------------------------------------- 1. engine --
   If the engine did not load, nothing would ever reveal the content it hides,
   so the page falls back to a plain document rather than to a blank one. */
if (window.ScrollCraft) {
  ScrollCraft.mount(document.body);
} else {
  document.documentElement.classList.add("no-engine");
}

/* ----------------------------------------------------------- 2. language -- */
var lang = (function () {
  try { var s = localStorage.getItem("gm-lang"); if (s && window.COPY[s]) return s; } catch (e) {}
  return "ru";
})();

function t(key) {
  var d = window.COPY[lang] || window.COPY.ru;
  return key in d ? d[key] : (window.COPY.ru[key] || "");
}

function applyLang() {
  var d = window.COPY[lang];
  if (!d) return;
  document.documentElement.lang = lang;
  if (d["doc.title"]) document.title = d["doc.title"];

  document.querySelectorAll("[data-t]").forEach(function (el) {
    var v = d[el.getAttribute("data-t")];
    if (v === undefined) return;
    if (v.indexOf("<") > -1) el.innerHTML = v; else el.textContent = v;
  });

  document.querySelectorAll(".lang button").forEach(function (b) {
    b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
  });

  try { localStorage.setItem("gm-lang", lang); } catch (e) {}
}

document.querySelector(".lang").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-lang]");
  if (!b) return;
  lang = b.getAttribute("data-lang");
  applyLang();
});

/* --------------------------------------------------------- 3. IL LINGOTTO --
   A bar of gold, a stack of beaten layers seen from above and to one side.
   Six discrete blows, each one halving the thickness and doubling the area.
   Then the sheet comes apart into foil and leaves in 3D.
   Everything below is driven by the act's own scroll progress. The engine is
   not touched.                                                              */

var BASE   = 420;                                   /* px, the finished sheet  */
var COLS   = 7, ROWS = 5;
var LAYERS = 12;                                    /* the stacked ingot       */
var H0     = 54;                                    /* px, starting thickness  */
var S0     = 0.19, SPREAD = 1.32;                   /* 0.19 * 1.32^6 = 1       */
var BLOWS  = [0.13, 0.20, 0.27, 0.35, 0.43, 0.52];
var SWAP_A = 0.58, SWAP_B = 0.66;                   /* stack fades to foil     */
var FLY_A  = 0.70;                                  /* the leaf takes off      */
var FOIL   = "https://giustomanetti.uz/wp-content/uploads/2023/03/25.jpg";

var forge  = document.getElementById("forge");
var scene  = document.getElementById("scene");
var bar    = document.getElementById("bar");
var shadow = document.getElementById("shadow");
var ring   = document.getElementById("ring");
var gauge  = document.getElementById("gauge");
var act    = document.getElementById("lingotto");

var layers = [], quads = [], marks = [];

function box(el, size) {
  el.style.width  = size + "px";
  el.style.height = size + "px";
  el.style.marginLeft = (-size / 2) + "px";
  el.style.marginTop  = (-size / 2) + "px";
}

function buildForge() {
  box(bar, BASE);
  box(ring, BASE);
  box(shadow, BASE);

  var i, j, el;

  /* the ingot: a short stack of beaten layers */
  for (i = 0; i < LAYERS; i++) {
    el = document.createElement("div");
    el.className = "q";
    el.style.cssText =
      "left:0;top:0;width:" + BASE + "px;height:" + BASE + "px;" +
      "background-size:" + BASE + "px " + BASE + "px;background-position:0 0;" +
      "filter:brightness(" + (0.52 + 0.48 * (i / (LAYERS - 1))).toFixed(3) + ");";
    el.style.setProperty("--foil", "url(" + FOIL + ")");
    el.classList.add(i === LAYERS - 1 ? "q--face" : "q--layer");
    bar.appendChild(el);
    layers.push(el);
  }

  /* the leaf: one sheet cut into foil */
  var w = BASE / COLS, h = BASE / ROWS;
  for (i = 0; i < ROWS; i++) {
    for (j = 0; j < COLS; j++) {
      el = document.createElement("div");
      el.className = "q";
      el.style.cssText =
        "left:" + (j * w) + "px;top:" + (i * h) + "px;" +
        "width:" + w + "px;height:" + h + "px;opacity:0;" +
        "background-size:" + BASE + "px " + BASE + "px;" +
        "background-position:" + (-j * w) + "px " + (-i * h) + "px;";
      el.style.setProperty("--foil", "url(" + FOIL + ")");
      bar.appendChild(el);
      /* one fixed pseudo-random character per piece, so the flight is varied
         but identical on every scroll pass */
      var s = Math.sin((i * COLS + j) * 12.9898) * 43758.5453;
      var r1 = s - Math.floor(s);
      var r2 = (Math.sin((i * COLS + j) * 78.233) * 12345.6789);
      r2 = r2 - Math.floor(r2);
      quads.push({
        el: el,
        row: i,
        dx: ((j + 0.5) / COLS - 0.5) * 2,
        dy: ((i + 0.5) / ROWS - 0.5) * 2,
        rx: -40 - r1 * 70,
        ry: (r2 - 0.5) * 160,
        rz: (r1 - 0.5) * 120,
        lift: 60 + r2 * 190,
        delay: 0.30 * (1 - i / (ROWS - 1)) + r1 * 0.10,
        /* each piece catches the light differently, but only once it is a
           piece: a sheet that is still one sheet must stay one tone */
        br: 0.80 + r2 * 0.46
      });
    }
  }

  marks = [].slice.call(gauge.querySelectorAll("i"));
}

/* the beaten state at progress p: how many blows have landed, plus the
   overshoot that follows each one */
function beaten(p) {
  var k = 0, last = -1, i;
  for (i = 0; i < BLOWS.length; i++) if (p >= BLOWS[i]) { k = i + 1; last = i; }

  /* a blow is an event, not a slope: the step is instant, and what follows is
     a decaying ring, which is what makes it read as a hammer rather than a
     squash animation */
  var shock = 0;
  if (last >= 0) {
    var u = (p - BLOWS[last]) / 0.035;
    if (u < 1) shock = 1 - u;
  }
  return { k: k, last: last, shock: shock < 0 ? 0 : shock };
}

function paintForge(p) {
  var b = beaten(p);
  var k = b.k;

  var thick  = H0 * Math.pow(0.5, k);
  var spread = S0 * Math.pow(SPREAD, k);

  /* the overshoot: the metal gives a little more on the blow, then returns */
  var over = b.shock * b.shock;
  thick  *= (1 - 0.34 * over);
  spread *= (1 + 0.05 * over);

  /* the camera drifts the whole way through, so the act is never still, then
     pulls back as the leaf leaves */
  var fly = p <= FLY_A ? 0 : (p - FLY_A) / (1 - FLY_A);
  var rx  = 58 - 6 * p - 13 * fly;
  var rz  = -24 + 8 * p;
  var fit = (scene.clientWidth * 0.86) / BASE || 1;
  var sc  = fit * (1 - 0.14 * fly);

  scene.style.setProperty("--fx", (rx + tiltX) + "deg");
  scene.style.setProperty("--fz", (rz + tiltZ) + "deg");
  scene.style.setProperty("--fs", sc.toFixed(4));
  scene.style.translate = "0 " + (b.shock * 7).toFixed(2) + "px";

  bar.style.transform = "scale3d(" + spread.toFixed(4) + "," + spread.toFixed(4) + ",1)";

  /* the ingot */
  var stackA = p < SWAP_A ? 1 : (p > SWAP_B ? 0 : 1 - (p - SWAP_A) / (SWAP_B - SWAP_A));
  for (var i = 0; i < LAYERS; i++) {
    var z = (i / (LAYERS - 1)) * thick;
    layers[i].style.transform = "translateZ(" + z.toFixed(2) + "px)";
    layers[i].style.opacity = stackA;
  }

  /* the leaf */
  var foilA = 1 - stackA;
  bar.classList.toggle("is-flying", fly > 0.001);
  for (var n = 0; n < quads.length; n++) {
    var q = quads[n];
    var u = fly <= q.delay ? 0 : (fly - q.delay) / (1 - q.delay);
    if (u > 1) u = 1;
    var e = u * u * (3 - 2 * u);                       /* smoothstep */
    var tz = thick + e * q.lift;
    var tx = e * q.dx * 150;
    var ty = e * q.dy * 110 - e * 40;
    q.el.style.transform =
      "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px," + tz.toFixed(1) + "px) " +
      "rotateX(" + (e * q.rx).toFixed(1) + "deg) " +
      "rotateY(" + (e * q.ry).toFixed(1) + "deg) " +
      "rotateZ(" + (e * q.rz).toFixed(1) + "deg)";
    q.el.style.opacity = (foilA * (1 - 0.55 * e)).toFixed(3);
    q.el.style.filter = e > 0.001 ? "brightness(" + (1 + (q.br - 1) * e).toFixed(3) + ")" : "";
  }

  /* the table under it */
  shadow.style.transform = "translateZ(-2px) scale(" + (spread * 1.06).toFixed(4) + ")";
  shadow.style.setProperty("--shb", (6 + thick * 0.55 + fly * 26).toFixed(1) + "px");
  shadow.style.setProperty("--sho", (0.92 - 0.5 * fly).toFixed(2));

  /* the blow itself */
  if (b.shock > 0 && !REDUCE) {
    ring.style.opacity = (b.shock * 0.8).toFixed(3);
    ring.style.transform =
      "translateZ(1px) scale(" + (spread * (1 + (1 - b.shock) * 2.6)).toFixed(3) + ")";
  } else {
    ring.style.opacity = 0;
  }

  for (var m = 0; m < marks.length; m++) marks[m].classList.toggle("on", m < k);
}

/* the act's own progress, measured the way the engine measures a pinned act */
function forgeP() {
  var r = act.getBoundingClientRect();
  var travel = act.offsetHeight - window.innerHeight;
  if (travel < 1) return 0;
  var p = (-r.top) / travel;
  return p < 0 ? 0 : (p > 1 ? 1 : p);
}

var tiltX = 0, tiltZ = 0, tiltXT = 0, tiltZT = 0, running = false, lastP = -1;

function frame() {
  running = false;
  var r = act.getBoundingClientRect();
  var live = r.bottom > -200 && r.top < window.innerHeight + 200;
  tiltX += (tiltXT - tiltX) * 0.12;
  tiltZ += (tiltZT - tiltZ) * 0.12;
  if (!live) return;
  var p = forgeP();
  paintForge(p);
  lastP = p;
  if (Math.abs(tiltX - tiltXT) > 0.02 || Math.abs(tiltZ - tiltZT) > 0.02) kick();
}

function kick() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

if (forge && scene && bar) {
  buildForge();
  if (REDUCE) {
    paintForge(0.62);                                   /* the flat sheet, held */
  } else {
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    [0, 160, 600].forEach(function (ms) { setTimeout(kick, ms); });
    if (FINE) {
      forge.addEventListener("pointermove", function (e) {
        var r = forge.getBoundingClientRect();
        tiltZT = (((e.clientX - r.left) / r.width) - 0.5) * 9;
        tiltXT = (((e.clientY - r.top) / r.height) - 0.5) * -7;
        kick();
      });
      forge.addEventListener("pointerleave", function () { tiltXT = 0; tiltZT = 0; kick(); });
    }
  }
}

/* -------------------------------------------------------- 4. the index ---- */
var links = [].slice.call(document.querySelectorAll(".idx__list a"));
var secs  = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });

function spy() {
  var best = 0;
  for (var i = 0; i < secs.length; i++) {
    if (secs[i] && secs[i].getBoundingClientRect().top <= window.innerHeight * 0.42) best = i;
  }
  for (var j = 0; j < links.length; j++) {
    if (j === best) links[j].setAttribute("aria-current", "true");
    else links[j].removeAttribute("aria-current");
  }
}
var spyQueued = false;
window.addEventListener("scroll", function () {
  if (spyQueued) return;
  spyQueued = true;
  requestAnimationFrame(function () { spyQueued = false; spy(); });
}, { passive: true });
spy();

/* --------------------------------------------------------- 5. the form ---- */
var form = document.getElementById("form"),
    ok   = document.getElementById("ok"),
    send = document.getElementById("send"),
    busy = false;

function say(key) { ok.textContent = t(key); ok.classList.add("on"); }

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (busy) return;

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

  if (!data.name || !data.phone) { say("f.err"); return; }

  var text = "Giusto Manetti, " +
    (lang === "uz" ? "yangi ariza" : lang === "en" ? "new request" : "новая заявка") + "\n" +
    data.name + "\n" + data.phone + "\n" + data.interest +
    (data.message ? "\n" + data.message : "");

  busy = true;
  send.disabled = true;

  function done(sent) {
    if (!busy) return;
    busy = false;
    send.disabled = false;
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

/* --------------------------------------------------------------- start ---- */
applyLang();

})();
