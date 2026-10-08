// End-to-end checks for the Overzicht homepage, derived from resume-lab/MUST-STAY-TRUE.md
// and the port plan. Needs a running site (npm run dev, or npm run build && npm run preview).
//
//   BASE=http://localhost:4321 node --test tests/overzicht.e2e.mjs
//
// The copy-parity test also needs the prototype (PROTO, default ~/Coding/resume-lab/proto);
// it is skipped when the prototype is not on this machine.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
const PROTO = process.env.PROTO || `${homedir()}/Coding/resume-lab/proto`;

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(path = '/', { width = 1440, height = 900, reducedMotion = 'no-preference', js = true, storage } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, javaScriptEnabled: js });
  if (storage) await context.addInitScript(s => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  return { context, page, errors, res };
}

// Visible text of the page chrome and content, with the live terminal left out:
// its output is the real terminal's, not prototype copy.
const pageText = () => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, .term-out, #terminal-body, .term-line, .skip, svg title').forEach(n => n.remove());
  // innerText needs layout; mount the clone off screen
  clone.style.cssText = 'position:absolute;left:-99999px;top:0;width:1400px';
  document.documentElement.append(clone);
  const t = clone.innerText;
  clone.remove();
  return t.replace(/\s+/g, ' ').trim();
};

async function activeTerminal(page) {
  await page.locator('#terminal-body').scrollIntoViewIfNeeded();
  await page.waitForSelector('.terminal-input-line', { timeout: 30000 });
}

async function run(page, cmd) {
  await page.click('#terminal-body');
  const before = await page.locator('#terminal-body').innerText();
  await page.locator('#terminal-input').fill(cmd);
  await page.locator('#terminal-input').press('Enter');
  await page.waitForTimeout(250);
  const after = await page.locator('#terminal-body').innerText();
  return after.slice(before.length);
}

test('homepage copy matches the prototype word for word', { skip: !existsSync(`${PROTO}/index.html`) && 'prototype not found' }, async () => {
  const proto = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const pp = await proto.newPage();
  await pp.goto(`file://${PROTO}/index.html`);
  const want = await pp.evaluate(pageText);
  await proto.close();

  const { context, page } = await open('/', { js: false });
  const got = await page.evaluate(pageText);
  await context.close();

  if (got !== want) {
    // point at the first difference rather than dumping two pages of text
    let i = 0; while (i < got.length && got[i] === want[i]) i++;
    assert.fail(`copy differs at char ${i}:\n  site:  …${got.slice(Math.max(0, i - 60), i + 80)}…\n  proto: …${want.slice(Math.max(0, i - 60), i + 80)}…`);
  }
});

