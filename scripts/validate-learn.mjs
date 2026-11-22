/* Checks the lesson files in www/apps/goals/learn/ against scripts/learn-spec.json.
   Usage: node scripts/validate-learn.mjs [key ...]     (no key = every category in the spec)
   Exit code 1 when anything is wrong, so the build check can use it too. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'scripts/learn-spec.json'), 'utf8'));
const want = process.argv.slice(2);
const cats = spec.categories.filter(c => !want.length || want.includes(c.key));
const LV = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };
const DF = { B: [1, 3], I: [2, 4], A: [3, 5] };
let bad = 0, total = 0;
const err = (c, where, msg) => { bad++; console.log(`  [${c.key}] ${where}: ${msg}`); };
const len = (s, a, b) => typeof s === 'string' && s.trim().length >= a && s.trim().length <= b;
const text = o => JSON.stringify(o);

for (const c of cats) {
  const file = path.join(root, 'www/apps/goals/learn', c.file + '.js');
  if (!fs.existsSync(file)) { err(c, c.file + '.js', 'file is missing'); continue; }
  const src = fs.readFileSync(file, 'utf8');
  let def = null;
  try { vm.runInNewContext(src, { LEARN: { cat: o => { def = o; } } }, { filename: file }); }
  catch (e) { err(c, 'syntax', e.message); continue; }
  if (!def) { err(c, 'file', 'LEARN.cat(...) was not called'); continue; }
  if (def.id !== c.id) err(c, 'id', `expected "${c.id}", got "${def.id}"`);
  if (def.name !== c.id) err(c, 'name', `expected "${c.id}"`);
  if (!len(def.blurb, 30, 170)) err(c, 'blurb', 'needs 30 to 170 characters');
  if (!Array.isArray(def.subjects)) { err(c, 'subjects', 'missing'); continue; }
  if (def.subjects.length !== c.subjects.length) err(c, 'subjects', `expected ${c.subjects.length}, got ${def.subjects.length}`);
  const titles = new Set(), qs = new Set();
  c.subjects.forEach((sp, si) => {
    const s = def.subjects[si];
    if (!s) return;
    if (s.k !== sp.k) { err(c, `subject ${si + 1}`, `expected "${sp.k}", got "${s.k}"`); return; }
    const les = Array.isArray(s.les) ? s.les : [];
    const got = les.map(l => l.lv).join('');
    if (got !== sp.levels) err(c, s.k, `levels must be "${sp.levels}" in that order, got "${got}"`);
    les.forEach((l, li) => {
      total++;
      const w = `${s.k} / ${LV[l.lv] || l.lv}`;
      if (!LV[l.lv]) { err(c, w, 'lv must be B, I or A'); return; }
      if (![30, 45, 60, 75, 90].includes(l.m)) err(c, w, 'm must be 30, 45, 60, 75 or 90');
      if (!Number.isInteger(l.df) || l.df < DF[l.lv][0] || l.df > DF[l.lv][1]) err(c, w, `df for ${LV[l.lv]} must be ${DF[l.lv][0]} to ${DF[l.lv][1]}`);
      if (!len(l.t, 8, 70)) err(c, w, 'title needs 8 to 70 characters');
      else if (titles.has(l.t.toLowerCase())) err(c, w, 'duplicate title in this category: ' + l.t); else titles.add(l.t.toLowerCase());
      if (!Array.isArray(l.obj) || l.obj.length !== 3 || !l.obj.every(x => len(x, 20, 150))) err(c, w, 'obj needs exactly 3 objectives of 20 to 150 characters');
      else if (!l.obj.every(x => /^[A-Z]/.test(x.trim()))) err(c, w, 'each objective must start with a capital letter (a verb)');
      if (!len(l.ex, 80, 460)) err(c, w, 'ex (exercise) needs 80 to 460 characters');
      if (!Array.isArray(l.qa) || l.qa.length !== 3 || !l.qa.every(p => Array.isArray(p) && p.length === 2 && len(p[0], 15, 220) && len(p[1], 20, 300))) err(c, w, 'qa needs exactly 3 [question (15-220), answer (20-300)] pairs');
      else l.qa.forEach(p => { const k = p[0].toLowerCase(); if (qs.has(k)) err(c, w, 'duplicate question: ' + p[0]); qs.add(k); });
      if (!len(l.src, 10, 220)) err(c, w, 'src needs 10 to 220 characters');
      if (c.ev === 'req' && !len(l.ev, 40, 320)) err(c, w, `ev ("${c.evLabel}") is required, 40 to 320 characters`);
      if (c.ev === 'opt' && l.ev != null && !len(l.ev, 40, 320)) err(c, w, 'ev needs 40 to 320 characters when present');
      if (c.ev === 'none' && l.ev != null) err(c, w, 'ev is not used in this category');
      if (c.see) { if (!Array.isArray(l.see) || l.see.length < 2 || l.see.length > 4 || !l.see.every(x => len(x, 15, 160))) err(c, w, 'see needs 2 to 4 named works, 15 to 160 characters each'); }
      else if (l.see != null) err(c, w, 'see is only used for Art History');
      const all = text(l);
      if (/[–—]/.test(all)) err(c, w, 'no en or em dashes: use a comma, a colon, a hyphen or the word "to"');
      if (/[‘’“”]/.test(all)) err(c, w, 'use straight quotes only');
      if (/\p{Extended_Pictographic}/u.test(all)) err(c, w, 'no emoji');
      if (/https?:\/\//.test(all)) err(c, w, 'no web addresses: name the source instead');
      Object.keys(l).forEach(k => { if (!['lv', 'm', 'df', 't', 'obj', 'ex', 'qa', 'src', 'ev', 'see'].includes(k)) err(c, w, 'unknown field ' + k); });
    });
  });
}
console.log(bad ? `\n${bad} problem(s) in ${total} lessons checked.` : `OK: ${total} lessons checked in ${cats.length} categor${cats.length === 1 ? 'y' : 'ies'}.`);
process.exit(bad ? 1 : 0);
