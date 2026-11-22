/* Forge: Settings. Work shifts, your day, the reminders (what, when, and a preview of what will be sent), the Claude brief, and your data. */
(function () {
  'use strict';
  var FU = window.FU, FG = window.FG, FD = window.FD, T = window.TS, esc = T.esc, dk = T.dkey, c = FG.fmtT;
  var ui = FU.ui; ui.confirm = null;
  var DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], DAYL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], KINDS = ['morning', 'afternoon', 'off'];

  function row(label, sub, right, cls) { return '<div class="prow' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + (sub ? '<span class="ls">' + esc(sub) + '</span>' : '') + '</span>' + right + '</div>'; }
  function pills(opts, cur, fn) { return '<div class="pills">' + opts.map(function (o) { return FU.pill(o[1], String(o[0]) === String(cur), function () { fn(o[0]); }); }).join('') + '</div>'; }
  function confirmBtn(id, label, sure, fn) {
    var armed = ui.confirm === id;
    return FU.btn(armed ? sure : label, function () { if (armed) { ui.confirm = null; fn(); } else { ui.confirm = id; FU.render(); } }, 'ghost');
  }
  var timeIn = function (v, label, fn) { return FU.input({ type: 'time', v: v, label: label, cls: 'ti', fn: fn }); };

  /* the lines that depend on your times refresh without redrawing the inputs */
  FU.regions.quiet = function () {
    var P = FG.get().prof;
    return '<p class="note">' + (FG.shiftOn() ? 'No reminders while you sleep, or while you are at work (from 30 minutes before your shift to 30 minutes after it).' : 'No reminders between your bedtime (' + esc(P.bed) + ') and wake time (' + esc(P.wake) + ').') +
      ' At most three a day, plus the weekly review. Nothing is sent for something you already did today.</p>';
  };
  FU.regions.prev = function () {
    var list = FG.plan(new Date()).slice(0, 6);
    return FU.card('Coming up', 'bell', list.length ? '<div class="rows">' + list.map(function (x) {
      return '<div class="row" style="align-items:flex-start"><span style="min-width:0"><span class="tag" style="display:block">' + esc(FU.short(x.day) + ' ' + FU.clock(x.at)) + ' · ' + esc(x.title) + '</span>' + esc(x.body) + '</span></div>';
    }).join('') + '</div><p class="note">The next seven days, as they will be sent. They are planned again every time you open Forge, so open it at least once a week.</p>' :
      '<p class="dim">Nothing is planned for the next seven days. Check that at least one reminder is switched on.</p>');
  };
  /* what each kind of day looks like in reminders: it updates when a time or a switch changes */
  FU.regions.rtab = function () {
    if (!FG.shiftOn()) return '';
    var N = FG.get().notif, line = function (kind) {
      var ts = FG.kindPlan(kind).filter(function (x) { return x.ok && N[x.slot].on; }).map(function (x) { return c(x.t); });
      return '<div class="row"><span>' + esc(FU.SHL[kind]) + '</span><span class="right tn b">' + esc(ts.length ? ts.join(' · ') : 'None') + '</span></div>';
    };
    var off = ['morning', 'afternoon', 'night'].filter(function (p) { return N[p].on; }).map(function (p) { return N[p].t; });
    return '<div class="lbl mt">Times on each kind of day</div><div class="rows">' + line('morning') + line('afternoon') +
      '<div class="row"><span>Day off, or no shift set</span><span class="right tn b">' + esc(off.length ? off.join(' · ') : 'None') + '</span></div></div>' +
      '<p class="note">On a work day Forge picks the times from your shift. The times above are for days off and days with no shift set.</p>';
  };

  /* ---------- work shifts: the calendar is kept in Goals; this card sets what Forge plans around each kind of day ---------- */
  function own(kind) { var S = FG.get().prof.shift; return S[kind] || (S[kind] = { wake: '', bed: '' }); }
  function kindBlock(kind) {
    var P = FG.get().prof, x = FG.kindTimes(kind), G = FG.goalsCfg(), name = FU.SHL[kind];
    var setW = function (v) { if (!v) return; if (kind === 'off') P.wake = v; else own(kind).wake = v; FU.save(); FU.render(); };
    var setB = function (v) { if (!v) return; if (kind === 'off') P.bed = v; else own(kind).bed = v; FU.save(); FU.render(); };
    return '<div class="kh"><b>' + esc(name) + '</b><span class="tag">' + (kind === 'off' ? 'or no shift set' : esc(c(G[kind][0]) + ' to ' + c(G[kind][1]))) + '</span></div>' +
      '<div class="tfs" style="margin-top:8px"><label class="tf"><span>Wake</span>' + FU.input({ type: 'time', v: c(x.wake), label: name + ' wake time', fn: setW }) + '</label>' +
      '<label class="tf"><span>Bed</span>' + FU.input({ type: 'time', v: c(x.bed), label: name + ' bed time', fn: setB }) + '</label></div>';
  }
  /* nights that are too short for the pattern you have (a morning shift right after an afternoon shift, say) */
  FU.regions.slp = function () {
    var short = [];
    KINDS.forEach(function (a) { KINDS.forEach(function (b) { var m = FG.kindTimes(b).wake + 1440 - FG.kindBed(a); if (m < 420) short.push(FU.SHL[a] + ', then ' + FU.SHL[b].toLowerCase() + ': ' + FG.dur(m)); }); });
    return short.length ? '<div class="callout" style="margin-top:14px"><b>Short nights in your pattern</b><br>' + short.map(esc).join('<br>') + '</div><p class="note">Under 7 hours of sleep makes the next day harder. Move a bed or wake time above, or plan a nap on those days.</p>' :
      '<p class="note">Every night in your pattern leaves at least 7 hours of sleep.</p>';
  };
  function shiftCard() {
    var P = FG.get().prof, S = P.shift, on = FG.shiftOn(), G = FG.goalsCfg();
    var sw = FU.seg([['1', 'Follow my shifts'], ['0', 'Same every day']], on ? '1' : '0', function (v) { S.on = v === '1'; FU.save(); FU.render(); });
    var h = '<div>' + sw + '</div>', acts = '';
    if (on) {
      h += '<p class="note">Forge reads the shifts you plan in Goals, so you set them once. It then sets your wake time, bed time, reminders and deep work windows for each kind of day. Your shift hours are ' + esc(c(G.morning[0]) + ' to ' + c(G.morning[1])) + ' (morning) and ' + esc(c(G.afternoon[0]) + ' to ' + c(G.afternoon[1])) + ' (afternoon). Change them in Goals.</p>';
      h += KINDS.map(kindBlock).join('') + FU.region('slp', FU.regions.slp());
      if (['morning', 'afternoon'].some(function (k) { var o = S[k] || {}; return o.wake || o.bed; })) acts += FU.btn('Use the suggested times', function () { S.morning = { wake: '', bed: '' }; S.afternoon = { wake: '', bed: '' }; FU.save(); FU.render(); }, 'ghost');
    } else {
      h += '<p class="note">The same wake time and bedtime every day, with no change for your shifts.</p>' +
        row('Wake time', 'Scores "wake on schedule"', '<span class="hm">' + timeIn(P.wake, 'Wake time', function (v) { if (!v) return; P.wake = v; FU.save(); FU.refresh('quiet', 'prev'); }) + '</span>', 'rem') +
        row('Bedtime', 'Also starts the quiet hours', '<span class="hm">' + timeIn(P.bed, 'Bedtime', function (v) { if (!v) return; P.bed = v; FU.save(); FU.refresh('quiet', 'prev'); }) + '</span>', 'rem');
    }
    acts += FU.btn('Open the Goals planner', FU.openGoals, 'ghost');
    return FU.card('Work shifts', 'clock', h + '<div class="actions">' + acts + '</div>');
  }

  /* the next seven days: a shift planned in Goals is shown as it is; a day Goals knows nothing about can be set here */
  function weekRow(i) {
    var d = T.addDays(T.sod(new Date()), i), k = dk(d), sh = FG.shiftOf(k), right;
    if (sh.from === 'goals') right = '<span class="hm"><span class="tag">' + esc(FU.SHL[sh.type]) + '</span></span>';
    else right = '<span class="hm">' + [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['off', 'Off']].map(function (o) {
      var on = sh.type === o[0];
      return FU.pill(o[1], on, function () { FU.chooseShift(k, on ? null : o[0]); FU.render(); }, FU.SHL[o[0]] + ', ' + FU.short(k));
    }).join('') + '</span>';
    return row(FU.short(k) + (i === 0 ? ' (today)' : ''), sh.from === 'goals' ? 'From Goals' : sh.from === 'forge' ? 'Set here' : 'Not set', right, 'rem');
  }
  function weekCard() {
    var rows = '', open = 0, bad = [];
    for (var i = 0; i < 7; i++) {
      var d = T.addDays(T.sod(new Date()), i), sp = FG.sleepPlan(d);
      rows += weekRow(i); if (!FG.shiftOf(dk(d)).type) open++; if (sp < 420) bad.push('Night after ' + FU.short(dk(d)) + ': ' + FG.dur(sp));
    }
    return FU.card('Your next 7 days', 'cal', rows +
      (open ? '<p class="note">' + open + (open === 1 ? ' day has' : ' days have') + ' no shift yet. They use your day-off times and reminders.</p>' : '') +
      (bad.length ? '<div class="callout" style="margin-top:12px"><b>Short nights this week</b><br>' + bad.map(esc).join('<br>') + '</div>' : '') +
      '<p class="note">A shift you plan in Goals is shown here and changed there. Days Goals knows nothing about can be set here.</p>');
  }

  FU.views.setup = function () {
    var F = FG.get(), P = F.prof, N = F.notif, on = FG.shiftOn(), h = '';
    h += '<div class="backrow"><button class="btn text" data-act="' + FU.reg(function () { FU.go('today'); }) + '">‹ Back to Today</button></div><div class="greet" style="padding-top:4px"><div><h1>Settings</h1><p>Your shifts, your day and your reminders.</p></div></div>';

    h += shiftCard();
    if (on) h += weekCard();

    /* your day */
    h += FU.card('Your day', 'sliders',
      '<div class="lbl">Daily deep work goal</div>' + pills([[30, '30 min'], [60, '1 hour'], [90, '1.5 hours'], [120, '2 hours'], [180, '3 hours']], P.deep, function (v) { P.deep = Number(v); FU.save(); FU.render(); }) +
      (on ? '<div class="lbl mt">Deep work goal on a day off</div>' + pills([[0, 'Same'], [90, '1.5 hours'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours']], P.deepOff || 0, function (v) { P.deepOff = Number(v); FU.save(); FU.render(); }) : '') +
      '<div class="lbl mt">Training days a week</div>' + pills([[0, 'None'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], P.exWeek, function (v) { P.exWeek = Number(v); FU.save(); FU.render(); }) +
      '<div class="lbl mt">Screen time limit</div>' + pills([[0, 'Off'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours'], [300, '5 hours']], P.screenGoal, function (v) { P.screenGoal = Number(v); FU.save(true); FU.render(); }) +
      '<div class="lbl mt">Study time from Goals</div>' + pills([[1, 'Counts as deep work'], [0, 'Does not']], P.goalsDeep ? 1 : 0, function (v) { P.goalsDeep = !!Number(v); FG.dropExt(); FU.save(); FU.render(); }) +
      '<p class="note">Learning always counts study time from Goals. Training counts workouts from Berserker.</p>');

    /* reminders */
    var avail = FU.notif.available, st = !avail ? 'Reminders are delivered by the installed Android app. In a browser you can still preview them below.' : FU.notif.perm === 'denied' ? 'Notifications are blocked for this app. Allow them in Android settings, then reopen Forge.' : '';
    var per = function (p, name, sub) {
      var c = N[p];
      return row(name, sub + (on ? ', day off' : ''), '<span class="hm">' + timeIn(c.t, name + ' time', function (v) { if (!v) return; c.t = v; FU.save(); FU.refresh('prev', 'rtab'); }) + FU.pill(c.on ? 'On' : 'Off', c.on, function () { c.on = !c.on; FU.save(); FU.render(); }) + '</span>', 'rem');
    };
    var rv = N.review;
    h += FU.card('Reminders', 'bell',
      (st ? '<div class="callout" style="margin-bottom:6px">' + esc(st) + '</div>' : '') +
      per('morning', 'Morning', FD.TITLE.morning) + per('afternoon', 'Afternoon', FD.TITLE.afternoon) + per('night', 'Night', FD.TITLE.night) +
      row('Weekly review', DAYL[rv.day], '<span class="hm">' + timeIn(rv.t, 'Weekly review time', function (v) { if (!v) return; rv.t = v; FU.save(); FU.render(); }) + FU.pill(rv.on ? 'On' : 'Off', rv.on, function () { rv.on = !rv.on; FU.save(); FU.render(); }) + '</span>', 'rem') +
      '<div class="lbl mt">Review day</div><div class="pills days">' + DAYS.map(function (d, i) { return FU.pill(d, rv.day === i, function () { rv.day = i; FU.save(); FU.render(); }, DAYL[i]); }).join('') + '</div>' +
      '<div class="lbl mt">Morning, afternoon and night reminders on</div>' + FU.seg([['every', 'Every day'], ['weekdays', 'Weekdays only']], N.days, function (v) { N.days = v; FU.save(); FU.render(); }) +
      FU.region('rtab', FU.regions.rtab()) +
      FU.region('quiet', FU.regions.quiet()) +
      '<div class="actions">' + FU.btn('Send a test reminder', function () {
        if (!FU.notif.available) { T.toast('Reminders work in the installed app. Nothing to test in a browser.'); return; }
        FU.notify(FG.NID + 901, 'Forge', 'If you can read this, reminders work.', new Date(Date.now() + 5000), 'today').then(function (ok) { T.toast(ok ? 'Test reminder in 5 seconds. Lock the screen to see it.' : 'Could not schedule it. Check that notifications are allowed for this app.'); });
      }, 'ghost') + '</div>');
    h += FU.region('prev', FU.regions.prev());
    h += FU.briefCard();

    /* your data */
    h += FU.card('Your data', 'layers',
      '<p>Tracking since <b class="b">' + esc(FU.short(F.since)) + '</b>. Forge keeps everything on this phone. It is part of the backup on the Today tab.</p>' +
      '<div class="actions">' + confirmBtn('since', 'Restart the numbers from today', 'Tap again to restart', function () { F.since = dk(new Date()); FU.save(); T.toast('Numbers restart from today. Your logs are kept.'); FU.render(); }) +
      confirmBtn('erase', 'Erase all Forge data', 'Tap again to erase everything', function () { FG.erase(); FU.ui.rv = null; FU.ui.aud = null; FU.ui.mDraft = null; FU.save(); T.toast('Forge is back to a clean start.'); FU.go('today'); }) + '</div>' +
      '<p class="note">Forge is a coaching tool, not medical advice. If sleep, mood or stress is a real problem, talk to a doctor or counsellor.</p>');
    return h;
  };
})();
