// Fast sanity check that runs in CI before the slow Android build. Catches the mistakes that would
// otherwise only show up as a blank screen on the phone: syntax errors, missing files, bad JSON.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const www = path.join(root, 'www');
let errors = 0, checked = 0;
const fail = (m) => { errors++; console.error('FAIL  ' + m); };

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const rel = (p) => path.relative(root, p);

for (const f of ['package.json', 'capacitor.config.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); checked++; } catch (e) { fail(f + ': ' + e.message); }
}

for (const file of walk(www)) {
  if (file.endsWith('.js')) {
    try { new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel(file) }); checked++; }
    catch (e) { fail(rel(file) + ': ' + e.message); }
  }
  if (file.endsWith('.html')) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      try { new vm.Script(m[1], { filename: rel(file) + ' (inline script)' }); checked++; }
      catch (e) { fail(rel(file) + ' inline script: ' + e.message); }
    }
    for (const m of html.matchAll(/\b(?:src|href)=["']([^"'#?]+)["']/g)) {
      const ref = m[1];
      if (/^(https?:|data:|mailto:|tel:|\/\/)/.test(ref)) continue;
      const target = path.resolve(path.dirname(file), ref);
      if (!fs.existsSync(target)) fail(rel(file) + ' points to a missing file: ' + ref);
      else checked++;
    }
  }
}
// the hub must know every app it lists
const hub = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
for (const m of hub.matchAll(/'(apps\/[^']+\.html)'/g)) {
  if (!fs.existsSync(path.join(www, m[1]))) fail('hub lists a missing app: ' + m[1]);
}

