/* Learning Path engine: the data model and the rules. The screens are in learn-ui.js, the lessons in learn/*.js.
   Eight categories: Financial & Business Education (it keeps your existing finance, strategy and entrepreneurship lessons)
   plus Economics, Philosophy, Body Language, Art History, Geopolitics, Culinary Basics and Psychology.
   Every category has subjects, every subject has Beginner, Intermediate and Advanced lessons.
   Lesson ids are '<Category>#<index>' like the rest of the app, so saved study time, completion and review dates keep working.
   NEVER reorder or delete lessons. To add more, put new subjects at the END of a category file.
   scripts/check.mjs compares every id with scripts/lesson-ids.json and fails the build if one moved. */
'use strict';
const LEARN_GROUP = 'Learning Path';
const LEARN_ORDER = ['Financial & Business Education', 'Economics', 'Philosophy', 'Body Language', 'Art History', 'Geopolitics', 'Culinary Basics', 'Psychology'];
/* Rotation order alternates theory (T) and practical or visual (P) so a week never stacks heavy reading back to back. */
const LEARN_ROT = ['Financial & Business Education', 'Culinary Basics', 'Economics', 'Art History', 'Philosophy', 'Body Language', 'Geopolitics', 'Psychology'];
const LEARN_TYPE = { 'Financial & Business Education': 'T', 'Economics': 'T', 'Philosophy': 'T', 'Geopolitics': 'T', 'Psychology': 'T', 'Culinary Basics': 'P', 'Art History': 'P', 'Body Language': 'P' };
const FIN_ID = LEARN_ORDER[0];
const LV_KEYS = ['B', 'I', 'A'];
const LV_LABEL = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };
const PASS_PCT = 66;      /* a check counts as passed at 2 of 3 questions */
const CP_PASS = 66;
const MASTERY_LABEL = ['Not checked', 'Learning', 'Proficient', 'Mastered'];
const LEARN_NOTES = {
  'Financial & Business Education': 'This is education, not personal financial advice. Rules, taxes and products differ by country and change over time, so check current local rules before you act. Your earlier finance, strategy and entrepreneurship lessons are part of this category and keep their progress.',
  'Economics': 'Economists often disagree. Lessons show the main schools of thought fairly and mark where the evidence is mixed.',
  'Philosophy': 'Read the ideas as arguments to understand and test, not as answers to memorise. Steelman a view before you criticise it.',
  'Body Language': 'Nonverbal cues are weak, probabilistic signals that depend on context, culture and the person. They are not a reliable way to read minds or to detect lying. Every lesson states the evidence and its limits.',
  'Art History': 'Look at the works first, then read. Each lesson lists works to look up. Tap a name to search for images (needs internet).',
  'Geopolitics': 'Current events change fast. These lessons teach frameworks and a source routine. Before you study a live topic, read two or three recent, reliable sources and keep facts, interpretations and predictions in separate columns.',
  'Culinary Basics': 'Every lesson ends with something you prepare. Follow the food safety lesson first if you are new to cooking.',
  'Psychology': 'Lessons separate established findings, contested findings and theories. This is education, not a tool to diagnose yourself or other people. If you are worried about your health, talk to a qualified professional.'
};
const shortName = c => c === FIN_ID ? 'Financial & Business' : c;
/* the heading above a lesson's "ev" note, per category */
const EV_LABEL = { 'Economics': 'Where economists disagree', 'Body Language': 'Evidence and limits', 'Geopolitics': 'Facts, interpretations, predictions', 'Psychology': 'Evidence status' };
const LEARN_META = {};
const LEARN = {
  cat(def) {
    LEARN_META[def.id] = def;
    const out = [];
    LV_KEYS.forEach(lv => def.subjects.forEach(s => (s.les || []).forEach(x => {
      if (x.lv !== lv) return;
      out.push(Object.assign(
        L(x.t, x.m, 1, x.obj, x.ex, 'Answer the ' + x.qa.length + ' check questions from memory and get at least 2 right.', x.src),
        { lv: x.lv, df: x.df, subj: s.k, qa: x.qa, ev: x.ev || '', see: x.see || null }));
    })));
    CURR[def.id] = out;   /* level-major order: all Beginner, then Intermediate, then Advanced */
  }
};
ROTATION[LEARN_GROUP] = { 1: LEARN_ROT };

/* Existing lessons that belong to Financial & Business Education. They stay where they are (same ids, same saved progress)
   and are only shown here, with a level. New lessons fill the gaps. [subject in CURR, index in that subject, level] */
