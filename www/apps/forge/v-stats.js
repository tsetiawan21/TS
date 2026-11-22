/* Forge: the Stats dashboard (ten metrics, trends, habits, obstacles, corrective actions) and the Weekly review. */
(function () {
  'use strict';
  var FU = window.FU, FG = window.FG, FD = window.FD, T = window.TS, esc = T.esc, dk = T.dkey, add = T.addDays;
  var ui = FU.ui; ui.win = 7; ui.rv = null;
  var now = function () { return new Date(); };
  var MINUS = '−';
  function delta(d) { return d == null ? '' : (d > 0 ? '+' : d < 0 ? MINUS : '') + Math.abs(d) + (d === 0 ? ' points, no change' : ' points'); }
  function tile(label, big, small, sub, pc) {
    return '<div class="tile"><div class="k">' + esc(label) + '</div><b>' + big + (small ? '<small>' + esc(small) + '</small>' : '') + '</b><div class="s">' + esc(sub) + '</div>' + (pc == null ? '' : FU.bar(pc)) + '</div>';
  }
  function dayBars(rows) {
    return '<div class="chart" role="img" aria-label="Completion for each of the last 7 days">' + rows.map(function (r, i) {
      var h = r.pct == null ? 0 : Math.max(3, r.pct);
      return '<div class="bc"><div class="bt" title="' + esc(FU.short(r.k)) + ': ' + FU.pct(r.pct) + '"><i class="' + (i === rows.length - 1 ? 'hi' : '') + '" style="height:' + h + '%"></i></div><span>' + esc(FU.letter(r.k)) + '</span></div>';
    }).join('') + '</div>';
  }
  function habRows(hab) {
    var list = hab.slice().sort(function (a, b) { return (a.pct == null ? 999 : a.pct) - (b.pct == null ? 999 : b.pct); });
    return list.map(function (h) {
      return '<div class="hbar"><span class="t">' + esc(h.t) + (h.pct != null && h.tot >= 2 && h.pct < 60 ? ' <span class="chip" style="padding:1px 7px;font-size:11px;margin-left:4px">Slipping</span>' : '') + '</span>' + FU.bar(h.pct || 0) + '<span class="v">' + (h.tot ? h.done + '/' + h.tot : '–') + '</span></div>';
    }).join('');
  }
  function obstacles(W) {
    var F = FG.get(), o = [];
    W.obstacles.forEach(function (x) { o.push(x.t + ': named on ' + x.n + (x.n === 1 ? ' day' : ' days') + ' you fell short.'); });
    var dist = (F.distract || []).filter(Boolean); if (dist.length) o.push('Distractions you named: ' + dist.join(', ') + '.');
    var al = FG.auditList(), last = al[al.length - 1];
    if (last && last.s.top && last.s.top.m >= 30) o.push('Biggest time sink in your latest audit: ' + last.s.top.t.toLowerCase() + ', ' + FG.dur(last.s.top.m) + '.');
    return o;
  }
  function areas(W) {
    var a = [], P = FG.get().prof;
    W.hab.filter(function (h) { return h.tot >= 2 && h.pct != null && h.pct < 60; }).sort(function (x, y) { return x.pct - y.pct; }).forEach(function (h) { a.push(h.t + ': done on ' + h.done + ' of ' + h.tot + ' days.'); });
    if (W.sleep.n >= 3 && W.sleep.cons < 60) a.push('Sleep schedule: steady on ' + W.sleep.steady + ' of ' + W.sleep.n + ' logged nights.');
    if (W.sleep.n >= 3 && W.sleep.avgDur < 420) a.push('Sleep length: ' + FG.dur(W.sleep.avgDur) + ' on average. Aim for 7 to 9 hours.');
    if (W.screen.n >= 3 && P.screenGoal && W.screen.over >= 2) a.push('Screen time: over your limit on ' + W.screen.over + ' of ' + W.screen.n + ' logged days.');
    if (W.days >= 4 && W.exTarget && W.ex < W.exTarget) a.push('Training: ' + W.ex + ' of ' + W.exTarget + ' planned days.');
    if (W.days >= 3 && W.deepGoal && W.deep < W.deepGoal * 0.6) a.push('Deep work: ' + FU.hrs(W.deep) + ' of ' + FU.hrs(W.deepGoal) + '.');
    var ms = FG.missionStats(now()); if (ms && ms.status === 'Behind') a.push('Mission: ' + ms.pct + '% done with ' + ms.timePct + '% of the time used.');
    return a.slice(0, 6);
  }
  function bullets(a, empty) { return a.length ? '<ul class="bl">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="dim">' + esc(empty) + '</p>'; }
  function actionRows(list) {
    return list.map(function (a, i) { return '<div class="act"><span class="n">' + (i + 1) + '</span><div><b>' + esc(a.todo) + '</b><span>' + esc(a.why) + '</span></div></div>'; }).join('');
  }

  /* completion on each kind of day, when you follow your work shifts */
  var KL = { morning: 'Morning shift days', afternoon: 'Afternoon shift days', off: 'Days off' };
  function kindCard(W) {
    if (!FG.shiftOn() || !W.types) return '';
    var ty = W.types, ks = ['morning', 'afternoon', 'off'].filter(function (k) { return ty[k].n > 0; });
    if (!ks.length) return '';
    var rows = ks.map(function (k) { return '<div class="hbar"><span class="t">' + esc(FU.SHL[k]) + '<span class="ls">' + ty[k].n + (ty[k].n === 1 ? ' day' : ' days') + '</span></span>' + FU.bar(ty[k].avg) + '<span class="v">' + ty[k].avg + '%</span></div>'; }).join('');
    var note = ty.none.n ? ty.none.n + (ty.none.n === 1 ? ' tracked day has' : ' tracked days have') + ' no shift set, so ' + (ty.none.n === 1 ? 'it is' : 'they are') + ' left out. Set shifts in Goals or in Settings.' : 'Average completion on each kind of day.';
    return FU.card('Work days and days off', 'clock', rows + '<p class="note">' + esc(note) + '</p>');
  }
  /* the same, as rows for the weekly review */
  function kindRows(R) {
    if (!FG.shiftOn() || !R.types) return '';
    return ['morning', 'afternoon', 'off'].filter(function (k) { return R.types[k].n > 0; }).map(function (k) {
      return '<div class="row"><span>' + esc(KL[k]) + '</span><span class="tn">' + R.types[k].avg + '% (' + R.types[k].n + (R.types[k].n === 1 ? ' day)' : ' days)') + '</span></div>';
    }).join('');
  }

  /* =================== STATS =================== */
  FU.views.stats = function () {
    var n = now(), S = FG.stats(n), W = ui.win === 30 ? S.M : S.W, label = ui.win === 30 ? '30 days' : '7 days', ms = S.mission, h = '';
    h += '<div class="greet"><div><h1>Stats</h1><p>Your real numbers. Days before you started do not count.</p></div></div>';
    h += '<div style="margin:0 0 12px">' + FU.seg([[7, 'Last 7 days'], [30, 'Last 30 days']], ui.win, function (v) { ui.win = Number(v); FU.render(); }) + '</div>';
    var wk = S.week, mo = S.month;
    h += '<section class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><div class="eyebrow">Weekly performance</div><div class="num">' + (wk ? wk.avg + '<small>%</small>' : '–') + '</div><div class="cap">' + (wk ? esc(wk.band.label) : 'Starts after your first full day') + (wk && S.prevWeek ? '<br>' + esc(delta(wk.avg - S.prevWeek.avg)) + ' vs the week before' : '') + '</div></div>' +
      '<div><div class="eyebrow">Monthly progress</div><div class="num">' + (mo ? mo.avg + '<small>%</small>' : '–') + '</div><div class="cap">' + (mo ? esc(mo.band.label) : 'Needs a few days of data') + (mo && S.prevMonth ? '<br>' + esc(delta(mo.avg - S.prevMonth.avg)) + ' vs the 30 days before' : '') + '</div></div></div></section>';
    var t = S.today, dpc = W.deepGoal ? Math.min(100, Math.round(W.deep / W.deepGoal * 100)) : null, epc = W.exTarget ? Math.min(100, Math.round(W.ex / W.exTarget * 100)) : null;
    h += '<div class="tiles">' +
      tile('Daily completion', t.pct, '%', 'Today: ' + t.n + ' of ' + t.total + ' rituals', t.pct) +
      tile('Habit streak', S.streak, S.streak === 1 ? 'day' : 'days', 'Best: ' + S.best + (S.best === 1 ? ' day' : ' days'), null) +
      tile('Deep work, ' + label, FU.hrs(W.deep), '', W.deepGoal ? 'Goal ' + FU.hrs(W.deepGoal) : 'No days tracked yet', dpc) +
      tile('Learning, ' + label, FU.hrs(W.learn), '', W.days ? Math.round(W.learn / W.days) + ' min a day' : 'No days tracked yet', null) +
      tile('Training, ' + label, W.ex, W.exTarget ? 'of ' + W.exTarget : 'days', W.exTarget ? 'Planned days done' : 'No target or no days yet', epc) +
      tile('Screen time', W.screen.n ? FG.dur(W.screen.avg) : '–', '', W.screen.n ? 'Daily average, ' + W.screen.n + ' days logged' + (W.screen.over ? '. Over the limit on ' + W.screen.over : '') : 'Log it on the Today screen', null) +
      tile('Sleep consistency', W.sleep.n ? W.sleep.cons : '–', W.sleep.n ? '%' : '', W.sleep.n ? 'Steady on ' + W.sleep.steady + ' of ' + W.sleep.n + ' nights' : 'Log your sleep to see it', W.sleep.n ? W.sleep.cons : null) +
      tile('Primary mission', ms && ms.pct != null ? ms.pct : '–', ms && ms.pct != null ? '%' : '', ms ? (ms.status || 'Set') + (ms.left != null && ms.left >= 0 ? ', ' + ms.left + ' days left' : '') : 'Choose one on the Mission tab', ms && ms.pct != null ? ms.pct : null) + '</div>';
    h += FU.card('Last 7 days', 'chart', dayBars(S.days7) + '<p class="note">Each bar is one day\'s completion. The solid bar is the most recent day.</p>');
    h += FU.card('Last 30 days', 'cal', '<div class="heat" role="img" aria-label="Completion for each of the last 30 days">' + S.heat.map(function (c) {
      return '<div class="hc ' + (c.pct == null ? 'n' : 'l' + FG.bandOf(c.pct).i) + '" title="' + esc(FU.short(c.k)) + ': ' + FU.pct(c.pct) + '"></div>';
    }).join('') + '</div><div class="legend">Lower' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="hc l' + i + '" style="aspect-ratio:auto;border-radius:3px"></i>'; }).join('') + 'Higher<span style="margin-left:10px;display:inline-flex;align-items:center;gap:5px"><i class="hc n" style="aspect-ratio:auto;border-radius:3px"></i>Not tracked</span></div>');
    h += kindCard(W);
    h += FU.card('Habits: what holds and what slips', 'list', (W.days ? habRows(W.hab) + '<p class="note">Done on the ' + W.days + ' tracked days of the last ' + label + '. "Slipping" means done on fewer than 60% of days.</p>' : '<p class="dim">No completed days yet. This fills in from tomorrow.</p>'));
    h += FU.card('Main obstacles', 'eye', bullets(obstacles(W), 'Nothing logged yet. When a day goes badly, tell Forge why on the Today screen and the pattern shows up here.'));
    h += FU.card('Areas that need work', 'target', bullets(areas(W), W.days >= 3 ? 'Nothing is clearly below target. Keep the basics steady.' : 'Needs a few days of data.'));
    h += FU.card('Recommended corrective actions', 'zap', actionRows(FG.advice(n, 3)) + '<p class="note">Rule-based, from your own numbers. For deeper coaching, use the brief for Claude in the Review tab.</p>');
    return h;
  };

  /* =================== WEEKLY REVIEW =================== */
  FU.briefCard = function () {
    var text = function () { return FG.brief(now()); };
    return FU.card('Ask Claude to coach you', 'send',
      '<p>Forge coaches you with rules and your own numbers, and works with no internet. For deeper coaching, send the brief below to Claude. It holds the full Forge Protocol prompt and your real data.</p>' +
      '<div class="actions">' + FU.btn('Copy the brief', function () { FU.copy(text()).then(function (ok) { T.toast(ok ? 'Brief copied. Paste it into a chat with Claude.' : 'Could not copy. Try Share.'); }); T.haptic(8); }) +
      FU.btn('Share', function () { FU.share('Forge coaching brief', text()).then(function (ok) { if (!ok) T.toast('Sharing is not available here. Use Copy.'); }); }, 'ghost') + '</div>' +
      '<details style="margin-top:12px"' + FU.det('brief', false) + '><summary class="dim sm" style="cursor:pointer">See the data it contains</summary><pre class="brief">' + esc(FG.briefData(now())) + '</pre></details>' +
      '<p class="note">Nothing leaves your phone unless you send it.</p>');
  };
  function hint(html) { return html ? '<div class="hint">' + html + '</div>' : ''; }
  FU.views.review = function () {
    var n = now(), R = FG.reviewData(n), F = FG.get(), h = '';
    if (!ui.rv || ui.rv.key !== R.key) { var a = R.answers ? R.answers.slice(0, 8) : []; while (a.length < 8) a.push(''); ui.rv = { key: R.key, a: a }; }
    var A = ui.rv.a, due = FG.reviewDue(n);
    h += '<div class="greet"><div><h1>Weekly review</h1><p>' + esc(FU.short(R.from)) + ' to ' + esc(FU.short(R.end)) + '</p></div></div>';
    h += '<section class="card"><p>' + (R.saved ? '<b class="b">Saved today.</b> You can still change your answers.' : due ? '<b class="b">Your review is ready.</b> Read the numbers, answer eight honest questions, save.' : 'Read the numbers, answer eight honest questions, save. It takes about five minutes.') + '</p><div class="actions">' +
      FU.btn('Go to the questions', function () { var q = document.getElementById('rvq'); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'ghost') + '</div></section>';
    /* 1. performance summary */
    var av = R.avg, hasAvg = !!av;
    h += FU.card('Weekly performance summary', 'chart',
      '<div class="hero"><div><div class="num">' + (hasAvg ? av.avg + '<small>%</small>' : '–') + '</div><div class="cap">' + (hasAvg ? esc(av.band.label) + (R.delta != null ? ' · ' + esc(delta(R.delta)) + ' vs the week before' : '') : 'No completed days yet') + '</div></div>' + (hasAvg ? FU.ring(av.avg) : '') + '</div>' +
      '<div style="margin-top:16px">' + dayBars(R.rows) + '</div>' +
      '<div class="rows" style="margin-top:12px">' +
      (R.best ? '<div class="row"><span>Best day</span><span class="tn">' + esc(FU.short(R.best.k)) + ', ' + R.best.pct + '%</span></div><div class="row"><span>Hardest day</span><span class="tn">' + esc(FU.short(R.worst.k)) + ', ' + R.worst.pct + '%</span></div>' : '') +
      kindRows(R) +
      '<div class="row"><span>Deep work</span><span class="tn">' + FU.hrs(R.deep) + (R.deepGoal ? ' of ' + FU.hrs(R.deepGoal) : '') + '</span></div>' +
      '<div class="row"><span>Learning</span><span class="tn">' + FU.hrs(R.learn) + '</span></div>' +
      '<div class="row"><span>Training days</span><span class="tn">' + R.ex + (R.exTarget ? ' of ' + R.exTarget : '') + '</span></div>' +
      '<div class="row"><span>Sleep consistency</span><span class="tn">' + (R.sleep.n ? R.sleep.cons + '% (' + R.sleep.steady + ' of ' + R.sleep.n + ' nights)' : 'not logged') + '</span></div>' +
      '<div class="row"><span>Screen time</span><span class="tn">' + (R.screen.n ? FG.dur(R.screen.avg) + ' a day' : 'not logged') + '</span></div></div>');
    /* 2. habits */
    h += FU.card('Habit consistency report', 'list', R.avg ? habRows(R.rituals) : '<p class="dim">No completed days yet.</p>');
    /* 3. energy audit */
    var gl = R.energy.gain.map(function (e) { return e.t; }), dl = R.energy.drain.map(function (e) { return e.t; });
    h += FU.card('Energy audit', 'zap', (gl.length || dl.length) ?
      '<div class="lbl">Gained energy</div><p>' + (gl.length ? esc(gl.join(', ')) : '<span class="dim">None listed</span>') + '</p><div class="lbl mt">Drained energy</div><p>' + (dl.length ? esc(dl.join(', ')) : '<span class="dim">None listed</span>') + '</p>' + (dl.length ? '<p class="note">Reduce or remove one drainer this week.</p>' : '') :
      '<p class="dim">Nothing listed yet. Add what gives you energy and what drains it in the Reset tab, under Energy audit.</p><div class="actions">' + FU.btn('Open Reset', function () { FU.go('reset'); }, 'ghost mini') + '</div>');
    /* 4. mission */
    var ms = R.mission;
    h += FU.card('Primary mission progress', 'target', ms ? '<div class="hero"><div style="min-width:0"><div style="font-weight:600">' + esc(ms.m.title) + '</div><div class="cap">' + (ms.pct == null ? 'No measurable progress set' : ms.pct + '% done' + (ms.timePct != null ? ', ' + ms.timePct + '% of the time used' : '')) + (ms.status ? ' · ' + ms.status : '') + '</div></div></div>' + (ms.pct != null ? '<div style="margin-top:12px">' + FU.bar(ms.pct) + '</div>' : '') :
      '<p class="dim">No mission yet. One clear mission is what makes the weekly numbers mean something.</p><div class="actions">' + FU.btn('Choose a mission', function () { FU.go('mission'); }, 'ghost mini') + '</div>');
    /* 5. actions */
    h += FU.card('Three improvement actions', 'zap', actionRows(R.actions) + '<p class="note">Chosen by rule from your numbers. Pick the one you will do first.</p>');
    /* the eight questions */
    var wk = R.rituals.filter(function (x) { return x.tot >= 2 && x.pct != null && x.pct < 60; }).sort(function (x, y) { return x.pct - y.pct; }).slice(0, 3);
    var use = function (i, txt) { return '<button data-act="' + FU.reg(function () { A[i] = txt; FU.render(); }) + '">Use this</button>'; };
    var dist = (F.distract || []).filter(Boolean), al = R.audit && R.audit.s.top && R.audit.s.top.m >= 30 ? R.audit.s.top : null;
    var H = [
      R.best ? hint('Your best day was ' + esc(FU.short(R.best.k)) + ' at ' + R.best.pct + '%.') : '',
      wk.length ? hint('Slipping: ' + esc(wk.map(function (x) { return x.t.toLowerCase() + ' (' + x.done + '/' + x.tot + ')'; }).join(', ')) + '.' + use(1, wk.map(function (x) { return x.t; }).join('; '))) : '',
      (dist.length || al) ? hint((dist.length ? 'You named: ' + esc(dist.join(', ')) + '. ' : '') + (al ? 'Latest audit: ' + esc(al.t.toLowerCase()) + ', ' + FG.dur(al.m) + '.' : '')) : '',
      hint('Tracked: ' + FU.hrs(R.deep) + (R.deepGoal ? ' of ' + FU.hrs(R.deepGoal) : '') + '.' + use(3, FG.dur(R.deep) + ' tracked')),
      ms ? hint(ms.pct == null ? 'No measurable progress set.' : 'Tracker: ' + ms.pct + '% done' + (ms.status ? ', ' + esc(ms.status.toLowerCase()) : '') + '.') : '',
      dl.length ? hint('Your drainers list: ' + esc(dl.join(', ')) + '.') : '',
      '',
      hint('One per line. They become your priorities for the week.')
    ];
    h += '<section class="card" id="rvq"><div class="ch"><h2>' + FU.ic('book') + 'Your eight questions</h2><span class="tag">' + A.filter(function (x) { return String(x).trim(); }).length + ' of 8</span></div>' +
      FD.REVIEW_Q.map(function (q, i) {
        return '<div class="q"><div class="qq"><i>' + (i + 1) + '</i><span>' + esc(q) + '</span></div>' + H[i] + FU.area({ v: A[i], rows: i === 7 ? 3 : 2, ph: i === 7 ? '1. \n2. \n3. ' : 'Your answer', label: q, fn: function (v) { A[i] = v; } }) + '</div>';
      }).join('') +
      '<div class="actions">' + FU.btn(R.saved ? 'Update review' : 'Save review', function () {
        if (!A.some(function (x) { return String(x).trim(); })) { T.toast('Answer at least one question.'); return; }
        FG.saveReview(now(), A); FU.save(); T.haptic(12); T.toast('Review saved. Your priorities are on the Mission tab.'); ui.rv = null; FU.render();
      }) + '</div></section>';
    /* past reviews */
    var keys = Object.keys(F.reviews).sort().reverse().filter(function (k) { return k !== R.key; }).slice(0, 8);
    if (keys.length) h += FU.card('Past reviews', 'cal', '<div class="rows">' + keys.map(function (k) {
      var r = F.reviews[k], qa = FD.REVIEW_Q.map(function (q, i) { return r.a && r.a[i] ? '<div class="lh">' + esc(q) + '</div><p style="white-space:pre-wrap">' + esc(r.a[i]) + '</p>' : ''; }).join('');
      return '<details class="ph"' + FU.det('r:' + k, false) + '><summary><span class="sx"><b>' + esc(FU.short(k)) + '</b><span class="s">' + (r.avg != null ? r.avg + '% · ' + esc(r.band || '') : 'No score') + (r.deep ? ' · deep work ' + FU.hrs(r.deep) : '') + '</span></span></summary><div class="pb" style="padding-left:0">' + (qa || '<p class="dim">No answers saved.</p>') + '</div></details>';
    }).join('') + '</div>');
    h += FU.briefCard();
    return h;
  };
})();
