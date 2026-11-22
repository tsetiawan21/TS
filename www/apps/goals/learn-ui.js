/* Learn tab: dashboard, curriculum, weekly balance, missed-session help. Loaded before app.js, but everything here only runs
   after app.js has defined DB, card, btn, seg, bar, go and the planner functions. */
'use strict';
const LS = { tab: 'overview', cat: null, grp: 'level', open: new Set(), cp: null };
const QZ = {};   /* running quizzes: { shown, mark } per quiz key. Not saved: an unfinished quiz is simply forgotten. */
const pc100 = (a, b) => b ? Math.round(a / b * 100) : 0;
const shortDate = s => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const dayName = (d, now) => { const k = Math.round((startOfDay(d) - startOfDay(now)) / 864e5); return k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : k === -1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long' }); };
const seeLink = w => 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(w.split(',').slice(0, 2).join(' ')) + '&title=Special:MediaSearch&type=image';
const dual = (a, n, m) => `<div class="bar"><b style="width:${pc100(a, n)}%"></b></div><div class="bar mb"><b style="width:${pc100(m, n)}%"></b></div>`;

/* ---------- quiz: answer from memory, reveal, mark yourself ---------- */
function quizHtml(key, items, onSave) {
  const z = QZ[key] || (QZ[key] = { shown: {}, mark: {} }), n = items.length;
  const set = (i, v) => () => { z.mark[i] = v; renderLearn(); };
  let h = '<div class="qz">';
  items.forEach((it, i) => {
    const sh = z.shown[i] || it.a === null, mk = z.mark[i];
    h += `<div class="qi"><div class="qq"><span class="qn">${i + 1}</span><span>${esc(it.q)}</span></div>${it.from ? `<div class="qf">From: ${esc(it.from)}</div>` : ''}`;
    if (!sh) h += `<div class="actions q">${btn('Show answer', () => { z.shown[i] = true; renderLearn(); }, 'ghost')}</div>`;
    else h += (it.a !== null ? `<p class="qa">${esc(it.a)}</p>` : '') + `<div class="actions q">${btn(it.a === null ? 'I can do this' : 'I knew it', set(i, 1), mk === 1 ? '' : 'ghost')}${btn('Not yet', set(i, 0), mk === 0 ? '' : 'ghost')}</div>`;
    h += '</div>';
  });
  const marked = Object.keys(z.mark).length, right = Object.values(z.mark).filter(v => v === 1).length, ok = marked === n;
  h += `<div class="actions">${btn(ok ? `Save result: ${right} of ${n}` : `Answer all ${n} to save`, () => { if (!ok) return; delete QZ[key]; onSave(Math.round(right / n * 100)); }, ok ? '' : 'ghost')}</div></div>`;
  return h;
}
const quizItems = x => x.qa ? x.qa.map(p => ({ q: p[0], a: p[1] })) : [{ q: 'Goal: ' + x.done, a: null }];

/* ---------- one lesson ---------- */
function lCard(x, ph) {
  const st = lstate(x.id), done = lessonDone(x), ma = masteryOf(x.id), need = done ? [] : completeNeeds(x);
  const tag = done ? 'Done' : st.min > 0 ? 'Started' : 'New';
  const ul = a => `<ul class="bl">${a.map(y => `<li>${esc(y)}</li>`).join('')}</ul>`;
  const rem = Math.max(0, x.m - st.min), len = Math.min(90, Math.max(15, Math.round((rem || 30) / 5) * 5));
  let h = `<details class="ln lx" data-oid="${esc(x.id)}"${LS.open.has(x.id) ? ' open' : ''}><summary><span class="chip${done ? ' solid' : ''}">${tag}</span><span class="lt">${esc(x.t)}<span class="dim sm ls">${esc(x.subj)}, ${LV_LABEL[x.lv]}${ma.lvl ? ', ' + ma.label.toLowerCase() : ''}</span></span><span class="dim sm tn">${x.m} min</span></summary><div class="lb">`;
  h += `<div class="mrow"><span class="chip">${LV_LABEL[x.lv]}</span><span class="chip">${x.m} min</span><span class="chip">Difficulty ${x.df} of 5</span>${x.ref ? '<span class="chip">From your roadmap</span>' : ''}</div>`;
  if (x.ref && x.p > ph) h += `<p class="note">Your roadmap schedules this lesson from phase ${x.p}. You can study it earlier here.</p>`;
  h += `<div class="lh">Objectives</div>${ul(x.learn)}<div class="lh">Exercise</div><p>${esc(x.d)}</p>`;
  h += `<div class="actions" style="margin-top:10px">${btn(st.ex ? 'Exercise done (tap to undo)' : 'I did the exercise', () => { setExercise(x.id, !st.ex); renderLearn(); }, st.ex ? '' : 'ghost')}</div>`;
  if (x.ev) h += `<div class="lh">${esc(EV_LABEL[x.sub] || 'Note')}</div><div class="callout">${esc(x.ev)}</div>`;
  if (x.see) h += `<div class="lh">Look at these first</div><ul class="bl see">${x.see.map(w => `<li><a href="${seeLink(w)}" target="_blank" rel="noopener">${esc(w)}</a></li>`).join('')}</ul>`;
  h += `<div class="lh">Check yourself${x.qa ? '' : ' (goal)'}</div><p class="dim sm" style="margin-bottom:6px">${x.qa ? 'Answer aloud or in writing first, then reveal. Pass at 2 of 3.' : 'Be honest: only tap yes if you could do it without notes.'}</p>${quizHtml('l|' + x.id, quizItems(x), p => {
    recordCheck(x.id, p);
    TS.haptic(10);
    if (p >= PASS_PCT && !lessonDone(x)) { TS.toast('Check passed: lesson complete'); markDone(x.id, true); }   /* passing is evidence, so it completes the lesson */
    else { TS.toast(p >= PASS_PCT ? 'Check passed: ' + p + '%' : 'Check ' + p + '%. Revise it and try again soon.'); checkMilestones(); renderLearn(); }
  })}`;
  if (x.res) h += `<div class="lh">Sources</div><p class="dim">${esc(x.res)}</p>`;
  h += `<div class="lh">Your progress</div><div class="rows">
    <div class="row"><span>Studied</span><span class="tn dim">${mmDur(st.min)} of ${mmDur(x.m)}</span></div>
    <div class="row"><span>Completion</span><span class="dim">${done ? 'Complete' + (st.cd ? ', ' + shortDate(st.cd) : '') : 'Not complete'}</span></div>
    <div class="row"><span>Mastery</span><span class="dim">${esc(ma.label)}${ma.n ? `, ${ma.n} check${ma.n > 1 ? 's' : ''}, last ${ma.last[1]}% on ${shortDate(ma.last[0])}` : ''}</span></div>
    ${st.rv ? `<div class="row"><span>Next revision</span><span class="dim tn" style="white-space:nowrap">${shortDate(st.rv.due)}</span></div>` : ''}</div>`;
  if (!done && need.length) h += `<p class="note">To complete this lesson: ${need.join(' and ')}. Or pass the check above (2 of 3), or study its full ${x.m} minutes. Opening a lesson never completes it.</p>`;
  h += `<div class="actions">${btn('Start a session', () => startLesson({ category: x.sub, lesson: x, len }))}${!done && !need.length ? btn('Complete lesson', () => markDone(x.id, true), 'ghost') : ''}${done && st.done ? btn('Reopen', () => markDone(x.id, false), 'ghost') : ''}</div>`;
  return h + '</div></details>';
}

/* ---------- category rows, lists ---------- */
function catRow(c, blurb) {
  const lv = LV_KEYS.map(k => `${LV_LABEL[k]} ${c.lv[k].d}/${c.lv[k].n}`).join(', ');
  return `<button class="crow" data-act="${reg(() => { LS.tab = 'path'; LS.cat = c.cat; LS.cp = null; renderLearn(); $v.scrollTop = 0; })}"><div class="gl"><span><b>${esc(shortName(c.cat))}</b></span><span class="dim tn">${c.d} / ${c.n}</span></div>${dual(c.d, c.n, c.ms)}<div class="dim sm" style="margin-top:6px">${blurb ? esc(LEARN_META[c.cat].blurb) : lv + (c.ms ? ', ' + c.ms + ' mastered' : '')}</div>${blurb && c.ms ? `<div class="dim sm" style="margin-top:4px">${c.ms} mastered</div>` : ''}</button>`;
}
function lCatList() {
  const t = pathTotals();
  return card('Eight categories', 'book', `<div class="rows">${t.cats.map(c => catRow(c, true)).join('')}</div><p class="note">Thick bar: lessons completed. Thin bar: lessons mastered.</p>`);
}
function cpCard(cat) {
  const rows = LV_KEYS.map(lv => {
    const a = cpAvail(cat, lv), rec = (DB.cp || {})[cpKey(cat, lv)], open = LS.cp === lv;
    const stt = rec && rec.best >= CP_PASS ? `Passed, best ${rec.best}%` : a.ok ? (rec ? `Best ${rec.best}%, try again` : 'Ready') : `Complete ${a.need} of ${a.n} lessons to unlock (${a.d} done)`;
    return `<div class="row"><span>${LV_LABEL[lv]}<span class="dim sm ls">${stt}</span></span>${a.ok ? btn(open ? 'Close' : rec ? 'Retake' : 'Start', () => { LS.cp = open ? null : lv; renderLearn(); }, 'ghost mini') : ''}</div>${open ? quizHtml('cp|' + cat + '|' + lv, cpItems(cat, lv), p => { saveCheckpoint(cat, lv, p); LS.cp = null; TS.toast(p >= CP_PASS ? 'Checkpoint passed: ' + p + '%' : 'Checkpoint ' + p + '%. Review and try again.'); renderLearn(); }) : ''}`;
  }).join('');
  return card('Level checkpoints', 'check', `<p class="dim sm" style="margin-bottom:8px">A mixed quiz from the lessons you completed in a level. It unlocks after 60% of the level.</p><div class="rows">${rows}</div>`);
}
function lCat(cat) {
  const meta = LEARN_META[cat], st = catStats(cat), ph = phaseIdx(new Date()), items = pathOf(cat);
  let h = `<div class="backrow"><button class="btn text" data-act="${reg(() => { LS.cat = null; LS.cp = null; renderLearn(); $v.scrollTop = 0; })}">All categories</button></div>`;
  h += `<section class="card"><div class="ch"><h2>${esc(cat)}</h2><span class="tag">${pc100(st.d, st.n)}%</span></div><p class="dim" style="margin-bottom:12px">${esc(meta.blurb)}</p>${dual(st.d, st.n, st.ms)}<div class="rows" style="margin-top:12px"><div class="row"><span>Completed</span><span class="tn dim">${st.d} of ${st.n}</span></div><div class="row"><span>Mastered</span><span class="tn dim">${st.ms}</span></div><div class="row"><span>In progress</span><span class="tn dim">${st.prog}</span></div><div class="row"><span>Study time left</span><span class="tn dim">${mmDur(st.remMin)}</span></div></div></section>`;
  h += `<div class="callout big">${esc(LEARN_NOTES[cat])}</div>`;
  h += cpCard(cat);
  h += `<div style="margin:4px 0 12px">${seg([['level', 'By level'], ['subject', 'By subject']], LS.grp, v => { LS.grp = v; renderLearn(); })}</div>`;
  if (LS.grp === 'level') {
    LV_KEYS.forEach(lv => {
      const li = items.filter(x => x.lv === lv), l = st.lv[lv];
      h += `<section class="card lcard"><div class="lvh"><h2>${LV_LABEL[lv]}</h2><span class="tag">${l.d} of ${l.n} done</span></div>${li.map(x => lCard(x, ph)).join('')}</section>`;
    });
  } else {
    meta.subjects.forEach(s => {
      const li = items.filter(x => x.subj === s.k).sort((a, b) => LV_KEYS.indexOf(a.lv) - LV_KEYS.indexOf(b.lv));
      if (!li.length) return;
      h += `<section class="card lcard"><div class="lvh"><h2>${esc(s.k)}</h2><span class="tag">${li.filter(lessonDone).length} of ${li.length} done</span></div>${li.map(x => lCard(x, ph)).join('')}</section>`;
    });
  }
  return h;
}

/* ---------- missed sessions: find them, suggest a new time, let the person accept ---------- */
function findMissed(now) {
  now = now || new Date();
  const since = getSetting('learnSince', null);
  for (let k = 0; k < 2; k++) {
    const day = addDays(startOfDay(now), -k), dk = dateKey(day);
    if (!since || dk <= since || (DB.missedAck || {})[dk]) continue;
    const plan = planForDate(day, undefined, undefined, day.getTime());
    const cutoff = k === 0 ? now.getHours() * 60 + now.getMinutes() - 20 : 1e9;
    const planned = plan.blocks.filter(b => b.group === LEARN_GROUP && b.end <= cutoff).reduce((a, b) => a + b.end - b.start, 0);
    if (planned < 30) continue;
    const a = day.getTime(), b = addDays(day, 1).getTime();
    const studied = Math.round(DB.sessions.filter(s => s.started_at >= a && s.started_at < b && GROUP_OF[s.category] === LEARN_GROUP).reduce((t, s) => t + s.duration_ms, 0) / 60000);
    const miss = planned - studied;
    if (miss >= 30) return { dk, day, planned, studied, min: Math.min(90, Math.max(30, Math.round(miss / 15) * 15)) };
  }
  return null;
}
function suggestSlot(len, now) {
  now = now || new Date();
  for (let k = 0; k < 3; k++) {
    const day = addDays(startOfDay(now), k), plan = planForDate(day);
    const busy = plan.blocks.map(b => [b.start, b.end]).sort((a, b) => a[0] - b[0]).concat([[1e9, 1e9]]);
    const nowM = k === 0 ? Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 15) * 15 : 0;
    for (const w of plan.wins) {
      let a = Math.max(w[0], nowM);
      for (const bz of busy) {
        if (bz[1] <= a) continue;
        if (bz[0] - a >= len && a + len <= w[1]) return { day, dk: dateKey(day), s: a, e: a + len };
        a = Math.max(a, bz[1] + 15);
        if (a + len > w[1]) break;
      }
    }
  }
  return null;
}
function acceptMakeup(m, slot) {
  DB.makeups = DB.makeups || {}; DB.missedAck = DB.missedAck || {};
  (DB.makeups[slot.dk] = DB.makeups[slot.dk] || []).push({ s: slot.s, e: slot.e });
  DB.missedAck[m.dk] = true;
  const keep = dateKey(addDays(new Date(), -14));
  Object.keys(DB.makeups).forEach(k => { if (k < keep) delete DB.makeups[k]; });
  save(); rescheduleReminders(); TS.haptic(10); TS.toast('Added to your plan'); render();
}
function skipMissed(m) { DB.missedAck = DB.missedAck || {}; DB.missedAck[m.dk] = true; save(); render(); }
function missedCard() {
  const now = new Date(), m = findMissed(now);
  if (!m) return '';
  const slot = suggestSlot(m.min, now);
  return card('A study block slipped', 'clock', `<p>${m.dk === dateKey(now) ? 'Earlier today' : 'Yesterday'} you planned about ${mmDur(m.planned)} of learning and logged ${mmDur(m.studied)}. That is fine, it happens. ${slot ? `A good new time: <b>${dayName(slot.day, now)}, ${fmtMin(slot.s)} to ${fmtMin(slot.e)}</b>.` : 'There is no free window in the next 3 days, so the lesson simply stays first in line.'}</p><div class="actions">${slot ? btn('Add to my plan', () => acceptMakeup(m, slot)) : ''}${btn('Skip it', () => skipMissed(m), 'ghost')}</div>`);
}

