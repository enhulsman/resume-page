// End-to-end checks for the inner pages, drawn as "sheets in the set": same frame, bar,
// tokens and type as the homepage. Needs a running site, like tests/overzicht.e2e.mjs:
//
//   BASE=http://localhost:4321 node --test tests/sheets.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
const PROJECTS = readdirSync(new URL('../src/pages/projects/', import.meta.url)).filter(f => f.endsWith('.mdx')).map(f => f.slice(0, -4));
const POSTS = readdirSync(new URL('../src/pages/blog/', import.meta.url)).filter(f => f.endsWith('.mdx') && !f.startsWith('_')).map(f => f.slice(0, -4));
const INNER = ['/projects', '/projects/Henk', '/projects/AnnaAssistant', '/projects/FinanceBot', '/blog', `/blog/${POSTS[0]}`, '/resume', '/contact'];
// Turnstile's own script logs to the console on a dev box without its real key; that is not ours
const ours = errors => errors.filter(e => !/turnstile|challenges\.cloudflare/i.test(e));

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(path, { width = 1440, height = 900, reducedMotion = 'no-preference', colorScheme = 'light', storage } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, colorScheme });
  if (storage) await context.addInitScript(s => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  return { context, page, errors, res };
}

const inked = page => page.evaluate(() => {
  const c = document.querySelector('canvas.drawing');
  if (!c || !c.width) return 0;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
  return n;
});

// ---------- every inner page is a sheet in the set ----------

for (const path of INNER) {
  test(`${path} is drawn on the sheet: frame, bar, tokens, no old stylesheet, no errors`, async () => {
    const { context, page, errors, res } = await open(path);
    assert.equal(res.status(), 200);
    assert.equal(await page.locator('.frame').count(), 1, 'the sheet frame');
    assert.equal(await page.locator('.foot').count(), 1, 'the foot');
    // main h1: Playwright also sees into the dev toolbar's shadow DOM, which has its own
    assert.equal(await page.locator('main h1').count(), 1, 'one h1');
    // the old site is gone: no global.css tokens, no Tailwind preflight, no Lenis
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary')), '');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tw-ring-color')), '');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis')), false);
    // the sheet's own ground and type
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(239, 237, 243)');
    assert.match(await page.evaluate(() => getComputedStyle(document.body).fontFamily), /^"?Archivo/);
    await page.waitForTimeout(400);
    assert.deepEqual(ours(errors), []);
    await context.close();
  });

  test(`${path} has no sideways scroll at 390px`, async () => {
    const { context, page } = await open(path, { width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `page is ${over}px wider than the viewport`);
    await context.close();
  });
}

test('the inner bar: E. Hulsman, Projects, Blog, Résumé, Contact, and the theme button', async () => {
  for (const [path, current] of [['/projects', 'PROJECTS'], ['/projects/Henk', 'PROJECTS'], ['/blog', 'BLOG'], [`/blog/${POSTS[0]}`, 'BLOG'], ['/resume', 'RÉSUMÉ'], ['/contact', 'CONTACT']]) {
    const { context, page } = await open(path);
    assert.equal((await page.locator('.bar-name').innerText()).trim(), 'E. HULSMAN');
    assert.equal(await page.locator('.bar-name').getAttribute('href'), '/');
    assert.deepEqual(await page.locator('.bar nav a').allInnerTexts(), ['PROJECTS', 'BLOG', 'RÉSUMÉ', 'CONTACT']);
    assert.deepEqual(await page.locator('.bar nav a').evaluateAll(as => as.map(a => a.getAttribute('href'))), ['/projects', '/blog', '/resume', '/contact']);
    assert.equal(await page.locator('.bar nav').getAttribute('aria-label'), 'Site');
    // the page you are on is marked, for eyes and for screen readers
    assert.deepEqual(await page.locator('.bar nav a[aria-current="page"]').allInnerTexts(), [current], `${path} marks ${current}`);
    assert.equal(await page.locator('.theme').isVisible(), true);
    await context.close();
  }
});

test('inner pages share the stored theme and the toggle', async () => {
  const { context, page } = await open('/blog', { storage: { theme: 'light' } });
  const html = page.locator('html');
  assert.equal(await html.getAttribute('data-theme'), 'light');
  await page.locator('.theme').click();
  assert.equal(await html.getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('.theme').innerText(), 'WHITEPRINT');
  await page.waitForTimeout(700); // the sheet fades over half a second
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(22, 20, 29)');
  await page.goto(BASE + '/projects');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('.theme').getAttribute('aria-pressed'), 'true');
  await context.close();
});

