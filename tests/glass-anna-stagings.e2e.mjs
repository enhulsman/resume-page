// ANNA's stagings in /hero-lab?lab=1, in a real browser (the shapes: tests/glass-anna-scene.test.mjs).
//   ?anna=window (default): the rules beside a glass window where a conversation plays (tests/glass-anna-window.e2e.mjs)
//   ?anna=turn:           the ANNA card, turned by scroll or drag; its levels' copy beside their lights
//   ?anna=journey:        one tall pane; the question goes down and comes back as the reader scrolls
//   ?anna=stack:          the exploded stack from before (tests/glass-anna.e2e.mjs)
// Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-anna-stagings.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
const LEVELS = ['−1 Identity', '−2 Claude', '−3 MCP connectors', '−4 Operations'];
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference', lab = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/hero-lab?${lab ? 'lab=1' : ''}${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  return { context, page, errors };
}
const shown = (page, sel) => page.isVisible(sel);
async function until(page, hook, pred, arg) {
  await page.waitForFunction(([h, src, a]) => window[h] && new Function('s', 'a', `return (${src})(s, a)`)(window[h].state(), a), [hook, pred.toString(), arg], { timeout: 20000 }).catch(() => {});
  return page.evaluate((h) => window[h].state(), hook);
}
/** Scroll so the section's top is `screens` screen heights above the top of the window. */
const into = (page, sel, screens) => page.evaluate(([sel, s]) => {
  const el = document.querySelector(sel);
  scrollTo(0, el.getBoundingClientRect().top + scrollY + s * innerHeight);
}, [sel, screens]);
/** Does the pane's canvas show light, not just its own colour? */
const lit = (page, sel) => page.$eval(sel, (el) => {
  const c = el.querySelector('canvas'), x = c.getContext('2d');
  const base = JSON.parse(el.dataset.base);
  let most = 0;
  for (const [u, v] of [[0.5, 0.3], [0.5, 0.5], [0.5, 0.7], [0.3, 0.6], [0.7, 0.6]]) {
    const d = x.getImageData(Math.floor(u * c.width), Math.floor(v * c.height), 1, 1).data;
    most = Math.max(most, Math.abs(d[0] - base[0]) + Math.abs(d[1] - base[1]) + Math.abs(d[2] - base[2]));
  }
  return most;
});

test('one staging at a time: window by default, turn, journey and stack on the switch, none without ?lab=1', async () => {
  for (const [q, want] of [['', 'window'], ['&anna=window', 'window'], ['&anna=turn', 'turn'], ['&anna=journey', 'journey'], ['&anna=stack', 'stack']]) {
    const { context, page, errors } = await open(q);
    assert.equal(await shown(page, '.anna-window'), want === 'window', `${q}: window`);
    assert.equal(await shown(page, '.anna-turn'), want === 'turn', `${q}: turn`);
    assert.equal(await shown(page, '.anna-journey'), want === 'journey', `${q}: journey`);
    assert.equal(await shown(page, '.anna-x'), want === 'stack', `${q}: stack`);
    await context.close();
    assert.deepEqual(errors, []);
  }
  const { context, page } = await open('', { lab: false });
  for (const sel of ['.anna-window', '.anna-turn', '.anna-journey', '.anna-x']) assert.equal(await shown(page, sel), false, sel);
  await context.close();
});

test('the lab bar switches staging in place', async () => {
  const { context, page, errors } = await open('');
  await page.click('.lab a[data-key="anna"][data-val="journey"]');
  assert.equal(await shown(page, '.anna-journey'), true);
  assert.equal(await shown(page, '.anna-window'), false);
  assert.equal(await shown(page, '.anna-turn'), false);
  assert.match(page.url(), /anna=journey/);
  await context.close();
  assert.deepEqual(errors, []);
});