const FIN_REFS = {
  'Compound Interest': [['Mathematics', 10, 'I'], ['Finance & Accounting', 4, 'I']],
  'Economics of Business': [['Finance & Accounting', 8, 'I']],
  'Financial Statements and Company Valuation': [['Finance & Accounting', 0, 'B'], ['Finance & Accounting', 1, 'B'], ['Finance & Accounting', 2, 'I'], ['Finance & Accounting', 3, 'I'], ['Finance & Accounting', 7, 'A'], ['Finance & Accounting', 9, 'A']],
  'Entrepreneurship and Business Models': [['Entrepreneurship & Income', 0, 'B'], ['Entrepreneurship & Income', 1, 'I'], ['Entrepreneurship & Income', 2, 'I'], ['Entrepreneurship & Income', 3, 'I'], ['Entrepreneurship & Income', 4, 'I'], ['Business Strategy', 3, 'I'], ['Entrepreneurship & Income', 5, 'A']],
  'Business Strategy and Management': [['Business Strategy', 0, 'B'], ['Business Strategy', 7, 'B'], ['Business Strategy', 1, 'I'], ['Business Strategy', 2, 'I'], ['Business Strategy', 6, 'I'], ['Leadership & Management', 2, 'I'], ['Leadership & Management', 4, 'I'], ['Business Strategy', 4, 'A'], ['Business Strategy', 5, 'A'], ['Business Strategy', 8, 'A']],
  'Corporate Finance': [['Finance & Accounting', 5, 'I'], ['Finance & Accounting', 6, 'A']]
};
/* Roadmap subjects whose study time also counts toward Financial & Business Education on the dashboard. */
const FIN_TIME = ['Finance & Accounting', 'Business Strategy', 'Entrepreneurship & Income'];
const catOfSession = c => LEARN_ORDER.includes(c) ? c : FIN_TIME.includes(c) ? FIN_ID : null;
const isLearnCat = c => LEARN_ORDER.includes(c);

/* ---------- the ordered lesson list of a category (new lessons plus referenced existing ones) ---------- */
const PATH_CACHE = {};
function pathOf(cat) {
  if (PATH_CACHE[cat]) return PATH_CACHE[cat];
  const meta = LEARN_META[cat];
  if (!meta) return [];
  const items = [];
  meta.subjects.forEach((s, si) => {
    if (cat === FIN_ID) (FIN_REFS[s.k] || []).forEach(r => {
      const l = lessonsOf(r[0])[r[1]];
      if (l) items.push(Object.assign({}, l, { lv: r[2], subj: s.k, ref: true, df: r[2] === 'B' ? 2 : r[2] === 'I' ? 3 : 4, si }));
    });
  });
  lessonsOf(cat).forEach(l => items.push(Object.assign({}, l, { si: Math.max(0, meta.subjects.findIndex(s => s.k === l.subj)) })));
  items.forEach((x, k) => { x.k0 = k; });
  items.sort((a, b) => LV_KEYS.indexOf(a.lv) - LV_KEYS.indexOf(b.lv) || a.si - b.si || (a.ref ? 0 : 1) - (b.ref ? 0 : 1) || a.k0 - b.k0);
  return (PATH_CACHE[cat] = items);
}
let PATH_IDX = null;
function pathIndex() {
  if (PATH_IDX) return PATH_IDX;
  PATH_IDX = {};
  LEARN_ORDER.forEach(c => pathOf(c).forEach(x => { PATH_IDX[x.id] = c; }));
  return PATH_IDX;
}

/* ---------- mastery: separate from completion ----------
   Completion = you did the work (study time, exercise, or passing the check).
   Mastery    = you can still answer the check later. Learning (last check failed), Proficient (last check passed),
                Mastered (passed twice, a week or more apart, and the latest one passed). */
