/* ==========================================================================
   Download page
   1. Product tabs   (NEAT Browser / Pluton Shield, driven by the URL hash)
   2. Architecture   (marks the build that fits the visitor's PC)
   3. Download toast (confirms the click, warns about SmartScreen)
   Links and file sizes are filled in by js/release.js.
   ========================================================================== */

(function () {
  "use strict";

  var DEFAULT_TAB = "shield";
  var TITLES = {
    shield: "Download Pluton Shield — The Pluton Company",
    neat: "Download NEAT Browser — The Pluton Company"
  };

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initArch();
    initToast();
  });

  /* ------------------------------------------------------------------
     1. Tabs
     ------------------------------------------------------------------ */
  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".subnav__tab"));
    if (!tabs.length) return;

    var names = tabs.map(function (t) { return t.getAttribute("data-tab"); });

    function fromHash() {
      var name = (location.hash || "").replace(/^#/, "");
      return names.indexOf(name) !== -1 ? name : DEFAULT_TAB;
    }

    function select(name, opts) {
      opts = opts || {};
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
        if (on && opts.focus) t.focus();
      });
      if (TITLES[name]) document.title = TITLES[name];

      // replaceState keeps the address shareable without piling up history,
      // and (unlike assigning location.hash) does not make the page jump.
      if (opts.updateUrl && "replaceState" in history) {
        history.replaceState(null, "", "#" + name);
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(tab.getAttribute("data-tab"), { updateUrl: true });
      });
      tab.addEventListener("keydown", function (e) {
        var n = tabs.length;
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = n - 1;
        if (next !== null) {
          e.preventDefault();
          select(names[next], { updateUrl: true, focus: true });
        }
      });
    });

    // Links like download.html#neat, clicked while already on this page
    window.addEventListener("hashchange", function () {
      select(fromHash());
      var anchor = document.getElementById("dl-top");
      if (anchor) anchor.scrollIntoView({ block: "start" });
    });

    select(fromHash());
  }

  /* ------------------------------------------------------------------
     2. Architecture
        Only Chromium-based browsers can tell us; elsewhere we say nothing
        rather than guess wrong.
     ------------------------------------------------------------------ */
  function initArch() {
    var uad = navigator.userAgentData;
    if (!uad || !uad.getHighEntropyValues) return;

    uad.getHighEntropyValues(["architecture", "platform"]).then(function (v) {
      if (v.platform !== "Windows") return;
      var arch = v.architecture === "arm" ? "arm64" : v.architecture === "x86" ? "x64" : null;
      if (!arch) return;
      var chip = document.querySelector('[data-arch="' + arch + '"] .dl__rec');
      if (chip) chip.hidden = false;
    }).catch(function () { /* not available: no badge */ });
  }

  /* ------------------------------------------------------------------
     3. Toast
     ------------------------------------------------------------------ */
  function initToast() {
    var toast = document.getElementById("toast");
    if (!toast) return;
    var title = toast.querySelector(".toast__title");
    var body = toast.querySelector(".toast__body");
    var timer = null;

    function show(file, isInstaller) {
      title.textContent = "Download started";
      body.textContent = isInstaller
        ? file + ". If Windows SmartScreen appears, choose “More info”, then “Run anyway”."
        : file;
      toast.classList.add("is-on");
      clearTimeout(timer);
      timer = setTimeout(function () { toast.classList.remove("is-on"); }, 9000);
    }

    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-dl]");
      if (!a) return;
      var key = a.getAttribute("data-dl");
      var file = a.getAttribute("data-file") || a.href.split("/").pop();
      show(file, /-setup$/.test(key));
    });

    toast.querySelector(".toast__close").addEventListener("click", function () {
      toast.classList.remove("is-on");
    });
  }
})();
