// The glass hero in a real browser, on the homepage (`/`), where it shipped (openspec
// stone-glass-homepage, chunk 2). The fit to one screen runs since chunk 3, when the
// drawing-sheet frame and bar left and the stone bar took their place. Needs a running site:
//   BASE=http://localhost:4399 node --test tests/glass-hero.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { terminalReflection } from '../src/config/glass.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function home(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
const HERO = '[data-glass-moment="hero"]';
/** The cards have arrived, every light full and drawn (the arrival, sketch round 3). */
const arrived = async (page) => { await page.waitForFunction(() => window.__glass.glow.every((g) => g === 1), null, { timeout: 10000 }); await frames(page, 3); };
/** Let the page render `n` more frames. */
const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);

// how much a card's canvas varies: an unlit or blank canvas is flat
const spread = (page, sel) => page.$$eval(sel, cs => cs.map(c => {
  const g = document.createElement('canvas'); g.width = 64; g.height = 78;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 78);
  const d = x.getImageData(0, 0, 64, 78).data; let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return hi - lo;
}));

test('H3: the name is real text, four cards link to their pages, every card is lit', async () => {
  const { context, page, errors } = await home();
  await arrived(page);
  assert.equal((await page.textContent(`${HERO} h1`)).replace(/\s+/g, ''), 'EzraHulsman');
  const links = await page.$$eval(`${HERO} .glass-card`, as => as.map(a => [a.querySelector('.title').textContent, a.getAttribute('href')]));
  assert.deepEqual(links.map(l => l[0]), ['ANNA', 'Henk', 'Homelab', 'Claude Sandbox']);
  for (const [, href] of links) assert.match(href, /^\/projects\//);
  for (const s of await spread(page, `${HERO} .glass-card canvas`)) assert.ok(s > 40, `a lit card varies (${s})`);
  assert.deepEqual(errors, []);
  await context.close();
});

// the homepage under the stone bar: the name, the intro and the whole card row on the first screen
for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) test(`hero fits the first ${w} x ${h} screen, cards included`, async () => {
  const { context, page } = await home('', { width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const { top, bottom } = await page.$eval(`${HERO} .cards`, el => el.getBoundingClientRect());
  await context.close(); // before asserting: a context left open keeps animating and starves the next test
  // the larger name (sketch round 3): on a 720 px screen the row starts on it, 90% of it inside
  if (h === 720) assert.ok(top < h && (h - top) / (bottom - top) >= 0.9, `cards ${top}..${bottom}`);
  else assert.ok(bottom <= h, `cards end at ${bottom}`);
});

test('reduced motion: the light holds still', async () => {
  const { context, page } = await home('', { reducedMotion: 'reduce' });
  const a = await page.$eval(`${HERO} .glass-card canvas`, c => c.toDataURL());
  await frames(page, 30);
  const b = await page.$eval(`${HERO} .glass-card canvas`, c => c.toDataURL());
  assert.equal(a, b);
  await context.close();
});

test('phone width: no sideways page scroll, the cards scroll in their own row', async () => {
  const { context, page, errors } = await home('', { width: 390, height: 844 });
  const row = await page.$eval(`${HERO} .cards`, r => r.scrollWidth - r.clientWidth);
  assert.ok(row > 0, 'the row holds more than one screen of cards');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(over <= 0, `page overflows by ${over}px`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the four cards fill the row: no gap after the last card', async () => {
  const { context, page } = await home();
  const gap = await page.evaluate((hero) => {
    const row = document.querySelector(`${hero} .cards`).getBoundingClientRect();
    const cards = [...document.querySelectorAll(`${hero} .glass-card`)].map(c => c.getBoundingClientRect());
    return row.right - cards.at(-1).right;
  }, HERO);
  await context.close();
  assert.ok(Math.abs(gap) < 1, `${gap}px left over`);
});

// Phones keep only a few WebGL contexts alive and drop the oldest: with one context per pane the
// first hero cards went blank once the lab added ANNA's stack and the terminal (2026-11-09). The
// homepage has the four cards and the terminal's reflection minis.
test('every pane draws on a phone, however many panes the page has: one WebGL context in all', async () => {
  const { context, page, errors } = await home('', { width: 390, height: 844 });
  await arrived(page);
  const kinds = await page.$$eval('.glass-card[data-light] canvas', cs => cs.map(c => (c.getContext('2d') ? '2d' : 'other')));
  const spreads = await spread(page, `${HERO} .glass-card canvas`);
  await context.close();
  assert.ok(kinds.length >= 4 + terminalReflection.panes.length, `the homepage has the cards and the reflections (${kinds.length})`);
  assert.ok(kinds.every(k => k === '2d'), 'each pane shows a copy, not its own context');
  spreads.forEach((s, i) => assert.ok(s > 40, `hero card ${i + 1} is lit (${s})`));
  assert.deepEqual(errors, []);
});

// ---- the arrival and the name's light (stone-homepage: "The hero arrives and the cards' light
// reaches the name", sketch round 3, 2026-11-11). `?at=` holds one moment of the arrival; `?t=`
// freezes the light (no arrival). window.__hero: t (the arrival's clock, s), arrived, lt (the
// light's loop time at the last paint), spill (per card), layers (what lights the name). ----
import { glassCards } from '../src/config/glass.ts';
import * as A from '../src/scripts/glass/arrival-model.js';
import { parseColor, contrast } from './lib/contrast.mjs';

const STONE = parseColor('#EEEAE3').slice(0, 3);
/** The hero once its driver has painted: waits on __hero, never on time. */
async function hero(q, opts = {}) {
  const r = await home(q, opts);
  await r.page.waitForFunction(() => window.__hero?.ready === true);
  await frames(r.page, 2);
  return r;
}
const heroState = (page) => page.evaluate(() => ({
  t: window.__hero.t, lt: window.__hero.lt, spill: window.__hero.spill, layers: window.__hero.layers,
  glow: window.__glass.glow,
  opacity: [...document.querySelectorAll('[data-glass-moment="hero"] .cards > li')].map((li) => +getComputedStyle(li).opacity),
  name: (() => { const h = document.querySelector('#hero-name'); const r = h.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, opacity: +getComputedStyle(h).opacity }; })(),
  cards: [...document.querySelectorAll('[data-glass-moment="hero"] .glass-card')].map((c) => { const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right }; }),
}));
const cardLayers = (s) => s.layers.filter((l) => l.kind === 'card');
const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('the cards arrive in order: ANNA first, 160 ms apart, every light up from dim; the name there throughout', async () => {
  const seen = {};
  for (const at of [0.1, 0.2, 0.5]) {
    const { context, page, errors } = await hero(`?at=${at}`);
    seen[at] = await heroState(page);
    await context.close();
    assert.deepEqual(errors, []);
  }
  for (const [at, s] of Object.entries(seen)) {
    assert.ok(near(s.t, +at * A.T, 1e-6), `held at ${+at * A.T} s, got ${s.t}`);
    for (let i = 1; i < 4; i++) {
      assert.ok(s.opacity[i] <= s.opacity[i - 1] + 1e-3, `at ${at}: card ${i + 1} is further in than card ${i} (${s.opacity})`);
      assert.ok(s.glow[i] <= s.glow[i - 1] + 1e-3, `at ${at}: light ${i + 1} is ahead of light ${i} (${s.glow})`);
    }
    assert.equal(s.name.opacity, 1, `the name is there at ${at}`);
    s.opacity.forEach((o, i) => assert.ok(near(o, A.cardIn(i, +at * A.T), 0.01), `at ${at}: card ${i + 1} at ${o}, the model says ${A.cardIn(i, +at * A.T)}`));
  }
  assert.ok(seen[0.1].opacity[0] > 0.5 && seen[0.1].opacity[3] === 0, `at 0.1 ANNA is in part, Claude Sandbox not yet: ${seen[0.1].opacity}`);
  assert.ok(seen[0.1].glow[0] < 1 && seen[0.1].glow[3] === 0, `at 0.1 the lights are still dim: ${seen[0.1].glow}`);
  assert.deepEqual(seen[0.5].opacity, [1, 1, 1, 1], 'at 0.5 every card is in');
  assert.deepEqual(seen[0.5].glow, [1, 1, 1, 1], 'at full light');
  assert.ok(seen[0.5].spill.every((k) => k === 1), `at 0.5 the spill is at its peak: ${seen[0.5].spill}`);
  assert.ok(seen[0.1].spill.every((k) => k === 0), 'no spill before the cards have landed');
});

test('the resting tint follows the loop: one light per card under the name at its card\'s centre, as strong as its light allows', async () => {
  const { context, page, errors } = await hero('?at=1&guard=off');
  const a = await heroState(page);
  await page.waitForFunction((lt0) => { const d = ((window.__hero.lt - lt0) % 10 + 10) % 10; return d > 1.5 && d < 8; }, a.lt, { timeout: 15000 });
  const b = await heroState(page);
  await context.close();
  assert.deepEqual(errors, []);
  const rows = glassCards.map((c) => A.loopAmounts(c));
  let differs = 0;
  for (const s of [a, b]) {
    const layers = cardLayers(s);
    assert.equal(layers.length, 4, `one light per card: ${JSON.stringify(layers)}`);
    for (const L of layers) {
      const c = s.cards[L.i];
      assert.ok(near(L.x, c.left + c.width / 2 - s.name.left, 1), `card ${L.i + 1}'s light at its centre`);
      assert.ok(L.y > s.name.height / 2, `card ${L.i + 1}'s light below the middle of the name`);
      const want = A.SPILL_A * A.restLevel(A.amountAt(rows[L.i], s.lt));
      assert.ok(near(L.a, want, 0.02), `card ${L.i + 1} at loop time ${s.lt.toFixed(2)}: ${L.a.toFixed(3)}, the model says ${want.toFixed(3)}`);
      assert.ok(L.a <= A.SPILL_A * 0.46 + 1e-6, 'at most 46% of the peak');
    }
  }
  for (let i = 0; i < 4; i++) if (Math.abs(cardLayers(a)[i].a - cardLayers(b)[i].a) > 0.005) differs++;
  assert.ok(differs > 0, 'the tint moved with the lights between two moments of the loop');
});

test('phone: each card\'s hue sits on the name at its live position, a swipe moves it; stronger than on a desktop', async () => {
  const desk = await hero('?t=2.4');
  const d = await heroState(desk.page);
  await desk.context.close();
  const { context, page, errors } = await hero('?t=2.4', { width: 390, height: 844 });
  const before = await heroState(page);
  const moved = await page.$eval(`${HERO} .cards`, (row) => {
    const henk = row.querySelectorAll(':scope > li')[1];
    const from = row.scrollLeft;
    row.style.scrollSnapType = 'none';
    row.scrollLeft = henk.offsetLeft - row.firstElementChild.offsetLeft;
    return row.scrollLeft - from;
  });
  await frames(page, 4);
  const after_ = await heroState(page);
  await context.close();
  assert.deepEqual(errors, []);
  assert.ok(moved > 200, `the row scrolled (${moved})`);
  const L = (s, i) => cardLayers(s).find((l) => l.i === i);
  assert.ok(L(before, 0), 'ANNA lights the name before the swipe');
  assert.ok(!L(before, 2), 'a card out of view throws no light');
  // ANNA's light went left with her card, Henk's came in at his
  const annaAfter = L(after_, 0);
  if (annaAfter) assert.ok(near(annaAfter.x, L(before, 0).x - moved, 2), `ANNA's light followed her card: ${L(before, 0).x} -> ${annaAfter.x}`);
  const henk = L(after_, 1);
  assert.ok(henk, 'Henk lights the name after the swipe');
  const hc = after_.cards[1];
  assert.ok(near(henk.x, hc.left + hc.width / 2 - after_.name.left, 1), 'at his card\'s centre');
  assert.ok(henk.a > (L(before, 1)?.a ?? 0), 'more of Henk in view, more of his light');
  assert.ok(L(before, 0).a > L(d, 0).a * 1.2, `stronger than at 1440: ${L(before, 0).a} vs ${L(d, 0).a}`);
});

test('a mouse over the name: a soft light at the pointer in the nearest card\'s hue, gone when it leaves; a tap adds none', async () => {
  const { context, page, errors } = await hero('?at=1');
  const s = await heroState(page);
  const hc = s.cards[1];
  const at = [hc.left + hc.width / 2, s.name.top + s.name.height * 0.75];
  await page.mouse.move(at[0], at[1], { steps: 4 });
  await page.waitForFunction(() => (window.__hero.layers.find((l) => l.kind === 'mouse')?.a ?? 0) > 0.95 * 0.5, null, { timeout: 20000 });
  const on = (await heroState(page)).layers.find((l) => l.kind === 'mouse');
  assert.ok(near(on.x, at[0] - s.name.left, 2) && near(on.y, at[1] - s.name.top, 2), `at the pointer: ${JSON.stringify(on)}`);
  const dist = (a, b) => Math.hypot(...a.map((v, j) => v - b[j]));
  const ds = glassCards.map((c) => dist(on.c, c.spill));
  assert.equal(ds.indexOf(Math.min(...ds)), 1, `nearest Henk's hue: ${on.c}`);
  await page.mouse.move(at[0], -20);
  await page.dispatchEvent('html', 'pointerleave');
  await page.waitForFunction(() => !window.__hero.layers.some((l) => l.kind === 'mouse'), null, { timeout: 20000 });
  await context.close();
  assert.deepEqual(errors, []);

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tp = await touch.newPage();
  await tp.goto(`${BASE}/?at=1`, { waitUntil: 'load' });
  await tp.waitForFunction(() => window.__hero?.ready === true);
  const box = await tp.locator('#hero-name').boundingBox();
  await tp.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await frames(tp, 30);
  const layers = await tp.evaluate(() => window.__hero.layers);
  await touch.close();
  assert.ok(!layers.some((l) => l.kind === 'mouse'), `a tap adds no light: ${JSON.stringify(layers)}`);
});

/** In the first painted frame: is each hero card shown (opacity 1 up its ancestors)? */
function firstFrameCards() {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => {
    const shown = (el) => { for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 1) return false; return true; };
    window.__firstCards = [...document.querySelectorAll('[data-glass-moment="hero"] .glass-card')].map(shown);
  }));
}