function masteryOf(id) {
  const a = (lstate(id).ma) || [];
  if (!a.length) return { lvl: 0, label: MASTERY_LABEL[0], n: 0, last: null };
  const last = a[a.length - 1], ok = last[1] >= PASS_PCT;
  let lvl = ok ? 2 : 1;
  if (ok) {
    const t = new Date(last[0] + 'T00:00:00').getTime();
    if (a.slice(0, -1).some(x => x[1] >= PASS_PCT && t - new Date(x[0] + 'T00:00:00').getTime() >= 7 * 864e5)) lvl = 3;
  }
  return { lvl, label: MASTERY_LABEL[lvl], n: a.length, last };
}
function recordCheck(id, pct) {
  const s = DB.lessons[id] || (DB.lessons[id] = { min: 0, done: false });
  s.ma = (s.ma || []).concat([[dateKey(new Date()), pct]]).slice(-12);
  const cur = s.rv;
  setReview(id, pct >= PASS_PCT ? (cur ? cur.n + 1 : 1) : 0);   /* a pass pushes the next review further out, a fail brings it back to tomorrow */
  save();
}
/* A lesson is only completed by evidence: time, the exercise, or passing the check. Opening it never counts. */
function completeNeeds(x) {
  const st = lstate(x.id), need = [];
  if (masteryOf(x.id).lvl >= 2) return need;
  const half = Math.ceil(x.m * .5);
  if (st.min < half) need.push('study at least ' + half + ' minutes (you have ' + Math.round(st.min) + ')');
  if (!st.ex) need.push('tick "I did the exercise"');
  return need;
}
function setExercise(id, v) { const s = DB.lessons[id] || (DB.lessons[id] = { min: 0, done: false }); s.ex = v; save(); }
/* call after study minutes were added to a lesson: stamps the day it became complete */
function touchLesson(id) { const s = DB.lessons[id]; if (!s) return; const L0 = lessonById(id); if (L0 && (s.done || s.min >= L0.m) && !s.cd) s.cd = dateKey(new Date()); }

/* ---------- counts ---------- */
function catStats(cat) {
  const items = pathOf(cat), lv = { B: { n: 0, d: 0, ms: 0 }, I: { n: 0, d: 0, ms: 0 }, A: { n: 0, d: 0, ms: 0 } };
  let d = 0, ms = 0, pr = 0, prog = 0, rem = 0, tot = 0;
  items.forEach(x => {
    const done = lessonDone(x), m = masteryOf(x.id).lvl, st = lstate(x.id);
    lv[x.lv].n++;
    if (done) { d++; lv[x.lv].d++; }
    if (m >= 3) { ms++; lv[x.lv].ms++; }
    if (m >= 2) pr++;
    if (!done && st.min > 0) prog++;
    if (!done) rem += Math.max(0, x.m - st.min);
    tot += x.m;
  });
  return { n: items.length, d, ms, pr, prog, remMin: Math.round(rem), totMin: tot, lv };
}
function pathTotals() {
  const cats = LEARN_ORDER.map(k => Object.assign({ cat: k }, catStats(k)));
  const sum = f => cats.reduce((a, x) => a + x[f], 0);
  return { cats, n: sum('n'), d: sum('d'), ms: sum('ms'), pr: sum('pr'), prog: sum('prog'), remMin: sum('remMin'), totMin: sum('totMin') };
}
const pathItem = id => { const c = pathIndex()[id]; return c ? (pathOf(c).find(x => x.id === id) || null) : null; };
/* every due revision that belongs to one of the eight categories (including your roadmap finance lessons), as path items */
function dueLearn(dk) { return dueReviews(dk).map(x => pathItem(x.id)).filter(Boolean); }
/* The roadmap schedule serves reviews of roadmap lessons. The Learning Path serves reviews of the new lessons. No lesson is served twice. */
const dueRoadmap = dk => dueReviews(dk).filter(x => !isLearnCat(x.sub));
const dueLearnNew = dk => dueReviews(dk).filter(x => isLearnCat(x.sub));
/* lessons you started but have not completed, in the eight categories */
function unfinished() {
  const out = [];
  LEARN_ORDER.forEach(c => pathOf(c).forEach(x => { if (!lessonDone(x) && lstate(x.id).min > 0) out.push(x); }));
  return out;
}

/* one duration style for everything the learning path shows: "45 min", "3h", "2h 30m" */
const mmDur = m => { m = Math.round(m); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return r ? h + 'h ' + r + 'm' : h + 'h'; };
/* the title shown for a planned block: a revision block names the lessons it revises */
const blockTitle = b => b.revision && b.revList ? (b.revList.length > 1 ? 'Revision of ' + b.revList.length + ' lessons' : 'Revision: ' + b.revList[0].t) : b.lesson.t;
const blockCat = b => b.revision ? 'Revision' : shortName(b.category);
/* dedicated revision sessions already logged in the week that starts at ws (they are timed with a topic that starts with "Revision") */
function revisionsDone(ws) { const a = ws.getTime(), z = addDays(ws, 7).getTime(); return DB.sessions.filter(s => s.started_at >= a && s.started_at < z && /^Revision/.test(s.topic || '')).length; }

