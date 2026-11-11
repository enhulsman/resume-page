// The lab and the rejected stagings are gone (openspec stone-glass-homepage, chunk 8): /hero-lab,
// the H2 variant, the name glare, the turn, journey and stack stagings, the words staging, the
// lab-only exports of glass.ts and their tests. The homepage carries the hero, ANNA's window and
// the terminal window; nothing may wire the stagings back. The 404 on the running site:
// tests/glass-retired.e2e.mjs.
//
//   node --test tests/glass-retired.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import * as glass from '../src/config/glass.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const walk = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));

const STAGINGS = ['glare.js', 'anna.js', 'anna-model.js', 'anna-scene.js', 'anna-turn.js', 'anna-journey.js', 'hero.js', 'words.js', 'words-model.js']
  .map((f) => `src/scripts/glass/${f}`);
const LAB_TESTS = ['glass-anna.test.mjs', 'glass-anna-scene.test.mjs', 'glass-anna.e2e.mjs', 'glass-anna-stagings.e2e.mjs', 'glass-glare.e2e.mjs']
  .map((f) => `tests/${f}`);

test('no lab page: src/pages has no hero-lab, and a build has none in dist/', () => {
  const pages = walk('src/pages/');
  assert.deepEqual(pages.filter((p) => /hero-lab/.test(p)), []);
  // a build left from before the lab went would still hold it: rebuild (`npm run build`) first
  if (existsSync(new URL('dist/', root))) {
    assert.deepEqual(walk('dist/').filter((p) => /hero-lab/.test(p)), [], 'dist/ is a build from after the lab went');
  }
});

test('no staging code: the lab\'s scripts and their tests are gone; the site\'s glass stays', () => {
  assert.deepEqual([...STAGINGS, ...LAB_TESTS].filter((p) => existsSync(new URL(p, root))), []);
  for (const p of ['panes.js', 'guard.js', 'model.js', 'shader.js', 'anna-window.js', 'anna-window-model.js']) {
    assert.ok(existsSync(new URL(`src/scripts/glass/${p}`, root)), `${p} stays`);
  }
});

test('no staging code: glass.ts exports none of the lab\'s, and no card carries the "before" look', () => {
  for (const name of ['h2Card', 'annaExploded', 'beforeTune', 'AnnaPane', 'AnnaVariant']) {
    assert.equal(name in glass, false, `export ${name}`);
  }
  const src = read('src/config/glass.ts');
  assert.doesNotMatch(src, /\b(h2Card|annaExploded|beforeTune|AnnaPane|AnnaVariant)\b/);
  assert.doesNotMatch(src, /\bbefore\??\s*:/, 'no `before` field on a card');
  assert.doesNotMatch(src, /annaLevels/, 'the four levels live on /projects only');
  for (const c of [...glass.glassCards, ...glass.benched]) assert.equal('before' in c, false, `${c.id} has no before look`);
});

test('no staging code: no file under src/ names a staging, the glare or the lab switch', () => {
  const code = walk('src/');
  const hits = code.flatMap((p) => {
    const s = read(p);
    return ['anna-turn', 'anna-journey', 'anna-x', 'data-glare', '?lab=', 'hero-lab', 'glare.js', 'hero.js']
      .filter((w) => s.includes(w)).map((w) => `${p}: ${w}`);
  });
  assert.deepEqual(hits, []);
});

test('no test still opens the lab', () => {
  const tests = walk('tests/').filter((p) => /\.(mjs|ts|py)$/.test(p) && p !== 'tests/glass-retired.test.mjs' && p !== 'tests/glass-retired.e2e.mjs');
  assert.deepEqual(tests.filter((p) => /hero-lab|[?&]lab=1|h2Card|annaExploded|look=before/.test(read(p))), []);
});

// task 8.3: CI runs the glass suites (npm test before the build, test:e2e against the build). Since
// 2026-11-11 (Ezra: 11.5 min for a website's tests) test:e2e runs two lanes: the live lane, the files
// whose tests need the light running (*.live.e2e.mjs), one at a time; the still lane, every other
// browser file, side by side (tests/lib/glass-page.mjs).
test('npm test runs every glass unit test and test:e2e every glass browser test', () => {
  const { scripts } = JSON.parse(read('package.json'));
  const files = readdirSync(new URL('tests/', root));
  const still = scripts['test:e2e:still'] ?? '', live = scripts['test:e2e:live'] ?? '';
  for (const f of files.filter((f) => /^glass-.*\.test\.mjs$/.test(f))) assert.ok(scripts.test.includes(`tests/${f}`), `npm test runs ${f}`);
  for (const f of files.filter((f) => /^glass-.*\.e2e\.mjs$/.test(f))) assert.ok(`${still} ${live}`.includes(`tests/${f}`), `test:e2e runs ${f}`);
  assert.match(scripts['test:e2e'], /test:e2e:still/, 'test:e2e runs the still lane');
  assert.match(scripts['test:e2e'], /test:e2e:live/, 'and the live lane');
  assert.match(still, /tests\/sheets\.e2e\.mjs/, 'the inner pages\' suite stays');
  // every browser file in exactly one lane; the live files only in the live lane
  for (const f of files.filter((f) => f.endsWith('.e2e.mjs'))) {
    const lanes = [still, live].filter((s) => s.split(/\s+/).includes(`tests/${f}`)).length;
    assert.equal(lanes, 1, `${f} runs in one lane`);
    if (f.endsWith('.live.e2e.mjs')) assert.ok(live.split(/\s+/).includes(`tests/${f}`), `${f} runs in the live lane`);
  }
  assert.match(live, /--test-concurrency=1/, 'the live lane: one browser suite at a time');
});
