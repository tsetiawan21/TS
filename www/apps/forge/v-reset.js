/* Forge: the Reset screen (five phases and the reset tools) and the Mission screen. */
(function () {
  'use strict';
  var FU = window.FU, FG = window.FG, FD = window.FD, T = window.TS, esc = T.esc, dk = T.dkey, add = T.addDays;
  var ui = FU.ui; ui.confirm = null; ui.detoxH = 24; ui.detoxEnding = false; ui.detoxNote = ''; ui.aud = null; ui.enAdd = { gain: '', drain: '' }; ui.mDraft = null; ui.mCur = '';

  var now = function () { return new Date(); };
  var keyOf = function (off) { return dk(add(T.sod(now()), off)); };
  var rd = function (k) { return FG.get().days[k] || {}; };
  function num(v) { var x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; }
  function group(n) { return Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 }); }
  function fmtVal(v, unit) { if (v == null || v === '') return '–'; var s = group(v); return unit === 'Rp' ? 'Rp ' + s : unit === '%' ? s + '%' : s + (unit ? ' ' + unit : ''); }
  function field(label, html, cls) { return '<label class="tf ' + (cls || '') + '"><span>' + esc(label) + '</span>' + html + '</label>'; }
  /* a button that needs a second tap before it does something that replaces data */
  function confirmBtn(id, label, sure, fn, kind) {
    var armed = ui.confirm === id;
    return '<button class="btn ' + (kind || 'ghost') + '" data-act="' + FU.reg(function () { if (armed) { ui.confirm = null; fn(); } else { ui.confirm = id; FU.render(); } }) + '">' + esc(armed ? sure : label) + '</button>';
  }
  /* daily checklists (detox rules, environment, sleep): saved per day, so each morning starts fresh */
  function checklist(kind, items) {
    var k = keyOf(0), st = (rd(k).lst || {})[kind] || {}, n = 0;
    var rows = items.map(function (t, i) {
      var on = !!st[i]; if (on) n++;
      var go = FU.reg(function () { var d = FG.day(k); d.lst = d.lst || {}; d.lst[kind] = d.lst[kind] || {}; if (d.lst[kind][i]) delete d.lst[kind][i]; else d.lst[kind][i] = 1; FU.save(true); T.haptic(8); FU.render(); });
      return '<div class="rit' + (on ? ' is-on' : '') + '"><button class="rmain" style="padding:10px 0" data-act="' + go + '" aria-pressed="' + on + '">' + FU.chk() + '<span class="rtx"><b style="font-weight:500">' + esc(t) + '</b></span></button></div>';
    }).join('');
    return '<div class="lbl">Today\'s checklist · ' + n + ' of ' + items.length + '</div><div class="rows">' + rows + '</div>';
  }
  function detailsCard(title, icon, sub, body, open) {
    return '<section class="card cfg-card"><details class="cfg"' + FU.det('c:' + title, open) + '><summary>' + FU.ic(icon) + '<span class="sx">' + esc(title) + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span></summary>' + body + '</details></section>';
  }

  /* =================== RESET =================== */
  function phasesCard() {
    var F = FG.get(), h = FD.PHASES.map(function (p) {
      var cur = p.n === F.phase, ul = function (a) { return '<ul class="bl">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
      return '<details class="ph' + (cur ? ' cur' : '') + '"' + FU.det('p:' + p.n, false) + '><summary><span class="pn">' + p.n + '</span><span class="sx"><b>' + esc(p.name) + '</b><span class="s">' + esc(p.tag) + '</span></span>' + (cur ? '<span class="chip solid">Now</span>' : '') + '</summary>' +
        '<div class="pb"><p>' + esc(p.obj) + '</p><div class="lh">Key actions</div>' + ul(p.keys) + (p.daily.length ? '<div class="lh">Daily reset actions</div>' + ul(p.daily) : '') +
        '<div class="lh">Your reminder for this phase</div><p class="dim">"' + esc(p.remind) + '"</p>' +
        (cur ? '' : '<div class="actions">' + FU.btn('Make this my current phase', function () { F.phase = p.n; FU.save(); T.haptic(10); T.toast('Phase ' + p.n + ': ' + p.name + '. Your reminder follows it.'); FU.render(); }, 'ghost mini') + '</div>') + '</div></details>';
    }).join('');
    var cp = FD.PHASES[F.phase - 1];
    return FU.card('The five-phase reset', 'layers', '<p><b class="b">Phase ' + cp.n + ', ' + esc(cp.name) + '.</b> ' + esc(cp.obj) + '</p><p class="note">Tap a phase to see its actions. Move on when the basics hold, not before.</p><div style="margin-top:10px">' + h + '</div>', '<span class="tag">Phase ' + F.phase + ' of 5</span>');
  }

  /* ----- digital detox ----- */
  function hms(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return T.p2(Math.floor(s / 3600)) + ':' + T.p2(Math.floor(s % 3600 / 60)) + ':' + T.p2(s % 60); }
  function when(ms) { var d = new Date(ms); return FU.short(dk(d)) + ' ' + FU.clock(d); }
  function detoxCard() {
    var st = FG.detoxStatus(now()), F = FG.get(), h = '';
    if (st) {
      if (st.done || ui.detoxEnding) {
        h += '<p><b class="b">' + (st.done ? 'Detox complete.' : 'Ending early.') + '</b> ' + (st.done ? 'You stayed off for ' + st.hours + ' hours.' : 'You were off for ' + FG.dur(Math.round(st.elapsed / 6e4)) + '.') + '</p>' +
          '<label class="tf" style="margin-top:12px"><span>What did you notice? (optional)</span>' + FU.area({ v: ui.detoxNote, ph: 'Urges, boredom, what you did instead', label: 'What did you notice', fn: function (v) { ui.detoxNote = v; } }) + '</label>' +
          '<div class="actions">' + FU.btn('Save and finish', function () { FG.detoxEnd(now(), ui.detoxNote); ui.detoxNote = ''; ui.detoxEnding = false; FU.unnotify(FG.NID + 900); FU.save(true); T.haptic(12); FU.render(); }) +
          (st.done ? '' : FU.btn('Keep going', function () { ui.detoxEnding = false; FU.render(); }, 'ghost')) + '</div>';
      } else {
        h += '<div class="eyebrow">Time left</div><div class="num tn" id="dxl" style="font-size:36px">' + hms(st.left) + '</div><div style="margin-top:12px">' + FU.bar(st.pct) + '</div>' +
          '<p class="note">Started ' + esc(when(st.start)) + ' · ends ' + esc(when(st.end)) + '. Silence the phone and do something with your hands.' + (FU.notif.available ? ' You get one alert at the end.' : '') + '</p>' +
          '<div class="actions">' + FU.btn('End detox', function () { ui.detoxEnding = true; FU.render(); }, 'ghost') + '</div>';
      }
    } else {
      h += '<p>A minimum of 24 hours, now and then. Pick a length, switch the notifications off and start the clock.</p>' +
        '<div style="margin-top:12px">' + FU.seg([[12, '12 hours'], [24, '24 hours'], [48, '48 hours']], ui.detoxH, function (v) { ui.detoxH = Number(v); FU.render(); }) + '</div>' +
        '<div class="actions">' + FU.btn('Start ' + ui.detoxH + '-hour detox', function () {
          var a = FG.detoxStart(ui.detoxH, now()); FU.save(true); T.haptic(12);
          FU.notify(FG.NID + 900, FD.TITLE.detox, FD.DETOX_MSG, new Date(a.start + a.hours * 36e5), 'reset').then(function (ok) { T.toast(ok ? 'Detox started. One alert at the end.' : 'Detox started. ' + (FU.notif.available ? 'Notifications are off for this app, so there is no alert. ' : 'Alerts work in the installed app. ') + 'Check back at ' + when(a.start + a.hours * 36e5) + '.'); });
          FU.render();
        }) + '</div>';
    }
    h += '<div style="margin-top:14px">' + checklist('det', FD.DETOX) + '</div>';
    var hist = F.detox.hist.slice(0, 3);
    if (hist.length) h += '<div class="lbl mt">Recent detoxes</div><div class="rows">' + hist.map(function (x) {
      return '<div class="row"><span>' + esc(FU.short(dk(new Date(x.start)))) + '<span class="ls">' + (x.done ? 'Completed ' + x.hours + ' hours' : 'Ended early after ' + FG.dur(x.mins)) + '</span>' + (x.note ? '<span class="ls" style="color:var(--fg)">' + esc(x.note) + '</span>' : '') + '</span><span class="tag">' + (x.done ? 'Done' : FG.dur(x.mins)) + '</span></div>';
    }).join('') + '</div>';
    return detailsCard('Digital detox', 'phone', st ? (st.done ? 'Complete' : 'Running: ' + FG.dur(Math.round(st.left / 6e4)) + ' left') : 'At least 24 hours, from time to time', h, !!st);
  }

  /* ----- brutal 24-hour time audit ----- */
  function audVals() { if (!ui.aud) { var k = keyOf(0), a = FG.get().audits[k]; ui.aud = { k: k, v: a ? JSON.parse(JSON.stringify(a)) : {} }; } return ui.aud.v; }
  FU.regions.auditsum = function () {
    var a = audVals(), s = FG.auditStats(a), pc = function (m) { return s.total ? Math.max(0, m / Math.max(1440, s.total) * 100) : 0; };
    if (!s.total) return '<p class="note">Enter your best estimate for the last 24 hours. Round numbers are fine. Nothing here is a judgement, it is a picture.</p>';
    var h = '<div class="stack" style="margin-top:14px" role="img" aria-label="Wasted ' + FG.dur(s.waste) + ', productive ' + FG.dur(s.prod) + ', sleep and rest ' + FG.dur(s.rest) + '"><i class="s-w" style="width:' + pc(s.waste) + '%"></i><i class="s-p" style="width:' + pc(s.prod) + '%"></i><i class="s-r" style="width:' + pc(s.rest) + '%"></i></div>' +
      '<div class="kl"><span><i class="s-w"></i>Low value ' + FG.dur(s.waste) + '</span><span><i class="s-p"></i>Productive ' + FG.dur(s.prod) + '</span><span><i class="s-r"></i>Sleep and rest ' + FG.dur(s.rest) + '</span></div>';
    h += '<div class="callout" style="margin-top:12px">Accounted for: <b>' + FG.dur(s.total) + '</b> of 24h.' + (s.other ? ' Unaccounted: ' + FG.dur(s.other) + '.' : '') + (s.over ? ' That is ' + FG.dur(s.over) + ' over 24 hours. Check the numbers.' : '');
    if (s.prod || s.waste) h += '<br>Productive time is ' + (s.prod >= s.waste ? 'at least as large as' : 'smaller than') + ' low-value time' + (s.prod === s.waste ? '' : ' by ' + FG.dur(Math.abs(s.prod - s.waste))) + '.';
    if (s.top && s.top.m >= 30) h += '<br>Biggest opportunity: <b>' + esc(s.top.t.toLowerCase()) + '</b> (' + FG.dur(s.top.m) + '). Moving 30 minutes a day from it to deep work is 3.5 hours a week.';
    return h + '</div>';
  };
  function auditCard() {
    var F = FG.get(), v = audVals(), list = FG.auditList().slice(-6).reverse();
    var rows = FD.AUDIT.map(function (x) {
      var m = v[x.k] || 0, onc = function (_, el) { var r = el.closest('.prow'), i = r.querySelectorAll('input'), mm = (parseInt(i[0].value, 10) || 0) * 60 + (parseInt(i[1].value, 10) || 0); if (mm > 0) ui.aud.v[x.k] = Math.min(1440, mm); else delete ui.aud.v[x.k]; FU.refresh('auditsum'); };
      return '<div class="prow"><span>' + esc(x.t) + '</span><span class="hm">' + FU.input({ type: 'number', v: m ? Math.floor(m / 60) : '', ph: '0', label: x.t + ' hours', attrs: 'min="0" max="24" step="1"', fn: onc }) + 'h ' +
        FU.input({ type: 'number', v: m ? m % 60 : '', ph: '0', label: x.t + ' minutes', attrs: 'min="0" max="59" step="5"', fn: onc }) + 'm</span></div>';
    }).join('');
    var h = '<p>How did the last 24 hours really go? Estimate each line.</p><div style="margin-top:8px">' + rows + '</div>' + FU.region('auditsum', FU.regions.auditsum()) +
      '<div class="actions">' + FU.btn('Save today\'s audit', function () { var a = ui.aud.v; if (!FG.auditStats(a).total) { T.toast('Add at least one line first.'); return; } F.audits[ui.aud.k] = JSON.parse(JSON.stringify(a)); FU.save(); T.haptic(10); T.toast('Audit saved.'); ui.aud = null; FU.render(); }) + '</div>';
    if (list.length) {
      h += '<div class="lbl mt">Your audits over time</div>' + list.map(function (x, i) {
        var s = x.s, tot = Math.max(1440, s.total), prev = list[i + 1], dl = prev ? s.waste - prev.s.waste : null;
        return '<div style="padding:9px 0;border-top:1px solid var(--line)"><div style="display:flex;justify-content:space-between;gap:10px;font-size:13.5px"><span>' + esc(FU.short(x.k)) + '</span><span class="dim tn">' + FG.dur(s.waste) + ' low value' + (dl == null || dl === 0 ? '' : ', ' + (dl < 0 ? '\u2212' : '+') + Math.abs(dl) + ' min') + '</span></div>' +
          '<div class="stack" style="margin-top:7px;height:8px"><i class="s-w" style="width:' + s.waste / tot * 100 + '%"></i><i class="s-p" style="width:' + s.prod / tot * 100 + '%"></i><i class="s-r" style="width:' + s.rest / tot * 100 + '%"></i></div></div>';
      }).join('') + '<p class="note">Each bar: the strongest shade is low value, the middle shade is productive, the faintest is sleep and rest. The number on the right compares with the audit before it.</p>';
    }
    return detailsCard('Brutal 24-hour time audit', 'clock', list.length ? list.length + ' saved' : 'See where the day really goes', h, false);
  }

  /* ----- distractions, environment, sleep, energy, principles ----- */
  function distractCard() {
    var F = FG.get(), h = '<p>Name the three things that pull your attention most. Naming them is the first step to controlling them.</p><div style="margin-top:8px">' +
      [0, 1, 2].map(function (i) { return '<div class="pr">' + '<span class="pn" style="flex:none">' + (i + 1) + '</span>' + FU.input({ v: F.distract[i] || '', ph: ['The biggest one', 'Second', 'Third'][i], label: 'Distraction ' + (i + 1), fn: function (v) { F.distract[i] = v; FU.save(true); } }) + '</div>'; }).join('') + '</div>' +
      '<p class="note">For each one, set a rule: a daily limit or a phone-free window. Uninstall the worst app for a while.</p>';
    return detailsCard('Your three biggest distractions', 'eye', (F.distract || []).filter(Boolean).length ? (F.distract || []).filter(Boolean).length + ' named' : 'Name them', h, false);
  }
  function envCard() { return detailsCard('Environmental reset', 'layers', 'Clear the space, clear the head', checklist('env', FD.ENV), false); }
  function sleepCard() {
    var P = FG.get().prof, n = new Date(), sub = FG.shiftOn() ? 'Today: wake ' + FG.fmtT(FG.targets(T.dkey(n)).wake) + ', bed ' + FG.fmtT(FG.nightBed(n) % 1440) : 'Wake ' + P.wake + ', bed ' + P.bed;
    return detailsCard('Sleep and morning reset', 'moon', sub, checklist('slp', FD.SLEEP) + '<p class="note">Never force a 4:00 wake-up if it costs you sleep. Your times are in Settings' + (FG.shiftOn() ? ', one set for each kind of shift' : '') + '. Log last night on the Today screen.</p>', false);
  }
  function energyCard() {
    var F = FG.get(), en = F.energy, list = function (kind, title) {
      var items = en.map(function (e, i) { return e.kind === kind ? { e: e, i: i } : null; }).filter(Boolean);
      var rows = items.map(function (x) { return '<div class="row" style="align-items:center"><span>' + esc(x.e.t) + '</span>' + FU.btn('Remove', function () { en.splice(x.i, 1); FU.save(true); FU.render(); }, 'text') + '</div>'; }).join('');
      var addIt = function () { var t = (ui.enAdd[kind] || '').trim(); if (!t) { T.toast('Type an activity first.'); return; } en.push({ t: t.slice(0, 80), kind: kind }); ui.enAdd[kind] = ''; FU.save(true); T.haptic(8); FU.render(); };
      return '<div class="lbl mt">' + title + ' · ' + items.length + '</div>' + (rows ? '<div class="rows">' + rows + '</div>' : '') +
        '<div class="pr">' + FU.input({ v: ui.enAdd[kind], ph: kind === 'gain' ? 'e.g. Reading, a long walk' : 'e.g. Late-night scrolling', label: 'Add an energy ' + kind + 'er', fn: function (v) { ui.enAdd[kind] = v; } }) + FU.btn('Add', addIt, 'mini') + '</div>';
    };
    var h = '<div class="callout">' + FD.ENERGY.ask.map(esc).join('<br>') + '</div>' + list('gain', 'Energy gainers') + '<p class="note">' + esc(FD.ENERGY.gain.join(' ')) + '</p>' + list('drain', 'Energy drainers') + '<p class="note">' + esc(FD.ENERGY.drain.join(' ')) + '</p>' +
      '<p class="note">Reduce or remove one drainer this week. Do one gainer more often.</p>';
    return detailsCard('Energy audit', 'zap', en.length ? en.filter(function (e) { return e.kind === 'gain'; }).length + ' gainers, ' + en.filter(function (e) { return e.kind === 'drain'; }).length + ' drainers' : 'What builds you, what drains you', h, false);
  }
  function principlesCard() {
    return detailsCard('The seven principles', 'book', 'What the system is built on', '<div class="rows">' + FD.PRINCIPLES.map(function (p) { return '<div class="row"><span><b class="b">' + esc(p[0]) + '</b><span class="ls">' + esc(p[1]) + '</span></span></div>'; }).join('') + '</div>', false);
  }

  FU.views.reset = function () {
    var h = '<div class="greet"><div><h1>Reset</h1><p>Five phases, in order. Do the next small thing.</p></div></div>';
    h += phasesCard() + detoxCard() + auditCard() + distractCard() + envCard() + sleepCard() + energyCard() + principlesCard();
    return h;
  };
  /* the detox countdown ticks once a second while the Reset screen is open */
  setInterval(function () {
    if (FU.view !== 'reset') return; var el = document.getElementById('dxl'); if (!el) return;
    var st = FG.detoxStatus(now()); if (!st) return;
    if (st.done) { if (!FU.editing()) FU.render(); return; }
    el.textContent = hms(st.left);
  }, 1000);

  /* =================== MISSION =================== */
  function newDraft(type) {
    var M = FD.MISSIONS[type];
    return { type: type, title: '', unit: M.unit, start: '', target: '', from: dk(now()), due: dk(add(now(), 60)), s1: '', s2: '' };
  }
  function draftFrom(m) { var s = m.support || []; return { type: m.type, title: m.title, unit: m.unit || '', start: m.start, target: m.target, from: m.from, due: m.due, s1: s[0] ? s[0].title : '', s2: s[1] ? s[1].title : '', editing: true }; }
  function chooseView() {
    var h = '<div class="greet"><div><h1>Mission</h1><p>One primary mission for the next 30 to 90 days.</p></div></div>';
    h += FU.card('Choose one', 'target', '<div class="rows">' + Object.keys(FD.MISSIONS).map(function (k) {
      var M = FD.MISSIONS[k];
      return '<button class="rmain" style="width:100%;border-top:1px solid var(--line);padding:14px 0" data-act="' + FU.reg(function () { ui.mDraft = newDraft(k); FU.render(); }) + '"><span class="rtx"><b>' + esc(M.t) + '</b><span>' + esc(M.d) + '</span><span style="margin-top:3px">For example: ' + esc(M.eg) + '</span></span></button>';
    }).join('').replace('border-top:1px solid var(--line);', 'border-top:0;') + '</div>');
    h += FU.card('The rules', 'list', '<ul class="bl"><li>One primary mission. No more than two supporting missions.</li><li>A measurable goal with a deadline.</li><li>1 to 3 hours of deep work a day, adjusted to your real life.</li><li>No multitasking. Review the results every week.</li></ul>');
    return h;
  }
  function formView() {
    var d = ui.mDraft, M = FD.MISSIONS[d.type], long = d.from && d.due && (FU.parse(d.due) - FU.parse(d.from)) / 864e5 > 90;
    var h = '<div class="greet"><div><h1>' + (d.editing ? 'Edit mission' : 'New mission') + '</h1><p>' + esc(M.t) + ': ' + esc(M.d) + '</p></div></div>';
    var body = field('What exactly will you achieve?', FU.input({ v: d.title, ph: M.eg, label: 'Mission', fn: function (v) { d.title = v; } })) +
      '<div class="tfs">' + field('Measured in', FU.input({ v: d.unit, ph: 'km, Rp, %, projects', label: 'Unit', fn: function (v) { d.unit = v; } })) + '<span></span>' +
      field('Where you start', FU.input({ type: 'number', v: d.start, ph: '0', label: 'Start value', attrs: 'step="any"', fn: function (v) { d.start = v; } })) +
      field('Your target', FU.input({ type: 'number', v: d.target, ph: M.unit === '%' ? '100' : '', label: 'Target value', attrs: 'step="any"', fn: function (v) { d.target = v; } })) +
      field('Starts', FU.input({ type: 'date', v: d.from, label: 'Start date', fn: function (v) { d.from = v; } })) +
      field('Deadline', FU.input({ type: 'date', v: d.due, label: 'Deadline', fn: function (v) { d.due = v; FU.render(); } })) + '</div>' +
      (long ? '<p class="note">That is more than 90 days. Missions work best at 30 to 90 days. A longer one is fine if you split it into stages.</p>' : '') +
      '<div class="lbl mt">Supporting missions (at most two, optional)</div><div class="pr" style="margin-top:0">' + FU.input({ v: d.s1, ph: 'Supporting mission 1', label: 'Supporting mission 1', fn: function (v) { d.s1 = v; } }) + '</div>' +
      '<div class="pr">' + FU.input({ v: d.s2, ph: 'Supporting mission 2', label: 'Supporting mission 2', fn: function (v) { d.s2 = v; } }) + '</div>' +
      '<div class="actions">' + FU.btn('Save mission', function () {
        var s = num(d.start), t = num(d.target);
        if (!d.title.trim()) { T.toast('Describe the mission first.'); return; }
        if (s == null || t == null || s === t) { T.toast('Set a start and a different target, so progress can be measured.'); return; }
        if (!d.from || !d.due || d.due <= d.from) { T.toast('The deadline must be after the start date.'); return; }
        var F = FG.get(), old = F.mission && d.editing ? F.mission : null, cur = old && old.cur != null && old.cur !== '' ? old.cur : s;
        F.mission = { type: d.type, title: d.title.trim(), unit: d.unit.trim(), start: s, target: t, cur: cur, from: d.from, due: d.due, support: [d.s1, d.s2].map(function (x) { return String(x || '').trim(); }).filter(Boolean).map(function (x) { return { title: x }; }), log: old && old.log ? old.log : [] };
        if (old && old.done && cur !== t) { /* a changed target reopens a finished mission */ }
        ui.mDraft = null; FU.save(); T.haptic(12); T.toast('Mission saved.'); FU.render();
      }) + FU.btn('Cancel', function () { ui.mDraft = null; FU.render(); }, 'ghost') + '</div>';
    return h + FU.card('Your mission', 'target', body, '<span class="chip">' + esc(M.t) + '</span>');
  }
  function overview() {
    var n = now(), ms = FG.missionStats(n), m = ms.m, W = FG.windowStats(n, 7), F = FG.get(), pct = ms.pct == null ? 0 : ms.pct, done = ms.status === 'Done';
    var h = '<div class="greet"><div><h1>Mission</h1><p>' + esc(FD.MISSIONS[m.type] ? FD.MISSIONS[m.type].t : m.type) + (m.done ? ' · completed ' + esc(FU.mon(m.done)) : '') + '</p></div></div>';
    var hero = '<div class="hero"><div style="min-width:0"><div class="eyebrow">' + esc(FD.MISSIONS[m.type] ? FD.MISSIONS[m.type].t : '') + '</div><div style="font-size:19px;font-weight:700;letter-spacing:-.02em;line-height:1.25">' + esc(m.title) + '</div>' +
      '<div class="cap">' + esc(fmtVal(m.cur == null || m.cur === '' ? m.start : m.cur, m.unit)) + ' of ' + esc(fmtVal(m.target, m.unit)) + (ms.left != null ? ' · ' + (ms.left >= 0 ? ms.left + ' days left' : -ms.left + ' days past the deadline') : '') + '</div></div>' + FU.ring(pct) + '</div>';
    hero += '<div style="margin-top:16px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>Progress</span><span class="tn">' + pct + '%</span></div>' + FU.bar(pct) + '</div>';
    if (ms.timePct != null) hero += '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span class="dim">Time used</span><span class="tn dim">' + ms.timePct + '%</span></div>' + FU.bar(ms.timePct, 'soft') + '</div>';
    if (ms.status) hero += '<div class="chips"><span class="chip' + (ms.status === 'Behind' ? '' : ' solid') + '">' + ms.status + '</span>' + (ms.status === 'Behind' ? '<span class="dim sm" style="align-self:center">Progress trails the calendar by ' + (ms.timePct - pct) + ' points.</span>' : '') + '</div>';
    h += '<section class="card">' + hero + '</section>';
    /* update progress */
    var cur = m.cur == null || m.cur === '' ? m.start : m.cur, log = (m.log || []).slice(-3).reverse();
    h += FU.card('Update your progress', 'trend', '<div class="pr" style="margin-top:0">' + FU.input({ type: 'number', v: ui.mCur !== '' ? ui.mCur : '', ph: 'Now: ' + group(cur), label: 'Current value', attrs: 'step="any"', fn: function (v) { ui.mCur = v; } }) + FU.btn('Save', function () {
      var x = num(ui.mCur); if (x == null) { T.toast('Enter where you are now.'); return; }
      m.cur = x; m.log = (m.log || []).concat([{ k: dk(now()), v: x }]).slice(-20); if (m.done && FG.missionStats(now()).status !== 'Done') delete m.done;
      ui.mCur = ''; FU.save(); T.haptic(10); T.toast('Progress saved.'); FU.render();
    }, 'mini') + '</div>' + (log.length ? '<div class="lbl mt">Recent updates</div><div class="rows">' + log.map(function (x) { return '<div class="row"><span>' + esc(FU.short(x.k)) + '</span><span class="tn">' + esc(fmtVal(x.v, m.unit)) + '</span></div>'; }).join('') + '</div>' : '<p class="note">Update it after each work session. Real numbers only.</p>'));
    /* deep work */
    var pd = W.deepGoal ? Math.min(100, Math.round(W.deep / W.deepGoal * 100)) : 0;
    h += FU.card('Deep work on the mission', 'clock', '<div class="hero"><div><div class="num tn" style="font-size:30px">' + FU.hrs(W.deep) + '</div><div class="cap">' + (W.deepGoal ? 'of ' + FU.hrs(W.deepGoal) + ' in the last ' + W.days + (W.days === 1 ? ' day' : ' days') : 'No days tracked yet') + '</div></div></div>' + (W.deepGoal ? '<div style="margin-top:12px">' + FU.bar(pd) + '</div>' : '') +
      '<p class="note">Aim for 1 to 3 hours a day, adjusted to your real life. Study sessions from Goals count too.</p>');
    /* supporting missions */
    if ((m.support || []).length) h += FU.card('Supporting missions', 'list', '<div class="rows">' + m.support.map(function (s) { return '<div class="row"><span>' + esc(s.title) + '</span></div>'; }).join('') + '</div><p class="note">Support the primary mission. Do not let them take it over.</p>');
    /* this week's priorities */
    var wp = [0, 1, 2].map(function (i) { return F.weekPri && F.weekPri[i] ? { t: F.weekPri[i].t || '', x: F.weekPri[i].x ? 1 : 0 } : { t: '', x: 0 }; });
    h += FU.card('This week\'s three priorities', 'check', wp.map(function (p, i) {
      var tick = FU.reg(function () { if (!wp[i].t.trim()) { T.toast('Write the priority first.'); return; } wp[i].x = wp[i].x ? 0 : 1; F.weekPri = wp; FU.save(true); T.haptic(8); FU.render(); });
      return '<div class="pr' + (p.x ? ' is-on' : '') + '" style="' + (i ? '' : 'margin-top:0') + '"><button class="cb" data-act="' + tick + '" aria-pressed="' + (p.x ? 'true' : 'false') + '" aria-label="Mark priority ' + (i + 1) + '">' + FU.chk() + '</button>' +
        FU.input({ v: p.t, ph: 'Priority ' + (i + 1), label: 'Weekly priority ' + (i + 1), fn: function (v) { wp[i].t = v; F.weekPri = wp; FU.save(true); } }) + '</div>';
    }).join('') + '<p class="note">Set in your weekly review (question 8), or write them here.</p>');
    /* actions */
    h += '<div class="actions">' + FU.btn('Edit mission', function () { ui.mDraft = draftFrom(m); FU.render(); }, 'ghost') +
      (done ? '' : FU.btn('Mark as complete', function () { m.cur = m.target; m.done = dk(now()); m.log = (m.log || []).concat([{ k: dk(now()), v: m.target }]).slice(-20); FU.save(); T.haptic(14); T.toast('Mission complete.'); FU.render(); }, 'ghost')) + '</div>' +
      '<div class="actions" style="margin-top:8px">' + confirmBtn('mnew', 'Start a different mission', 'Tap again to replace this mission', function () { F.mission = null; FU.save(); ui.mDraft = null; FU.render(); }, 'text') + '</div>';
    return h;
  }
  FU.views.mission = function () {
    if (ui.mDraft) return ui.mDraft.type ? formView() : chooseView();
    return FG.missionStats(now()) ? overview() : chooseView();
  };
})();
