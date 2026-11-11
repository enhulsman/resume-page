// The stone homepage in a real browser, the tests that need its light running (the live lane;
// tests/lib/glass-page.mjs): the loop redrawing in view and stopping out of it, the slow-device
// guard and its busy-work hook, the arrival's first frame, the name without glare, and the pointer
// as a light. They run one at a time, alone: a page with the light running at 1440 draws at 2-4
// frames a second under SwiftShader and starves any page beside it. Everything else on the
// homepage: tests/glass-home.e2e.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-home.live.e2e.mjs
// Every wait is on state (__glassReady, __glass.slow, the lean, animation frames), never a fixed
// sleep; the pointer's waits have budgets that fit CI, where a frame at 1440 can take a second or
// two and the lean eases in steps of at most 0.1 s a frame (panes.js: about 16 frames to rest).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useBrowser, SWIFTSHADER } from './lib/browser.mjs';
import { BASE, opener, CARDS, frames, shots, norm } from './lib/glass-page.mjs';
import site from '../src/config/site.ts';

const pw = useBrowser({ args: SWIFTSHADER });
const open = opener(pw);
/** A state wait's budget with the light running: the lean's ~16 frames at CI's slowest. */
const SLOW = 60000;

test('the name is plain: no glare, no CSS animation, read once; with reduced motion nothing over it', async () => {
  const { context, page } = await open();
  const h = await page.$eval('main h1', (h) => ({
    glare: h.hasAttribute('data-glare'),
    anims: h.getAnimations({ subtree: true }).length,
  }));
  const snap = await page.locator('main h1').ariaSnapshot();
  await context.close();
  assert.equal(h.glare, false);
  assert.equal(h.anims, 0);
  // its ::after copy of the name (the cards' light) is silent: readers hear the name once
  assert.equal(norm(snap), `- heading "${site.name}" [level=1]`);
  const still = await open('', { reducedMotion: 'reduce' });
  const after_ = await still.page.$eval('main h1', (h) => getComputedStyle(h, '::after').display);
  await still.context.close();
  assert.equal(after_, 'none', 'reduced motion: nothing over the name');
});

