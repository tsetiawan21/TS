/* TS shared layer. Small helpers plus the "facts" engine that the hub, Today and Coach all read from.
   No dependencies. Works in the hub window and inside the app iframes (same origin, same localStorage). */
(function (g) {
  'use strict';
  var DAY = 864e5;
  var p2 = function (n) { return String(n).padStart(2, '0'); };
  var dkey = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  var sod = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  var sow = function (d) { var s = sod(d); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmtDur = function (m) { m = Math.round(m); return Math.floor(m / 60) + 'h ' + p2(m % 60) + 'm'; };
  var fmtH = function (m) { return (Math.round(m / 6) / 10) + 'h'; };
  var fmtR = function (r) { return (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(1) + 'R'; };

  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* ---- settings shared by the whole app ---- */
  function settings() {
    var s = rd('hub.settings.v1') || {};
    return { studyMin: s.studyMin || 60, haptics: s.haptics !== false };
  }
  function setSetting(k, v) { var s = rd('hub.settings.v1') || {}; s[k] = v; wr('hub.settings.v1', s); }

  /* ---- capacitor + feedback ---- */
  function plug(n) {
    try { var C = (g.parent && g.parent.Capacitor) || g.Capacitor; return (C && C.Plugins && C.Plugins[n]) || null; } catch (e) { return null; }
  }
  function haptic(p) {
    try {
      if (!settings().haptics || !navigator.vibrate) return;
      var ua = navigator.userActivation; /* browsers block vibration until the user has tapped once */
      if (ua && !ua.hasBeenActive) return;
      navigator.vibrate(p || 8);
    } catch (e) { }
  }
  function toast(m) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  /* ---- data ---- */
  function load() {
    var D = g.__DEMO__ || { G: rd('futuregoals.v1'), T: rd('trading-routine-tracker.v1'), BH: rd('apex_history'), BP: rd('apex_profile') };
    /* Trading ships with example trades (flag: sample). They are not the user's own, so every score and chart ignores them. */
    return { G: D.G || {}, T: (D.T && !D.T.sample) ? D.T : {}, BH: Array.isArray(D.BH) ? D.BH : [], BP: D.BP || {} };
  }
  /* Berserker stamps entry.date in UTC; the id ends with Date.now(), which gives the true local day. */
  function berserkerDay(e) { var ts = Number(String(e.id || '').split('-').pop()); return ts > 1e12 ? dkey(new Date(ts)) : e.date; }

  /* Index the data once, then answer "what happened on day k" in O(1). */
  function index(D, studyMinOverride) {
    var thr = studyMinOverride || settings().studyMin;
    var sMs = {}, sN = {}, train = {}, trades = {};
    (D.G.sessions || []).forEach(function (s) {
      if (!s || !s.started_at) return;
      var k = dkey(new Date(s.started_at));
      sMs[k] = (sMs[k] || 0) + (s.duration_ms || 0); sN[k] = (sN[k] || 0) + 1;
    });
    (D.BH || []).forEach(function (e) { var k = berserkerDay(e); (train[k] = train[k] || []).push(e); });
    var T = D.T || {};
    (T.trades || []).forEach(function (t) { if (t.status === 'cancelled') return; (trades[t.date] = trades[t.date] || []).push(t); });
    var cache = {};
    function facts(k) {
      if (cache[k]) return cache[k];
      var f = {}, m = Math.round((sMs[k] || 0) / 60000);
      f.study = { min: m, n: sN[k] || 0, lvl: m >= thr ? 2 : m > 0 ? 1 : 0, pct: Math.min(100, Math.round(m / thr * 100)) };
      var ws = train[k] || [];
      f.train = { n: ws.length, xp: ws.reduce(function (a, e) { return a + (e.xpGained || 0); }, 0), name: ws.length ? ws[ws.length - 1].name : '', lvl: ws.length ? 2 : 0 };
      var tr = trades[k] || [], dy = (T.days && T.days[k]) || {};
      var cl = tr.filter(function (t) { return t.status === 'closed'; });
      var r = cl.reduce(function (a, t) { return a + (typeof t.r === 'number' ? t.r : 0); }, 0);
      var rules = cl.length ? Math.round(cl.reduce(function (a, t) { return a + (t.rules == null ? 1 : t.rules); }, 0) / cl.length * 100) : null;
      var lvl = (dy.closed || cl.length) ? 2 : (dy.planReady || tr.length) ? 1 : 0;
      f.trade = { n: tr.length, closed: cl.length, r: r, rules: rules, plan: !!dy.planReady, dayClosed: !!dy.closed, lvl: lvl,
        pct: lvl === 2 ? 100 : tr.length ? 66 : dy.planReady ? 33 : 0 };
      return (cache[k] = f);
    }
    function score(k) { var f = facts(k); return (f.study.lvl >= 2) + (f.train.lvl >= 2) + (f.trade.lvl >= 2); }
    /* consecutive done days ending today (or yesterday when today is still open) */
    function streak(pillar, from) {
      var n = 0, d = new Date(from);
      if (facts(dkey(d))[pillar].lvl < 2) d = addDays(d, -1);
      for (var i = 0; i < 366; i++) { if (facts(dkey(d))[pillar].lvl >= 2) { n++; d = addDays(d, -1); } else break; }
      return n;
    }
    return { facts: facts, score: score, streak: streak, thr: thr };
  }

  /* running or paused study timer owned by Goals */
  function timer(D) {
    var t = D.G && D.G.timer;
    if (!t || (t.status !== 'running' && t.status !== 'paused')) return null;
    var el = (t.accMs || 0) + (t.status === 'running' && t.segStart ? Date.now() - t.segStart : 0);
    return { status: t.status, elapsed: el, target: t.targetMin || 0, category: t.category || '', topic: t.topic || '' };
  }

  /* re-run fn whenever data may have changed: another document wrote storage, the hub pinged us, or the page came back */
  function onData(fn) {
    var t = 0, go = function () { clearTimeout(t); t = setTimeout(fn, 160); };
    g.addEventListener('storage', go);
    g.addEventListener('message', function (e) { if (e.data && e.data.hubRefresh) go(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) go(); });
  }

  /* keep the screen on while a session runs (not supported everywhere, so always optional) */
  var wl = null;
  function wake(on) {
    try {
      if (!on) { if (wl) { wl.release(); wl = null; } return; }
      if (navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () { });
    } catch (e) { }
  }

  g.TS = { DAY: DAY, p2: p2, dkey: dkey, addDays: addDays, sod: sod, sow: sow, esc: esc, fmtDur: fmtDur, fmtH: fmtH, fmtR: fmtR,
    rd: rd, wr: wr, settings: settings, setSetting: setSetting, plug: plug, haptic: haptic, toast: toast,
    load: load, berserkerDay: berserkerDay, index: index, timer: timer, onData: onData, wake: wake };
})(window);