/* the body of a revision block in the Planner */
function revisionBody(b) {
  return `<div class="lb rvc"><div class="lh">Revise from memory</div><p>Close your notes. For each lesson, answer its check questions aloud, then open the check and mark yourself. A pass pushes the next revision further away. A miss brings it back tomorrow.</p><div class="rows">${b.revList.map(x => `<div class="row"><span>${esc(x.t)}<span class="dim sm ls">${esc(shortName(x.sub))}${x.lv ? ', ' + LV_LABEL[x.lv] : ''}</span></span>${btn('Open check', () => jumpLesson(x.id), 'ghost mini')}</div>`).join('')}</div></div>`;
}

/* ---------- schedule helpers ---------- */
function nextLearnBlock(now) {
  const s = buildSchedule(now, 7), nm = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 7; i++) {
    const d = addDays(startOfDay(now), i), pl = s[dateKey(d)];
    if (!pl) continue;
    const b = pl.blocks.find(x => x.group === LEARN_GROUP && (i > 0 || x.end > nm));
    if (b) return { b, d, i };
  }
  return null;
}
function learnHomeCard() {
  const t = pathTotals(), now = new Date(), nx = learnWeekMin() > 0 ? nextLearnBlock(now) : null;
  return missedCard() + card('Learning path', 'book', `<div class="kv"><b>${t.d} of ${t.n}</b><span>lessons completed, ${t.n - t.d} to go</span></div><div style="margin-top:12px">${bar(pc100(t.d, t.n))}</div>${nx ? `<div class="rows"><div class="row"><span>Next${nx.i ? ', ' + dayName(nx.d, now).toLowerCase() : ''}<span class="dim sm ls">${nx.b.revision ? '' : esc(blockCat(nx.b)) + ': '}${esc(blockTitle(nx.b))}</span></span><span class="tn dim">${fmtMin(nx.b.start)}</span></div></div>` : ''}<div class="actions" style="margin-top:12px">${btn('Open Learn', () => go('learn'), 'ghost')}</div>`);
}
function jumpLesson(id) {
  const c = pathIndex()[id];
  if (!c) return;
  LS.tab = 'path'; LS.cat = c; LS.open.add(id); go('learn');
  setTimeout(() => { [...$v.querySelectorAll('details[data-oid]')].forEach(e => { if (e.dataset.oid === id) e.scrollIntoView({ block: 'start' }); }); }, 40);
}

