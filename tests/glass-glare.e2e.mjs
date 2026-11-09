// The glare across the name (/hero-lab?name=glare), in a real browser. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-glare.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(q, { reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/hero-lab?${q}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}
const glareShown = (page) => page.$eval('#name-h3', (h) => getComputedStyle(h, '::after').display !== 'none');
const glareAt = (page) => page.$eval('#name-h3', (h) => h.style.getPropertyValue('--glare-x'));

test('the name stays plain text, said once, with or without the glare', async () => {
  for (const q of ['', 'name=glare']) {
    const { context, page, errors } = await open(q);
    assert.equal((await page.textContent('#name-h3')).replace(/\s+/g, ''), 'EzraHulsman');
    const name = await page.locator('#name-h3').evaluate((h) => h.innerText.replace(/\s+/g, ' ').trim());
    assert.equal(name, 'Ezra Hulsman');
    assert.equal(await glareShown(page), q === 'name=glare', q);
    await context.close();
    assert.deepEqual(errors, []);
  }
});

test('one sweep on arrival, left to right, then out of sight; the pointer on the name sweeps again', async () => {
  const { context, page, errors } = await open('name=glare');
  await page.waitForFunction(() => window.__glare.sweeps() >= 1, null, { timeout: 5000 });
  await page.waitForFunction(() => !window.__glare.running());
  assert.equal(await glareAt(page), '100.00%', 'parked off to the left');
  // the pointer comes onto the name: record the sweep frame by frame
  const record = page.evaluate(() => new Promise((done) => {
    const seen = [], t0 = performance.now();
    const h = document.querySelector('#name-h3');
    let started = false;
    const tick = () => {
      const run = window.__glare.running();
      started ||= run;
      if (run) seen.push(parseFloat(h.style.getPropertyValue('--glare-x')));
      if (run || (!started && performance.now() - t0 < 5000)) requestAnimationFrame(tick); else done(seen);
    };
    requestAnimationFrame(tick);
  }));
  await page.hover('#name-h3');
  const seen = await record;
  assert.equal(await page.evaluate(() => window.__glare.sweeps()), 2);
  const moving = seen.filter((x) => x > 0 && x < 100);
  assert.ok(moving.length >= 3, `it swept: ${seen}`);
  for (let i = 1; i < moving.length; i++) assert.ok(moving[i] <= moving[i - 1], `left to right: ${moving}`);
  await context.close();
  assert.deepEqual(errors, []);
});

test('?glare= holds one moment', async () => {
  const { context, page } = await open('name=glare&glare=0.5');
  await page.waitForTimeout(800);
  assert.equal(await glareAt(page), '50.00%');
  await context.close();
});

test('reduced motion: no glare', async () => {
  const { context, page } = await open('name=glare', { reducedMotion: 'reduce' });
  assert.equal(await glareShown(page), false);
  await context.close();
});