test('reduced motion: no arrival and a plain name; ?t=: no arrival and no mouse light; no WebGL: the fallback, a plain name, no error', async () => {
  // reduced motion
  {
    const { context, page, errors } = await home('', { reducedMotion: 'reduce' });
    await context.addInitScript(firstFrameCards);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__glassReady === true && window.__hero?.ready === true);
    const r = await page.evaluate(() => ({ first: window.__firstCards, after: getComputedStyle(document.querySelector('#hero-name'), '::after').display, layers: window.__hero.layers }));
    await context.close();
    assert.deepEqual(r.first, [true, true, true, true], 'reduced motion: the cards are in from the first frame');
    assert.equal(r.after, 'none', 'reduced motion: nothing over the name');
    assert.deepEqual(r.layers, []);
    assert.deepEqual(errors, []);
  }
  // ?t=
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(firstFrameCards);
    const page = await context.newPage();
    await page.goto(`${BASE}/?t=2.4`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__hero?.ready === true);
    const box = await page.locator('#hero-name').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7, { steps: 4 });
    await frames(page, 20);
    const r = await page.evaluate(() => ({ first: window.__firstCards, layers: window.__hero.layers }));
    await context.close();
    assert.deepEqual(r.first, [true, true, true, true], '?t=: the cards are in from the first frame');
    assert.ok(!r.layers.some((l) => l.kind === 'mouse'), '?t=: the mouse adds no light');
  }
  // no WebGL
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) { return /webgl/i.test(kind) ? null : orig.call(this, kind, ...rest); };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__glassReady === true && window.__hero?.ready === true);
    await frames(page, 4);
    const r = await page.evaluate(() => ({
      lit: document.querySelectorAll('[data-glass-moment="hero"] .glass-card.lit').length,
      opacity: [...document.querySelectorAll('[data-glass-moment="hero"] .cards > li')].map((li) => +getComputedStyle(li).opacity),
      fallback: [...document.querySelectorAll('[data-glass-moment="hero"] .glass-card')].map((c) => getComputedStyle(c).backgroundImage),
      spill: document.querySelector('#hero-name').style.getPropertyValue('--spill'),
      layers: window.__hero.layers,
    }));
    await context.close();
    assert.equal(r.lit, 0);
    assert.deepEqual(r.opacity, [1, 1, 1, 1], 'every card shows');
    r.fallback.forEach((bg, i) => assert.match(bg, /radial-gradient/, `card ${i + 1} keeps its soft gradient`));
    assert.equal(r.spill, '', 'the name has no tint');
    assert.deepEqual(r.layers, []);
    assert.deepEqual(errors, []);
  }
  // the arrival's script never runs: the cards still show
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route(/arrival(\.js|\.[\w-]+\.js)/, (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => [...document.querySelectorAll('[data-glass-moment="hero"] .cards > li')].every((li) => getComputedStyle(li).opacity === '1'), null, { timeout: 6000 });
    await context.close();
  }
});