test('phones reach every page through the drawn menu', async () => {
  const { context, page } = await open('/resume', { width: 390, height: 844 });
  const btn = page.locator('.menu-btn');
  const links = page.locator('.bar nav a');
  assert.equal(await btn.isVisible(), true);
  assert.equal(await btn.getAttribute('aria-label'), 'Sections');
  assert.equal(await links.first().isVisible(), false);
  await btn.click();
  assert.equal(await btn.getAttribute('aria-expanded'), 'true');
  await page.waitForTimeout(700);
  assert.deepEqual(await links.allInnerTexts(), ['PROJECTS', 'BLOG', 'RÉSUMÉ', 'CONTACT']);
  await links.filter({ hasText: 'Blog' }).click();
  await page.waitForURL(/\/blog$/);
  await context.close();
});

test('keyboard focus is visible on the inner pages', async () => {
  const { context, page } = await open('/projects');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // E. Hulsman
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('bar-name')), true);
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
  await context.close();
});

// ---------- /projects: the lead drawings, then the register ----------

test('/projects leads with ANNA, then the four drawn projects, then the register', async () => {
  const { context, page } = await open('/projects');
  assert.deepEqual(await page.locator('.detail').evaluateAll(els => els.map(e => e.id)), ['anna', 'henk', 'sandbox', 'homelab', 'pytaiga']);
  // ANNA's plate is the real section drawing; the others are their detail drawings
  assert.equal(await page.locator('#anna canvas.drawing').count(), 1);
  assert.equal(await page.locator('.detail .dwg').count(), 4);
  // every drawn project links to its case study, and every case study exists
  const cases = await page.locator('.detail .links a', { hasText: 'Case study' }).evaluateAll(as => as.map(a => a.getAttribute('href')));
  assert.equal(cases.length, 5);
  // the register holds the rest; together they cover every project page exactly once
  const reg = await page.locator('.register td:first-child a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  const all = [...cases, ...reg].map(h => h.replace('/projects/', '')).sort();
  assert.deepEqual(all, [...PROJECTS].sort());
  // the fun side pieces are in the set too
  assert.ok(await page.locator('.side li').count() >= 4);
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  assert.ok(await inked(page) > 500, 'the ANNA plate plotted');
  await context.close();
});

test('the ANNA plate turns by hand and by its buttons', async () => {
  const { context, page } = await open('/projects');
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const spin = () => page.evaluate(() => window.__plate?.state.spin);
  const before = await spin();
  assert.equal(typeof before, 'number', 'the plate exposes its scene in tests');
  await page.locator('#anna [data-turn="1"]').click();
  assert.ok(await spin() > before, 'the turn button turns it');
  await context.close();
});

test('reduced motion: every plate arrives drawn', async () => {
  const { context, page } = await open('/projects', { reducedMotion: 'reduce' });
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.dwg:not(.drawn)').count(), 0);
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  assert.ok(await inked(page) > 500);
  await context.close();
});

// ---------- a project page: title block, plate, then the write-up ----------

test('a project page opens with its title block and its own drawing at full size', async () => {
  const src = readFileSync(new URL('../src/pages/projects/Henk.mdx', import.meta.url), 'utf8');
  const label = src.match(/^dateLabel: "(.*)"/m)[1];
  const { context, page } = await open('/projects/Henk');
  const block = page.locator('.titleblock');
  assert.deepEqual(await block.locator('th').allInnerTexts(), ['PROJECT', label.toUpperCase(), 'STACK', 'CODE']);
  assert.match(await block.innerText(), /July 2026/);
  assert.equal(await page.locator('.plate .dwg').count(), 1, 'Henk\'s detail drawing');
  // shown at full size: the plate is wider than the drawing on the homepage's half-width card
  assert.ok(await page.locator('.plate .dwg').evaluate(d => d.getBoundingClientRect().width) > 900);
  // the stats are dimension strings, and the write-up is set in the sheet's type
  assert.ok(await page.locator('.prose .dims div').count() >= 4);
  assert.match(await page.locator('.prose h2').first().evaluate(h => getComputedStyle(h).fontFamily), /^"?Archivo/);
  await context.close();
});

test('ANNA\'s case study carries the section drawing; a project without a drawing has none', async () => {
  let { context, page } = await open('/projects/AnnaAssistant');
  assert.equal(await page.locator('.plate canvas.drawing').count(), 1);
  await page.locator('.plate').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  assert.ok(await inked(page) > 500);
  await context.close();

  ({ context, page } = await open('/projects/FinanceBot'));
  assert.equal(await page.locator('.plate').count(), 0);
  assert.equal(await page.locator('.titleblock th', { hasText: 'Preview' }).count(), 0, 'no empty rows');
  await context.close();
});

// ---------- the blog: the site diary, then a post ----------

test('/blog is the site diary: every post, newest first, dated', async () => {
  const { context, page } = await open('/blog');
  const rows = page.locator('.diary li');
  assert.equal(await rows.count(), POSTS.length);
  const dates = await rows.locator('time').evaluateAll(ts => ts.map(t => t.getAttribute('datetime')));
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.equal(await page.locator('a[href="/rss.xml"]').count(), 0, 'no new links nobody asked for');
  await context.close();
});

test('a post opens with its date in a title block and reads at a sane measure', async () => {
  const { context, page } = await open(`/blog/${POSTS[0]}`);
  assert.equal((await page.locator('.titleblock th').first().innerText()).trim(), 'DATE');
  const measure = await page.locator('.prose p').first().evaluate(p => p.getBoundingClientRect().width / parseFloat(getComputedStyle(p).fontSize));
  assert.ok(measure < 44, `a line is about ${measure.toFixed(0)}em`);
  await context.close();
});

// ---------- the résumé: revisions and schedules, and it still prints ----------

test('/resume: every role as a revision, skills and schooling as schedules', async () => {
  const src = readFileSync(new URL('../src/config/resume.ts', import.meta.url), 'utf8');
  const roles = (src.match(/^\s+role: '/gm) || []).length;
  const { context, page } = await open('/resume');
  assert.equal(await page.locator('.revs li').count(), roles);
  assert.deepEqual(await page.locator('.schedule caption').allInnerTexts(), ['SKILLS', 'EDUCATION', 'CERTIFICATIONS']);
  assert.equal(await page.locator('a', { hasText: 'Inquire about my full CV' }).getAttribute('href'), '/contact');
  await context.close();
});

test('/resume prints on white with no chrome', async () => {
  const { context, page } = await open('/resume');
  await page.emulateMedia({ media: 'print' });
  for (const sel of ['.bar', '.frame', '.foot', '.skip']) {
    assert.equal(await page.locator(sel).evaluate(el => getComputedStyle(el).display), 'none', `${sel} is hidden in print`);
  }
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').display), 'none', 'no paper grain');
  const pdf = await page.pdf({ format: 'A4' });
  assert.ok(pdf.length > 10000, 'a real PDF comes out');
  await context.close();
});

test('/resume prints on white from the dark theme too', async () => {
  const { context, page } = await open('/resume', { storage: { theme: 'dark' } });
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
  await context.close();
});

// ---------- /contact: the transmittal ----------

test('/contact is a transmittal: stamp, labelled fields, honeypot, Turnstile', async () => {
  const { context, page } = await open('/contact');
  assert.equal((await page.locator('main h1').innerText()).trim(), 'Get in touch');
  assert.match(await page.locator('.stamp').innerText(), /ISSUED FOR\s+CONVERSATION\s+2026/);
  for (const [id, label] of [['name', 'Name'], ['email', 'Email'], ['message', 'Message']]) {
    assert.equal((await page.locator(`label[for="${id}"]`).innerText()).trim().toLowerCase(), label.toLowerCase());
    assert.equal(await page.locator(`#${id}`).getAttribute('required'), '');
  }
  // the honeypot stays off-screen, not display:none, so bots still see it
  const hp = await page.locator('.hp-field').evaluate(el => ({ d: getComputedStyle(el).display, l: el.getBoundingClientRect().left }));
  assert.notEqual(hp.d, 'none');
  assert.ok(hp.l < -1000);
  assert.equal(await page.locator('#turnstile-container').count(), 1);
  assert.equal((await page.locator('#submitButton').innerText()).trim().toLowerCase(), 'send message');
  // fields are drawn as ruled lines, focus is still unmistakable
  await page.locator('#name').focus();
  assert.notEqual(await page.locator('#name').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await context.close();
});

test('/contact reports a failed send in the sheet\'s red, without Tailwind', async () => {
  const { context, page } = await open('/contact');
  await page.route('**/api/contact', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"error":"Nope"}' }));
  // stand in for Turnstile, which a test cannot solve
  await page.evaluate(() => { window.turnstile = { getResponse: () => 'tok', reset() {}, render() { return 0; } }; window.__turnstileWidgetId = 0; });
  await page.fill('#name', 'Test');
  await page.fill('#email', 'test@example.com');
  await page.fill('#message', 'Hello');
  await page.click('#submitButton');
  const status = page.locator('#statusMessage');
  await status.waitFor({ state: 'visible' });
  assert.equal((await status.innerText()).trim(), 'Nope');
  assert.equal(await status.getAttribute('role'), 'status');
  assert.equal(await status.evaluate(el => getComputedStyle(el).color), 'rgb(184, 48, 26)');
  await context.close();
});
