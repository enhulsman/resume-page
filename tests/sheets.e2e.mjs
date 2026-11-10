// End-to-end checks for the inner pages: their drawing-sheet bodies under the stone chrome
// (openspec stone-glass-homepage: the stone bar and footer on every page, no sheet frame, no dark
// theme). The homepage is stone and glass, tested in tests/glass-*.e2e.mjs, and so is the chrome
// itself, in tests/glass-chrome.e2e.mjs. Needs a running site:
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

async function open(path, { width = 1440, height = 900, scale = 1, reducedMotion = 'no-preference', colorScheme = 'light', storage } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion, colorScheme });
  if (storage) await context.addInitScript(s => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  return { context, page, errors, res };
}

/** In the page: how much of the section drawing is inked. */
function inkedIn() {
  const c = document.querySelector('canvas.drawing');
  if (!c || !c.width) return 0;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
  return n;
}
const inked = page => page.evaluate(inkedIn);
/** Wait (on state, not a sleep) until the section drawing has plotted; the test asserts after. */
const untilInked = page => page.waitForFunction(`(${inkedIn})() > 500`, null, { timeout: 15000 }).catch(() => {});
/** Let the page render `n` more frames. */
const frames = (page, n = 2) => page.evaluate(n => new Promise(done => { const f = k => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
/** In the page: true once ANNA's model on her case study is at least `min` px tall. */
function modelHeight(min) {
  const c = document.querySelector('.plate-stage canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let y0 = 1e9, y1 = -1;
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 4) if (d[(y * c.width + x) * 4 + 3] > 20) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return (y1 - y0) / devicePixelRatio >= min;
}

// ---------- every inner page is a sheet in the set ----------

for (const path of INNER) {
  test(`${path} sits on the stone: the stone bar and footer, no frame, no old stylesheet, no errors`, async () => {
    const { context, page, errors, res } = await open(path);
    assert.equal(res.status(), 200);
    assert.equal(await page.locator('header.bar').count(), 1, 'the stone bar');
    assert.equal(await page.locator('.bar .bar-cta').count(), 1, 'its "Get in touch"');
    assert.equal(await page.locator('.frame').count(), 0, 'no sheet frame');
    assert.equal(await page.locator('.foot').count(), 1, 'the foot');
    // main h1: Playwright also sees into the dev toolbar's shadow DOM, which has its own
    assert.equal(await page.locator('main h1').count(), 1, 'one h1');
    // the old site is gone: no global.css tokens, no Tailwind preflight, no Lenis
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary')), '');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tw-ring-color')), '');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis')), false);
    // the stone ground and the sheet's type
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(238, 234, 227)');
    assert.equal(await page.locator('.bar').evaluate(b => getComputedStyle(b).backgroundColor), 'rgb(238, 234, 227)');
    assert.match(await page.evaluate(() => getComputedStyle(document.body).fontFamily), /^"?Archivo/);
    await page.waitForTimeout(400);
    assert.deepEqual(ours(errors), []);
    await context.close();
  });

  test(`${path} has no sideways scroll at 390px`, async () => {
    const { context, page } = await open(path, { width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await frames(page, 2);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `page is ${over}px wider than the viewport`);
    await context.close();
  });
}

test('one stone bar on every page: EH. | Ezra Hulsman, Projects, Blog, Résumé, Contact, Get in touch, no theme button', async () => {
  for (const [path, current] of [['/projects', 'Projects'], ['/projects/Henk', 'Projects'], ['/blog', 'Blog'], [`/blog/${POSTS[0]}`, 'Blog'], ['/resume', 'Résumé'], ['/contact', 'Contact']]) {
    const { context, page } = await open(path);
    // the signature from the old site, then the name in full; read out as the name alone
    assert.equal((await page.locator('.bar-name').innerText()).replace(/\s+/g, ' ').trim(), 'EH. Ezra Hulsman');
    assert.equal(await page.locator('.bar-name .sig').getAttribute('aria-hidden'), 'true');
    const [dot, red] = await page.locator('.bar-name .sig-dot').evaluate(e => {
      const i = document.body.appendChild(document.createElement('i'));
      i.style.color = 'var(--red)';
      const c = getComputedStyle(i).color;
      i.remove();
      return [getComputedStyle(e).color, c];
    });
    assert.equal(dot, red, 'the full stop in red');
    assert.equal(await page.getByRole('link', { name: 'Ezra Hulsman', exact: true }).count(), 1);
    assert.equal(await page.locator('.bar-name').getAttribute('href'), '/');
    assert.deepEqual(await page.locator('.bar nav a').allInnerTexts(), ['Projects', 'Blog', 'Résumé', 'Contact']);
    assert.deepEqual(await page.locator('.bar nav a').evaluateAll(as => as.map(a => a.getAttribute('href'))), ['/projects', '/blog', '/resume', '/contact']);
    assert.equal(await page.locator('.bar nav').getAttribute('aria-label'), 'Site');
    // the page you are on is marked, for eyes and for screen readers
    assert.deepEqual(await page.locator('.bar nav a[aria-current="page"]').allInnerTexts(), current ? [current] : [], `${path} marks ${current}`);
    // "Get in touch" goes to the contact page; the theme button is gone with the dark theme
    const cta = page.locator('.bar .bar-cta');
    assert.equal((await cta.innerText()).trim(), 'Get in touch');
    assert.equal(await cta.getAttribute('href'), '/contact');
    assert.equal(await cta.isVisible(), true);
    assert.equal(await page.locator('.theme').count(), 0, 'no theme button');
    await context.close();
  }
});

test('phones reach every page through the stone menu', async () => {
  const { context, page } = await open('/resume', { width: 390, height: 844 });
  const btn = page.locator('.menu-btn');
  const links = page.locator('.bar nav a');
  assert.equal(await btn.isVisible(), true);
  assert.equal(await btn.getAttribute('aria-label'), 'Menu');
  assert.equal(await links.first().isVisible(), false);
  // the mark and "Get in touch" stay in the bar beside the button
  assert.equal(await page.locator('.bar-name .sig').isVisible(), true);
  assert.equal(await page.locator('.bar .bar-cta').isVisible(), true);
  await btn.click();
  assert.equal(await btn.getAttribute('aria-expanded'), 'true');
  await links.last().waitFor({ state: 'visible' });
  assert.deepEqual(await links.allInnerTexts(), ['Projects', 'Blog', 'Résumé', 'Contact']);
  await links.filter({ hasText: 'Blog' }).click();
  await page.waitForURL(/\/blog\/?$/); // the live site adds a trailing slash
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

const DRAWN = ['henk', 'finance', 'homelab', 'bible', 'pytaiga', 'sandbox'];

test('/projects leads with ANNA, then every project under its status: running, paused, done', async () => {
  const { context, page } = await open('/projects');
  assert.deepEqual(await page.locator('.detail').evaluateAll(els => els.map(e => e.id)), ['anna', ...DRAWN]);
  // ANNA's plate is the real section drawing; the others are their detail drawings
  assert.equal(await page.locator('#anna canvas.drawing').count(), 1);
  assert.equal(await page.locator('.detail .dwg').count(), DRAWN.length);
  // every drawn project links to its case study, and every case study exists
  const cases = await page.locator('.detail .links a', { hasText: 'Case study' }).evaluateAll(as => as.map(a => a.getAttribute('href')));
  assert.equal(cases.length, DRAWN.length + 1);
  // each drawn project carries its two strongest dimensions, not a row of three
  for (const id of DRAWN) assert.equal(await page.locator(`#${id} .dims > div`).count(), 2, `${id} dims`);
  // the undrawn ones are cards; together they cover every project page exactly once
  const reg = await page.locator('.register .reg-title a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  const all = [...cases, ...reg].map(h => h.replace('/projects/', '')).sort();
  assert.deepEqual(all, [...PROJECTS].sort());
  // grouped by status, so a lighter treatment reads as paused, not as less
  assert.deepEqual(await page.locator('section:has(#projects-h) h2.group').allInnerTexts(), ['Running', 'Paused', 'Done']);
  const groupOf = async sel => page.locator(sel).evaluate(el => el.closest('.status-group')?.dataset.group);
  for (const [sel, g] of [['#henk', 'running'], ['#finance', 'running'], ['#homelab', 'running'], ['a[href="/projects/ResumePage"]', 'running'],
    ['#bible', 'paused'], ['a[href="/projects/EncryptedChatTUI"]', 'paused'], ['#pytaiga', 'done'], ['#sandbox', 'done']]) {
    assert.equal(await groupOf(sel), g, `${sel} is ${g}`);
  }
  assert.equal(await page.locator('#register-h').count(), 0);
  // the fun side pieces are in the set too; bible-tui has its own project now
  assert.ok(await page.locator('.side li').count() >= 3);
  assert.equal(await page.locator('.side a[href="https://bible.hulsman.dev"]').count(), 0);
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await untilInked(page);
  assert.ok(await inked(page) > 500, 'the ANNA plate plotted');
  await context.close();
});

test('the ANNA plate turns by hand and by its buttons', async () => {
  const { context, page } = await open('/projects');
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await untilInked(page);
  const spin = () => page.evaluate(() => window.__plate?.state.spin);
  const before = await spin();
  assert.equal(typeof before, 'number', 'the plate exposes its scene in tests');
  await page.locator('#anna [data-turn="1"]').click();
  assert.ok(await spin() > before, 'the turn button turns it');
  await context.close();
});

// 'ANNA's project page draws the model large' retired (openspec stone-inner-pages 4.2, decision
// 2026-11-10: ANNA's plate retires on her page, her window and levels take its place):
// tests/inner-windows.e2e.mjs checks her page instead.

// on /projects, where the plate stays until that page moves to stone (her own page has none since
// stone-inner-pages chunk 4)
test('turning the ANNA plate by hand draws no pencil line on the page', async () => {
  const { context, page } = await open('/projects');
  const stage = page.locator('#anna .plate-stage');
  await stage.scrollIntoViewIfNeeded();
  await untilInked(page);
  const b = await stage.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + b.width / 2 + 12 * i, b.y + b.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.pencil-line, .pencil-mark').count(), 0);
  await context.close();
});

test('reduced motion: every plate arrives drawn', async () => {
  const { context, page } = await open('/projects', { reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('.dwg:not(.drawn)'), null, { timeout: 5000 }).catch(() => {});
  assert.equal(await page.locator('.dwg:not(.drawn)').count(), 0);
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await untilInked(page);
  assert.ok(await inked(page) > 500);
  await context.close();
});

// ---------- a project page: title block, plate, then the write-up ----------

// 'a project page opens with its title block and its own drawing' retired (openspec stone-inner-pages,
// decision 2026-11-10: P1 head with layout ac, the drawings retire): tests/inner-article.e2e.mjs
// checks the stone head, the facts, the numbers and the window instead.

// 'ANNA's case study carries the section drawing; a project without a drawing has none' retired
// (openspec stone-inner-pages 4.2, decision 2026-11-10: her plate retires on her page, her window and
// levels take its place): tests/inner-windows.e2e.mjs ("Window and levels") and
// tests/inner-article.e2e.mjs ("The window per page") check both pages instead.

// ---------- the blog: the site diary, then a post ----------

// (openspec stone-inner-pages 7.2, decision 2026-11-10: /blog BI2, the titles large)
test('/blog lists every post, newest first, dated, each title a large link', async () => {
  const { context, page } = await open('/blog');
  const rows = page.locator('.bl-list > li');
  assert.equal(await rows.count(), POSTS.length);
  const dates = await rows.locator('time').evaluateAll(ts => ts.map(t => t.getAttribute('datetime')));
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.equal(await rows.locator('h2 > a').count(), POSTS.length);
  assert.equal(await page.locator('.diary').count(), 0, 'no diary table left');
  assert.equal(await page.locator('a[href="/rss.xml"]').count(), 0, 'no new links nobody asked for');
  await context.close();
});

// (openspec stone-inner-pages 6.2, decision 2026-11-10: B1 with layout ac, the title block goes)
test('a post opens with its date in the side\'s facts and reads at a sane measure', async () => {
  const { context, page } = await open(`/blog/${POSTS[0]}`);
  assert.equal((await page.locator('.art-facts dt').first().innerText()).trim(), 'Date');
  assert.match(await page.locator('.art-facts dd').first().locator('time').getAttribute('datetime'), /^\d{4}-\d{2}-\d{2}$/);
  const width = await page.locator('.art .prose').evaluate(p => p.getBoundingClientRect().width);
  assert.ok(width <= 672.5, `the prose column is ${width}px wide`);
  await context.close();
});

// ---------- the résumé: the years as the spine, rows of type, and it still prints ----------

// (openspec stone-inner-pages 7.2, decision 2026-11-10: /resume R3, no revision letters)
test('/resume: every role a row on the years\' spine, skills and schooling as rows', async () => {
  const src = readFileSync(new URL('../src/config/resume.ts', import.meta.url), 'utf8');
  const roles = (src.match(/^\s+role: '/gm) || []).length;
  const { context, page } = await open('/resume');
  assert.equal(await page.locator('.cv-row').count(), roles);
  assert.equal(await page.locator('.cv-row .cv-years b').count(), roles, 'each row\'s start year set large');
  assert.equal(await page.locator('main .revs, main .rev, main .schedule').count(), 0, 'no revisions, no schedules');
  assert.deepEqual((await page.locator('.cv-more h2').allInnerTexts()).map(t => t.trim()), ['Skills', 'Education', 'Certifications']);
  assert.ok(await page.locator('.cv-more dl > div').count() > 0, 'their rows');
  // one says the form, the other says mail
  assert.equal(await page.locator('.cv-actions a', { hasText: 'Request my full CV' }).getAttribute('href'), '/contact');
  assert.match(await page.locator('.cv-actions a', { hasText: 'Email me' }).getAttribute('href'), /^mailto:/);
  await context.close();
});

test('/resume prints on white with no chrome, no actions and no page light', async () => {
  const { context, page } = await open('/resume');
  await page.emulateMedia({ media: 'print' });
  for (const sel of ['.bar', '.foot', '.skip', '.cv-actions', '[data-page-light]']) {
    assert.equal(await page.locator(sel).evaluate(el => getComputedStyle(el).display), 'none', `${sel} is hidden in print`);
  }
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').display), 'none', 'no paper grain');
  const pdf = await page.pdf({ format: 'A4' });
  assert.ok(pdf.length > 10000, 'a real PDF comes out');
  await context.close();
});

// ---------- /contact: the form in a frosted window ----------
// Rewritten (openspec stone-inner-pages 8.2, decision 2026-11-10: C2 wide; the stamp and the
// transmittal go). tests/inner-contact.e2e.mjs checks the layout, the send and the contrast in full.

test('/contact: labelled fields, honeypot and Turnstile inside the frosted window, no stamp', async () => {
  const { context, page } = await open('/contact');
  assert.equal((await page.locator('main h1').innerText()).trim(), 'Get in touch');
  assert.equal(await page.locator('.stamp').count(), 0, 'no stamp');
  const win = page.locator('[data-glass-moment="compose"] [data-glass="frosted"]');
  assert.equal(await win.count(), 1);
  assert.equal(await win.locator('#contactForm').count(), 1, 'the form inside the window');
  for (const [id, label] of [['name', 'Name'], ['email', 'Email'], ['message', 'Message']]) {
    assert.equal((await win.locator(`label[for="${id}"]`).innerText()).trim().toLowerCase(), label.toLowerCase());
    assert.equal(await page.locator(`#${id}`).getAttribute('required'), '');
  }
  // the honeypot stays off-screen, not display:none, so bots still see it
  const hp = await page.locator('.hp-field').evaluate(el => ({ d: getComputedStyle(el).display, l: el.getBoundingClientRect().left }));
  assert.notEqual(hp.d, 'none');
  assert.ok(hp.l < -1000);
  assert.equal(await win.locator('#turnstile-container').count(), 1);
  assert.equal((await page.locator('#submitButton').innerText()).trim().toLowerCase(), 'send message');
  // focus is still unmistakable: a ring drawn by box-shadow or outline (read a frame later)
  await page.locator('#name').focus();
  await frames(page);
  const f = await page.locator('#name').evaluate(el => { const cs = getComputedStyle(el); return { o: cs.outlineStyle, s: cs.boxShadow }; });
  assert.ok(f.o !== 'none' || /2px/.test(f.s), JSON.stringify(f));
  await context.close();
});

test('/contact reports a failed send in --glass-ink-red at 4.5:1, without Tailwind', async () => {
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
  assert.equal(await status.evaluate(el => getComputedStyle(el).color), 'rgb(143, 51, 32)', '--glass-ink-red');
  // the text made transparent, the pixels behind its own box against that red
  await page.mouse.move(2, 2);
  await status.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const box = await status.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
  await status.evaluate(el => { el.style.color = 'transparent'; });
  await frames(page);
  const png = (await page.screenshot({ clip: box })).toString('base64');
  const min = await page.evaluate(async (png) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const red = L([143, 51, 32]);
    let m = 99; for (let i = 0; i < d.length; i += 4) m = Math.min(m, (L([d[i], d[i + 1], d[i + 2]]) + 0.05) / (red + 0.05));
    return m;
  }, png);
  assert.ok(min >= 4.5, `the error at ${min.toFixed(2)}:1`);
  await context.close();
});

// ---------- the bar: scrolled content never shows above or through it ----------

// Paints the whole document green under the chrome, scrolls, then counts green pixels from the
// top of the screen to the bottom of the bar. The stone bar is stuck to the top of the screen,
// opaque and above the page, so scrolled content must never show there.
async function greenAboveTheBar(page) {
  await page.evaluate(() => {
    const g = document.createElement('div');
    g.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${document.documentElement.scrollHeight}px;background:#00c800;z-index:30;pointer-events:none`;
    document.body.append(g);
    scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - innerHeight));
  });
  await page.waitForFunction(() => scrollY > 0);
  const { w, barTop, barBottom } = await page.evaluate(() => {
    const r = document.querySelector('.bar').getBoundingClientRect();
    return { w: innerWidth, barTop: r.top, barBottom: Math.floor(r.bottom) };
  });
  assert.equal(barTop, 0, 'the bar stays at the top of the screen');
  const png = (await page.screenshot({ clip: { x: 0, y: 0, width: w, height: barBottom } })).toString('base64');
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    // any green tint counts, so a half-covered seam pixel is caught too
    let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] - Math.max(d[i], d[i + 2]) > 30) k++;
    return k;
  }, png);
}

for (const path of ['/projects', '/projects/Henk', '/resume']) {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    test(`${path} at ${width}px: scrolled content never shows above the bar`, async () => {
      const { context, page } = await open(path, { width, height });
      await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
      assert.equal(await greenAboveTheBar(page), 0);
      await context.close();
    });
  }
}

