// The shared chrome in a real browser (openspec stone-glass-homepage, "Shared chrome on every page"
// and "Phones reach every page from the bar"): the stone ground, the stone bar and footer on every
// page, no drawing-sheet frame, no dark theme, and the phone menu. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/glass-chrome.e2e.mjs
// Every wait is on state (load, fonts, the menu's open state, the URL), never a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { footer, siteNav } from '../src/config/home.ts';
import site from '../src/config/site.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const PAGES = ['/', '/projects', '/projects/Henk', '/blog', '/blog/bible-tui', '/resume', '/contact'];
const INNER = PAGES.filter((p) => p !== '/');
const STONE = 'rgb(238, 234, 227)';
const LINKS = [['Projects', '/projects'], ['Blog', '/blog'], ['Résumé', '/resume'], ['Contact', '/contact']];

let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });
after(async () => { await browser?.close(); });

async function open(path, { width = 1440, height = 900, colorScheme = 'light', storage } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme });
  if (storage) await context.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  return { context, page };
}
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const bodyGround = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('the config holds the chrome\'s words: the four page links, "Get in touch", and the footer', () => {
  assert.deepEqual(siteNav.links.map((l) => [l.label, l.href]), LINKS);
  assert.deepEqual([siteNav.cta.label, siteNav.cta.href], ['Get in touch', '/contact']);
  assert.equal(footer.line, 'Made in Utrecht by');
  assert.equal(footer.verse, 'Proverbs 3:5-7');
});

for (const path of PAGES) {
  test(`no sheet frame on ${path}: no .frame, and the ground at the viewport edges is stone`, async () => {
    const { context, page } = await open(path);
    const frames = await page.locator('.frame').count();
    assert.equal(await bodyGround(page), STONE);
    // the edges below the bar, in pixels: the old frame drew ink lines there and the green
    // table past them; the stone page shows its own ground to the very edge
    const { w, h, top } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, top: Math.ceil(document.querySelector('.bar').getBoundingClientRect().bottom) + 1 }));
    const off = [];
    for (const x of [0, w - 3]) {
      const png = (await page.screenshot({ clip: { x, y: top, width: 3, height: h - top } })).toString('base64');
      off.push(await page.evaluate(async (b64) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 238) > 2 || Math.abs(d[i + 1] - 234) > 2 || Math.abs(d[i + 2] - 227) > 2) n++;
        return n;
      }, png));
    }
    await context.close();
    assert.equal(frames, 0, 'no .frame element');
    assert.deepEqual(off, [0, 0], 'pixels at the left and right edges that are not #EEEAE3');
  });
}

