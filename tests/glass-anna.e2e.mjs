// ANNA's stack in /hero-lab?lab=1, in a real browser. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-anna.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function open(q = '', { width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/hero-lab?lab=1&anna=stack${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true && window.__anna);
  return { context, page, errors };
}
// the software renderer is slow: wait for the stack to get there (or time out), then read it
const state = (page) => page.evaluate(() => window.__anna.state());
async function until(page, pred, arg) {
  await page.waitForFunction(([src, a]) => new Function('s', 'a', `return (${src})(s, a)`)(window.__anna.state(), a), [pred.toString(), arg], { timeout: 20000 }).catch(() => {});
  return state(page);
}
const scrollTo = async (page, screens, pred = () => true) => {
  const H = page.viewportSize().height;
  await page.evaluate(([s, H]) => scrollTo(0, document.querySelector('.anna-x').getBoundingClientRect().top + scrollY + s * H), [screens, H]);
  return until(page, pred);
};

test('the four levels are real headings with home.ts\'s words; the stack is decoration', async () => {
  const { context, page, errors } = await open();
  const heads = await page.$$eval('.anna-x .step h3', hs => hs.map(h => h.textContent));
  assert.deepEqual(heads, ['−1 Identity', '−2 Claude', '−3 MCP connectors', '−4 Operations']);
  assert.equal(await page.getAttribute('.anna-x .stack', 'aria-hidden'), 'true');
  assert.equal(await page.locator('.anna-x .turn button').count(), 3);
  await context.close();
  assert.deepEqual(errors, []);
});

test('the section is hidden without ?lab=1', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/hero-lab`);
  const shown = await page.isVisible('.anna-x');
  await context.close();
  assert.equal(shown, false);
});

test('scrolling in pulls the block apart; then each level, read in turn, slides out and sharpens', async () => {
  const { context, page, errors } = await open('&t=2.4');
  const shut = await scrollTo(page, -0.5, (s) => s.open < 0.05);
  const apart = await scrollTo(page, 0.8, (s) => s.open > 0.95);
  const reading = [];
  for (let k = 0; k < 4; k++) {
    await page.locator(`.anna-x .step[data-step="${k}"]`).evaluate(el => el.scrollIntoView({ block: 'center' }));
    reading.push(await until(page, (s, k) => s.active === k && s.slides[k] > 0.5 && s.distances.indexOf(Math.min(...s.distances)) === k, k));
  }
  await context.close();
  assert.ok(shut.open < 0.05, `shut ${shut.open}`);
  assert.ok(apart.open > 0.95, `apart ${apart.open}`);
  reading.forEach((s, k) => {
    assert.equal(s.active, k);
    const sharpest = s.distances.indexOf(Math.min(...s.distances));
    assert.equal(sharpest, k, `reading ${k}: distances ${s.distances}`);
    assert.ok(s.slides[k] > 0.5, `reading ${k} slides out`);
  });
  assert.deepEqual(errors, []);
});

test('the buttons turn it and tilt it edge-on; a drag turns it', async () => {
  const { context, page } = await open('&t=2.4');
  const rest = await scrollTo(page, 0.8, (s) => s.open > 0.95);
  await page.click('[data-turn="1"]');
  const turned = (await until(page, (s, r) => Math.abs(s.turn.rz - r - 45) < 2, rest.turn.rz)).turn;
  await page.click('[data-tilt]');
  const edge = (await until(page, (s) => s.turn.rx > 80)).turn;
  const box = await page.locator('.anna-stage').boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100); await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(box.x + 100 + i * 20, box.y + 100);
  await page.mouse.up();
  const dragged = (await until(page, (s, e) => s.turn.rz > e + 20, edge.rz)).turn;
  await context.close();
  assert.ok(Math.abs(turned.rz - rest.turn.rz - 45) < 2, `turned ${turned.rz}`);
  assert.ok(edge.rx > 80, `edge-on ${edge.rx}`);
  assert.ok(dragged.rz > edge.rz + 20, `dragged ${dragged.rz} from ${edge.rz}`);
});

test('reduced motion: the stack is apart from the start, nothing eases', async () => {
  const { context, page } = await open('', { reducedMotion: 'reduce' });
  const s = await scrollTo(page, -0.5);
  await context.close();
  assert.equal(s.open, 1);
});

test('phone: the stage stays pinned above the text and the level being read is the one below it', async () => {
  const { context, page, errors } = await open('&t=2.4', { width: 390, height: 844 });
  await scrollTo(page, 0.6, (s) => s.open > 0.95);
  await page.locator('.anna-x .step[data-step="2"]').evaluate(el => {
    const stage = document.querySelector('.anna-stage').getBoundingClientRect();
    const r = el.getBoundingClientRect(), line = stage.bottom + (innerHeight - stage.bottom) / 2;
    scrollBy(0, (r.top + r.bottom) / 2 - line);
  });
  const s = await until(page, (s) => s.active === 2);
  const stageTop = await page.$eval('.anna-stage', el => el.getBoundingClientRect().top);
  await context.close();
  assert.equal(s.active, 2);
  assert.ok(Math.abs(stageTop) < 1, `stage pinned at the top (${stageTop})`);
  assert.deepEqual(errors, []);
});
