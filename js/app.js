/* ==========================================================================
   The Pluton Company — site behaviour
   1. Theme            (runs immediately, before first paint)
   2. Small UI         (nav menu, tabs, year)
   3. Manifesto chips  (which ones are lit)
   4. Fingerprint grids
   5. Blocks           (hero stage + footer walker: tumble, merge, tip over)
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Theme: "system" (no attribute), "light" or "dark"
     ------------------------------------------------------------------ */
  var THEME_KEY = "pluton-theme";
  var root = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function readTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return v === "light" || v === "dark" ? v : "system";
    } catch (e) {
      return "system";
    }
  }

  function applyTheme(mode) {
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
    else root.removeAttribute("data-theme");

    var isDark = mode === "dark" || (mode === "system" && darkQuery.matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0f0f11" : "#f4f4ef");
  }

  var themeMode = readTheme();
  applyTheme(themeMode);

  if (darkQuery.addEventListener) {
    darkQuery.addEventListener("change", function () {
      if (themeMode === "system") applyTheme("system");
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initThemeButtons();
    initNav();
    initTabs();
    initYear();
    initChips();
    initFingerprint();
    initBlocks();
  }

  function initThemeButtons() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-theme-set]"));
    function paint() {
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-theme-set") === themeMode));
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        themeMode = b.getAttribute("data-theme-set");
        try {
          if (themeMode === "system") localStorage.removeItem(THEME_KEY);
          else localStorage.setItem(THEME_KEY, themeMode);
        } catch (e) { /* storage can be blocked; the theme still applies */ }
        applyTheme(themeMode);
        paint();
      });
    });
    paint();
  }

  /* ------------------------------------------------------------------
     2. Small UI
     ------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector(".nav__toggle");
    var links = document.getElementById("nav-links");
    if (!toggle || !links) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      links.classList.toggle("is-open", open);
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  function initTabs() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-tabs]"), function (rootEl) {
      var tabs = Array.prototype.slice.call(rootEl.querySelectorAll('[role="tab"]'));
      var panels = tabs.map(function (t) {
        return document.getElementById(t.getAttribute("aria-controls"));
      });

      function select(index, focus) {
        tabs.forEach(function (t, i) {
          var on = i === index;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          if (panels[i]) panels[i].hidden = !on;
        });
        if (focus) tabs[index].focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(i, false); });
        tab.addEventListener("keydown", function (e) {
          var n = tabs.length;
          var next = null;
          if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % n;
          else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + n) % n;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = n - 1;
          if (next !== null) {
            e.preventDefault();
            select(next, true);
          }
        });
      });
    });
  }

  function initYear() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------------
     Shared helpers
     ------------------------------------------------------------------ */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /** Watches an element and reports whether it is on screen. */
  function watchVisible(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      cb(entries[entries.length - 1].isIntersecting);
    }, { threshold: 0 }).observe(el);
  }

  /* ------------------------------------------------------------------
     3. Manifesto chips: a few light up, then others do
     ------------------------------------------------------------------ */
  function initChips() {
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chips .chip"));
    if (chips.length < 6) return;

    var visible = false;
    var timer = null;

    function relight() {
      var pool = chips.slice();
      var lit = {};
      for (var k = 0; k < 5 && pool.length; k++) {
        var pick = Math.floor(Math.random() * pool.length);
        lit[chips.indexOf(pool[pick])] = true;
        pool.splice(pick, 1);
      }
      chips.forEach(function (c, i) { c.classList.toggle("chip--lit", !!lit[i]); });
    }

    function sync() {
      var run = visible && !reduceMotion.matches && !document.hidden;
      if (run && !timer) timer = setInterval(relight, 2600);
      if (!run && timer) { clearInterval(timer); timer = null; }
    }

    watchVisible(document.getElementById("manifesto") || chips[0], function (v) { visible = v; sync(); });
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener && reduceMotion.addEventListener("change", sync);
  }

  /* ------------------------------------------------------------------
     4. Fingerprint grids: same site → same pattern, other site → other one
     ------------------------------------------------------------------ */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function initFingerprint() {
    var grids = Array.prototype.slice.call(document.querySelectorAll(".fp__grid"));
    if (!grids.length) return;
    var palette = ["#00f0f0", "#04a8ee", "#32f38b", "#17facb"];
    var CELLS = 64;

    grids.forEach(function (g) {
      for (var i = 0; i < CELLS; i++) g.appendChild(document.createElement("i"));
    });

    function paint(grid, seed) {
      var rnd = mulberry32(seed);
      var cells = grid.children;
      for (var i = 0; i < cells.length; i++) {
        var on = rnd() < 0.4;
        var color = palette[Math.floor(rnd() * palette.length)];
        cells[i].style.background = on ? color : "";
      }
    }

    grids.forEach(function (g) { paint(g, parseInt(g.getAttribute("data-seed"), 10) || 1); });

    // The "after restart" grid re-rolls now and then, to show the values change.
    var roller = document.querySelector(".fp__grid[data-roll]");
    if (roller && !reduceMotion.matches) {
      var base = parseInt(roller.getAttribute("data-seed"), 10) || 1;
      var n = 0;
      setInterval(function () {
        if (!roller.offsetParent || document.hidden) return; // panel hidden or tab in background
        n += 1;
        paint(roller, base + n * 97);
      }, 2400);
    }
  }

  /* ------------------------------------------------------------------
     5. Blocks
        A block is a square with a stepped corner. It moves by tumbling:
        a quarter turn about its bottom corner lands it one cell over.
        Scene: two blocks tumble towards each other, merge into one bar,
        the bar tips over (90°), splits, and the pieces go back out.
     ------------------------------------------------------------------ */
  var CANCEL = { cancelled: true };

  var ease = {
    linear: function (t) { return t; },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return 1 - (1 - t) * (1 - t); }
  };

  /** Time advances only while the host is visible, so nothing runs off-screen. */
  function tween(tok, ms, easing, fn) {
    return new Promise(function (resolve, reject) {
      var elapsed = 0;
      var last = performance.now();
      function frame(now) {
        if (tok.dead) { reject(CANCEL); return; }
        var dt = now - last;
        last = now;
        if (tok.active()) elapsed += Math.min(dt, 64);
        var t = Math.min(1, elapsed / ms);
        fn(easing(t));
        if (t >= 1) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  function wait(tok, ms) { return tween(tok, ms, ease.linear, function () {}); }

  function Block(el, w, h) {
    this.el = el;
    this.w = w;
    this.h = h;
    this.cx = 0;
    this.cy = 0;
    this.rot = 0;
    el.style.width = w + "px";
    el.style.height = h + "px";
  }
  Block.prototype.place = function () {
    var x = Math.round((this.cx - this.w / 2) * 10) / 10;
    var y = Math.round((this.cy - this.h / 2) * 10) / 10;
    this.el.style.transform = "translate(" + x + "px," + y + "px) rotate(" + this.rot + "deg)";
  };
  Block.prototype.at = function (left, bottomOffset, groundY) {
    this.cx = left + this.w / 2;
    this.cy = groundY - bottomOffset - this.h / 2;
    this.rot = 0;
    this.place();
  };
  Block.prototype.show = function (on) { this.el.style.display = on ? "block" : "none"; };
  /** Half-size of the box as drawn (the box swaps sides on quarter turns). */
  Block.prototype.half = function () {
    var q = ((Math.round(this.rot / 90) % 4) + 4) % 4;
    return q % 2 ? [this.h / 2, this.w / 2] : [this.w / 2, this.h / 2];
  };

  /** Quarter turn about the bottom-right (dir 1) or bottom-left (dir -1) corner. */
  function tumble(tok, b, dir, ms, easing) {
    var half = b.half();
    var px = b.cx + dir * half[0];
    var py = b.cy + half[1];
    var dx0 = b.cx - px;
    var dy0 = b.cy - py;
    var rot0 = b.rot;
    return tween(tok, ms, easing || ease.inOutQuad, function (t) {
      var a = dir * 90 * t * Math.PI / 180;
      var cos = Math.cos(a);
      var sin = Math.sin(a);
      b.cx = px + dx0 * cos - dy0 * sin;
      b.cy = py + dx0 * sin + dy0 * cos;
      b.rot = rot0 + dir * 90 * t;
      b.place();
    });
  }

  function slide(tok, b, dx, ms) {
    var x0 = b.cx;
    return tween(tok, ms, ease.inOutCubic, function (t) { b.cx = x0 + dx * t; b.place(); });
  }

  /** Drop to the ground, with a small bounce. */
  async function fall(tok, b, groundCy, u) {
    var y0 = b.cy;
    await tween(tok, 320, ease.inQuad, function (t) { b.cy = y0 + (groundCy - y0) * t; b.place(); });
    var hop = u * 0.14;
    await tween(tok, 110, ease.outQuad, function (t) { b.cy = groundCy - hop * t; b.place(); });
    await tween(tok, 110, ease.inQuad, function (t) { b.cy = groundCy - hop * (1 - t); b.place(); });
  }

  async function repeat(n, fn, gap, tok) {
    for (var i = 0; i < n; i++) {
      await fn(i);
      if (gap) await wait(tok, gap);
    }
  }

  function cssVar(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ---- Hero scene ---- */
  async function heroScene(stage, tok, still) {
    var probe = stage.querySelector(".stage__probe");
    var u = probe.getBoundingClientRect().width;
    var W = stage.clientWidth;
    var G = stage.clientHeight; // ground line = bottom edge of the stage
    var xc = Math.round(W / 2 / u) * u; // the merge point, on the unit grid

    var elA = stage.querySelector('[data-mv="a"]');
    var elB = stage.querySelector('[data-mv="b"]');
    var elBar = stage.querySelector('[data-mv="bar"]');
    var elD = stage.querySelector('[data-mv="d"]');

    var A = new Block(elA, u, u);
    var B = new Block(elB, u, u);
    var bar = new Block(elBar, u * 2, u);
    var D = new Block(elD, u, u);
    var colA = cssVar(stage, "--c3", "#00f0f0");
    var colB = cssVar(stage, "--c5", "#32f38b");
    A.el.style.background = colA;
    B.el.style.background = colB;

    // The idle block on top of the right-hand stack
    var stackTop = 4 * u;
    D.at(W - 2 * u, stackTop, G);
    // Left piece starts five cells left of the merge point, right piece five cells right.
    A.at(xc - 5 * u, 0, G);
    B.at(xc + 5 * u, 0, G);
    bar.show(false);
    stage.classList.add("is-ready");
    if (still) return;

    var L = A;
    var R = B;

    async function idle() {
      while (true) {
        await wait(tok, 1500);
        await tumble(tok, D, 1, 520);
        await wait(tok, 1700);
        await tumble(tok, D, -1, 520);
      }
    }

    async function main() {
      while (true) {
        // set the start pose exactly (kills any rounding drift)
        L.at(xc - 5 * u, 0, G);
        R.at(xc + 5 * u, 0, G);
        L.show(true);
        R.show(true);
        bar.show(false);
        await wait(tok, 900);

        // 1. approach: four tumbles each, so both end upright again
        await Promise.all([
          repeat(4, function () { return tumble(tok, L, 1, 430); }, 90, tok),
          (async function () {
            await wait(tok, 220);
            await repeat(4, function () { return tumble(tok, R, -1, 430); }, 90, tok);
          })()
        ]);
        await wait(tok, 140);

        // 2. merge: two blocks become one bar, colours blend left → right
        L.show(false);
        R.show(false);
        bar.w = u * 2;
        bar.h = u;
        bar.el.style.width = bar.w + "px";
        bar.el.style.height = bar.h + "px";
        bar.el.style.background = "linear-gradient(90deg," + (L === A ? colA : colB) + "," + (R === A ? colA : colB) + ")";
        bar.cx = xc;
        bar.cy = G - u / 2;
        bar.rot = 0;
        bar.place();
        bar.show(true);
        bar.el.style.filter = "brightness(1.6)";
        await wait(tok, 170);
        bar.el.style.filter = "";
        await wait(tok, 520);

        // 3. the bar tips over a quarter turn about its bottom-right corner
        await tumble(tok, bar, 1, 700, ease.inOutCubic);
        await wait(tok, 220);

        // 4. split: left piece ends on top, right piece underneath
        bar.show(false);
        L.rot = 90;
        R.rot = 90;
        L.cx = R.cx = bar.cx;
        L.cy = bar.cy - u / 2;
        R.cy = bar.cy + u / 2;
        L.place();
        R.place();
        L.show(true);
        R.show(true);
        await wait(tok, 380);

        // 5. the top piece tumbles off, drops, and walks right
        await tumble(tok, L, 1, 480);
        await Promise.all([
          (async function () {
            await fall(tok, L, G - u / 2, u);
            await repeat(2, function () { return tumble(tok, L, 1, 420); }, 70, tok);
            await slide(tok, L, u, 380);
          })(),
          (async function () {
            await wait(tok, 150);
            await tumble(tok, R, -1, 480);
            await wait(tok, 80);
            await slide(tok, R, -5 * u, 1200);
          })()
        ]);

        // they have traded sides; go again
        var tmp = L; L = R; R = tmp;
        await wait(tok, 1300);
      }
    }

    await Promise.all([idle(), main()]);
  }

  /* ---- Footer walker ---- */
  async function walkerScene(band, tok, still) {
    var el = band.querySelector('[data-mv="w"]');
    if (!el) return;
    var s = el.offsetWidth;
    var W = band.clientWidth;
    var G = band.clientHeight * 0.5; // stands on the third stripe
    var b = new Block(el, s, s);
    var x0 = Math.round((W * 0.1) / s) * s;
    var n = Math.max(3, Math.min(10, Math.floor((W * 0.3) / s)));
    b.at(x0, 0, G);
    band.classList.add("is-ready");
    if (still) return;

    while (true) {
      await wait(tok, 1500);
      await repeat(n, function () { return tumble(tok, b, 1, 340); }, 60, tok);
      await wait(tok, 1800);
      await repeat(n, function () { return tumble(tok, b, -1, 340); }, 60, tok);
      b.at(x0, 0, G);
      await wait(tok, 2600);
    }
  }

  function initBlocks() {
    var stage = document.getElementById("stage");
    var band = document.querySelector(".band");
    var hosts = [];

    function makeRunner(host, scene) {
      var visible = true;
      var tok = null;
      watchVisible(host, function (v) { visible = v; });

      function start() {
        stop();
        var t = { dead: false };
        t.active = function () { return visible && !document.hidden; };
        tok = t;
        scene(host, t, reduceMotion.matches).catch(function (err) {
          if (err !== CANCEL) console.error(err);
        });
      }
      function stop() { if (tok) tok.dead = true; }
      return { start: start, stop: stop };
    }

    if (stage) hosts.push(makeRunner(stage, heroScene));
    if (band) hosts.push(makeRunner(band, walkerScene));
    if (!hosts.length) return;

    function startAll() { hosts.forEach(function (h) { h.start(); }); }
    startAll();

    // Rebuild on width changes (unit size depends on the viewport width)
    var lastW = window.innerWidth;
    var timer = null;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (window.innerWidth !== lastW) {
          lastW = window.innerWidth;
          startAll();
        }
      }, 200);
    });

    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", startAll);

    // Fonts can shift layout; settle once everything has loaded.
    window.addEventListener("load", startAll);
  }
})();