for (const path of INNER) {
  test(`${path} carries the chrome: stone ground, the bar with the name and its links, the stone footer`, async () => {
    const { context, page } = await open(path);
    assert.equal(await bodyGround(page), STONE);
    assert.match(await page.evaluate(() => getComputedStyle(document.body).fontFamily), /^"?Archivo/);
    // the bar: "EH." with the full name beside it, on one line, linking home
    const name = page.locator('.bar .bar-name');
    assert.equal(await name.getAttribute('href'), '/');
    assert.equal(norm(await name.locator('.sig').innerText()), 'EH.');
    assert.equal(norm(await name.innerText()).replace(/^EH\.\s*/, ''), site.name);
    const [sig, full] = await name.evaluate((a) => {
      const s = a.querySelector('.sig').getBoundingClientRect();
      const r = document.createRange(); r.setStart(a.lastChild, 0); r.setEnd(a.lastChild, a.lastChild.length);
      const n = r.getBoundingClientRect();
      return [{ r: s.right, t: s.top, b: s.bottom }, { l: n.left, t: n.top, b: n.bottom }];
    });
    assert.ok(full.l >= sig.r - 0.5, 'the name sits beside the mark, after it');
    assert.ok(full.t < sig.b && full.b > sig.t, 'on the same line');
    assert.equal(await page.getByRole('link', { name: site.name, exact: true }).count(), 1, 'read out as the name alone');
    // the four page links and "Get in touch", all visible at desktop width
    const nav = page.locator('.bar nav a');
    assert.deepEqual((await nav.allInnerTexts()).map(norm), LINKS.map((l) => l[0]));
    assert.deepEqual(await nav.evaluateAll((as) => as.map((a) => a.getAttribute('href'))), LINKS.map((l) => l[1]));
    for (const a of await nav.all()) assert.equal(await a.isVisible(), true);
    const cta = page.locator('.bar a', { hasText: 'Get in touch' });
    assert.equal(await cta.count(), 1);
    assert.equal(await cta.getAttribute('href'), '/contact');
    assert.equal(await cta.isVisible(), true);
    assert.match(await page.locator('.bar').evaluate((b) => getComputedStyle(b).fontFamily), /^"?Archivo/);
    // the footer, from config: the line, the name and its full stop, then the verse as a link
    const foot = page.locator('footer.foot');
    assert.equal(await foot.count(), 1);
    assert.equal(norm(await foot.innerText()), `Made in Utrecht by ${site.name}. Proverbs 3:5-7`);
    assert.equal(await foot.locator('a', { hasText: 'Proverbs 3:5-7' }).getAttribute('href'), site.quoteUrl);
    assert.doesNotMatch(await foot.innerText(), /dimension|perspective|Drawn/);
    assert.match(await foot.evaluate((f) => getComputedStyle(f).fontFamily), /^"?Archivo/);
    await context.close();
  });
}

for (const path of PAGES) {
  test(`dark system theme on ${path}: the ground stays stone, no theme button`, async () => {
    // a stored choice from the old theme button no longer counts either
    const { context, page } = await open(path, { colorScheme: 'dark', storage: { theme: 'dark' } });
    const ground = await bodyGround(page);
    const buttons = await page.locator('.theme, .bar button[aria-pressed], .lamp').count();
    const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
    const metas = await page.$$eval('meta[name="theme-color"]', (ms) => ms.map((m) => m.content));
    await context.close();
    assert.equal(ground, STONE);
    assert.equal(buttons, 0, 'no theme button');
    assert.equal(theme, null, 'nothing sets a theme on the page');
    assert.deepEqual(metas, ['#EEEAE3'], 'the browser bar is stone too');
  });
}

for (const path of PAGES) {
  test(`at 390 x 844 every page is reached from ${path} through the menu, with no sideways scroll`, async () => {
    for (const [label, href] of LINKS) {
      const { context, page } = await open(path, { width: 390, height: 844 });
      const btn = page.locator('.bar .menu-btn');
      // the mark and "Get in touch" stay in the bar; the links fold into the menu
      assert.equal(await page.locator('.bar .bar-name .sig').isVisible(), true, 'EH. visible');
      assert.equal(await page.locator('.bar a', { hasText: 'Get in touch' }).isVisible(), true, 'Get in touch visible');
      assert.equal(await btn.isVisible(), true, 'the menu button');
      assert.equal(await page.locator('.bar nav a').first().isVisible(), false, 'links folded away');
      await btn.click();
      assert.equal(await btn.getAttribute('aria-expanded'), 'true');
      const link = page.locator('.bar nav a', { hasText: label });
      await link.waitFor({ state: 'visible' });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `${path}: ${over}px of sideways scroll with the menu open`);
      await link.click();
      await page.waitForURL(new RegExp(`${href.replace('/', '\\/')}\\/?$`));
      await context.close();
    }
  });
}

test('keyboard order: on /projects at 390 x 844, Enter on the menu button, then Tab, lands on Projects', async () => {
  const { context, page } = await open('/projects', { width: 390, height: 844 });
  await page.locator('.bar .menu-btn').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.bar .menu-btn').getAttribute('aria-expanded') === 'true');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute('href'), inNav: !!document.activeElement.closest('.bar nav') }));
  await context.close();
  assert.deepEqual(focused, { text: 'Projects', href: '/projects', inNav: true });
});