// ---------- a drawn project is one target: drawing, title or link ----------

test('clicking a project\'s drawing opens its case study, on /projects', async () => {
  {
    const { context, page } = await open('/projects');
    const dwg = page.locator('#henk .dwg');
    await dwg.scrollIntoViewIfNeeded();
    await frames(page, 2);
    const r = await dwg.boundingBox();
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForURL(/\/projects\/Henk\/?$/); // the live site adds a trailing slash
    await context.close();
  }
  // the numbers are part of the card too
  {
    const { context, page } = await open('/projects');
    const dims = page.locator('#henk .dims');
    await dims.scrollIntoViewIfNeeded();
    const hit = await dims.evaluate(d => { const r = d.getBoundingClientRect(); return document.elementFromPoint(r.x + 20, r.y + r.height / 2)?.closest('a')?.getAttribute('href'); });
    assert.equal(hit, '/projects/Henk');
    await context.close();
  }
  // the card's own Code link still goes to the code, not to the case study
  const { context, page } = await open('/projects');
  const code = page.locator('#pytaiga .links a', { hasText: 'Code' });
  await code.scrollIntoViewIfNeeded();
  const top = await code.evaluate(a => { const r = a.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === a; });
  assert.ok(top, 'the Code link is on top of the card link');
  await context.close();
});