test('off screen: the light redraws in view and stops out of view', async () => {
  const { context, page } = await open('?guard=off');
  // the hero's four cards come first in page order; the terminal's reflections, far below, wait
  const n = await page.$$eval(CARDS, (cs) => cs.length);
  const a = (await page.evaluate(() => window.__glass.draws)).slice(0, n);
  await frames(page, 30);
  const b = (await page.evaluate(() => window.__glass.draws)).slice(0, n);
  assert.equal(n, 4);
  a.forEach((x, i) => assert.ok(b[i] > x, `card ${i + 1} redrew in view (${x} → ${b[i]})`));
  // room below the hero, whatever the page holds yet, then scroll the cards out of view
  await page.evaluate(() => {
    const pad = document.body.appendChild(document.createElement('div'));
    pad.style.height = `${2 * innerHeight}px`;
    const row = document.querySelector('[data-glass-moment="hero"] .cards').getBoundingClientRect();
    scrollTo(0, scrollY + row.bottom + 40);
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-glass-moment="hero"] [data-glass="ribbed"]')].every((c) => c.getBoundingClientRect().bottom < 0));
  await frames(page, 4); // the observer reports the change
  const c = await page.evaluate(() => window.__glass.draws);
  await frames(page, 30);
  const d = await page.evaluate(() => window.__glass.draws);
  await context.close();
  assert.deepEqual(d, c, 'no redraws out of view');
});

test('the guard is wired: 30 ms of extra draw work trips it, every pane holds the still frame', async () => {
  const { context, page } = await open('?busy=30');
  await page.waitForFunction(() => window.__glass.slow === true, null, { timeout: 60000 });
  const a = await shots(page);
  await frames(page, 30);
  const b = await shots(page);
  a.forEach((x, i) => assert.equal(x, b[i], `card ${i + 1} still moves`));
  // and it is the still frame: drawn at 2.4 s again, nothing changes
  await page.evaluate(() => window.__glass.at(2.4));
  const c = await shots(page);
  await context.close();
  a.forEach((x, i) => assert.equal(x, c[i], `card ${i + 1} is not the still frame`));
});

test('the guard is wired: with ?guard=off the same work never trips it, and the cards keep changing', async () => {
  const { context, page } = await open('?guard=off&busy=30');
  // 4 s of frames
  await page.evaluate(() => new Promise((done) => { const t0 = performance.now(); const f = () => (performance.now() - t0 > 4000 ? done() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const slow = await page.evaluate(() => window.__glass.slow);
  const a = await shots(page);
  await frames(page, 5);
  const b = await shots(page);
  await context.close();
  assert.equal(slow, false);
  assert.ok(a.some((x, i) => x !== b[i]), 'the light still moves');
});

// The busy-work hook ships with the page (the e2e suite runs against the production build in CI),
// so it must never freeze a tab: only a small finite value counts, at both entry points.
test('?busy=Infinity freezes nothing: the page gets ready and keeps drawing frames', { timeout: 60000 }, async () => {
  const { context, page } = await open('?guard=off&busy=Infinity', { ready: false });
  try {
    await page.waitForFunction(() => window.__glassReady === true, null, { timeout: 20000 });
    const t0 = Date.now();
    await frames(page, 10);
    assert.ok(Date.now() - t0 < 15000, `ten frames took ${Date.now() - t0} ms`);
  } finally { await context.close(); }
});

test('__glass.busy takes only a small finite number of ms, and says what it took', { timeout: 60000 }, async () => {
  const { context, page } = await open('?guard=off');
  try {
    assert.equal(await page.evaluate(() => window.__glass.busy(Infinity)), 0, 'Infinity adds none');
    assert.equal(await page.evaluate(() => window.__glass.busy('abc')), 0, 'not a number adds none');
    assert.equal(await page.evaluate(() => window.__glass.busy(-10)), 0, 'a negative adds none');
    assert.equal(await page.evaluate(() => window.__glass.busy(30)), 30);
    assert.equal(await page.evaluate(() => window.__glass.busy(1e9)), 50, 'clamped to 50 ms a frame');
    const t0 = Date.now();
    await frames(page, 10);
    assert.ok(Date.now() - t0 < 15000, `ten frames took ${Date.now() - t0} ms`);
  } finally { await context.close(); }
});

test('arrival: the name and intro show in the first painted frame (the cards arrive), no intro class ever, the body not clipped', async () => {
  const watch = () => {
    window.__sawIntro = false;
    // before any page script, and before <html> exists: watch the whole document for it
    const look = () => { if (document.documentElement?.classList.contains('intro')) window.__sawIntro = true; };
    look();
    new MutationObserver(look).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => {
      const h1 = document.querySelector('main h1');
      const shown = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (+s.opacity < 1 || s.visibility !== 'visible' || s.display === 'none') return false; } return true; };
      const r = h1?.getBoundingClientRect();
      const cards = [...document.querySelectorAll('[data-glass-moment="hero"] [data-glass="ribbed"]')];
      const p = document.querySelector('.hero-intro');
      window.__first = {
        intro: document.documentElement.classList.contains('intro'),
        h1: !!h1 && shown(h1) && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
        p: !!p && shown(p),
        // the cards are laid out on the first screen, waiting for their arrival
        cards: cards.length === 4 && cards.every((c) => c.getBoundingClientRect().top < innerHeight),
        transform: getComputedStyle(document.body).transform,
      };
    }));
  };
  const { context, page } = await open('', { init: [watch] });
  const first = await page.evaluate(() => window.__first);
  const after_ = await page.evaluate(() => {
    const b = getComputedStyle(document.body);
    return { saw: window.__sawIntro, oy: b.overflowY, h: document.body.getBoundingClientRect().height, sh: document.body.scrollHeight };
  });
  await context.close();
  assert.equal(first.intro, false);
  assert.equal(first.h1, true, 'the name is on screen in the first frame');
  assert.equal(first.p, true, 'the intro is on screen in the first frame');
  assert.equal(first.cards, true, 'the cards are laid out in the first frame');
  assert.equal(first.transform, 'none', 'the page is not tilted');
  assert.equal(after_.saw, false, 'the document never got an intro class');
  assert.ok(!['hidden', 'clip'].includes(after_.oy), `body overflow ${after_.oy}`);
  assert.ok(after_.h >= after_.sh - 1, `the body holds all it has (${after_.h} of ${after_.sh})`);
});

test('the pointer is a light: a mouse on Henk\'s card brings its light nearer, ANNA\'s leans toward it; gone when the mouse leaves', async () => {
  const { context, page, errors } = await open('?guard=off');
  const box = await page.locator(CARDS).nth(1).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForFunction(() => window.__glass.lean[1].near > 0.9 && window.__glass.lean[0].x > 5, null, { timeout: SLOW }).catch(() => {});
  const on = await page.evaluate(() => window.__glass.lean);
  assert.ok(on[1].near > 0.9, `Henk's light nearer: ${JSON.stringify(on[1])}`);
  assert.ok(on[0].x > 5, `ANNA's light leans right, toward the pointer: ${JSON.stringify(on[0])}`);
  // the mouse leaves the page
  await page.mouse.move(box.x + box.width / 2, -20);
  await page.dispatchEvent('html', 'pointerleave');
  await page.waitForFunction(() => window.__glass.lean.every((l) => Math.abs(l.x) < 0.5 && Math.abs(l.y) < 0.5 && l.near < 0.05), null, { timeout: SLOW }).catch(() => {});
  const off = await page.evaluate(() => window.__glass.lean);
  await context.close();
  assert.ok(off.every((l) => Math.abs(l.x) < 0.5 && Math.abs(l.y) < 0.5 && l.near < 0.05), `back to rest: ${JSON.stringify(off)}`);
  assert.deepEqual(errors, []);
});

test('a phone is unaffected: tapping a card leans no light, and the sheen stays put', async () => {
  const context = await pw.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?guard=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  await page.evaluate(() => document.querySelector('[data-glass-moment="hero"] .cards').addEventListener('click', (e) => e.preventDefault(), true));
  const box = await page.locator(CARDS).first().boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await frames(page, 30);
  const lean = await page.evaluate(() => window.__glass.lean);
  const sheen = await page.$eval('[data-glass-moment="anna"] [data-glass="frosted"]', (w) => [w.style.getPropertyValue('--sx'), w.style.getPropertyValue('--sy')]);
  await context.close();
  assert.ok(lean.every((l) => l.x === 0 && l.y === 0 && l.near === 0), JSON.stringify(lean));
  assert.deepEqual(sheen, ['', ''], 'the sheen is where it rests');
  assert.deepEqual(errors, []);
});

test('the sheen follows the mouse over a frosted window', async () => {
  const { context, page, errors } = await open();
  const W = '[data-glass-moment="anna"] [data-glass="frosted"]';
  await page.$eval(W, (w) => w.scrollIntoView({ block: 'center' }));
  const b = await page.locator(W).boundingBox();
  await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.6, { steps: 3 });
  await page.waitForFunction((W) => document.querySelector(W).style.getPropertyValue('--sx') !== '', W, { timeout: SLOW }).catch(() => {});
  const v = await page.$eval(W, (w) => [w.style.getPropertyValue('--sx'), w.style.getPropertyValue('--sy')].map(parseFloat));
  await context.close();
  assert.ok(Math.abs(v[0] - 25) <= 2 && Math.abs(v[1] - 60) <= 2, `the sheen at ${v}`);
  assert.deepEqual(errors, []);
});