test('page title and description are the prototype\'s', { skip: !existsSync(`${PROTO}/index.html`) && 'prototype not found' }, async () => {
  const html = readFileSync(`${PROTO}/index.html`, 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const desc = html.match(/name="description" content="(.*?)"/)[1];
  const { context, page } = await open('/', { js: false });
  assert.equal(await page.title(), title);
  assert.equal(await page.getAttribute('meta[name="description"]', 'content'), desc);
  await context.close();
});

test('the real terminal is on the homepage with all 42 commands', async () => {
  const src = readFileSync(new URL('../src/scripts/interactive-terminal.ts', import.meta.url), 'utf8');
  const names = [...src.matchAll(/this\.commands\.set\('([^']+)'/g)].map(m => m[1]);
  assert.equal(names.length, 42, 'the terminal registers 42 commands');

  const { context, page, errors } = await open('/');
  await activeTerminal(page);
  // the intro typed itself, then the shell became real
  const intro = await page.locator('#terminal-body').innerText();
  assert.match(intro, /whoami/);
  assert.match(await run(page, 'cat resume'), /Forward Deployed Engineer/);
  assert.match(await run(page, 'cat resume | grep Engineer | wc -l'), /^\s*\d+\s*$/m);
  // everything except the ones that leave, navigate or take over the screen
  const skip = new Set(['open', 'exit', 'logout', 'sl', 'matrix', 'clear', 'theme']);
  for (const n of names.filter(n => !skip.has(n))) {
    const out = await run(page, n);
    assert.doesNotMatch(out, /command not found/, `${n} is wired up`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('the theme toggle, the terminal and the inner pages share one stored theme', async () => {
  const { context, page } = await open('/', { storage: { theme: 'light' } });
  const html = page.locator('html');
  assert.equal(await html.getAttribute('data-theme'), 'light');
  const toggle = page.locator('.theme');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');

  await toggle.click();
  assert.equal(await html.getAttribute('data-theme'), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await toggle.innerText(), 'WHITEPRINT');

  await page.reload();
  assert.equal(await html.getAttribute('data-theme'), 'dark');

  // the terminal's theme command moves the toggle too
  await activeTerminal(page);
  await run(page, 'theme light');
  assert.equal(await html.getAttribute('data-theme'), 'light');
  assert.equal(await page.locator('.theme').getAttribute('aria-pressed'), 'false');

  // and an inner page starts in the same theme
  await page.goto(BASE + '/resume');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await context.close();
});

test('dark chosen on a light system stays dark', async () => {
  const context = await browser.newContext({ colorScheme: 'light' });
  await context.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const page = await context.newPage();
  await page.goto(BASE + '/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(bg, 'rgb(22, 20, 29)');
  await context.close();
});

for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
  test(`no sideways scroll at ${w}x${h}`, async () => {
    const { context, page } = await open('/', { width: w, height: h });
    await page.waitForTimeout(800);
    for (let y = 0; y < 30; y++) {
      await page.mouse.wheel(0, h);
      await page.waitForTimeout(60);
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `page is ${over}px wider than the viewport`);
    await context.close();
  });
}

test('reduced motion: drawings arrive drawn, the terminal arrives filled', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.dwg:not(.drawn)').count(), 0);
  await page.locator('#terminal-body').scrollIntoViewIfNeeded();
  await page.waitForSelector('.terminal-input-line', { timeout: 1500 });
  await context.close();
});

test('the ANNA drawing plots, with native scroll and no errors', async () => {
  const { context, page, errors } = await open('/');
  await page.waitForTimeout(3500);
  const inked = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
    return n;
  });
  assert.ok(inked > 500, `canvas has ink (${inked} sampled pixels)`);
  // none of the old site's stylesheet (global.css, Tailwind) on this page
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary')), '');
  assert.equal(await page.evaluate(() => 'lenis' in window || '__lenis' in window || document.documentElement.classList.contains('lenis')), false);
  // scrolling turns the section into the exploded view
  await page.locator('[data-cloud="connectors"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.stage.turnable').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the employment status line is shown', async () => {
  const { context, page } = await open('/', { js: false });
  assert.equal((await page.locator('.status').innerText()).trim(), 'Currently employed • Open to connect');
  await context.close();
});

test('keyboard focus is visible', async () => {
  const { context, page } = await open('/');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // first bar link
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, 'none');
  await context.close();
});

for (const path of ['/projects', '/projects/Henk', '/blog', '/blog/bible-tui', '/resume', '/contact', '/rss.xml']) {
  test(`${path} still renders`, async () => {
    const { context, res, errors } = await open(path);
    assert.equal(res.status(), 200);
    assert.deepEqual(errors.filter(e => !/turnstile|challenges\.cloudflare/i.test(e)), []);
    await context.close();
  });
}

test('the inner pages\' About link lands on a section that exists', async () => {
  const { context, page } = await open('/resume');
  const href = await page.locator('nav a', { hasText: 'About' }).first().getAttribute('href');
  const id = href.split('#')[1];
  await page.goto(BASE + '/');
  assert.equal(await page.locator(`[id="${id}"]`).count(), 1, `${href} has a target`);
  await context.close();
});

test('the drawings appear even if IntersectionObserver never fires', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.waitForTimeout(3500);
  const inked = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
    return n;
  });
  assert.ok(inked > 500, 'the ANNA drawing plotted');
  for (const id of ['henk', 'sandbox', 'homelab', 'pytaiga']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  assert.equal(await page.locator('.dwg.drawn').count(), 4);
  await context.close();
});

test('reduced motion on a dark phone: the drawing is never inked in black', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.waitForTimeout(400);
  const black = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4 * 8) if (d[i + 3] > 200 && d[i] + d[i + 1] + d[i + 2] < 30) n++;
    return n;
  });
  assert.equal(black, 0);
  await context.close();
});

test('the browser bar colour follows the chosen theme', async () => {
  const context = await browser.newContext({ colorScheme: 'light' });
  await context.addInitScript(() => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark'); });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.waitForTimeout(300);
  const bar = () => page.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content.toUpperCase()));
  assert.deepEqual([...new Set(await bar())], ['#16141D']);
  await page.locator('.theme').click();
  await page.waitForTimeout(700);
  assert.deepEqual([...new Set(await bar())], ['#EFEDF3']);
  await context.close();
});

test('Henk\'s blocked call stays a dashed redline once drawn', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  const dash = await page.evaluate(() => getComputedStyle(document.querySelector('#henk .red .dash')).strokeDasharray);
  assert.notEqual(dash, 'none');
  await context.close();
});
