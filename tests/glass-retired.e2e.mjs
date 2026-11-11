// The lab and the rejected stagings are gone, in a real browser (openspec stone-glass-homepage,
// chunk 8): /hero-lab answers 404, and Contact on the homepage is type on stone, with no glass
// strip. The files: tests/glass-retired.test.mjs. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-retired.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

test('no lab page: /hero-lab answers 404, with or without the lab switch', async () => {
  for (const path of ['/hero-lab', '/hero-lab/', '/hero-lab?lab=1']) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
    assert.equal(res.status, 404, path);
  }
});

test('no lab page: nothing on the homepage links to it', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  await context.close();
  assert.ok(hrefs.length > 10, `${hrefs.length} links read`);
  assert.deepEqual(hrefs.filter((h) => /hero-lab/.test(h)), []);
});

for (const [w, h] of [[1440, 900], [390, 844]]) test(`no contact strip at ${w} x ${h}: Contact holds no canvas, no glass and no blur`, async () => {
  const context = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  await page.locator('section[aria-labelledby="contact-h"]').scrollIntoViewIfNeeded();
  const s = await page.$eval('section[aria-labelledby="contact-h"]', (sec) => ({
    read: sec.querySelectorAll('*').length,
    bad: [sec, ...sec.querySelectorAll('*')]
      .filter((el) => el.tagName === 'CANVAS' || el.hasAttribute('data-glass') || el.closest('[data-glass-moment]') || getComputedStyle(el).backdropFilter !== 'none')
      .map((el) => `${el.tagName}.${el.className}`),
  }));
  await context.close();
  assert.ok(s.read > 3, `${s.read} elements read`);
  assert.deepEqual(s.bad, []);
});
