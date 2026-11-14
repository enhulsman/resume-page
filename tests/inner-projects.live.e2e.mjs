// /projects in a real browser, the test that runs the cards' light (the live lane, run one at a
// time; tests/lib/glass-page.mjs): one WebGL context, and only the panes that show are drawn. The
// rest of /projects: tests/inner-projects.e2e.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-projects.live.e2e.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser } from './lib/browser.mjs';
import { details, register } from '../src/config/home.ts';

/** One card per project except ANNA. */
const CARDS = details.length + register.length;

const BASE = process.env.BASE || 'http://localhost:4321';
const CARD = '[data-glass-moment="project-cards"] .pc';

/** Count every canvas that got a WebGL context, before any page script runs. */
function countGL() {
  const orig = HTMLCanvasElement.prototype.getContext;
  const gl = new Set();
  window.__glCanvases = gl;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    const ctx = orig.call(this, kind, ...rest);
    if (ctx && /webgl/i.test(kind)) gl.add(this);
    return ctx;
  };
}

// every context load() makes is closed after its test (tests/lib/browser.mjs), passed or failed
const pw = useBrowser();
const loads = [];
async function load(query, { motion = 'reduce', init = [], ready = true, scale = 1 } = {}) {
  const context = await pw.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: motion, deviceScaleFactor: scale });
  for (const s of init) await context.addInitScript(s);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/projects${query}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  if (ready) await page.waitForFunction(() => window.__glassReady === true);
  loads.push({ context, errors });
  return page;
}
after(() => {
  const errors = loads.flatMap((l) => l.errors);
  assert.deepEqual(errors, [], 'no error on any load of /projects');
});

const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
async function width(page, w, h = w <= 400 ? 844 : 900) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames(page, 3);
}

// ---------- the loop: one context, only the panes that show ----------

test('One context, and only what shows: one WebGL context; at 1440 and at 390 the visible panes are lit and drawn, the hidden never', async () => {
  // which panes draw is all this reads: at half the device pixels each draw costs a quarter
  const page = await load('?guard=off', { motion: 'no-preference', init: [countGL], scale: 0.5 });
  assert.equal(await page.evaluate(() => window.__glCanvases.size), 1, 'one WebGL context on the page');
  const panes = () => page.$$eval('[data-glass="ribbed"]', (ps) => ps.map((p) => ({ shown: getComputedStyle(p).display !== 'none', lit: p.classList.contains('lit'), card: !!p.closest('.pc') })));
  const draws = () => page.evaluate(() => window.__glass.draws);
  // 30 frames in all, every row of cards scrolled into view in turn
  const tour = async () => {
    const rows = await page.$$eval(CARD, (cs) => [...new Set(cs.map((c) => Math.round(c.getBoundingClientRect().top + scrollY)))]);
    const each = Math.ceil(30 / rows.length);
    for (const top of rows) {
      await page.evaluate((y) => window.scrollTo(0, y - innerHeight / 3), top);
      await frames(page, each);
    }
  };
  for (const w of [1440, 390]) {
    await width(page, w);
    const p = await panes();
    assert.equal(p.length, CARDS * 5, 'five panes per card');
    assert.ok(p.every((x) => x.card), 'every ribbed pane is a card\'s');
    const a = await draws();
    await tour();
    const b = await draws();
    p.forEach((x, i) => {
      if (x.shown) {
        assert.ok(x.lit, `${w}: pane ${i} is lit`);
        assert.ok(b[i] > a[i], `${w}: pane ${i} was drawn (${a[i]} -> ${b[i]})`);
      } else {
        assert.equal(b[i], a[i], `${w}: hidden pane ${i} was drawn (${a[i]} -> ${b[i]})`);
        if (w === 1440) assert.equal(b[i], 0, `${w}: hidden pane ${i} never drawn`);
      }
    });
    assert.equal(p.filter((x) => x.shown).length, CARDS * (w === 1440 ? 3 : 2), `${w}: panes shown`);
  }
});
