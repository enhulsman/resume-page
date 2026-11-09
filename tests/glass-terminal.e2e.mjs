// The terminal as a clean glass window (/hero-lab?lab=1), in a real browser. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-terminal.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function open() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/hero-lab?lab=1&t=2.4`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__glassReady === true);
  await page.evaluate(() => document.querySelector('.term-window').scrollIntoView({ block: 'center' }));
  return { context, page, errors };
}

test('a frosted window: translucent, blurring what is behind it, with a title bar', async () => {
  const { context, page, errors } = await open();
  const look = await page.$eval('.term-window', el => {
    const cs = getComputedStyle(el);
    return { backdrop: cs.backdropFilter || cs.webkitBackdropFilter, bg: cs.backgroundColor };
  });
  const title = await page.textContent('.term-window .term-title');
  await context.close();
  assert.match(look.backdrop, /blur\(/);
  const alpha = +(look.bg.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1);
  assert.ok(alpha < 0.8, `see-through (${look.bg})`);
  assert.match(title, /ezra@hulsman/);
  assert.deepEqual(errors, []);
});

test('the hero\'s four panes reflect in it: lit, upside down, decoration only', async () => {
  const { context, page } = await open();
  const r = await page.$eval('.term-reflect', el => ({
    hidden: el.getAttribute('aria-hidden'),
    n: el.querySelectorAll('.glass-card[data-light] canvas').length,
    flipped: getComputedStyle(el).transform,
  }));
  const lit = await page.$$eval('.term-reflect .glass-card', cs => cs.filter(c => c.classList.contains('lit')).length);
  await context.close();
  assert.equal(r.hidden, 'true');
  assert.equal(r.n, 4);
  assert.equal(lit, 4);
  assert.match(r.flipped, /matrix\(1, 0, 0, -1/, 'mirrored top to bottom');
});

test('it is the real terminal: it types its intro, then answers a command', async () => {
  const { context, page } = await open();
  await page.waitForFunction(() => document.querySelector('.term-window .terminal-input-line'), null, { timeout: 90000 });
  const box = await page.locator('.term-window .term-body').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 30);
  await page.keyboard.type('whoami', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('.term-window .term-body > div')].filter(d => d.textContent.trim() === 'ezra').length >= 2, null, { timeout: 20000 });
  await context.close();
});