/** The lowest contrast of any pixel in the name's box against the stone, with the ink and its light painted as solid blocks. */
async function nameContrast(page) {
  await page.addStyleTag({ content: '#hero-name { background: var(--stone-ink) !important; color: var(--stone-ink) !important; } #hero-name::after { -webkit-background-clip: border-box !important; background-clip: border-box !important; }' });
  await frames(page, 2);
  const b = await page.locator('#hero-name').boundingBox();
  const clip = { x: b.x + 2, y: Math.max(0, b.y + 2), width: b.width - 4, height: Math.min(b.height - 4, 900) };
  const png = await page.screenshot({ clip });
  const px = await page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    // every distinct colour once
    const out = new Map();
    for (let i = 0; i < d.length; i += 4) out.set((d[i] << 16) | (d[i + 1] << 8) | d[i + 2], [d[i], d[i + 1], d[i + 2]]);
    return [...out.values()];
  }, png.toString('base64'));
  let lo = Infinity, at = null;
  for (const p of px) { const r = contrast(p, STONE); if (r < lo) { lo = r; at = p; } }
  return { ratio: lo, at, colours: px.length };
}

test('the name reads at 4.5:1 at every pixel: at the spill\'s peak (desktop and phone, mid-swipe too), at rest with the mouse on it', { timeout: 120000 }, async (t) => {
  const worst = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { context, page } = await hero('?at=0.5', { width: w, height: h });
    worst.push({ where: `peak ${w}`, ...(await nameContrast(page)) });
    if (w === 390) {
      await page.$eval(`${HERO} .cards`, (row) => { row.style.scrollSnapType = 'none'; row.scrollLeft = row.querySelectorAll(':scope > li')[1].offsetLeft / 2; });
      await frames(page, 4);
      worst.push({ where: 'peak 390 mid-swipe', ...(await nameContrast(page)) });
    }
    await context.close();
  }
  const { context, page } = await hero('?at=1');
  const s = await heroState(page);
  for (const c of s.cards) {
    // on the name's lower line, above each card (the last card reaches past the name: its edge)
    await page.mouse.move(Math.min(c.left + c.width / 2, s.name.left + s.name.width - 8), s.name.top + s.name.height * 0.82, { steps: 2 });
    await page.waitForFunction(() => (window.__hero.layers.find((l) => l.kind === 'mouse')?.a ?? 0) > 0.95 * 0.5, null, { timeout: 10000 });
    worst.push({ where: `rest, mouse over card at ${Math.round(c.left)}`, ...(await nameContrast(page)) });
    await page.evaluate(() => document.querySelectorAll('style').forEach((st) => { if (st.textContent.includes('background-clip: border-box !important')) st.remove(); }));
  }
  await context.close();
  t.diagnostic(`lowest: ${Math.min(...worst.map((w) => w.ratio)).toFixed(2)}:1 (${worst.map((w) => `${w.where} ${w.ratio.toFixed(2)}`).join('; ')})`);
  for (const w of worst) {
    assert.ok(w.colours > 20, `${w.where}: the light shows in the probe (${w.colours} colours)`);
    assert.ok(w.ratio >= 4.5, `${w.where}: ${w.ratio.toFixed(2)}:1 at rgb(${w.at})`);
  }
});