/* ---------- dashboard ---------- */
function lDash() {
  const now = new Date(), t = pathTotals(), ss = studyStats(now), wk = learnWeekMin(), due = dueLearn(dateKey(now));
  const weeks = wk > 0 ? Math.ceil(t.remMin / wk) : null;
  let h = `<section class="card hero"><div><div class="eyebrow">Lessons completed</div><div class="num">${t.d}<small>of ${t.n}</small></div><div class="cap">${t.n - t.d} left, about ${mmDur(t.remMin)} of study${weeks ? `. At ${mmDur(wk)} a week: about ${weeks} weeks.` : ''}</div></div>${mini(pc100(t.d, t.n))}</section>`;
  h += `<div class="kpis"><section class="card kpi">${ic('check')}<div class="kv"><b>${t.pr}</b><span>proficient or better, ${t.ms} mastered</span></div></section><section class="card kpi">${ic('clock')}<div class="kv"><b>${due.length}</b><span>revision${due.length === 1 ? '' : 's'} due</span></div></section></div>`;
  h += missedCard();
  const nx = wk > 0 ? nextLearnBlock(now) : null;
  if (nx) h += card('Up next', 'clock', `<div class="next"><div><div class="eyebrow">${dayName(nx.d, now)}, ${fmtMin(nx.b.start)} to ${fmtMin(nx.b.end)}${nx.b.revision ? ', revision' : ''}</div><b>${esc(blockTitle(nx.b))}</b><div class="dim sm" style="margin-top:2px">${nx.b.revision ? esc(nx.b.revList.slice(0, 3).map(x => x.t).join('; ')) + (nx.b.revList.length > 3 ? ' and ' + (nx.b.revList.length - 3) + ' more' : '') + '. Close your notes and answer from memory.' : esc(blockCat(nx.b)) + (nx.b.lesson.review ? '' : `, lesson ${nx.b.lesson.i + 1} of ${nx.b.lesson.n}`)}</div></div></div><div class="actions" style="margin-top:12px">${btn('Start this session', () => startLesson(nx.b))}${nx.b.revision ? btn('Open the check', () => jumpLesson(nx.b.lesson.id), 'ghost') : ''}</div>`);
  h += card('Progress by category', 'target', `<div class="rows">${t.cats.map(c => catRow(c, false)).join('')}</div><p class="note">Thick bar: completed. Thin bar: mastered. Tap a category to open its lessons.</p>`);
  const mx = Math.max(1, ...Object.values(ss.by));
  h += card('Study', 'chart', `<div class="rows"><div class="row"><span>Learning time this week</span><span class="tn dim">${mmDur(ss.weekMin)} of ${wk ? mmDur(wk) : 'off'}</span></div><div class="row"><span>All time, eight categories</span><span class="tn dim">${mmDur(ss.total)}</span></div><div class="row"><span>Days in a row</span><span class="tn dim">${ss.streak}</span></div><div class="row"><span>Active days, last 4 weeks</span><span class="tn dim">${ss.act28} of 28</span></div><div class="row"><span>Sessions, last 30 days</span><span class="tn dim">${ss.n30}</span></div></div><div class="grps" style="margin-top:16px">${LEARN_ORDER.map(c => `<div class="grp"><div class="gl"><span>${esc(shortName(c))}</span><span class="dim tn">${mmDur(ss.by[c])}</span></div>${bar(ss.by[c] / mx * 100)}</div>`).join('')}</div><p class="note">Hours by category over the last 30 days. Financial & Business also counts time on your finance, strategy and entrepreneurship roadmap subjects.</p>`);
  h += card('Revision due', 'flame', due.length ? `<div class="rows">${due.slice(0, 6).map(x => `<div class="row"><span>${esc(x.t)}<span class="dim sm ls">${esc(shortName(pathIndex()[x.id]))}, ${LV_LABEL[x.lv || 'B'] || ''}</span></span>${btn('Check', () => jumpLesson(x.id), 'ghost mini')}</div>`).join('')}</div>${due.length > 6 ? `<p class="note">${due.length - 6} more are waiting.</p>` : ''}` : '<p class="note">Nothing is due. Reviews appear a day, 3 days, a week, then longer after each lesson, and sooner if a check goes badly.</p>');
  const ms = Object.keys(DB.milestones || {}).map(k => Object.assign({ id: k }, DB.milestones[k])).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  const nextN = MS_LESSONS.find(n => n > t.d);
  h += card('Milestones', 'flame', (ms.length ? `<div class="rows">${ms.slice(0, 5).map(m => `<div class="row"><span>${esc(m.t)}</span><span class="dim tn" style="white-space:nowrap;margin-left:12px">${shortDate(m.d)}</span></div>`).join('')}</div>` : '<p class="note">Your first milestone is one completed lesson away.</p>') + (nextN ? `<p class="note">Next: ${nextN} lessons completed, ${nextN - t.d} to go.</p>` : ''));
  return h;
}