test('on a phone a project\'s drawing fits the screen whole', async () => {
  const { context, page } = await open('/projects', { width: 390, height: 844 });
  for (const id of DRAWN) {
    const r = await page.locator(`#${id} .dwg`).evaluate(d => ({ right: d.getBoundingClientRect().right, left: d.getBoundingClientRect().left }));
    assert.ok(r.left >= 0 && r.right <= 390, `${id}: drawing spans ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  await context.close();
});

test('/projects on a wide screen: the text sits beside each drawing, and ANNA is read on arrival', async () => {
  const { context, page } = await open('/projects');
  // ANNA's name and line are on the first screen, not under a screen of drawing
  const lead = await page.locator('#anna .detail-text p').first().evaluate(p => p.getBoundingClientRect().bottom);
  assert.ok(lead < 900, `ANNA's line ends at ${Math.round(lead)}px`);
  for (const id of ['anna', ...DRAWN]) {
    const [art, text] = await page.locator(`#${id}`).evaluate(a => [a.querySelector('.dwg-wrap, .anna-plate').getBoundingClientRect().right, a.querySelector('.detail-text').getBoundingClientRect().left]);
    assert.ok(text >= art, `${id}: text starts at ${Math.round(text)}, drawing ends at ${Math.round(art)}`);
  }
  // each project gets room to breathe before the next one starts
  for (const id of DRAWN) {
    const pad = await page.locator(`#${id}`).evaluate(a => parseFloat(getComputedStyle(a).paddingTop));
    assert.ok(pad >= 56, `${id}: ${pad}px above it`);
  }
  // the smaller projects read at body size, not as a footnote
  const size = await page.locator('.register .reg-title').first().evaluate(t => parseFloat(getComputedStyle(t).fontSize));
  assert.ok(size >= 18, `register titles are ${size}px`);
  await context.close();
});

// ---------- keyboard and screen-reader paths ----------

test('on a phone the opened stone menu\'s links come next in keyboard order', async () => {
  for (const path of ['/projects']) {
    const { context, page } = await open(path, { width: 390, height: 844 });
    await page.locator('.menu-btn').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.bar').classList.contains('open'));
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => ({ inMenu: !!document.activeElement.closest('.bar nav'), text: document.activeElement.textContent.trim() }));
    assert.deepEqual(at, { inMenu: true, text: 'Projects' }, `${path}: Tab after opening lands on the menu's first link`);
    await context.close();
  }
});

test('/resume: every section is a heading a screen reader can jump to', async () => {
  const { context, page } = await open('/resume');
  const h2 = (await page.locator('main h2').allInnerTexts()).map(t => t.trim().toUpperCase());
  for (const name of ['EXPERIENCE', 'SKILLS', 'EDUCATION', 'CERTIFICATIONS']) assert.ok(h2.includes(name), `${name} in ${h2.join(', ')}`);
  await context.close();
});

// ---------- the drawings keep legible lettering at every width ----------

for (const width of [900, 1024, 1180, 1440]) {
  test(`at ${width}px every detail drawing is drawn at a legible scale`, async () => {
    for (const path of ['/projects', '/projects/Henk']) {
      const { context, page } = await open(path, { width, height: 900 });
      const scales = await page.locator('.dwg').evaluateAll(ds => ds.map(d => d.getBoundingClientRect().width / d.viewBox.baseVal.width));
      // 11.5px lettering at the drawing's own scale; 0.9 keeps it above 10px
      for (const k of scales) assert.ok(k >= 0.9 && k <= 1.3, `${path}: scales ${scales.map(x => x.toFixed(2)).join(', ')}`);
      await context.close();
    }
  });
}

test('no project drawing scrolls sideways at any width, and none says it does', async () => {
  for (const path of ['/projects', '/projects/Henk']) for (const [width, height] of [[390, 844], [820, 1180], [844, 390]]) {
    const { context, page } = await open(path, { width, height });
    const r = await page.locator('.dwg-scroll').evaluateAll(els => els.map(el => ({ over: el.scrollWidth > el.clientWidth + 1, hint: getComputedStyle(el, '::after').content })));
    for (const x of r) {
      assert.equal(x.over, false, `${path} ${width}: a drawing overflows`);
      assert.ok(x.hint === 'none' || x.hint === 'normal', `${path} ${width}: hint ${x.hint}`);
    }
    await context.close();
  }
});

// ---------- the 2026-10-09 additions: the workstation, Finance Bot and bible-tui drawn ----------

test('the homelab counts the workstation: in the drawing, the figure and the write-up', async () => {
  const { context, page } = await open('/projects');
  assert.match(await page.locator('#homelab .dwg').textContent(), /w11/);
  assert.match(await page.locator('#homelab .dwg title').textContent(), /workstation/);
  assert.deepEqual(await page.locator('#homelab .dims dt').allInnerTexts(), ['4', '7']);
  // and the card says the same: three servers and the workstation, not three devices
  assert.match(await page.locator('#homelab .detail-text p').first().innerText(), /^Three servers and my workstation/);
  await page.goto(BASE + '/projects/HomelabInfrastructure');
  assert.match(await page.locator('main').innerText(), /is the fourth machine on the mesh/);
  await context.close();
});

test('bible-tui has its own page, linked to the live reader, the code and the blog post', async () => {
  const { context, page, errors, res } = await open('/projects/BibleTui');
  assert.equal(res.status(), 200);
  assert.match(await page.locator('h1').innerText(), /bible-tui/i);
  for (const href of ['https://bible.hulsman.dev', 'https://github.com/enhulsman/bible-tui', '/blog/bible-tui']) {
    assert.ok(await page.locator(`a[href="${href}"]`).count() >= 1, `links ${href}`);
  }
  assert.deepEqual(ours(errors), []);
  await context.close();
});

test('the sandbox says it is retired, not that it runs daily', async () => {
  const { context, page } = await open('/projects/ClaudeSandbox');
  const text = await page.locator('main').innerText();
  assert.doesNotMatch(text, /runs daily/);
  assert.match(text, /auto mode covered what I needed/);
  await context.close();
});

test('the sitemap the pages advertise exists and lists every page', async () => {
  const { context, page } = await open('/');
  assert.equal(await page.locator('link[rel="sitemap"]').getAttribute('href'), '/sitemap-index.xml');
  const res = await page.request.get(BASE + '/sitemap-index.xml');
  assert.equal(res.status(), 200);
  assert.match(res.headers()['content-type'], /xml/);
  const locs = [...(await res.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname.replace(/\/$/, '') || '/');
  for (const path of ['/', '/projects', '/blog', '/resume', '/contact', ...PROJECTS.map(p => `/projects/${p}`), ...POSTS.map(p => `/blog/${p}`)]) {
    assert.ok(locs.includes(path), `sitemap lists ${path}`);
  }
  await context.close();
});

// ---------- round 3: favicon, mail line, the post head ----------

test('the favicon is the EH. signature in one frame, its full stop red, with its own light and dark', async () => {
  const { context, page } = await open('/');
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  const res = await page.request.get(BASE + href);
  assert.equal(res.status(), 200);
  const svg = await res.text();
  assert.match(svg, /prefers-color-scheme:\s*dark/);
  assert.equal((svg.match(/<rect[^>]*fill="none"/g) || []).length, 1, 'one frame');
  // the H alone in a square read as a hospital sign: the initials, signed off in red
  assert.match(svg, /class="r"/, 'a red full stop');
  assert.match(svg, /\.r\{fill:#B8301A\}/);
  assert.doesNotMatch(svg, /Gradient|filter|#c9942b/i, 'none of the old amber glow');
  await context.close();
});

// Rewritten (openspec stone-inner-pages 8.2, decision 2026-11-10: C2 wide; the mail line goes and
// the address is set large beside the form).
test('/contact sets the address large: in the left column on a desktop, under the window on a phone', async () => {
  const { context, page } = await open('/contact');
  assert.equal(await page.locator('.tm-mail').count(), 0, 'no mail line');
  const mail = page.locator('main a[href^="mailto:"]');
  assert.equal(await mail.count(), 1);
  assert.equal((await mail.innerText()).trim(), 'info@hulsman.dev');
  assert.equal(await mail.getAttribute('href'), 'mailto:info@hulsman.dev');
  assert.equal(await mail.evaluate(el => !!el.closest('form')), false, 'not inside the form');
  assert.ok(parseFloat(await mail.evaluate(el => getComputedStyle(el).fontSize)) >= 36, 'set large');
  const win = '[data-glass-moment="compose"] [data-glass="frosted"]';
  let [w, m] = await Promise.all([page.locator(win).boundingBox(), mail.boundingBox()]);
  assert.ok(m.x + m.width <= w.x, 'left of the window on a desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await frames(page);
  [w, m] = await Promise.all([page.locator(win).boundingBox(), mail.boundingBox()]);
  assert.ok(m.y >= w.y + w.height, 'under the window on a phone');
  await context.close();
});

const box = (page, sel) => page.locator(sel).first().evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });

// Retired (openspec stone-inner-pages 6.2, decision 2026-11-10: B1 with layout ac; the hanging heads
// and the title block go): "a post's text starts beside its title" and "every heading of a post still
// hangs in the left column". tests/inner-blog.e2e.mjs checks the post's head, columns and order.

test('a post\'s facts give its reading time and, where it has one, its project', async () => {
  let { context, page } = await open('/blog/henk-exactly-once');
  const facts = async page => Object.fromEntries(await page.locator('.art-facts > div').evaluateAll(ds => ds.map(d => [d.querySelector('dt').innerText.trim(), d.querySelector('dd').innerText.trim()])));
  assert.match((await facts(page)).Reading, /^\d+ min$/);
  assert.equal(await page.locator('.art-stick .art-proj a[href="/projects/Henk"]').count(), 1, 'its project, linked');
  await context.close();
  ({ context, page } = await open('/blog/spec-factory'));
  assert.match((await facts(page)).Reading, /^\d+ min$/);
  assert.equal(await page.locator('.art-proj').count(), 0, 'no project when the post names none');
  await context.close();
});

test('on a phone a post reads in order: title, lead, window, text, facts', async () => {
  const { context, page } = await open('/blog/henk-exactly-once', { width: 390, height: 844 });
  const [h1, lead, win, prose, facts] = await Promise.all(['main h1', '.art-lead', '.art-window', '.art .prose', '.art-facts'].map(sel => box(page, sel)));
  assert.ok(h1.b <= lead.t && lead.b <= win.t && win.b <= prose.t && prose.b <= facts.t);
  await context.close();
});

test('the Henk post carries its own drawing in the frosted pane opening the right column; a post without one has none', async () => {
  let { context, page } = await open('/blog/henk-exactly-once');
  const dwg = page.locator('.art-window [data-glass="frosted"] svg.dwg');
  assert.equal(await dwg.count(), 1);
  assert.match(await dwg.locator('title').textContent(), /cursor/);
  assert.equal(await page.locator('.art > aside > :first-child').evaluate(el => el.classList.contains('art-window')), true, 'the pane opens the right column');
  const [h1, d] = await Promise.all([box(page, 'main h1'), box(page, '.art-window svg.dwg')]);
  assert.ok(d.l > h1.r || d.l >= h1.l + 672, 'beside the text, not over it');
  assert.ok(d.r - d.l > 280, `drawn at a legible size (${Math.round(d.r - d.l)}px)`);
  await page.waitForFunction(() => document.querySelector('.art-window svg.dwg').classList.contains('drawn'));
  await context.close();
  ({ context, page } = await open('/blog/spec-factory'));
  assert.equal(await page.locator('svg.dwg').count(), 0);
  await context.close();
});

test('on a phone the post drawing fits the screen whole', async () => {
  const { context, page } = await open('/blog/henk-exactly-once', { width: 390, height: 844 });
  const d = await box(page, '.art-window [data-glass="frosted"] svg.dwg');
  assert.ok(d.l >= 0 && d.r <= 390);
  await context.close();
});

test('the site\'s own case study says what it is, how it is checked, and the two jokes worth pointing at', async () => {
  const { context, page } = await open('/projects/ResumePage');
  assert.deepEqual(await page.locator('.prose > h2').allInnerTexts(), ['The Idea', 'Built Like It Matters', 'Stack Choices', 'The Terminal', 'Two Things You Might Have Missed']);
  const text = await page.locator('.prose').innerText();
  assert.match(text, /it['’]s mine: 2,00\./);
  assert.match(text, /Dom tower/);
  assert.doesNotMatch(text, /Claude|prompt/i, 'the page leaves Claude out');
  await context.close();
});

test('the bar keeps the signature and the full name on one line on small phones, the menu in reach', async () => {
  for (const width of [320, 390]) {
    const { context, page } = await open('/blog', { width, height: 800 });
    const r = await page.evaluate(() => {
      const box = s => document.querySelector(s).getBoundingClientRect();
      const name = box('.bar-name'), menu = box('.menu-btn');
      return { nameH: name.height, nameRight: name.right, menuLeft: menu.left, menuRight: menu.right, over: document.documentElement.scrollWidth - innerWidth };
    });
    assert.ok(r.nameH < 24, `${width}: one line (${r.nameH}px)`);
    assert.ok(r.nameRight <= r.menuLeft - 8, `${width}: clear of the menu`);
    assert.ok(r.menuRight <= width && r.over <= 0, `${width}: nothing off the screen`);
    await context.close();
  }
});
