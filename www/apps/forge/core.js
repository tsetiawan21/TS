/* Forge core: data, scoring, advice, reminders and the coaching brief. No DOM here, so it can be tested on its own.
   Needs TS (shared/ts.js) and FD (data.js). Everything is stored under one key, forge.v1. */
(function (g) {
  'use strict';
  var T = g.TS, FD = g.FD, KEY = 'forge.v1', NID = 700000;
  var dk = T.dkey, add = T.addDays, sod = T.sod, p2 = T.p2;
  var F = null, IDX = null, SRC = null;

  /* ---------- small helpers ---------- */
  function mins(s) { if (typeof s !== 'string') return null; var p = s.split(':'), h = +p[0], m = +p[1]; return (h >= 0 && h < 24 && m >= 0 && m < 60) ? h * 60 + m : null; }
  function fmtT(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return p2(Math.floor(m / 60)) + ':' + p2(m % 60); }
  function circ(d) { d = ((d % 1440) + 1440) % 1440; return d > 720 ? d - 1440 : d; }          /* signed shortest gap on a 24-hour clock */
  function dur(m) { m = Math.round(m); var h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + 'h ' + r + 'm' : h + 'h') : r + 'm'; }
  function pct1(n, d) { return d ? Math.round(n / d * 100) : 0; }
  function dayNum(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function keys(from, n) { var a = []; for (var i = 0; i < n; i++) a.push(dk(add(from, i))); return a; }
  function lastN(end, n) { return keys(add(sod(end), -(n - 1)), n); }                         /* n day keys ending on `end` */
  function plain(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function merge(a, b) { for (var k in b) { if (plain(b[k]) && plain(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; }

  /* ---------- state ---------- */
  function def() {
    /* prof.wake and prof.bed are the times for a day off, or a day with no shift known. prof.shift holds your own wake and bed times for a morning or afternoon shift;
       empty means "use the suggested time". prof.deepOff is the deep work goal on a day off (0 = the same as on a work day). shifts: days Goals has no shift for, set here. */
    return { v: 1, since: dk(new Date()), phase: 1,
      prof: { wake: '06:30', bed: '22:30', deep: 60, exWeek: 3, screenGoal: 0, goalsDeep: true, deepOff: 0, shift: { on: true, morning: { wake: '', bed: '' }, afternoon: { wake: '', bed: '' } } },
      shifts: {},
      mission: null, days: {}, audits: {}, energy: [], distract: ['', '', ''], detox: { active: null, hist: [] }, reviews: {}, weekPri: [], dw: null,
      notif: { morning: { on: true, t: '07:00' }, afternoon: { on: true, t: '14:00' }, night: { on: true, t: '21:00' }, review: { on: true, t: '19:00', day: 0 }, days: 'every' } };
  }
  function load() { var s = T.rd(KEY); F = merge(def(), s || {}); IDX = null; SRC = null; if (!s) save(); return F; }
  function save() { T.wr(KEY, F); }
  function erase() { try { localStorage.removeItem(KEY); } catch (e) { } F = null; IDX = null; SRC = null; return load(); }
  function get() { return F || load(); }
  function dropExt() { IDX = null; SRC = null; }
  function day(k) { return get().days[k] || (F.days[k] = {}); }
  /* what the other apps wrote: read once, and again after dropExt() (a storage event, a day change) */
  function src() { if (!SRC) { try { SRC = T.load(); } catch (e) { SRC = { G: {}, T: {}, BH: [], BP: {} }; } } return SRC; }
  /* what the other apps know about a day: study minutes (Goals) and whether you trained (Berserker) */
  function ext(k) {
    if (!IDX) { try { IDX = T.index(src()); } catch (e) { IDX = { facts: function () { return { study: { min: 0 }, train: { n: 0 } }; } }; } }
    var f = IDX.facts(k); return { study: f.study.min || 0, train: (f.train.n || 0) > 0 };
  }

  /* ---------- work shifts ----------
     Goals is the shift calendar (futuregoals.v1: shifts[day] and settings.config with the shift hours). Forge only reads it and never writes to it.
     For a day that Goals has no shift for, you can set one in Forge (F.shifts). When both have one, Goals wins, so there is one place to change a planned shift.
     A day is "morning" (morning till evening), "afternoon" (afternoon till night), "off", or unknown (null). Unknown days are planned like a day off. */
  var TYPES = ['morning', 'afternoon', 'off'];
  var GDEF = { morning: ['08:50', '16:30'], afternoon: ['14:20', '22:00'], wake: '06:00', sleep: '22:30', buffer: 60 };     /* the same defaults as DEFAULT_CONFIG in apps/goals/app.js */
  function ab(m) { return m < 720 ? m + 1440 : m; }                                       /* a bedtime before noon is after midnight: 00:30 is 1470 */
  function r5(m) { return Math.round(m / 5) * 5; }
  function r15(m) { return Math.round(m / 15) * 15; }
  function dayDate(k) { return new Date(k + 'T00:00:00'); }
  function goalsCfg() {
    var G = src().G || {}, c = G.settings && G.settings.config; c = c && typeof c === 'object' ? c : {};
    var pair = function (n) { var a = Array.isArray(c[n]) ? c[n] : [], s = mins(a[0]), e = mins(a[1]); if (s == null || e == null || e <= s) { s = mins(GDEF[n][0]); e = mins(GDEF[n][1]); } return [s, e]; };
    var w = mins(c.wake), sl = mins(c.sleep), bf = c.bufferMin == null || c.bufferMin === '' ? NaN : Number(c.bufferMin);
    return { morning: pair('morning'), afternoon: pair('afternoon'), wake: w == null ? mins(GDEF.wake) : w, sleep: sl == null ? mins(GDEF.sleep) : sl, buffer: isFinite(bf) && bf >= 0 && bf <= 180 ? bf : GDEF.buffer };
  }
  function shiftOn() { var s = get().prof.shift; return !s || s.on !== false; }
  function shiftOf(k) {
    var gs = (src().G || {}).shifts, t = gs && typeof gs === 'object' ? gs[k] : null, from = 'goals';
    if (TYPES.indexOf(t) < 0) { t = (get().shifts || {})[k]; from = 'forge'; }
    if (TYPES.indexOf(t) < 0) return { k: k, type: null, from: null, s: null, e: null };
    var h = t === 'off' ? null : goalsCfg()[t];
    return { k: k, type: t, from: from, s: h ? h[0] : null, e: h ? h[1] : null };
  }
  /* set (or, with no type, clear) the shift Forge keeps for a day. It only counts while Goals has none for that day. */
  function setShift(k, type) {
    var m = get().shifts || (F.shifts = {}), cut = dk(add(sod(new Date()), -120));
    if (TYPES.indexOf(type) < 0) delete m[k]; else m[k] = type;
    Object.keys(m).forEach(function (x) { if (x < cut) delete m[x]; });
    save();
  }
  /* wake time and bed time (minutes) for a day of this kind. Your own entry, else a suggestion from the shift hours: a morning shift uses the wake and sleep times from Goals;
     after an afternoon shift you are in bed 90 minutes after it ends (23:30 for a 22:00 finish), and the wake time gives 7h30 of sleep. A day off uses the times in "Your day". */
  function kindTimes(kind) {
    var P = get().prof, w0 = mins(P.wake), b0 = mins(P.bed);
    if (kind === 'off') return { wake: w0 == null ? 390 : w0, bed: b0 == null ? 1350 : b0 };
    var G = goalsCfg(), o = (P.shift && P.shift[kind]) || {}, ob = mins(o.bed), ow = mins(o.wake);
    var bed = ob != null ? ab(ob) : kind === 'morning' ? ab(G.sleep) : Math.max(ab(G.sleep), r15(G.afternoon[1] + 90));
    var wake = ow != null ? ow : kind === 'morning' ? G.wake : r15((bed + 450) % 1440);
    return { wake: wake, bed: bed % 1440, ownWake: ow != null, ownBed: ob != null };
  }
  /* everything Forge plans around for a day (k is a day key) */
  function targets(k) {
    var sh = shiftOf(k), kind = shiftOn() && sh.type && sh.type !== 'off' ? sh.type : 'off', x = kindTimes(kind), work = kind !== 'off';
    return { k: k, type: sh.type, from: sh.from, kind: kind, s: work ? sh.s : null, e: work ? sh.e : null, wake: x.wake, bed: x.bed };
  }
  /* when to be in bed for the night after day d, in minutes after that day's midnight (1470 is 00:30). After a shift it is never earlier than 45 minutes after the shift ends. */
  function nightBed(d) {
    var t = targets(dk(d)), b = ab(t.bed); if (t.kind !== 'off' && t.e != null) b = Math.max(b, t.e + 45);
    return b;
  }
  /* the same for a kind of day, with the shift hours from Goals (for the settings screen) */
  function kindBed(kind) { var b = ab(kindTimes(kind).bed); if (kind !== 'off') b = Math.max(b, goalsCfg()[kind][1] + 45); return b; }
  /* minutes of sleep planned for the night after day d: from that bed time to the next morning's wake time */
  function sleepPlan(d) { return targets(dk(add(sod(d), 1))).wake + 1440 - nightBed(d); }
  /* free stretches for deep work on a work day: before the shift (leaving the Goals buffer for getting ready and the trip) and after it. At least 45 minutes long. */
  function focusWindows(d) {
    var t = targets(dk(d)), G = goalsCfg(), bf = G.buffer, bed = nightBed(d), out = [];
    if (t.kind === 'off') return out;
    var a1 = t.wake + 30, b1 = t.s - bf, a2 = t.e + bf, b2 = bed - 60;
    if (b1 - a1 >= 45) out.push({ a: a1, b: b1, label: 'before work' });
    if (b2 - a2 >= 45) out.push({ a: a2, b: b2, label: 'after work' });
    return out;
  }

  /* ---------- sleep ---------- */
  function sleepOf(k) {
    var d = get().days[k], s = d && d.sl; if (!s) return null;
    var b = mins(s.b), w = mins(s.w); if (b == null || w == null) return null;
    var du = w - b; if (du <= 0) du += 1440;
    var tw = targets(k).wake, tb = nightBed(add(dayDate(k), -1)) % 1440, bd = circ(b - tb), wd = circ(w - tw);
    return { b: s.b, w: s.w, dur: du, bedDiff: bd, wakeDiff: wd, tb: fmtT(tb), tw: fmtT(tw), wakeOk: wd <= 15, steady: Math.abs(bd) <= 45 && Math.abs(wd) <= 45 };
  }
  function sleepStats(ks) {
    var n = 0, st = 0, d = 0, ok = 0;
    ks.forEach(function (k) { var s = sleepOf(k); if (s) { n++; if (s.steady) st++; d += s.dur; if (s.dur >= 420 && s.dur <= 540) ok++; } });
    return n ? { n: n, steady: st, cons: pct1(st, n), avgDur: Math.round(d / n), okDur: ok } : { n: 0 };
  }

  /* ---------- one day ---------- */
  function dayInfo(k) {
    var d = get().days[k] || {}, e = ext(k), P = F.prof, light = !!d.light, base = P.deep;
    if (P.deepOff && shiftOn() && shiftOf(k).type === 'off') base = P.deepOff;                  /* a different deep work goal on a day off */
    var goal = light ? Math.max(20, Math.round(base / 2)) : base;
    var deepMin = (d.deep || 0) + (P.goalsDeep ? e.study : 0), learnMin = (d.learn || 0) + e.study;
    var sl = sleepOf(k), pri = (d.pri || []).filter(function (x) { return x && x.t; });
    var auto = { deep: deepMin >= goal, learn: learnMin >= 10, priority: pri.some(function (x) { return x.x; }), wake: !!(sl && sl.wakeOk), review: !!(String(d.win || '').trim() || String(d.lesson || '').trim()) };
    var set = light ? FD.LIGHT.slice() : FD.RITUALS.map(function (r) { return r.k; }), done = {};
    set.forEach(function (x) { done[x] = !!(d.r && d.r[x]) || !!auto[x]; });
    var n = set.filter(function (x) { return done[x]; }).length;
    return { k: k, light: light, goal: goal, deepMin: deepMin, learnMin: learnMin, study: e.study, auto: auto, set: set, done: done, n: n, total: set.length,
      pct: pct1(n, set.length), pri: d.pri || [], sleep: sl, screen: d.screen == null ? null : d.screen, ex: !!(d.ex || e.train), exAuto: e.train, d: d };
  }
  function bandOf(p) { var b = FD.BANDS[0], i = 0; FD.BANDS.forEach(function (x, j) { if (p >= x[0]) { b = x; i = j; } }); return { i: i, label: b[1], say: b[2], min: b[0] }; }
  function pctOn(k) { return k < get().since ? null : dayInfo(k).pct; }                     /* days before you started do not count */
  function avgPct(ks) { var s = 0, c = 0; ks.forEach(function (k) { var p = pctOn(k); if (p != null) { s += p; c++; } }); return c ? { avg: Math.round(s / c), n: c, band: bandOf(Math.round(s / c)) } : null; }
  /* days in a row with 60% or more of the rituals; an unfinished today never breaks it */
  function streak(today) {
    var n = 0, d = sod(today), tp = pctOn(dk(d));
    if (tp == null || tp < 60) d = add(d, -1);
    for (var i = 0; i < 3660; i++) { var p = pctOn(dk(d)); if (p != null && p >= 60) { n++; d = add(d, -1); } else break; }
    return n;
  }
  function bestStreak(today) {
    var best = 0, run = 0, first = new Date(get().since + 'T00:00:00');
    for (var d = first; dk(d) <= dk(today); d = add(d, 1)) { var p = pctOn(dk(d)); if (p != null && p >= 60) { run++; if (run > best) best = run; } else if (dk(d) !== dk(today)) run = 0; }
    return best;
  }

  /* ---------- statistics for the dashboard ---------- */
  function exCount(ks) { return ks.filter(function (k) { return dayInfo(k).ex; }).length; }
  function screenStats(ks) {
    var n = 0, t = 0, over = 0, gl = get().prof.screenGoal;
    ks.forEach(function (k) { var d = F.days[k]; if (d && d.screen != null) { n++; t += d.screen; if (gl && d.screen > gl) over++; } });
    return n ? { n: n, avg: Math.round(t / n), over: over } : { n: 0 };
  }
  /* average completion by kind of day (morning shift, afternoon shift, day off, shift not known) for the given day keys; days before you started are left out */
  function typeStats(ks) {
    var g = { morning: [], afternoon: [], off: [], none: [] }, out = {};
    ks.forEach(function (k) { var p = pctOn(k); if (p != null) g[shiftOf(k).type || 'none'].push(p); });
    Object.keys(g).forEach(function (t) { var a = g[t]; out[t] = { n: a.length, avg: a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : null }; });
    return out;
  }
  /* The last n completed days before today (7 for the week, 30 for the month). Days before you started are left out, never counted as zero. */
  function windowStats(today, n) {
    today = sod(today); var P = get().prof, y = add(today, -1), all = lastN(y, n), since = F.since;
    var ks = all.filter(function (k) { return k >= since; }), pks = lastN(add(y, -n), n).filter(function (k) { return k >= since; });
    var inf = ks.map(dayInfo), deep = 0, goal = 0, learn = 0, ex = 0;
    inf.forEach(function (di) { deep += di.deepMin; goal += di.goal; learn += di.learnMin; if (di.ex) ex++; });
    var hab = FD.RITUALS.map(function (r) {
      var done = 0, tot = 0; inf.forEach(function (di) { if (di.set.indexOf(r.k) >= 0) { tot++; if (di.done[r.k]) done++; } });
      return { k: r.k, t: r.t, done: done, tot: tot, pct: tot ? Math.round(done / tot * 100) : null };
    });
    var why = {}; ks.forEach(function (k) { var m = F.days[k] && F.days[k].miss; if (m && m.k) why[m.k] = (why[m.k] || 0) + 1; });
    var obstacles = FD.WHY.filter(function (w) { return why[w.k]; }).map(function (w) { return { k: w.k, t: w.t, n: why[w.k] }; }).sort(function (a, b) { return b.n - a.n; });
    var av = avgPct(ks), pv = avgPct(pks);
    return { n: n, days: ks.length, keys: ks, avg: av, prev: pv, delta: av && pv ? av.avg - pv.avg : null, hab: hab,
      deep: deep, deepGoal: goal, learn: learn, ex: ex, exTarget: Math.round(P.exWeek * ks.length / 7),
      screen: screenStats(ks), prevScreen: screenStats(pks), sleep: sleepStats(ks), obstacles: obstacles, types: typeStats(ks),
      rows: all.map(function (k) { var p = pctOn(k), di = p == null ? null : dayInfo(k); return { k: k, pct: p, deep: di ? di.deepMin : 0, learn: di ? di.learnMin : 0, ex: di ? di.ex : false }; }) };
  }
  function stats(today) {
    today = sod(today); var W = windowStats(today, 7), M = windowStats(today, 30);
    return { today: dayInfo(dk(today)), week: W.avg, prevWeek: W.prev, month: M.avg, prevMonth: M.prev, streak: streak(today), best: bestStreak(today),
      days7: W.rows, deep7: W.deep, learn7: W.learn, deepGoalWeek: W.deepGoal, ex7: W.ex, exTarget: W.exTarget,
      screen: W.screen, screenPrev: W.prevScreen, sleep: W.sleep, mission: missionStats(today),
      heat: M.rows.map(function (r) { return { k: r.k, pct: r.pct }; }), W: W, M: M };
  }

  /* ---------- mission ---------- */
  function missionStats(today) {
    var m = get().mission; if (!m || !m.type) return null;
    var s = Number(m.start), t = Number(m.target), c = Number(m.cur == null || m.cur === '' ? m.start : m.cur), pct = null;
    if (isFinite(s) && isFinite(t) && t !== s && isFinite(c)) pct = Math.max(0, Math.min(100, Math.round((c - s) / (t - s) * 100)));
    var from = m.from ? new Date(m.from + 'T00:00:00') : null, due = m.due ? new Date(m.due + 'T00:00:00') : null, tp = null, left = null;
    if (from && due && due > from) { tp = Math.max(0, Math.min(100, Math.round((sod(today) - from) / (due - from) * 100))); left = Math.round((due - sod(today)) / 864e5); }
    var st = null; if (pct != null && tp != null) st = pct >= 100 ? 'Done' : (pct >= tp - 5 ? 'On track' : 'Behind');
    return { m: m, pct: pct, timePct: tp, left: left, status: st };
  }

  /* ---------- time audit ---------- */
  function auditStats(a) {
    var g2 = { waste: 0, prod: 0, rest: 0 }, top = null; a = a || {};
    FD.AUDIT.forEach(function (x) { g2[x.g] += a[x.k] || 0; if (x.g === 'waste' && (a[x.k] || 0) > (top ? a[top.k] : 0)) top = x; });
    var total = g2.waste + g2.prod + g2.rest;
    return { waste: g2.waste, prod: g2.prod, rest: g2.rest, total: total, other: Math.max(0, 1440 - total), over: Math.max(0, total - 1440), top: top ? { k: top.k, t: top.t, m: a[top.k] } : null };
  }
  function auditList() { return Object.keys(get().audits).sort().map(function (k) { return { k: k, a: F.audits[k], s: auditStats(F.audits[k]) }; }); }

  /* ---------- advice (rule based, from your own numbers) ---------- */
  function ritualDo(k, c, t) {
    var tgt = Math.min(7, c + 2), goal = get().prof.deep;
    return ({
      wake: 'Put the alarm across the room and lay out tomorrow\'s clothes tonight. Target: ' + tgt + ' of 7 mornings on time.',
      nophone: 'Charge the phone away from your bed. Spend the first hour on water and a short walk. Target: ' + tgt + ' of 7 mornings.',
      walk: 'Walk right after your first drink of water. Ten minutes is enough. Target: ' + tgt + ' of 7 days.',
      priority: 'Write tomorrow\'s one priority task tonight, on paper, and do it first. Target: ' + tgt + ' of 7 days.',
      deep: 'Block ' + goal + ' minutes at your best hour, phone in another room. If that is too much, start with ' + Math.round(goal / 2) + '. Target: ' + tgt + ' of 7 days.',
      learn: 'Pick one 15-minute lesson in Goals and do it right after your deep work. Target: ' + tgt + ' of 7 days.',
      review: 'Set a 3-minute review after dinner: one win, one lesson, three priorities for tomorrow. Target: ' + tgt + ' of 7 days.'
    })[k];
  }
  var KIND = { morning: 'Morning shift days', afternoon: 'Afternoon shift days', off: 'Days off' };
  var SHIFT_DO = {
    afternoon: 'Do your priority task and deep work in the free morning, before you leave for work. Do not leave them for after the shift.',
    morning: 'Keep your deep work for the evening after you rest. Before the shift, do only the quick rituals: water, a short walk, and write your priority.',
    off: 'Plan your days off the night before: pick the time for deep work and the one priority, then keep to them.'
  };
  /* up to `max` specific actions, strongest evidence first. Never invents a number: each one quotes your own data. */
  function advice(today, max) {
    today = sod(today); max = max || 3;
    var y = add(today, -1), ks = lastN(y, 7).filter(function (k) { return k >= get().since; }), c = [];
    var rit = [];
    if (ks.length >= 2) {
      FD.RITUALS.forEach(function (r) {
        var done = 0, tot = 0; ks.forEach(function (k) { var di = dayInfo(k); if (di.set.indexOf(r.k) >= 0) { tot++; if (di.done[r.k]) done++; } });
        if (tot >= 2 && done / tot < 0.6) rit.push({ k: 'r-' + r.k, sev: (1 - done / tot) * 100 + (r.k === 'priority' || r.k === 'deep' ? 8 : 0),
          why: r.t + ': done on ' + done + ' of the last ' + tot + ' days.', todo: ritualDo(r.k, done, tot) });
      });
      rit.sort(function (a, b) { return b.sev - a.sev; });
      c = rit.slice(0, 2);                                    /* the two weakest rituals compete with sleep, mission, screen time and so on */
      var S = sleepStats(ks), bed = nightBed(today) % 1440;
      if (S.n >= 3 && S.cons < 60) c.push({ k: 'sleep', sev: 90 - S.cons * 0.5, why: 'Bedtime and wake time were within 45 minutes of your schedule on ' + S.steady + ' of ' + S.n + ' nights.',
        todo: 'Set a bedtime alarm for ' + fmtT(bed - 45) + (shiftOn() ? ' tonight, and keep the same wake time on the same kind of shift.' : ' and keep your wake time the same all week, weekends included.') });
      if (S.n >= 3 && S.avgDur < 420) c.push({ k: 'sleepdur', sev: 85, why: 'You averaged ' + dur(S.avgDur) + ' of sleep.', todo: 'Move bedtime 30 minutes earlier for the next 5 nights. Aim for 7 to 9 hours.' });
      var SC = screenStats(ks), gl = F.prof.screenGoal;
      if (gl && SC.n && SC.over >= 2) c.push({ k: 'screen', sev: 75, why: 'Screen time was over your ' + dur(gl) + ' limit on ' + SC.over + ' of ' + SC.n + ' logged days.', todo: 'Set an app limit on the app that drains you most and check it every evening.' });
      else if (SC.n >= 3 && SC.avg >= 300) c.push({ k: 'screen', sev: 60, why: 'Screen time averaged ' + dur(SC.avg) + ' a day.', todo: 'Cut 30 minutes a day: set a limit on the one app that drains you most and log your screen time daily.' });
      var ex = exCount(ks), wk = F.prof.exWeek, tg = Math.round(wk * ks.length / 7);
      if (ks.length >= 4 && wk && ex < tg) c.push({ k: 'ex', sev: 40 + (tg - ex) * 12, why: 'You trained on ' + ex + ' of the last ' + ks.length + ' days. Your plan is ' + wk + ' a week.', todo: 'Fix ' + wk + ' training days now and book them in your calendar. This week, aim for ' + Math.min(wk, ex + 1) + ' or more.' });
      /* work days against days off: the kind of day that scores lowest gets its own action (needs two tracked days of each kind, over the last 14 days) */
      if (shiftOn()) {
        var TS2 = typeStats(lastN(y, 14)), have = ['morning', 'afternoon', 'off'].filter(function (t) { return TS2[t].n >= 2; });
        if (have.length >= 2) {
          have.sort(function (a, b) { return TS2[a].avg - TS2[b].avg; });
          var lo = have[0], hi = have[have.length - 1], gap = TS2[hi].avg - TS2[lo].avg;
          if (gap >= 20) c.push({ k: 'shift', sev: 70 + gap / 5, why: KIND[lo] + ' average ' + TS2[lo].avg + '% over the last 14 days, against ' + TS2[hi].avg + '% on ' + KIND[hi].toLowerCase() + '.', todo: SHIFT_DO[lo] });
        }
      }
    }
    var ms = missionStats(today);
    if (ms && ms.status === 'Behind') c.push({ k: 'mission', sev: 80, why: 'Your mission is at ' + ms.pct + '% with ' + ms.timePct + '% of the time used.', todo: 'Add two extra deep work sessions on the mission this week, before anything else on those days.' });
    var dist = (F.distract || []).filter(Boolean)[0];
    if (dist) c.push({ k: 'dist', sev: 55, why: 'You named "' + dist + '" as a top distraction.', todo: 'Set one rule for "' + dist + '": a daily limit or a phone-free window. Write the rule down and track it.' });
    var al = auditList(), last = al[al.length - 1];
    if (last && last.s.waste >= 180 && last.s.top) c.push({ k: 'audit', sev: 65, why: 'Your latest time audit shows ' + dur(last.s.waste) + ' of low-value time, mostly ' + last.s.top.t.toLowerCase() + '.', todo: 'Move 30 minutes a day from ' + last.s.top.t.toLowerCase() + ' to deep work. That is 3.5 hours more each week.' });
    c.sort(function (a, b) { return b.sev - a.sev; });
    var out = c.slice(0, max);
    for (var j = 2; out.length < max && j < rit.length; j++) out.push(rit[j]);      /* more weak rituals only if there is room */
    var fill = [
      { k: 'f1', why: 'A plan made tonight removes tomorrow morning\'s decision.', todo: 'Write your three priorities every night this week, before you sleep.' },
      { k: 'f2', why: 'The weekly review turns data into decisions.', todo: 'Do your weekly review and write down three priorities for next week.' },
      { k: 'f3', why: 'Progress over perfection.', todo: 'Raise one standard by a small step, for example 5 more minutes of deep work a day.' }
    ];
    for (var i = 0; out.length < max && i < fill.length; i++) out.push(fill[i]);
    return out;
  }

  /* ---------- failure recovery ---------- */
  /* yesterday under 60% and not yet looked at: ask what got in the way */
  function recovery(today) {
    today = sod(today); var y = dk(add(today, -1)), p = pctOn(y);
    if (p == null || p >= 60) return null;
    var d = get().days[y] || {};
    return { k: y, pct: p, band: bandOf(p), miss: d.miss || null };
  }

  /* ---------- reviews ---------- */
  function reviewDue(today) {
    today = sod(today); var r = Object.keys(get().reviews).sort(), last = r[r.length - 1];
    if (last) return Math.round((today - new Date(last + 'T00:00:00')) / 864e5) >= 7;
    return Math.round((today - new Date(F.since + 'T00:00:00')) / 864e5) >= 6;
  }
  /* The review looks at the 7 completed days before `today` and is filed under `today`, the day you do it. */
  function reviewData(today) {
    today = sod(today); var W = windowStats(today, 7), rows = W.rows, have = rows.filter(function (r) { return r.pct != null; }), best = null, worst = null, key = dk(today);
    have.forEach(function (r) { if (!best || r.pct > best.pct) best = r; if (!worst || r.pct < worst.pct) worst = r; });
    var al = auditList().filter(function (x) { return x.k >= rows[0].k && x.k <= rows[6].k; }), saved = F.reviews[key] || null;
    return { key: key, from: rows[0].k, end: rows[6].k, rows: rows, avg: W.avg, prev: W.prev, delta: W.delta, best: best, worst: worst, rituals: W.hab, types: W.types,
      deep: W.deep, deepGoal: W.deepGoal, learn: W.learn, ex: W.ex, exTarget: W.exTarget, screen: W.screen, sleep: W.sleep, mission: missionStats(today), audit: al.length ? al[al.length - 1] : null,
      energy: { gain: F.energy.filter(function (e) { return e.kind === 'gain'; }), drain: F.energy.filter(function (e) { return e.kind === 'drain'; }) },
      obstacles: W.obstacles, actions: advice(today, 3), saved: saved, answers: saved ? saved.a : null };
  }
  /* file the answers with the numbers they were written against; answer 8 (three priorities) becomes this week's priority list */
  function saveReview(today, answers) {
    today = sod(today); var R = reviewData(today), a = (answers || []).map(function (x) { return String(x || '').trim(); });
    var s = { a: a, at: Date.now(), from: R.from, to: R.end, avg: R.avg ? R.avg.avg : null, band: R.avg ? R.avg.band.label : null, deep: R.deep, learn: R.learn, ex: R.ex, exTarget: R.exTarget, mission: R.mission ? R.mission.pct : null };
    get().reviews[R.key] = s;
    var pri = (a[7] || '').split(/\r?\n/).map(function (x) { return x.replace(/^\s*(?:\d+[.)]|[-*\u2022])\s*/, '').trim(); }).filter(Boolean).slice(0, 3);
    if (pri.length) F.weekPri = pri.map(function (t) { return { t: t, x: 0 }; });
    save(); return s;
  }

  /* ---------- digital detox ---------- */
  function detoxStart(hours, now) { now = now || new Date(); get().detox.active = { start: now.getTime(), hours: hours }; save(); return get().detox.active; }
  function detoxStatus(now) {
    var a = get().detox.active; if (!a) return null; now = now || new Date();
    var tot = a.hours * 36e5, el = Math.max(0, now.getTime() - a.start);
    return { start: a.start, hours: a.hours, end: a.start + tot, elapsed: el, left: Math.max(0, tot - el), pct: Math.min(100, Math.round(el / tot * 100)), done: el >= tot };
  }
  function detoxEnd(now, note) {
    var D = get().detox, a = D.active; if (!a) return null; now = now || new Date();
    var el = Math.max(0, now.getTime() - a.start), done = el >= a.hours * 36e5;
    var h = { start: a.start, end: now.getTime(), hours: a.hours, mins: Math.round(Math.min(el, a.hours * 36e5) / 6e4), done: done, note: String(note || '').trim() };
    D.hist.unshift(h); D.hist = D.hist.slice(0, 30); D.active = null; save(); return h;
  }

  /* ---------- reminders ---------- */
  var SLOT = { morning: 0, afternoon: 1, night: 2, review: 3 };
  function inQuiet(t, bed, wake) {
    if (bed == null || wake == null || t == null) return false;
    if (bed > wake) return t >= bed || t < wake;
    if (bed < wake) return t >= bed && t < wake;
    return false;
  }
  function moodFromPct(p) { return p == null ? 'any' : p < 60 ? 'low' : p >= 80 ? 'good' : 'any'; }
  function pool(period, phase) {
    var p = FD.MSG[period].map(function (m) { return { id: m[0], t: m[1], kind: m[2], c: m[3] }; });
    FD.PHASES.forEach(function (ph) { if (ph.n === phase && ph.slot === period) p.push({ id: 'p' + ph.n, t: ph.remind, kind: ph.kind, c: 'any', phase: true }); });
    return p;
  }
  /* The message for a period on a day. A fixed rotation, so the same message never comes back inside nine days (the phase reminder, once a week, is the one planned exception); after a hard day
     (or a steady run) every third day uses a supportive (or protecting) message; your phase reminder shows once a week. */
  function pick(period, d, mood, phase) {
    var all = pool(period, phase), n = dayNum(d), gen = all.filter(function (m) { return m.c === 'any' && !m.phase; });
    var sp = mood && mood !== 'any' ? all.filter(function (m) { return m.c === mood; }) : [], ph = all.filter(function (m) { return m.phase; });
    if (ph.length && n % 7 === 0) return ph[0];
    if (sp.length && n % 3 === 1) return sp[Math.floor(n / 3) % sp.length];
    return gen[(n + SLOT[period] * 3) % gen.length];
  }
  function atTime(d, tm) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(tm / 60), tm % 60); }
  /* The times of one day's reminders (minutes). A work day follows the shift: morning 30 minutes after you wake, the middle one 90 minutes before a shift that starts
     in the afternoon or 30 minutes after a shift that ends in the evening, and night 90 minutes before bed (60 after an afternoon shift, and never before you are home).
     A day off, or a day with no shift known, uses the times you set. Nothing is planned for the hours you are at work or asleep. */
  function workRem(kind, wake, bed, s, e) {
    var t = { morning: r5(wake + 30) }, tag;
    if (kind === 'morning') { t.afternoon = r5(e + 30); t.night = r5(bed - 90); tag = { morning: 'before work', afternoon: 'after work' }; }
    else { t.afternoon = r5(s - 90); t.night = r5(Math.max(bed - 60, e + 30)); tag = { morning: 'free morning', afternoon: 'before work', night: 'after work' }; }
    return { t: t, tag: tag };
  }
  function dayRem(d) {
    var t = targets(dk(d)), N = get().notif, follow = t.kind !== 'off', bed = nightBed(d);
    var r = { k: t.k, type: t.type, from: t.from, kind: t.kind, wake: t.wake, bed: bed, s: t.s, e: t.e, follow: follow, t: {}, tag: {} };
    if (!follow) { r.t = { morning: mins(N.morning.t), afternoon: mins(N.afternoon.t), night: mins(N.night.t) }; return r; }
    var w = workRem(t.kind, t.wake, bed, t.s, t.e); r.t = w.t; r.tag = w.tag;
    return r;
  }
  /* the reminder times of a typical morning-shift or afternoon-shift day, and whether each one fits (for the settings screen) */
  function kindPlan(kind) {
    var G = goalsCfg(), x = kindTimes(kind), bed = kindBed(kind), s = G[kind][0], e = G[kind][1], w = workRem(kind, x.wake, bed, s, e), R = { wake: x.wake, bed: bed, s: s, e: e, follow: true };
    return ['morning', 'afternoon', 'night'].map(function (p) { return { slot: p, t: w.t[p], tag: w.tag[p] || '', ok: okAt(w.t[p], R) }; });
  }
  /* is t (minutes) a good time for a reminder on this day: you are awake, and not at work (from 30 minutes before the shift starts to 30 minutes after it ends) */
  function okAt(t, r) {
    if (t == null || t < r.wake || t >= r.bed || t >= 1440) return false;
    return !(r.follow && t >= r.s - 30 && t < r.e + 30);
  }
  /* The next 7 days of reminders. Skips a reminder whose job is already done (no nagging), and never lands in your sleeping hours or, on a work day, during the shift. */
  function plan(now) {
    now = now || new Date(); var N = get().notif, today = sod(now), out = [], nowT = now.getTime();
    var lastRev = Object.keys(F.reviews).sort().pop();
    for (var i = 0; i < 7; i++) {
      var d = add(today, i), k = dk(d), wd = d.getDay(), weekend = wd === 0 || wd === 6, R = dayRem(d), mood = i === 0 ? moodFromPct(pctOn(dk(add(d, -1)))) : i === 1 ? moodFromPct(pctOn(dk(today))) : 'any';
      ['morning', 'afternoon', 'night'].forEach(function (p) {
        var c = N[p]; if (!c || !c.on || (N.days === 'weekdays' && weekend)) return;
        var tm = R.t[p]; if (!okAt(tm, R)) return;
        if (i === 0) {
          var di = dayInfo(k);
          if (p === 'morning' && (di.n > 0 || di.done.wake)) return;
          if (p === 'afternoon' && di.done.priority && di.done.deep) return;
          if (p === 'night' && di.done.review) return;
        }
        var at = atTime(d, tm); if (at.getTime() <= nowT + 5000) return;
        var m = pick(p, d, mood, F.phase), tag = R.tag[p] || '', title = FD.TITLE[p] + (tag ? ' · ' + tag : '');
        if (title.length + 1 + m.t.length > 120) { title = FD.TITLE[p]; tag = ''; }                 /* a long message keeps the short title, so the whole notification stays within 120 characters */
        out.push({ id: NID + i * 10 + SLOT[p], at: at, title: title, body: m.t, mid: m.id, kind: m.kind, day: k, slot: p, shift: R.type, tag: tag });
      });
      var rv = N.review;
      if (rv && rv.on && wd === rv.day) {
        var tm2 = mins(rv.t), recent = lastRev && Math.round((d - new Date(lastRev + 'T00:00:00')) / 864e5) < 6, young = Math.round((d - new Date(F.since + 'T00:00:00')) / 864e5) < 3;
        /* on a work day the review is never sent during the shift: it moves to 30 minutes after the shift, if that is still well before bed */
        if (tm2 != null && R.follow && tm2 >= R.s - 30 && tm2 < R.e + 30) { tm2 = r5(R.e + 30); if (tm2 > R.bed - 30) tm2 = null; }
        if (tm2 != null && okAt(tm2, R) && !recent && !young) {
          var at2 = atTime(d, tm2);
          if (at2.getTime() > nowT + 5000) {
            /* the review already is the evening reflection: no second reminder within half an hour of it */
            out = out.filter(function (x) { return !(x.day === k && x.slot === 'night' && Math.abs(x.at.getHours() * 60 + x.at.getMinutes() - tm2) < 30); });
            out.push({ id: NID + i * 10 + 3, at: at2, title: FD.TITLE.review, body: FD.REVIEW_MSG, mid: 'rv', kind: 'I', day: k, slot: 'review', shift: R.type, tag: '' });
          }
        }
      }
    }
    return out.sort(function (a, b) { return a.at - b.at; });
  }

  /* ---------- the brief you can paste into a Claude chat ---------- */
  function briefData(today) {
    today = sod(today); var S = stats(today), L = [], P = F.prof, ph = FD.PHASES[F.phase - 1];
    L.push('=== MY FORGE TRACKER DATA (real numbers from my app on ' + dk(today) + '. Use only this data. Do not invent progress.) ===');
    L.push('Current phase: ' + F.phase + ' - ' + ph.name + '.  Tracking since ' + F.since + '.');
    var sOn = shiftOn();
    L.push('My schedule: ' + (sOn ? 'I work shifts (see the next lines)' : 'wake ' + P.wake + ', bed ' + P.bed) + ', daily deep work goal ' + P.deep + ' min' + (sOn && P.deepOff ? ' on work days and ' + P.deepOff + ' min on days off' : '') + ', training target ' + P.exWeek + ' days a week' + (P.screenGoal ? ', screen limit ' + dur(P.screenGoal) + ' a day' : '') + '.');
    if (sOn) {
      var G = goalsCfg(), kt = function (kind) { var x = kindTimes(kind); return 'wake ' + fmtT(x.wake) + ', bed ' + fmtT(x.bed); }, WDN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], SL = { morning: 'morning shift', afternoon: 'afternoon shift', off: 'day off' };
      L.push('My work shifts: morning shift ' + fmtT(G.morning[0]) + ' to ' + fmtT(G.morning[1]) + ' (' + kt('morning') + '); afternoon shift ' + fmtT(G.afternoon[0]) + ' to ' + fmtT(G.afternoon[1]) + ' (' + kt('afternoon') + '); day off (' + kt('off') + '). Plan my deep work, training and reminders around them.');
      var up = []; for (var i = 0; i < 7; i++) { var dd = add(today, i), st = shiftOf(dk(dd)).type; up.push((i === 0 ? 'today' : WDN[dd.getDay()]) + ' ' + (st ? SL[st] : 'not set')); }
      L.push('Shifts, next 7 days: ' + up.join('; ') + '.');
      var ty = typeStats(lastN(add(today, -1), 30)), tp = ['morning', 'afternoon', 'off'].filter(function (t) { return ty[t].n > 0; }).map(function (t) { return SL[t] + ' ' + ty[t].avg + '% (' + ty[t].n + (ty[t].n === 1 ? ' day)' : ' days)'); });
      if (tp.length) L.push('Average completion by kind of day, last 30 days: ' + tp.join('; ') + '.');
    }
    var ms = S.mission;
    if (ms) L.push('Primary mission (' + ms.m.type + '): ' + (ms.m.title || 'untitled') + '. Progress ' + (ms.pct == null ? 'not set' : ms.pct + '%') + (ms.timePct != null ? ', ' + ms.timePct + '% of the time used, ' + ms.left + ' days left, ' + ms.status : '') + '. Supporting: ' + ((ms.m.support || []).map(function (s) { return s.title; }).filter(Boolean).join('; ') || 'none') + '.');
    else L.push('Primary mission: not chosen yet.');
    L.push('Score, last 7 completed days: ' + (S.week ? S.week.avg + '% (' + S.week.band.label + ', ' + S.week.n + ' days of data)' : 'no data yet') + '; previous 7: ' + (S.prevWeek ? S.prevWeek.avg + '%' : 'no data') + '; last 30: ' + (S.month ? S.month.avg + '%' : 'no data') + '.  Streak: ' + S.streak + ' days (best ' + S.best + ').');
    L.push('Last 7 days: deep work ' + dur(S.deep7) + ', learning ' + dur(S.learn7) + ', training days ' + S.ex7 + ' of ' + S.exTarget + ', screen time ' + (S.screen.n ? dur(S.screen.avg) + ' a day average' : 'not logged') + ', sleep ' + (S.sleep.n ? dur(S.sleep.avgDur) + ' average, on schedule ' + S.sleep.steady + ' of ' + S.sleep.n + ' nights' : 'not logged') + '.');
    L.push('Daily log (date, completion, rituals missed):');
    lastN(add(today, -1), 7).forEach(function (k) { var p = pctOn(k); if (p == null) { L.push('  ' + k + '  before I started'); return; } var di = dayInfo(k), miss = di.set.filter(function (x) { return !di.done[x]; }).join(', ');
      var d = F.days[k] || {}, ty2 = sOn ? shiftOf(k).type : null; L.push('  ' + k + '  ' + p + '%' + (ty2 ? '  [' + ({ morning: 'morning shift', afternoon: 'afternoon shift', off: 'day off' })[ty2] + ']' : '') + '  missed: ' + (miss || 'none') + (d.miss ? '  (reason: ' + d.miss.why + ')' : '')); });
    var dist = (F.distract || []).filter(Boolean); if (dist.length) L.push('My biggest distractions: ' + dist.join('; ') + '.');
    var al = auditList(), last = al[al.length - 1];
    if (last) L.push('Latest 24-hour time audit (' + last.k + '): wasted ' + dur(last.s.waste) + ', productive ' + dur(last.s.prod) + ', sleep and rest ' + dur(last.s.rest) + '.');
    var g1 = F.energy.filter(function (e) { return e.kind === 'gain'; }).map(function (e) { return e.t; }), g2 = F.energy.filter(function (e) { return e.kind === 'drain'; }).map(function (e) { return e.t; });
    if (g1.length || g2.length) L.push('Energy gainers: ' + (g1.join('; ') || 'none') + '. Energy drainers: ' + (g2.join('; ') || 'none') + '.');
    var rk = Object.keys(F.reviews).sort(), lr = rk.length ? F.reviews[rk[rk.length - 1]] : null;
    if (lr && lr.a) { L.push('My last weekly review (' + rk[rk.length - 1] + '):'); FD.REVIEW_Q.forEach(function (q, i) { if (lr.a[i]) L.push('  ' + (i + 1) + '. ' + q + ' ' + lr.a[i]); }); }
    L.push('');
    L.push('Please act as Forge Protocol AI. Start with: where I actually stand, the biggest pattern holding me back, and three specific actions for tomorrow. Keep it direct and short.');
    return L.join('\n');
  }
  function brief(today) { return (g.FORGE_PROMPT || '') + '\n\n' + briefData(today); }

  g.FG = { KEY: KEY, NID: NID, load: load, save: save, erase: erase, get: get, def: def, day: day, dropExt: dropExt, ext: ext,
    mins: mins, fmtT: fmtT, circ: circ, dur: dur, keys: keys, lastN: lastN, dayNum: dayNum,
    shiftOn: shiftOn, shiftOf: shiftOf, setShift: setShift, goalsCfg: goalsCfg, kindTimes: kindTimes, kindBed: kindBed, kindPlan: kindPlan, targets: targets, nightBed: nightBed, sleepPlan: sleepPlan, focusWindows: focusWindows, dayRem: dayRem, typeStats: typeStats,
    sleepOf: sleepOf, sleepStats: sleepStats, dayInfo: dayInfo, bandOf: bandOf, pctOn: pctOn, avgPct: avgPct, streak: streak, bestStreak: bestStreak,
    stats: stats, windowStats: windowStats, exCount: exCount, screenStats: screenStats, missionStats: missionStats, auditStats: auditStats, auditList: auditList,
    advice: advice, recovery: recovery, reviewDue: reviewDue, reviewData: reviewData, saveReview: saveReview,
    detoxStart: detoxStart, detoxStatus: detoxStatus, detoxEnd: detoxEnd, inQuiet: inQuiet, moodFromPct: moodFromPct, pick: pick, pool: pool, plan: plan, briefData: briefData, brief: brief };
})(window);