// ---- lessons: ids are saved inside your data (as "Subject#number"), so they may only grow at the end ----
// Loads the lesson files the way the Goals page does, then compares with the recorded list in scripts/lesson-ids.json.
// After you add lessons at the END of a subject (or a new subject), run: node scripts/check.mjs --write-ids
const goals = path.join(www, 'apps', 'goals');
{
  const ctx = vm.createContext({ console });
  const load = (f) => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: rel(f) });
  try {
    load(path.join(goals, 'curriculum.js'));
    load(path.join(goals, 'learn.js'));
    for (const f of fs.readdirSync(path.join(goals, 'learn')).filter((x) => x.endsWith('.js')).sort()) load(path.join(goals, 'learn', f));
    const now = vm.runInContext('Object.keys(CURR).flatMap(k => CURR[k].map((l, i) => [k + "#" + i, l.t]))', ctx);
    const idsFile = path.join(root, 'scripts', 'lesson-ids.json');
    if (process.argv.includes('--write-ids')) {
      fs.writeFileSync(idsFile, JSON.stringify(Object.fromEntries(now), null, 1) + '\n');
      console.log(`wrote ${now.length} lesson ids to scripts/lesson-ids.json`);
    } else {
      const gold = JSON.parse(fs.readFileSync(idsFile, 'utf8')), cur = Object.fromEntries(now);
      for (const [id, title] of Object.entries(gold)) {
        if (!(id in cur)) fail('lesson ' + id + ' ("' + title + '") is gone. Saved progress would point at nothing');
        else if (cur[id] !== title) fail('lesson ' + id + ' changed from "' + title + '" to "' + cur[id] + '". Saved progress would move to another lesson');
        else checked++;
      }
      const fresh = now.filter(([id]) => !(id in gold)).length;
      if (fresh) console.log(`note: ${fresh} lessons are not in scripts/lesson-ids.json yet. Run: node scripts/check.mjs --write-ids`);
    }
    const eight = vm.runInContext('LEARN_ORDER', ctx);
    if (eight.length !== 8) fail('the Learning Path must have exactly eight categories, found ' + eight.length);
    for (const c of eight) if (!vm.runInContext('CURR[' + JSON.stringify(c) + ']', ctx)) fail('category "' + c + '" has no lesson file loaded');
  } catch (e) { fail('lesson files do not load together: ' + e.message); }
  // lesson content rules (lengths, three questions, evidence notes, art links...)
  try { execFileSync(process.execPath, [path.join(root, 'scripts', 'validate-learn.mjs')], { stdio: 'pipe' }); checked++; }
  catch (e) { fail('validate-learn.mjs found problems:\n' + String(e.stdout || '').trim().split('\n').slice(0, 12).join('\n')); }
  // every lesson file must be loaded by the Goals page, in the right order: learn.js, lesson files, learn-ui.js, app.js
  const html = fs.readFileSync(path.join(goals, 'index.html'), 'utf8');
  const at = (name) => html.indexOf('src="' + name + '"');
  for (const f of fs.readdirSync(path.join(goals, 'learn')).filter((x) => x.endsWith('.js'))) if (at('learn/' + f) < 0) fail('apps/goals/index.html does not load learn/' + f);
  const order = ['curriculum.js', 'learn.js', 'learn-ui.js', 'app.js'].map(at);
  if (order.some((x) => x < 0) || order.some((x, i) => i && x < order[i - 1])) fail('apps/goals/index.html must load curriculum.js, learn.js, the learn/ files, learn-ui.js, app.js in that order');
  const firstLesson = html.indexOf('src="learn/');
  if (firstLesson < at('learn.js') || firstLesson > at('learn-ui.js')) fail('the learn/ files must load after learn.js and before learn-ui.js');
}
// ---- Forge: the sixth item in the bottom bar. Its reminders use ids 700000 to 709999, which no other app may touch or reuse ----
{
  const forge = path.join(www, 'apps', 'forge');
  const read = (f) => fs.readFileSync(path.join(forge, f), 'utf8');
  try {
    // the page loads its files, in the order they depend on each other
    const html = read('index.html');
    const names = ['shared/ts.js', 'data.js', 'prompt.js', 'core.js', 'ui.js', 'v-today.js', 'v-reset.js', 'v-stats.js', 'v-setup.js', 'boot.js'];
    const pos = names.map((n) => html.indexOf('src="' + (n.includes('/') ? '../../' + n : n) + '"'));
    names.forEach((n, i) => { if (pos[i] < 0) fail('apps/forge/index.html does not load ' + n); });
    if (pos.some((x, i) => i && x < pos[i - 1])) fail('apps/forge/index.html must load ts.js, data.js, prompt.js, core.js, ui.js, the v-*.js screens, boot.js in that order');
    else checked++;

    // the hub: one button per app, the grid and the sliding marker match the number of buttons, Forge is wired in
    const nav = [...hub.matchAll(/<button data-t="(\w+)"/g)].map((m) => m[1]);
    const order = (hub.match(/var ORDER=\[([^\]]*)\]/) || [])[1] || '';
    const cols = Number((hub.match(/grid-template-columns:repeat\((\d+),1fr\)/) || [])[1]);
    const ind = parseFloat((hub.match(/#ind\{[^}]*width:([\d.]+)%/) || [])[1]);
    if (!nav.includes('forge')) fail('the hub bottom bar has no Forge button');
    if (cols !== nav.length) fail('the hub bottom bar has ' + nav.length + ' buttons but ' + cols + ' grid columns');
    if (Math.abs(ind * nav.length - 100) > 0.5) fail('the hub marker (#ind) is ' + ind + '% wide but there are ' + nav.length + ' buttons');
    if (order.replace(/['\s]/g, '') !== nav.join(',')) fail('the hub ORDER list does not match the buttons: ' + order);
    if (!/forge:'apps\/forge\/index\.html'/.test(hub)) fail('the hub APPS list does not point Forge at apps/forge/index.html');
    if (!/ensure\('forge',true\)/.test(hub)) fail('the hub should load Forge in the background (ensure(\'forge\',true)) so its reminders are planned at every launch');
    checked++;

    // static data: the structure the screens rely on
    const ctx = vm.createContext({ console, window: {} });
    ctx.window = ctx;
    vm.runInContext(read('data.js'), ctx, { filename: 'apps/forge/data.js' });
    vm.runInContext(read('prompt.js'), ctx, { filename: 'apps/forge/prompt.js' });
    const D = ctx.FD, P = ctx.FORGE_PROMPT;
    if (!D) fail('apps/forge/data.js does not define FD');
    else {
      if (D.RITUALS.length !== 7) fail('Forge needs 7 daily rituals, found ' + D.RITUALS.length);
      if (D.LIGHT.some((k) => !D.RITUALS.some((r) => r.k === k))) fail('Forge light-day list names a ritual that does not exist');
      if (D.PHASES.length !== 5) fail('Forge needs 5 phases, found ' + D.PHASES.length);
      if (Object.keys(D.MISSIONS).length !== 3) fail('Forge needs 3 mission types');
      if (D.REVIEW_Q.length !== 8) fail('The Forge weekly review needs 8 questions, found ' + D.REVIEW_Q.length);
      if (D.BANDS.length !== 5) fail('Forge needs 5 score bands');
      // every notification text fits the 120 character limit with its title
      const texts = [];
      const walkMsg = (x) => { if (typeof x === 'string') texts.push(x); else if (x && typeof x === 'object') Object.values(x).forEach(walkMsg); };
      walkMsg(D.MSG); walkMsg(D.REVIEW_MSG); walkMsg(D.DETOX_MSG);
      const titles = Object.values(D.TITLE || {}).map((t) => String(t).length);
      const tmax = Math.max(...titles);
      const long = texts.filter((t) => t.length + tmax + 1 > 120 && t.length > 120 - tmax - 1);
      if (!texts.length) fail('Forge has no reminder messages');
      if (long.length) fail(long.length + ' Forge reminder message(s) are too long for 120 characters with the title, e.g. "' + long[0] + '"');
      else checked++;
    }
    if (typeof P !== 'string' || P.length < 8000 || !/FORGE PROTOCOL/i.test(P)) fail('apps/forge/prompt.js should hold the full Forge Protocol master prompt');
    else checked++;

    // reminder ids: Forge plans 700000 to 700899 (+ 700900 detox, 700901 test); nobody else may use that block, and Goals must not cancel it
    const core = read('core.js');
    if (!/NID\s*[:=]\s*700000\b/.test(core)) fail('Forge reminder ids must start at 700000 (FG.NID)');
    for (const file of walk(www)) {
      if (!/\.(js|html)$/.test(file) || file.startsWith(forge + path.sep)) continue;
      const src = fs.readFileSync(file, 'utf8');
      if (/\b70\d{4}\b/.test(src.replace(/n\.id>=700000&&n\.id<710000/g, ''))) fail(rel(file) + ' mentions an id in the Forge block 700000 to 709999');
    }
    const goalsApp = fs.readFileSync(path.join(goals, 'app.js'), 'utf8');
    if (!/n\.id>=700000&&n\.id<710000/.test(goalsApp)) fail('Goals reminder clean-up must leave ids 700000 to 709999 (Forge) alone');
    else checked++;

    // Forge follows the work shifts planned in Goals: it only reads them, and its built-in shift hours are the same as Goals' defaults
    const gd = goalsApp.match(/const DEFAULT_CONFIG=\{morning:\['([\d:]+)','([\d:]+)'\],afternoon:\['([\d:]+)','([\d:]+)'\],wake:'([\d:]+)',sleep:'([\d:]+)',bufferMin:(\d+)/);
    const fd = core.match(/GDEF\s*=\s*\{\s*morning:\s*\['([\d:]+)',\s*'([\d:]+)'\],\s*afternoon:\s*\['([\d:]+)',\s*'([\d:]+)'\],\s*wake:\s*'([\d:]+)',\s*sleep:\s*'([\d:]+)',\s*buffer:\s*(\d+)/);
    if (!gd) fail('the Goals DEFAULT_CONFIG (shift hours) could not be read; update scripts/check.mjs if its format changed');
    else if (!fd) fail('apps/forge/core.js has no GDEF with the Goals shift defaults');
    else if (gd.slice(1).join(' ') !== fd.slice(1).join(' ')) fail('Forge GDEF (' + fd.slice(1).join(' ') + ') differs from the Goals DEFAULT_CONFIG (' + gd.slice(1).join(' ') + '): both must use the same shift hours');
    else checked++;
    if (!/\(src\(\)\.G \|\| \{\}\)\.shifts/.test(core)) fail('Forge should read the shifts from the Goals data (src().G.shifts)');
    else checked++;
    const forgeJs = fs.readdirSync(forge).filter((f) => f.endsWith('.js')).map(read).join('\n');
    if (/\b(?:wr|setItem)\(\s*['"]futuregoals/.test(forgeJs)) fail('Forge must never write to the Goals data (futuregoals.v1); it only reads the shifts');
    else checked++;
    // the "Open the Goals planner" button reaches the Goals planner through the hub
    if (!/hubGo:\s*'goals',\s*view:\s*'planner'/.test(read('ui.js'))) fail('Forge "Open the Goals planner" must post {hubGo:\'goals\', view:\'planner\'} to the hub');
    if (!/\['home','planner','learn','timer','stats'\]\.includes\(d\.goView\)/.test(goalsApp)) fail('Goals no longer accepts {goView:\'planner\'}, so the hub cannot open its planner from Forge');
    else checked++;
    // the screens that show the shifts exist
    if (!/FU\.regions\.shift\b/.test(read('v-today.js')) || !/Work shifts/.test(read('v-setup.js')) || !/Work days and days off/.test(read('v-stats.js'))) fail('Forge is missing a shift screen (Today card, Settings card or the Stats card)');
    else checked++;
  } catch (e) { fail('Forge checks could not run: ' + e.message); }
}
console.log(`${checked} checks, ${errors} problem${errors === 1 ? '' : 's'}`);
process.exit(errors ? 1 : 0);