test('turn: the card face-on, its levels\' copy hidden; scrolled through, turned with all four beside their lights', async () => {
  const { context, page, errors } = await open('&anna=turn&t=2.4');
  assert.deepEqual(await page.$$eval('.anna-turn .levels h3', (hs) => hs.map((h) => h.textContent)), LEVELS);
  await into(page, '.anna-turn', 0);
  const face = await until(page, '__annaTurn', (s) => s.turn < 0.02);
  assert.ok(face.turn < 0.02, `face-on: ${face.turn}`);
  assert.ok(face.labels.every((o) => o < 0.05), `copy hidden face-on: ${face.labels}`);
  assert.ok(await lit(page, '.anna-turn .turn-pane') > 20, 'the pane is lit');
  await into(page, '.anna-turn', 1.6);
  const turned = await until(page, '__annaTurn', (s) => s.turn > 0.98 && s.labels.every((o) => o > 0.95));
  assert.ok(turned.turn > 0.98, `turned: ${turned.turn}`);
  assert.ok(turned.labels.every((o) => o > 0.95), `all copy shown: ${turned.labels}`);
  // halfway, the nearer levels' copy has come before the further ones'
  await into(page, '.anna-turn', 0.5);
  const half = await until(page, '__annaTurn', (s) => s.turn > 0.2 && s.turn < 0.8);
  for (let i = 1; i < 4; i++) assert.ok(half.labels[i] <= half.labels[i - 1] + 1e-6, `order: ${half.labels}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('turn: each level\'s copy sits level with its light, beside the pane, outside the glass', async () => {
  const { context, page, errors } = await open('&anna=turn&t=2.4');
  await into(page, '.anna-turn', 1.6);
  await until(page, '__annaTurn', (s) => s.turn > 0.98);
  const geo = await page.evaluate(() => {
    const pane = document.querySelector('.anna-turn .turn-pane').getBoundingClientRect();
    return { pane: { left: pane.left, right: pane.right, top: pane.top, bottom: pane.bottom }, rows: [...document.querySelectorAll('.anna-turn .levels li')].map((li) => { const r = li.querySelector('h3').getBoundingClientRect(); return { left: r.left, top: r.top, bottom: r.bottom }; }) };
  });
  for (const r of geo.rows) assert.ok(r.left >= geo.pane.right - 1, `copy at ${r.left} is beside the pane (right ${geo.pane.right})`);
  for (let i = 1; i < 4; i++) assert.ok(geo.rows[i].top > geo.rows[i - 1].top, 'top to bottom in level order');
  await context.close();
  assert.deepEqual(errors, []);
});

test('turn: a sideways drag turns the card without scrolling', async () => {
  const { context, page, errors } = await open('&anna=turn&t=2.4');
  await into(page, '.anna-turn', 0);
  await until(page, '__annaTurn', (s) => s.turn < 0.02);
  const y0 = await page.evaluate(() => scrollY);
  const box = await page.locator('.anna-turn .turn-pane').boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3 + 260, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const s = await until(page, '__annaTurn', (s) => s.turn > 0.3);
  assert.ok(s.turn > 0.3, `dragged to ${s.turn}`);
  assert.equal(await page.evaluate(() => scrollY), y0);
  await context.close();
  assert.deepEqual(errors, []);
});

test('turn, reduced motion: one complete still, turned, all copy shown', async () => {
  const { context, page, errors } = await open('&anna=turn', { reducedMotion: 'reduce' });
  await into(page, '.anna-turn', 0);
  const s = await until(page, '__annaTurn', (s) => s.turn > 0.98);
  assert.ok(s.turn > 0.98 && s.labels.every((o) => o > 0.98), JSON.stringify(s));
  await context.close();
  assert.deepEqual(errors, []);
});

test('journey: reading down the levels sends the question down and back; each level comes forward as it is read', async () => {
  const { context, page, errors } = await open('&anna=journey&t=2.4');
  assert.deepEqual(await page.$$eval('.anna-journey .step h3', (hs) => hs.map((h) => h.textContent)), LEVELS);
  await into(page, '.anna-journey', -0.3);
  const start = await until(page, '__annaJourney', (s) => s.p < 0.02);
  assert.ok(start.p < 0.02, `start ${start.p}`);
  assert.ok(await lit(page, '.anna-journey .journey-pane') > 20, 'the pane is lit');
  const ps = [];
  for (let k = 0; k < 4; k++) {
    await page.locator(`.anna-journey .step[data-step="${k}"]`).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const s = await until(page, '__annaJourney', (s, k) => s.focus === k, k);
    assert.equal(s.focus, k, `reading level ${k}`);
    ps.push(s.p);
  }
  for (let i = 1; i < 4; i++) assert.ok(ps[i] > ps[i - 1], `progress ${ps}`);
  await page.locator('.anna-journey .step.end').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const end = await until(page, '__annaJourney', (s) => s.p > 0.98);
  assert.ok(end.p > 0.98, `arrived: ${end.p}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('journey, reduced motion: the message arrived, every level\'s copy readable', async () => {
  const { context, page, errors } = await open('&anna=journey', { reducedMotion: 'reduce' });
  await into(page, '.anna-journey', 0.5);
  const s = await until(page, '__annaJourney', (s) => s.p > 0.98);
  assert.ok(s.p > 0.98, `p ${s.p}`);
  const op = await page.$$eval('.anna-journey .step[data-step]', (els) => els.map((e) => +getComputedStyle(e).opacity));
  assert.ok(op.every((o) => o > 0.98), `${op}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('phone width: no sideways page scroll, either staging', async () => {
  for (const q of ['&anna=turn', '&anna=journey']) {
    const { context, page, errors } = await open(q, { width: 390, height: 844 });
    for (const s of [0, 0.8, 1.6]) {
      await into(page, q.endsWith('turn') ? '.anna-turn' : '.anna-journey', s);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `${q} at ${s}: ${over}px over`);
    }
    await context.close();
    assert.deepEqual(errors, []);
  }
});