/* ---------- which category comes next: the one you studied least recently, alternating reading and practical subjects ---------- */
function learnLast() {
  const m = {};
  LEARN_ORDER.forEach(c => { m[c] = 0; });
  DB.sessions.forEach(s => { const c = catOfSession(s.category); if (c && s.started_at > m[c]) m[c] = s.started_at; });
  return m;
}
function learnPrevType() {
  let best = null, t = 0;
  DB.sessions.forEach(s => { const c = catOfSession(s.category); if (c && s.started_at > t) { t = s.started_at; best = c; } });
  return best ? LEARN_TYPE[best] : null;
}
function pickLearnCat(last, prevType, skip, used, ph) {
  const cand = LEARN_ROT.filter(c => lessonsOf(c).some(x => lessonOpen(x, ph, used)));
  if (!cand.length) return null;
  const ord = cand.slice().sort((a, b) => (last[a] || 0) - (last[b] || 0) || LEARN_ROT.indexOf(a) - LEARN_ROT.indexOf(b));
  const fresh = ord.filter(c => !skip.has(c)), pool = fresh.length ? fresh : ord, top = pool.slice(0, 3);
  return top.find(c => LEARN_TYPE[c] !== prevType) || top[0];
}
/* a lesson you already started comes before a new one */
function learnOpen(sub, ph, used) {
  const ls = lessonsOf(sub).filter(x => lessonOpen(x, ph, used));
  return ls.find(x => lstate(x.id).min > 0) || ls[0] || null;
}

/* ---------- level checkpoints: a mixed quiz built from the questions of the lessons you completed ---------- */
const cpKey = (cat, lv) => cat + '|' + lv;
function cpAvail(cat, lv) {
  const it = pathOf(cat).filter(x => x.lv === lv), dn = it.filter(lessonDone), qd = dn.filter(x => x.qa);
  return { n: it.length, d: dn.length, need: Math.ceil(it.length * .6), ok: it.length > 0 && dn.length >= Math.ceil(it.length * .6) && qd.length >= 3 };
}
function cpItems(cat, lv) {
  const dn = pathOf(cat).filter(x => x.lv === lv && lessonDone(x) && x.qa);
  const tries = ((DB.cp || {})[cpKey(cat, lv)] || {}).tries || 0;
  const k = Math.min(6, dn.length), stride = Math.max(1, Math.floor(dn.length / Math.max(1, k))), out = [];
  for (let j = 0; j < k; j++) { const x = dn[(tries + j * stride) % dn.length], p = x.qa[(tries + j) % x.qa.length]; out.push({ q: p[0], a: p[1], from: x.t }); }
  return out;
}
function saveCheckpoint(cat, lv, pct) {
  DB.cp = DB.cp || {};
  const k = cpKey(cat, lv), r = DB.cp[k] || { best: 0, tries: 0 };
  DB.cp[k] = { best: Math.max(r.best, pct), last: pct, date: dateKey(new Date()), tries: r.tries + 1 };
  save(); checkMilestones();
}

/* ---------- milestones (each fires once; the first run on existing data is silent) ---------- */
const MS_LESSONS = [1, 10, 25, 50, 100, 150, 200, 250, 300];
function milestoneNow() {
  const t = pathTotals(), out = [];
  MS_LESSONS.forEach(n => { if (t.d >= n) out.push({ id: 'les' + n, text: n === 1 ? 'First lesson completed' : n + ' lessons completed' }); });
  [1, 10, 25, 50].forEach(n => { if (t.ms >= n) out.push({ id: 'mas' + n, text: n === 1 ? 'First lesson mastered' : n + ' lessons mastered' }); });
  t.cats.forEach(c => {
    if (c.n && c.d >= c.n / 2) out.push({ id: 'cat50:' + c.cat, text: shortName(c.cat) + ': half complete' });
    if (c.n && c.d >= c.n) out.push({ id: 'cat100:' + c.cat, text: shortName(c.cat) + ': all lessons complete' });
    LV_KEYS.forEach(k => { const l = c.lv[k]; if (l.n && l.d >= l.n) out.push({ id: 'lv:' + c.cat + ':' + k, text: shortName(c.cat) + ': ' + LV_LABEL[k] + ' level complete' }); });
  });
  Object.keys(DB.cp || {}).forEach(k => { if (DB.cp[k].best >= CP_PASS) { const p = k.split('|'); out.push({ id: 'cp:' + k, text: shortName(p[0]) + ': ' + LV_LABEL[p[1]] + ' checkpoint passed' }); } });
  return out;
}
function checkMilestones(silent) {
  DB.milestones = DB.milestones || {};
  const fresh = [];
  milestoneNow().forEach(m => { if (!DB.milestones[m.id]) { DB.milestones[m.id] = { d: dateKey(new Date()), t: m.text }; fresh.push(m); } });
  if (fresh.length) { save(); if (!silent) announceMilestones(fresh); }
  return fresh;
}
function announceMilestones(fresh) {
  TS.toast('Milestone: ' + fresh[0].text + (fresh.length > 1 ? ' and ' + (fresh.length - 1) + ' more' : ''));
  TS.haptic([30, 60, 30]);
  if (LN && notifCfg().milestone) {
    try { LN.schedule({ notifications: [{ id: 810000 + Math.floor(Math.random() * 9000), title: 'Milestone reached', body: fresh[0].text + (fresh.length > 1 ? ' and ' + (fresh.length - 1) + ' more' : ''), schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true }, channelId: 'study' }] }); } catch (e) { }
  }
}