/* ---------- week: the balance across the eight categories ---------- */
function weekMatrix(now) {
  const ws = startOfWeek(now), days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(ws, i)), today = startOfDay(now).getTime();
  const sched = buildSchedule(startOfDay(now), 7), cell = {};
  LEARN_ORDER.forEach(c => { cell[c] = days.map(() => ({ s: 0, p: 0, r: false })); });
  DB.sessions.forEach(s => {
    const c = catOfSession(s.category); if (!c) return;
    const di = Math.round((startOfDay(new Date(s.started_at)).getTime() - ws.getTime()) / 864e5);
    if (di >= 0 && di < 7) cell[c][di].s += s.duration_ms / 60000;
  });
  days.forEach((d, i) => {
    if (d.getTime() < today) return;
    const pl = sched[dateKey(d)]; if (!pl) return;
    pl.blocks.forEach(b => {
      if (b.group !== LEARN_GROUP) return;
      if (b.revision) { const cs = [...new Set(b.revList.map(x => x.sub))].filter(c => cell[c]); cs.forEach(c => { cell[c][i].p += b.len / cs.length; cell[c][i].r = true; }); return; }
      if (cell[b.category]) cell[b.category][i].p += b.len;
    });
  });
  return { days, cell, sched };
}
function lWeek() {
  const now = new Date(), wk = learnWeekMin(), M = weekMatrix(now);
  let touched = 0, th = 0, pr = 0;
  const rows = LEARN_ORDER.map(c => {
    const cs = M.cell[c], tot = cs.reduce((a, x) => a + x.s + x.p, 0);
    if (tot > 0) touched++;
    if (LEARN_TYPE[c] === 'T') th += tot; else pr += tot;
    return `<div class="grp"><div class="gl"><span>${esc(shortName(c))}</span><span class="dim tn">${tot ? TS.fmtH(tot) : ''}</span></div><div class="wk7">${cs.map(x => `<i class="mc${x.s >= 15 ? ' s' : x.p ? ' p' : ''}${x.r ? ' r' : ''}"></i>`).join('')}</div></div>`;
  }).join('');
  let h = card('This week, all eight', 'cal', `<div class="wk7 hd">${M.days.map(d => `<span>${d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>`).join('')}</div><div class="grps" style="margin-top:8px">${rows}</div><div class="legend" style="margin-top:14px"><i class="mc s"></i><span>studied</span><i class="mc p"></i><span>planned</span><i class="mc p r"></i><span>revision</span></div><p class="note">${wk > 0 ? `The week touches ${touched} of 8 categories. Reading-heavy subjects: ${TS.fmtH(th)}. Practical and visual subjects: ${TS.fmtH(pr)}.` : 'Learning time is off. Pick a weekly amount below to get a plan.'}</p>`, `<span class="tag">${mmDur(learnWeekMin())} a week</span>`);
  h += missedCard();
  const day7 = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(startOfDay(now), i), pl = M.sched[dateKey(d)], bl = pl ? pl.blocks.filter(b => b.group === LEARN_GROUP) : [];
    if (bl.length) day7.push(`<div class="dayh"><b>${dayName(d, now)}</b><span class="dim sm">${mmDur(bl.reduce((a, b) => a + b.len, 0))}</span></div><div class="rows">${bl.map(b => `<div class="row"><span>${esc(blockCat(b) === 'Revision' ? 'Revision' : shortName(b.category))}<span class="dim sm ls">${esc(blockTitle(b))}${b.makeup ? ', rescheduled' : ''}</span></span><span class="tn dim">${fmtMin(b.start)}</span></div>`).join('')}</div>`);
  }
  h += card('Next 7 days', 'clock', day7.length ? day7.join('') + '<p class="note">Times come from the free hours left after your shifts and your MBA study. Change shift hours in Planner.</p>' : '<p class="note">No learning blocks fit the next 7 days. Check your shifts in Planner or raise the weekly time below.</p>');
  h += card('Weekly learning time', 'sliders', `${seg([['0', 'Off'], ['120', '2h'], ['180', '3h'], ['240', '4h'], ['360', '6h'], ['480', '8h']], String(wk), v => { setSetting('learnMin', Number(v)); rescheduleReminders(); renderLearn(); })}<p class="note">On top of your MBA study, shared by all eight categories. Each session is about one lesson: at 3h a week the categories take turns, at 8h every category gets a session each week.</p><p class="note">The planner picks the category you studied least recently, alternates reading with practical subjects, and serves lessons you already started first. When revisions are due, one revision session is added each week, and a quick recall question opens other sessions.</p>`);
  const cfg = notifCfg(), lab = [['pre', 'Shortly before a session'], ['start', 'When a session starts'], ['unfinished', 'Unfinished lessons, once a week'], ['evening', 'Evening check-in, also covers a missed session'], ['weekly', 'Weekly summary, Sunday evening'], ['milestone', 'Milestones']];
  h += card('Reminders', 'clock', lab.map(r => `<div class="prow"><span>${r[1]}</span>${seg([['on', 'On'], ['off', 'Off']], cfg[r[0]] ? 'on' : 'off', v => { setSetting('notif', Object.assign(notifCfg(), { [r[0]]: v === 'on' })); rescheduleReminders(); renderLearn(); })}</div>`).join('') + `<p class="note">At most ${NOTIF_MAX_PER_DAY} a day. ${LN ? '' : 'Reminders work in the installed Android app.'}</p>`);
  return h;
}

function renderLearn() {
  resetActs();
  const sy = $v.scrollTop;
  const tabs = seg([['overview', 'Dashboard'], ['path', 'Curriculum'], ['week', 'Week']], LS.tab, v => { if (v === 'path' && LS.tab === 'path') LS.cat = null; LS.tab = v; renderLearn(); $v.scrollTop = 0; });
  const sub = { overview: 'Eight subjects, one steady plan.', path: LS.cat ? 'Lessons by level. Completion and mastery are tracked separately.' : 'Pick a category.', week: 'How the week is balanced.' }[LS.tab];
  const body = LS.tab === 'overview' ? lDash() : LS.tab === 'path' ? (LS.cat ? lCat(LS.cat) : lCatList()) : lWeek();
  $v.innerHTML = `<div class="greet"><h1>Learn</h1><p>${sub}</p></div><div style="margin:0 0 14px">${tabs}</div>${body}`;
  $v.scrollTop = sy;
  $v.querySelectorAll('details[data-oid]').forEach(d => { d.ontoggle = () => { if (d.open) LS.open.add(d.dataset.oid); else LS.open.delete(d.dataset.oid); }; });
}
