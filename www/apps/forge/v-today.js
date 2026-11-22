/* Forge: the Today screen. A page is built from regions; the ones that show scores (hero, rituals) refresh on their own
   when you type in the log below them, so nothing you are typing is ever replaced. */
(function () {
  'use strict';
  var FU = window.FU, FG = window.FG, FD = window.FD, T = window.TS, esc = T.esc, dk = T.dkey, add = T.addDays;
  var ui = FU.ui; ui.priDay = 'today';

  var now = function () { return new Date(); };
  var keyOf = function (off) { return dk(add(T.sod(now()), off)); };
  var rd = function (k) { return FG.get().days[k] || {}; };
  function period(d) { var h = d.getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'night'; }
  function diffText(m) { return FG.dur(Math.abs(m)); }
  var AUTO = { deep: 'Counted from your Goals study time and the minutes you logged.', learn: 'Counted from your Goals study time and the minutes you logged.',
    priority: 'Counted because you ticked one of your priorities.', wake: 'Counted from your sleep log.', review: 'Counted because you wrote an evening note.' };

  /* ---------- message of the period ---------- */
  FU.regions.push = function () {
    var n = now(), p = period(n), F = FG.get(), m = FG.pick(p, T.sod(n), FG.moodFromPct(FG.pctOn(keyOf(-1))), F.phase);
    var lab = { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' }[p];
    return '<section class="card push"><div class="md">' + esc(FD.TITLE[p]) + ' · ' + lab + '</div><p>' + esc(m.t) + '</p></section>';
  };

  /* ---------- today's shift: the day Forge plans around (the calendar itself is kept in Goals) ---------- */
  FU.regions.shift = function () {
    if (!FG.shiftOn()) return '';
    var n = now(), k = keyOf(0), t = FG.targets(k), P = FG.get().prof, c = FG.fmtT, d0 = T.sod(n);
    var seg = function (cur) { return FU.seg([['morning', 'Morning'], ['afternoon', 'Afternoon'], ['off', 'Off']], cur, function (v) { FU.chooseShift(k, v); FU.render(); }); };
    if (!t.type) {
      return FU.card('Which shift is today?', 'clock', '<p>Forge plans your reminders, bed time and deep work around it.</p><div style="margin-top:12px">' + seg(null) + '</div>' +
        '<p class="note">Shifts you plan in the Goals planner are picked up automatically. You can also set the whole week in Settings.</p>');
    }
    var nx = FG.targets(dk(add(d0, 1))), bed = FG.nightBed(n) % 1440, sp = FG.sleepPlan(n), w = FG.focusWindows(n), rows = '';
    var row = function (a, b) { return '<div class="row"><span>' + esc(a) + '</span><span class="right tn b">' + esc(b) + '</span></div>'; };
    rows += row('Wake', c(t.wake)) + row('Bed tonight', c(bed));
    if (t.kind === 'off') { if (P.deepOff && t.type === 'off') rows += row('Deep work goal', FG.dur(P.deepOff)); }
    else if (w.length) rows += w.map(function (x) { return row('Deep work, ' + x.label, c(x.a) + ' to ' + c(x.b)); }).join('');
    else rows += row('Deep work', 'No gap of 45 minutes');
    var tom = nx.type ? 'Tomorrow: ' + FU.SHL[nx.type].toLowerCase() + (nx.s != null ? ', ' + c(nx.s) + ' to ' + c(nx.e) : '') + '. Wake ' + c(nx.wake) + '.' : 'Tomorrow\'s shift is not set yet.';
    var note = '<p class="note">' + esc(tom + ' Sleep planned tonight: ' + FG.dur(sp) + '.' + (sp < 420 ? ' That is a short night, so keep to your bed time.' : '')) + '</p>';
    var ctl = t.from === 'forge' ? '<div style="margin-top:12px">' + seg(t.type) + '</div><p class="note">Set here. A shift planned in Goals takes over.</p>' :
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px"><span class="dim sm">From your Goals planner</span>' + FU.btn('Change', FU.openGoals, 'text') + '</div>';
    return FU.card(FU.SHL[t.type] + ' today', 'clock', '<div class="rows">' + rows + '</div>' + note + ctl, t.s != null ? '<span class="tag">' + esc(c(t.s) + ' to ' + c(t.e)) + '</span>' : '');
  };

  /* ---------- failure recovery: reason, lighter load, one corrective action ---------- */
  FU.regions.recover = function () {
    var rc = FG.recovery(now()); if (!rc) return '';
    var d = rd(rc.k), why = d.miss ? FD.WHY.filter(function (w) { return w.k === d.miss.k; })[0] : null, light = !!rd(keyOf(0)).light, right = '<span class="tag">' + esc(rc.band.label) + '</span>';
    if (!why) {
      return FU.card('Yesterday: ' + rc.pct + '%', 'moon',
        '<p>A missed day is a setback, not an identity. What got in the way?</p><div class="pills" style="margin-top:12px">' +
        FD.WHY.map(function (w) { return FU.pill(w.t, false, function () { FG.day(rc.k).miss = { k: w.k, why: w.t }; FU.save(true); T.haptic(8); FU.render(); }); }).join('') +
        '</div><p class="note">Name the reason. Then shrink the plan and take one small step.</p>', right);
    }
    return FU.card('Restart plan', 'moon',
      '<p>' + esc(why.say) + '</p>' +
      '<div class="lbl mt">Reduce the workload if you need to</div><div class="pills">' + FU.pill(light ? 'Light day is on' : 'Make today a light day', light, function () { var dd = FG.day(keyOf(0)); dd.light = !dd.light; FU.save(); T.haptic(8); FU.render(); }) + '</div>' +
      '<div class="lbl mt">One corrective action for today</div><div class="callout">' + esc(why.fix) + '</div>' +
      '<p class="note">Recover now. You do not need to restart the whole system.</p>' +
      '<div class="actions">' + FU.btn('Change reason', function () { delete FG.day(rc.k).miss; FU.save(true); FU.render(); }, 'text') + '</div>', '<span class="tag">Yesterday ' + rc.pct + '%</span>');
  };

  /* ---------- score ---------- */
  FU.regions.hero = function () {
    var n = now(), k = keyOf(0), di = FG.dayInfo(k), b = FG.bandOf(di.pct), st = FG.streak(n), top = FG.advice(n, 1)[0];
    var h = '<div class="hero"><div><div class="eyebrow">Today</div><div class="num">' + di.pct + '<small>%</small></div><div class="cap">' + esc(b.label) + ' · ' + di.n + ' of ' + di.total + ' done</div></div>' + FU.ring(di.pct, di.n + '/' + di.total) + '</div>';
    h += '<p class="note">' + esc(b.say) + '</p>';
    h += '<div class="chips"><span class="chip">' + (st ? 'Streak: ' + st + (st === 1 ? ' day' : ' days') : 'No streak yet') + '</span>' +
      FU.pill(di.light ? 'Light day: on' : 'Light day', di.light, function () { var dd = FG.day(k); dd.light = !dd.light; FU.save(); T.haptic(8); FU.render(); }) + '</div>';
    if (top && !/^f\d/.test(top.k)) h += '<div class="callout" style="margin-top:14px"><b>Focus today:</b> ' + esc(top.todo) + '<span class="dim" style="display:block;font-size:12.5px;margin-top:3px">' + esc(top.why) + '</span></div>';
    return '<section class="card">' + h + '</section>';
  };

  /* ---------- rituals ---------- */
  function ritSub(r, di, k) {
    var tw = FG.fmtT(FG.targets(k).wake);
    if (r.k === 'wake') return di.sleep ? 'Woke at ' + di.sleep.w + '. Target ' + tw + '.' : 'Target ' + tw + '. Never at the cost of enough sleep.';
    if (r.k === 'deep') return di.deepMin + ' of ' + di.goal + ' min' + (di.study ? ', ' + di.study + ' min from Goals' : '');
    if (r.k === 'learn') return di.learnMin ? di.learnMin + ' min. 10 minutes counts.' : '10 minutes counts.';
    if (r.k === 'priority') { var f = di.pri.filter(function (x) { return x.t; })[0]; return f ? f.t : 'Write it under Priorities below.'; }
    return r.h;
  }
  function ritRow(r, di, k) {
    var on = !!di.done[r.k], man = !!(di.d.r && di.d.r[r.k]), auto = !!di.auto[r.k], sub = ritSub(r, di, k);
    var go = FU.reg(function () {
      if (auto && !man) { T.toast(AUTO[r.k]); return; }
      var d = FG.day(k); d.r = d.r || {}; if (d.r[r.k]) delete d.r[r.k]; else d.r[r.k] = 1;
      FU.save(); T.haptic(8); FU.render();
      if (auto) T.toast(AUTO[r.k]);
    });
    return '<div class="rit' + (on ? ' is-on' : '') + '"><button class="rmain" data-act="' + go + '" aria-pressed="' + on + '">' + FU.chk() + '<span class="rtx"><b>' + esc(r.t) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span>' +
      (auto && !man ? '<span class="auto">Auto</span>' : '') + '</button></div>';
  }
  FU.regions.rits = function () {
    var k = keyOf(0), di = FG.dayInfo(k), h = '';
    ['Morning', 'Day', 'Evening'].forEach(function (p) {
      var rs = FD.RITUALS.filter(function (r) { return r.part === p && di.set.indexOf(r.k) >= 0; });
      if (rs.length) h += '<div class="lbl' + (h ? ' mt' : '') + '">' + p + '</div>' + rs.map(function (r) { return ritRow(r, di, k); }).join('');
    });
    if (di.light) h += '<p class="note">Light day: the four essentials count today, and the deep work goal is halved.</p>';
    return FU.card('Daily rituals', 'check', h, '<span class="tag">' + di.n + ' of ' + di.total + '</span>');
  };

  /* ---------- priorities (today, or tomorrow written the night before) ---------- */
  function three(a) { var o = []; for (var i = 0; i < 3; i++) o.push(a && a[i] ? { t: a[i].t || '', x: a[i].x ? 1 : 0 } : { t: '', x: 0 }); return o; }
  function priCard() {
    var tm = ui.priDay === 'tomorrow', key = keyOf(tm ? 1 : 0), list = three(rd(key).pri), PH = ['The one that matters most', 'Second', 'Third'];
    var rows = list.map(function (p, i) {
      var tick = FU.reg(function () {
        var d = FG.day(key), L = three(d.pri); if (!L[i].t.trim()) { T.toast('Write the task first.'); return; }
        L[i].x = L[i].x ? 0 : 1; d.pri = L; FU.save(); T.haptic(8); FU.render();
      });
      return '<div class="pr' + (p.x ? ' is-on' : '') + '"><button class="cb" data-act="' + tick + '" aria-label="' + (p.x ? 'Mark not done' : 'Mark done') + '" aria-pressed="' + (p.x ? 'true' : 'false') + '">' + FU.chk() + '</button>' +
        FU.input({ v: p.t, ph: PH[i], label: 'Priority ' + (i + 1), fn: function (v) { var d = FG.day(key), L = three(d.pri); L[i].t = v; d.pri = L; FU.save(true); FU.refresh('hero', 'rits'); } }) + '</div>';
    }).join('');
    var sw = FU.seg([['today', 'Today'], ['tomorrow', 'Tomorrow']], ui.priDay, function (v) { ui.priDay = v; FU.render(); });
    return FU.card('Priorities', 'target', rows + '<p class="note">' + (tm ? 'Write tomorrow\'s three priorities tonight. It removes the morning decision.' : 'Finish one priority to tick the ritual. Start with the first.') + '</p>', sw);
  }

  /* ---------- log: sleep, hand-logged minutes, screen time, training ---------- */
  FU.regions.slsum = function () {
    var s = FG.sleepOf(keyOf(0)); if (!s) return '<p class="note" style="margin-top:8px">Log bedtime and wake time to track sleep consistency. Aim for 7 to 9 hours.</p>';
    var w = s.wakeOk ? 'Woke on schedule.' : 'Woke ' + diffText(s.wakeDiff) + ' after your ' + s.tw + ' target.';
    var b = Math.abs(s.bedDiff) <= 45 ? 'Bedtime on schedule.' : 'Bedtime ' + diffText(s.bedDiff) + (s.bedDiff > 0 ? ' later' : ' earlier') + ' than planned.';
    return '<p class="note" style="margin-top:8px"><b class="b" style="color:var(--fg)">Slept ' + FG.dur(s.dur) + '.</b> ' + w + ' ' + b + (s.dur < 420 ? ' Under 7 hours: protect tonight\'s bedtime.' : '') + '</p>';
  };
  function logCard() {
    var k = keyOf(0), d = rd(k), di = FG.dayInfo(k), sl = d.sl || {}, P = FG.get().prof, sc = d.screen == null ? null : d.screen, scr = { h: sc == null ? '' : Math.floor(sc / 60), m: sc == null ? '' : sc % 60 };
    var setSl = function (f, v) { var dd = FG.day(k); dd.sl = dd.sl || { b: '', w: '' }; dd.sl[f] = v; if (!dd.sl.b && !dd.sl.w) delete dd.sl; FU.save(); FU.refresh('hero', 'rits', 'slsum'); };
    var setMin = function (f) { return function (v) { var x = parseInt(v, 10), dd = FG.day(k); if (x > 0) dd[f] = Math.min(1440, x); else delete dd[f]; FU.save(); FU.refresh('hero', 'rits'); }; };
    var setScr = function (f) { return function (v) {
      scr[f] = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0); var dd = FG.day(k);
      if (scr.h === '' && scr.m === '') delete dd.screen; else dd.screen = Math.min(1440, (Number(scr.h) || 0) * 60 + (Number(scr.m) || 0));
      FU.save(true);
    }; };
    var h = '<div class="lbl">Last night\'s sleep</div><div class="tfs">' +
      '<label class="tf"><span>Went to bed</span>' + FU.input({ type: 'time', v: sl.b || '', label: 'Bedtime', fn: function (v) { setSl('b', v); } }) + '</label>' +
      '<label class="tf"><span>Woke up</span>' + FU.input({ type: 'time', v: sl.w || '', label: 'Wake time', fn: function (v) { setSl('w', v); } }) + '</label></div>' + FU.region('slsum', FU.regions.slsum());
    h += '<div class="lbl mt">Deep work and learning by hand</div><div class="prow"><span>Deep work' + (di.study && P.goalsDeep ? '<span class="ls">' + di.study + ' min already counted from Goals</span>' : '') + '</span><span class="hm">' +
      FU.input({ type: 'number', v: d.deep || '', ph: '0', label: 'Deep work minutes', attrs: 'min="0" max="1440" step="5"', fn: setMin('deep') }) + 'min</span></div>' +
      '<div class="prow"><span>Learning' + (di.study ? '<span class="ls">' + di.study + ' min already counted from Goals</span>' : '') + '</span><span class="hm">' +
      FU.input({ type: 'number', v: d.learn || '', ph: '0', label: 'Learning minutes', attrs: 'min="0" max="1440" step="5"', fn: setMin('learn') }) + 'min</span></div>';
    h += '<div class="lbl mt">Phone</div><div class="prow"><span>Screen time today' + (P.screenGoal ? '<span class="ls">Limit ' + FG.dur(P.screenGoal) + '</span>' : '') + '</span><span class="hm">' +
      FU.input({ type: 'number', v: scr.h, ph: '0', label: 'Screen time hours', attrs: 'min="0" max="24" step="1"', fn: setScr('h') }) + 'h ' +
      FU.input({ type: 'number', v: scr.m, ph: '0', label: 'Screen time minutes', attrs: 'min="0" max="59" step="5"', fn: setScr('m') }) + 'm</span></div>';
    var on = di.ex, go = FU.reg(function () {
      if (di.exAuto && !d.ex) { T.toast('Counted from your Berserker workout.'); return; }
      var dd = FG.day(k); if (dd.ex) delete dd.ex; else dd.ex = 1; FU.save(true); T.haptic(8); FU.render();
    });
    h += '<div class="lbl mt">Training</div><div class="rit' + (on ? ' is-on' : '') + '" style="border-top:0"><button class="rmain" style="padding:4px 0" data-act="' + go + '" aria-pressed="' + on + '">' + FU.chk() + '<span class="rtx"><b>I trained today</b><span>' +
      (di.exAuto ? 'Counted from Berserker.' : 'Target: ' + (P.exWeek ? P.exWeek + ' days a week' : 'not set')) + '</span></span></button></div>';
    return FU.card('Log', 'clock', h);
  }

  /* ---------- evening review ---------- */
  function noteCard() {
    var k = keyOf(0), d = rd(k);
    return FU.card('Evening review', 'moon',
      '<label class="tf"><span>One win today</span>' + FU.input({ v: d.win || '', ph: 'Something you finished or handled well', label: 'One win today', fn: function (v) { FG.day(k).win = v; FU.save(true); FU.refresh('hero', 'rits'); } }) + '</label>' +
      '<label class="tf" style="margin-top:12px"><span>One lesson, or one thing to adjust</span>' + FU.input({ v: d.lesson || '', ph: 'What you would do differently', label: 'One lesson', fn: function (v) { FG.day(k).lesson = v; FU.save(true); FU.refresh('hero', 'rits'); } }) + '</label>' +
      '<p class="note">Two lines are enough. It takes three minutes and ticks "Review your daily progress". Then write tomorrow\'s priorities.</p>');
  }

  /* ---------- the page ---------- */
  FU.views.today = function () {
    var n = now(), F = FG.get(), ph = FD.PHASES[F.phase - 1], h = '';
    h += '<div class="greet"><div><h1>Forge</h1><p>' + esc(FU.dateLabel(n)) + ' · Phase ' + F.phase + ', ' + esc(ph.name) + '</p></div><button class="gear" aria-label="Reminders and settings" data-act="' + FU.reg(function () { FU.go('setup'); }) + '">' + FU.ic('gear') + '</button></div>';
    h += FU.region('push', FU.regions.push());
    h += FU.region('shift', FU.regions.shift());
    h += FU.region('recover', FU.regions.recover());
    if (FG.reviewDue(n)) h += FU.card('Your weekly review is ready', 'chart', '<p>Seven days of data are waiting. It takes about five minutes.</p><div class="actions">' + FU.btn('Open the review', function () { FU.go('review'); }) + '</div>');
    h += FU.region('hero', FU.regions.hero());
    h += FU.region('rits', FU.regions.rits());
    h += priCard() + logCard() + noteCard();
    h += '<div class="actions" style="margin-top:4px">' + FU.btn('Reminders and settings', function () { FU.go('setup'); }, 'ghost') + '</div>';
    return h;
  };
})();
