// The glass hero's arrival, the light's loop in the name, and the mouse over it, on the homepage
// (`/`), in a real browser: the tests of tests/glass-hero.e2e.mjs that need the light running, so
// this file runs alone (the live lane; tests/lib/glass-page.mjs). Needs a running site:
//   BASE=http://localhost:4399 node --test tests/glass-hero.live.e2e.mjs
// Every wait is on state; its budget fits CI, where a frame of the running light at 1440 can take
// a second or two, and the name's mouse light eases in steps of at most 0.1 s a frame (arrival.js:
// it rises in about two frames and fades out over about 28).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';
import { BASE, opener, heroOpener, heroState, cardLayers, near, frames } from './lib/glass-page.mjs';
import { glassCards } from '../src/config/glass.ts';
import * as A from '../src/scripts/glass/arrival-model.js';
import { parseColor, contrast } from './lib/contrast.mjs';

const pw = useBrowser({ args: SWIFTSHADER });
const home = opener(pw);
const hero = heroOpener(home);
const HERO = '[data-glass-moment="hero"]';
/** A state wait's budget with the light running: ~28 frames at CI's slowest. */
const SLOW = 90000;

// ---- the arrival and the name's light (stone-homepage: "The hero arrives and the cards' light
// reaches the name", sketch round 3, 2026-11-11). `?at=` holds one moment of the arrival; `?t=`
// freezes the light (no arrival). window.__hero: t (the arrival's clock, s), arrived, lt (the
// light's loop time at the last paint), spill (per card), layers (what lights the name). ----
const STONE = parseColor('#EEEAE3').slice(0, 3);

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


test('a mouse over the name: a soft light at the pointer in the nearest card\'s hue, gone when it leaves; a tap adds none', async () => {
  const { context, page, errors } = await hero('?at=1');
  const s = await heroState(page);
  const hc = s.cards[1];
  const at = [hc.left + hc.width / 2, s.name.top + s.name.height * 0.75];
  await page.mouse.move(at[0], at[1], { steps: 4 });
  await page.waitForFunction(() => (window.__hero.layers.find((l) => l.kind === 'mouse')?.a ?? 0) > 0.95 * 0.5, null, { timeout: SLOW });
  const on = (await heroState(page)).layers.find((l) => l.kind === 'mouse');
  assert.ok(near(on.x, at[0] - s.name.left, 2) && near(on.y, at[1] - s.name.top, 2), `at the pointer: ${JSON.stringify(on)}`);
  const dist = (a, b) => Math.hypot(...a.map((v, j) => v - b[j]));
  const ds = glassCards.map((c) => dist(on.c, c.spill));
  assert.equal(ds.indexOf(Math.min(...ds)), 1, `nearest Henk's hue: ${on.c}`);
  await page.mouse.move(at[0], -20);
  await page.dispatchEvent('html', 'pointerleave');
  await page.waitForFunction(() => !window.__hero.layers.some((l) => l.kind === 'mouse'), null, { timeout: SLOW });
  await context.close();
  assert.deepEqual(errors, []);

  const touch = await pw.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
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
    const context = await pw.newContext({ viewport: { width: 1440, height: 900 } });
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
    const context = await pw.newContext({ viewport: { width: 1440, height: 900 } });
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
    const context = await pw.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route(/arrival(\.js|\.[\w-]+\.js)/, (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => [...document.querySelectorAll('[data-glass-moment="hero"] .cards > li')].every((li) => getComputedStyle(li).opacity === '1'), null, { timeout: 30000 });
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
    const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d', { willReadFrequently: true });
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

test('the name reads at 4.5:1 at every pixel: at the spill\'s peak (desktop and phone, mid-swipe too), at rest with the mouse on it', { timeout: 300000 }, async (t) => {
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
    await page.waitForFunction(() => (window.__hero.layers.find((l) => l.kind === 'mouse')?.a ?? 0) > 0.95 * 0.5, null, { timeout: SLOW });
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
