/* ==========================================================================
   Pluton Shield: latest release → direct download links
   --------------------------------------------------------------------------
   Release files are named with the version in them, for example
   PlutonShield-v0.6.0-win-x64-Setup.exe, so a fixed link can't point at "the
   latest" file. This script asks GitHub for the latest release and fills in:

     [data-dl="<key>"]    href to the file itself (the browser downloads it
                          straight away, the GitHub release page is skipped)
     [data-size="<key>"]  the file size, for example "73.7 MB"
     [data-version]       the tag, for example "v0.6.0"
     [data-date]          the publish date
     [data-release-url]   href to the release notes page

   The HTML already carries working links to v0.6.0. If GitHub can't be
   reached, or the API rate limit is hit, those stay in place.
   ========================================================================== */

(function () {
  "use strict";

  var REPO = "plutonlabs/shield";
  var API = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var CACHE_KEY = "pluton-shield-release-v1";
  var CACHE_TTL = 15 * 60 * 1000; // 15 minutes, keeps us far from the 60/hour limit

  // asset key → file name pattern
  var ASSETS = {
    "x64-setup": /-win-x64-Setup\.exe$/,
    "x64-zip": /-win-x64\.zip$/,
    "x64-setup-sha": /-win-x64-Setup\.exe\.sha256$/,
    "arm64-setup": /-win-arm64-Setup\.exe$/,
    "arm64-zip": /-win-arm64\.zip$/,
    "arm64-setup-sha": /-win-arm64-Setup\.exe\.sha256$/
  };

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (c && c.at && Date.now() - c.at < CACHE_TTL && c.info) return c.info;
    } catch (e) { /* storage blocked or corrupt: ignore */ }
    return null;
  }

  function writeCache(info) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), info: info }));
    } catch (e) { /* ignore */ }
  }

  /** Reduces the API answer to just what the page needs. */
  function summarise(data) {
    if (!data || !data.tag_name || !Array.isArray(data.assets)) return null;
    var files = {};
    data.assets.forEach(function (a) {
      Object.keys(ASSETS).forEach(function (key) {
        if (!files[key] && ASSETS[key].test(a.name)) {
          files[key] = { name: a.name, url: a.browser_download_url, size: a.size };
        }
      });
    });
    // A release without the installers isn't one we can link to.
    if (!files["x64-setup"] && !files["arm64-setup"]) return null;
    return {
      tag: data.tag_name,
      date: data.published_at || "",
      url: data.html_url || "",
      files: files
    };
  }

  function fetchLatest() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);

    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 7000) : null;

    return fetch(API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error("GitHub answered " + res.status);
        return res.json();
      })
      .then(function (data) {
        var info = summarise(data);
        if (!info) throw new Error("Unexpected release data");
        writeCache(info);
        return info;
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function apply(info) {
    each("[data-version]", function (el) { el.textContent = info.tag; });

    var date = formatDate(info.date);
    each("[data-date]", function (el) {
      el.textContent = date;
      var wrap = el.closest("[data-date-wrap]");
      if (wrap) wrap.hidden = !date;
    });

    if (info.url) each("[data-release-url]", function (el) { el.href = info.url; });

    each("[data-dl]", function (el) {
      var file = info.files[el.getAttribute("data-dl")];
      if (!file) return;
      el.href = file.url;
      el.setAttribute("data-file", file.name);
    });

    each("[data-size]", function (el) {
      var file = info.files[el.getAttribute("data-size")];
      if (file && file.size) el.textContent = formatSize(file.size);
    });

    document.documentElement.setAttribute("data-release", info.tag);
  }

  function run() {
    fetchLatest().then(apply).catch(function () {
      // Keep the built-in v0.6.0 links. Nothing to show the visitor.
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
