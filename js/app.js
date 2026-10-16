"use strict";

/*
 * love-hug — the Hug Machine.
 *
 * Squeeze (click) for a quick burst; hold the button down for a real hug —
 * warmth fills for eight full seconds, then it says the big-hug line.
 * ?hug=1 on the URL shows the "someone sent you a hug" banner.
 */

(function () {
  var LS = "mena-hug";
  var FULL_HUG_MS = 8000;
  var TICK_MS = 100;

  var state = { squeezes: 0, longest: 0, last: 0 };
  var holding = false;
  var holdStart = 0;
  var tickTimer = null;

  function $(id) { return document.getElementById(id); }

  function load() {
    try {
      var raw = window.localStorage.getItem(LS);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.squeezes = parsed.squeezes | 0;
        state.longest = parsed.longest | 0;
        state.last = parsed.last | 0;
      }
    } catch (e) { /* fresh start */ }
  }

  function save() {
    try { window.localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function fmtLast(ts) {
    if (!ts) return "never";
    var diff = Date.now() - ts;
    if (diff < 60 * 1000) return "just now";
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + "h ago";
    var d = new Date(ts);
    return d.getDate() + "/" + (d.getMonth() + 1);
  }

  function tier(ms) {
    if (ms < 800) return "A quick squeeze \u2665";
    if (ms < 3000) return "A proper hug\u2026";
    if (ms < FULL_HUG_MS) return "A big, long hug\u2026";
    return "The hug that fixes everything \u2665\u2665\u2665";
  }

  function renderStats() {
    $("hug-count").textContent = String(state.squeezes);
    $("longest-hold").textContent = (state.longest / 1000).toFixed(state.longest % 1000 ? 1 : 0) + "s";
    $("last-hug").textContent = fmtLast(state.last);
  }

  function popSqueezeClass() {
    var btn = $("hug-btn");
    btn.classList.remove("squeezed");
    void btn.offsetWidth; // restart the animation
    btn.classList.add("squeezed");
  }

  function tick() {
    if (!holding) return;
    var held = Date.now() - holdStart;
    var pct = Math.min(100, (held / FULL_HUG_MS) * 100);
    $("warmth-fill").style.width = pct + "%";
    $("warmth-label").textContent = (held / 1000).toFixed(1) + "s of warmth\u2026";
  }

  function startHold() {
    if (holding) return;
    holding = true;
    holdStart = Date.now();
    $("hug-btn").classList.add("holding");
    $("warmth-label").textContent = "warming up\u2026";
    tickTimer = setInterval(tick, TICK_MS);
    tick();
  }

  function endHold() {
    if (!holding) return;
    holding = false;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    var held = Date.now() - holdStart;
    $("hug-btn").classList.remove("holding");
    state.squeezes += 1;
    if (held > state.longest) state.longest = held;
    state.last = Date.now();
    save();
    renderStats();
    $("hug-message").textContent = tier(held);
    $("warmth-label").textContent = "\u00a0";
    setTimeout(function () { $("warmth-fill").style.width = "0%"; }, 350);
    popSqueezeClass();
  }

  function share() {
    var url;
    try {
      url = window.location.origin + window.location.pathname + "?hug=1";
    } catch (e) {
      url = "?hug=1";
    }
    function copied() {
      $("share-note").textContent = "Link copied \u2014 go send it \u2665";
    }
    function fallback() {
      $("share-note").textContent = "Copy this link by hand: " + url;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(copied, fallback);
      } else {
        fallback();
      }
    } catch (e) {
      fallback();
    }
  }

  function boot() {
    load();
    renderStats();

    var btn = $("hug-btn");
    btn.addEventListener("mousedown", startHold);
    btn.addEventListener("touchstart", function (ev) { ev.preventDefault(); startHold(); });
    btn.addEventListener("mouseup", endHold);
    btn.addEventListener("touchend", function (ev) { ev.preventDefault(); endHold(); });
    btn.addEventListener("mouseleave", endHold);
    window.addEventListener("blur", endHold);

    $("share-hug").addEventListener("click", share);

    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
    if (params && params.get("hug")) {
      var note = $("sent-note");
      note.textContent = "Ammar sent you a hug \u2665 \u2014 press the machine to send one back.";
      note.hidden = false;
      popSqueezeClass();
      $("hug-message").textContent = "A hug travelled all this way for you \u2665";
    }

    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      try { navigator.serviceWorker.register("sw.js"); } catch (e) { /* ignore */ }
    }
  }

  boot();
})();