/* ---------- study numbers for the dashboard and the weekly summary ---------- */
function studyStats(now) {
  now = now || new Date();
  const eight = DB.sessions.filter(s => catOfSession(s.category));
  const total = Math.round(eight.reduce((a, s) => a + s.duration_ms, 0) / 60000);
  const from = addDays(startOfDay(now), -29).getTime(), by = {};
  LEARN_ORDER.forEach(c => by[c] = 0);
  let n30 = 0;
  eight.forEach(s => { if (s.started_at >= from) { by[catOfSession(s.category)] += s.duration_ms / 60000; n30++; } });
  const days = new Set(eight.map(s => dateKey(new Date(s.started_at))));
  let streak = 0, c = days.has(dateKey(now)) ? now : addDays(now, -1);
  while (days.has(dateKey(c))) { streak++; c = addDays(c, -1); }
  let act28 = 0;
  for (let i = 0; i < 28; i++) if (days.has(dateKey(addDays(now, -i)))) act28++;
  const ws = startOfWeek(now), wkMin = Math.round(DB.sessions.filter(s => s.started_at >= ws.getTime() && s.started_at < addDays(ws, 7).getTime() && GROUP_OF[s.category] === LEARN_GROUP).reduce((a, s) => a + s.duration_ms, 0) / 60000);
  return { total, by, n30, streak, act28, weekMin: wkMin };
}
function weekSummary(now) {
  now = now || new Date();
  const ws = startOfWeek(now), a = ws.getTime(), b = addDays(ws, 7).getTime(), k0 = dateKey(ws), k1 = dateKey(addDays(ws, 7));
  const sess = DB.sessions.filter(s => s.started_at >= a && s.started_at < b && catOfSession(s.category));
  let lessons = 0, checks = 0;
  Object.keys(DB.lessons).forEach(id => {
    const s = DB.lessons[id];
    if (s.cd && s.cd >= k0 && s.cd < k1) lessons++;
    (s.ma || []).forEach(x => { if (x[0] >= k0 && x[0] < k1) checks++; });
  });
  return { min: Math.round(sess.reduce((x, s) => x + s.duration_ms, 0) / 60000), lessons, checks, cats: new Set(sess.map(s => catOfSession(s.category)).filter(Boolean)).size };
}

/* text of the two weekly reminders. They are written when reminders are scheduled, and every change in the app reschedules them. */
function weeklyNote(day) {
  const w = weekSummary(day), t = pathTotals();
  if (!w.min) return { title: 'Your week in learning', body: 'A quiet week. One short session tomorrow is enough to start again.' };
  const bits = [mmDur(w.min) + ' across ' + w.cats + ' categor' + (w.cats === 1 ? 'y' : 'ies')];
  if (w.lessons) bits.push(w.lessons + ' lesson' + (w.lessons === 1 ? '' : 's') + ' completed');
  if (w.checks) bits.push(w.checks + ' check' + (w.checks === 1 ? '' : 's'));
  return { title: 'Your week in learning', body: bits.join(', ') + '. ' + t.d + ' of ' + t.n + ' lessons complete overall.' };
}
function unfinishedNote() {
  const u = unfinished();
  if (!u.length) return null;
  return { title: 'Lessons waiting for you', body: u.length + ' lesson' + (u.length === 1 ? ' is' : 's are') + ' in progress. Next to finish: ' + u[0].t + '. A short session moves it forward.' };
}

/* ---------- notification settings: every kind can be switched off, and there is a hard cap per day ---------- */
const NOTIF_DEFAULT = { pre: true, start: true, unfinished: true, evening: true, weekly: true, milestone: true };
const NOTIF_MAX_PER_DAY = 3;
const notifCfg = () => Object.assign({}, NOTIF_DEFAULT, getSetting('notif', {}));
const learnWeekMin = () => getSetting('learnMin', 180);
