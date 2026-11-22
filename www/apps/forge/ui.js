/* Forge UI base: small HTML helpers, click and input delegation, the router, reminders, copy and share.
   The screens live in v-today.js, v-reset.js, v-stats.js and v-setup.js. boot.js starts everything. */
(function (g) {
  'use strict';
  var T = g.TS, FG = g.FG, FD = g.FD, esc = T.esc, dk = T.dkey;
  var FU = g.FU = { view: 'today', views: {}, regions: {}, ui: {} };
  var $v = document.getElementById('view'), acts = {}, ins = {}, ak = 0;

  /* ---------- icons ---------- */
  var IC = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', chart: '<path d="M5 20v-7M12 20V5M19 20v-10"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>', check: '<path d="M5 12l4 4 10-10"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    send: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3M8 7l4-4 4 4"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>', trend: '<path d="M3 17l5-6 4 3 8-9"/><path d="M15 5h5v5"/>'
  };
  FU.ic = function (n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; };

  /* ---------- registries: clicks and inputs are looked up by id, and cleared on every full render ---------- */
  FU.reg = function (fn) { var k = 'a' + (ak++); acts[k] = fn; return k; };
  FU.card = function (title, icon, body, right, cls) { return '<section class="card ' + (cls || '') + '"><div class="ch"><h2>' + (icon ? FU.ic(icon) : '') + esc(title) + '</h2>' + (right || '') + '</div>' + body + '</section>'; };
  FU.btn = function (label, fn, kind) { return '<button class="btn ' + (kind || '') + '" data-act="' + FU.reg(fn) + '">' + esc(label) + '</button>'; };
  FU.pill = function (label, on, fn, aria) { return '<button class="pill' + (on ? ' on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (aria ? ' aria-label="' + esc(aria) + '"' : '') + ' data-act="' + FU.reg(fn) + '">' + esc(label) + '</button>'; };
  FU.seg = function (opts, cur, fn) { return '<div class="seg">' + opts.map(function (o) { return '<button class="' + (String(o[0]) === String(cur) ? 'on' : '') + '" data-act="' + FU.reg(function () { fn(o[0]); }) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; };
  FU.bar = function (pc, cls) { return '<div class="bar ' + (cls || '') + '"><b style="width:' + Math.max(0, Math.min(100, pc || 0)) + '%"></b></div>'; };
  FU.ring = function (pc, label) {
    var r = 26, c = 2 * Math.PI * r; pc = Math.max(0, Math.min(100, pc || 0));
    return '<svg class="mini" viewBox="0 0 64 64" role="img" aria-label="' + pc + ' percent"><circle cx="32" cy="32" r="26" class="rt"/><circle cx="32" cy="32" r="26" class="rp" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - pc / 100)).toFixed(2) + '" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle">' + esc(label != null ? label : pc + '%') + '</text></svg>';
  };
  FU.chk = function () { return '<span class="chk"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>'; };
  /* an input whose handler runs on 'input' (text, number: saved as you type) or 'change' (time, date: when the picker is confirmed). Never re-render inside these handlers. */
  FU.input = function (o) {
    var k = 'i' + (ak++), type = o.type || 'text'; ins[k] = { fn: o.fn, ev: o.ev || (type === 'text' || type === 'number' ? 'input' : 'change') };
    return '<input class="in ' + (o.cls || '') + '" data-i="' + k + '" type="' + type + '" value="' + esc(o.v == null ? '' : o.v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') +
      (type === 'number' ? ' inputmode="decimal"' : '') + (o.attrs ? ' ' + o.attrs : '') + '>';
  };
  FU.area = function (o) {
    var k = 'i' + (ak++); ins[k] = { fn: o.fn, ev: 'input' };
    return '<textarea class="in ' + (o.cls || '') + '" data-i="' + k + '" rows="' + (o.rows || 3) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' + esc(o.v || '') + '</textarea>';
  };
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (b && acts[b.dataset.act]) acts[b.dataset.act](b, e); });
  ['input', 'change'].forEach(function (t) {
    document.addEventListener(t, function (e) { var el = e.target, k = el && el.dataset && el.dataset.i, h = k && ins[k]; if (h && h.ev === t) h.fn(el.value, el); });
  });

  /* ---------- rendering: a screen is a function that returns html; regions can be refreshed without touching the inputs around them ---------- */
  FU.region = function (name, html) { return '<div data-rg="' + name + '">' + html + '</div>'; };
  FU.refresh = function () {
    for (var i = 0; i < arguments.length; i++) {
      var n = arguments[i], el = $v.querySelector('[data-rg="' + n + '"]'), f = FU.regions[n];
      if (el && f) el.innerHTML = f();
    }
  };
  /* <details> sections remember whether you opened them, so a tick or a choice inside one never folds it shut again */
  FU.ui.open = {};
  FU.det = function (key, dflt) { var o = FU.ui.open[key]; return ' data-k="' + esc(key) + '"' + ((o == null ? dflt : o) ? ' open' : ''); };
  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.tagName === 'DETAILS' && d.dataset && d.dataset.k) FU.ui.open[d.dataset.k] = d.open; }, true);
  FU.render = function () {
    acts = {}; ins = {}; ak = 0;
    var f = FU.views[FU.view] || FU.views.today;
    $v.innerHTML = f();
    document.querySelectorAll('#top button').forEach(function (b) { var on = b.dataset.v === FU.view; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  };
  FU.go = function (v, keepScroll) { FU.view = v; if (!keepScroll) $v.scrollTop = 0; FU.render(); };
  /* a data refresh must never wipe what someone is typing */
  FU.editing = function () { var a = document.activeElement; return !!(a && $v.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  FU.save = function (noPlan) { FG.save(); if (!noPlan) FU.rescheduleSoon(); };

  /* ---------- small formatters ---------- */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function parse(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  FU.parse = parse; FU.WDL = WDL;
  FU.dateLabel = function (d) { return WDL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()]; };
  FU.short = function (k) { var d = parse(k); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  FU.mon = function (k) { var d = parse(k); return d.getDate() + ' ' + MON[d.getMonth()]; };
  FU.letter = function (k) { return WD[parse(k).getDay()].charAt(0); };
  FU.clock = function (d) { return T.p2(d.getHours()) + ':' + T.p2(d.getMinutes()); };
  FU.pct = function (n) { return n == null ? '–' : n + '%'; };
  FU.hrs = function (m) { return (Math.round(m / 6) / 10) + 'h'; };
  /* work shifts: the calendar is kept in Goals. Forge reads it, fills the gaps you set here, and can open the Goals planner for you. */
  FU.SHL = { morning: 'Morning shift', afternoon: 'Afternoon shift', off: 'Day off' };
  FU.openGoals = function () { try { window.parent.postMessage({ hubGo: 'goals', view: 'planner' }, '*'); } catch (e) { } };
  FU.chooseShift = function (k, type) { FG.setShift(k, type); T.haptic(8); FU.rescheduleSoon(); };

  /* ---------- reminders (Capacitor LocalNotifications through the parent shell) ---------- */
  var LN = T.plug('LocalNotifications'), granted = false, busy = null, queued = false, rt = 0;
  FU.notif = { available: !!LN, perm: LN ? 'unknown' : 'none' };
  /* ask=false only looks at the current permission (a background load must never show the Android prompt);
     ask=true shows the prompt if the question was never answered. */
  FU.initNotif = function (ask) {
    if (!LN) return Promise.resolve(false);
    return Promise.resolve().then(function () { return LN.checkPermissions(); })
      .then(function (p) { return ask && (p.display === 'prompt' || p.display === 'prompt-with-rationale') ? LN.requestPermissions() : p; })
      .then(function (p) { FU.notif.perm = p.display; granted = p.display === 'granted'; return granted ? LN.createChannel({ id: 'forge', name: 'Forge reminders', importance: 3 }) : null; })
      .then(function () { return granted; }, function () { return false; });
  };
  /* for something the person just did (start a detox, send a test): ask if we must */
  FU.ensureNotif = function () { return granted ? Promise.resolve(true) : FU.initNotif(true); };
  function payload(id, title, body, at, view) {
    return { id: id, title: title, body: body, largeBody: body, schedule: { at: at, allowWhileIdle: true }, channelId: 'forge', extra: { go: 'forge', view: view || 'today' } };
  }
  /* replace the next seven days of reminders. Only ids 700000 to 700899 are touched; the detox alarm (700900) and other apps are left alone. */
  function doSchedule() {
    if (!LN) return Promise.resolve(false);
    return (granted ? Promise.resolve(true) : FU.initNotif(false)).then(function (ok) {
      if (!ok) return false;
      return LN.getPending().then(function (r) {
        var ids = (r.notifications || []).filter(function (n) { return n.id >= FG.NID && n.id < FG.NID + 900; }).map(function (n) { return { id: n.id }; });
        return ids.length ? LN.cancel({ notifications: ids }) : null;
      }).then(function () {
        var list = FG.plan(new Date()).map(function (x) { return payload(x.id, x.title, x.body, x.at, x.slot === 'review' ? 'review' : 'today'); });
        return list.length ? LN.schedule({ notifications: list }) : null;
      }).then(function () { return true; });
    });
  }
  FU.reschedule = function () {
    if (busy) { queued = true; return busy; }
    busy = doSchedule().catch(function () { return false; }).then(function (r) { busy = null; if (queued) { queued = false; return FU.reschedule(); } return r; });
    return busy;
  };
  FU.rescheduleSoon = function () { clearTimeout(rt); rt = setTimeout(FU.reschedule, 700); };
  FU.notify = function (id, title, body, at, view) {
    if (!LN) return Promise.resolve(false);
    return FU.ensureNotif().then(function (ok) { return ok ? LN.schedule({ notifications: [payload(id, title, body, at, view)] }).then(function () { return true; }) : false; }).catch(function () { return false; });
  };
  FU.unnotify = function (id) { if (!LN) return Promise.resolve(); return LN.cancel({ notifications: [{ id: id }] }).catch(function () { }); };

  /* ---------- copy and share ---------- */
  FU.copy = function (text) {
    var fallback = function () {
      try { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(t); t.select(); var ok = document.execCommand('copy'); t.remove(); return ok; } catch (e) { return false; }
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); }); } catch (e) { }
    return Promise.resolve(fallback());
  };
  FU.share = function (title, text) {
    var SH = T.plug('Share');
    try {
      if (SH) return SH.share({ title: title, text: text, dialogTitle: 'Send to Claude' }).then(function () { return true; }, function () { return false; });
      if (navigator.share) return navigator.share({ title: title, text: text }).then(function () { return true; }, function () { return false; });
    } catch (e) { }
    return Promise.resolve(false);
  };
})(window);