// the larger name (sketch round 3): 233 px at 1440, 207 at 1280, 150 at 1000, 88 on a phone
for (const [w, h, size] of [[1440, 900, 233], [1280, 800, 207], [1000, 800, 150], [390, 844, 88]]) test(`the name at ${w} x ${h}: ${size} px, clear of the intro and the cards`, async () => {
  const { context, page, errors } = await home('?t=2.4', { width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    // the name's box, as wide as its widest line of text
    const h1 = document.querySelector('#hero-name');
    const range = document.createRange(); range.selectNodeContents(h1);
    const name = box(h1);
    name.r = Math.max(name.r, ...[...range.getClientRects()].map((b) => b.right));
    return {
      size: parseFloat(getComputedStyle(h1).fontSize),
      name: [name],
      intro: box(document.querySelector('.hero-intro')),
      cards: box(document.querySelector('[data-glass-moment="hero"] .cards')),
      over: document.documentElement.scrollWidth - innerWidth,
    };
  });
  await context.close();
  const hits = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  assert.ok(near(r.size, size, 1), `the name is ${r.size}px`);
  for (const line of r.name) {
    assert.ok(!hits(line, r.intro), `the name meets the intro: ${JSON.stringify(line)} ${JSON.stringify(r.intro)}`);
    assert.ok(!hits(line, r.cards), 'the name meets the cards');
  }
  assert.ok(!hits(r.intro, r.cards), 'the intro meets the cards');
  assert.ok(r.cards.t < h, `the cards start on the first screen (${r.cards.t})`);
  assert.ok(r.over <= 0, `${r.over}px of sideways scroll`);
  assert.deepEqual(errors, []);
});
