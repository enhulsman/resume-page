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

test('one bar on every page, homepage included: E. Hulsman, Projects, Blog, Résumé, Contact, and the theme button', async () => {
  for (const [path, current] of [['/', null], ['/projects', 'PROJECTS'], ['/projects/Henk', 'PROJECTS'], ['/blog', 'BLOG'], [`/blog/${POSTS[0]}`, 'BLOG'], ['/resume', 'RÉSUMÉ'], ['/contact', 'CONTACT']]) {
    const { context, page } = await open(path);
    assert.equal((await page.locator('.bar-name').innerText()).trim(), 'E. HULSMAN');
    assert.equal(await page.locator('.bar-name').getAttribute('href'), path === '/' ? '#top' : '/');
    assert.deepEqual(await page.locator('.bar nav a').allInnerTexts(), ['PROJECTS', 'BLOG', 'RÉSUMÉ', 'CONTACT']);
    assert.deepEqual(await page.locator('.bar nav a').evaluateAll(as => as.map(a => a.getAttribute('href'))), ['/projects', '/blog', '/resume', '/contact']);
    assert.equal(await page.locator('.bar nav').getAttribute('aria-label'), 'Site');
    // the page you are on is marked, for eyes and for screen readers
    assert.deepEqual(await page.locator('.bar nav a[aria-current="page"]').allInnerTexts(), current ? [current] : [], `${path} marks ${current}`);
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

test('a project page opens with its title block and its own drawing', async () => {
  const src = readFileSync(new URL('../src/pages/projects/Henk.mdx', import.meta.url), 'utf8');
  const label = src.match(/^dateLabel: "(.*)"/m)[1];
  const { context, page } = await open('/projects/Henk');
  const block = page.locator('.titleblock');
  assert.deepEqual(await block.locator('th').allInnerTexts(), ['PROJECT', label.toUpperCase(), 'STACK', 'CODE']);
  assert.match(await block.innerText(), /July 2026/);
  assert.equal(await page.locator('.plate .dwg').count(), 1, 'Henk\'s detail drawing');
  // drawn near its own scale, so its lettering matches the page's and the write-up keeps the stage
  const w = await page.locator('.plate .dwg').evaluate(d => d.getBoundingClientRect().width);
  assert.ok(w >= 480 && w <= 680, `the drawing is ${Math.round(w)}px wide`);
  // the stats are dimension strings, and the write-up is set in the sheet's type
  assert.ok(await page.locator('.prose .dims div').count() >= 4);
  assert.match(await page.locator('.prose h2').first().evaluate(h => getComputedStyle(h).fontFamily), /^"?Archivo/);
  await context.close();
});

test('ANNA\'s case study carries the section drawing; a project without a drawing has none', async () => {
  let { context, page } = await open('/projects/AnnaAssistant');
  assert.equal(await page.locator('.plate canvas.drawing').count(), 1);
  const h = await page.locator('.plate .plate-stage').evaluate(s => s.getBoundingClientRect().height);
  assert.ok(h <= 900 * 0.6, `the model is ${Math.round(h)}px tall on a 900px screen`);
  await page.locator('.plate').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  assert.ok(await inked(page) > 500);
  await context.close();

  ({ context, page } = await open('/projects/EncryptedChatTUI'));
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

// ---------- the paper: nothing shows past the frame ----------

// Paints the whole document green under the chrome, then counts green pixels in the strips
// between the screen's edge and the bar or frame. Scrolled content must never show there.
async function greenAtTheEdges(page) {
  await page.evaluate(() => {
    const g = document.createElement('div');
    g.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${document.documentElement.scrollHeight}px;background:#00c800;z-index:30;pointer-events:none`;
    document.body.append(g);
    scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - innerHeight));
  });
  await page.waitForTimeout(300);
  const { w, h, barTop, frame } = await page.evaluate(() => ({
    w: innerWidth, h: innerHeight,
    barTop: Math.floor(document.querySelector('.bar').getBoundingClientRect().top),
    frame: Math.floor(document.querySelector('.frame').getBoundingClientRect().left),
  }));
  const strips = [
    { x: 0, y: 0, width: w, height: barTop },
    { x: 0, y: h - frame - 5, width: w, height: frame + 5 },
    { x: 0, y: 0, width: frame + 5, height: h },
    { x: w - frame - 5, y: 0, width: frame + 5, height: h },
  ];
  let n = 0;
  for (const clip of strips) {
    const png = (await page.screenshot({ clip })).toString('base64');
    n += await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      // any green tint counts, so a half-covered seam pixel is caught too
      let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] - Math.max(d[i], d[i + 2]) > 30) k++;
      return k;
    }, png);
  }
  return n;
}

for (const path of ['/', '/projects', '/projects/Henk', '/resume']) {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    test(`${path} at ${width}px: scrolled content never shows above the bar or past the frame`, async () => {
      const { context, page } = await open(path, { width, height });
      await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
      assert.equal(await greenAtTheEdges(page), 0);
      await context.close();
    });
  }
}

// Phones draw at fractional pixel ratios, where the paper's edge and the bar's edge can both
// land mid-pixel and leave a seam of page between them. 408x912 is whole device pixels at
// each ratio, as a real screen is, so the screenshot has no half pixel past its edge.
for (const scale of [2.625, 2.75, 3]) {
  test(`at a ${scale}x phone screen no seam of scrolled content shows above the bar`, async () => {
    const { context, page } = await open('/projects', { width: 408, height: 912, scale });
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    assert.equal(await greenAtTheEdges(page), 0);
    await context.close();
  });
}

// ---------- a drawn project is one target: drawing, title or link ----------

test('clicking a project\'s drawing opens its case study, on /projects and on the homepage', async () => {
  for (const path of ['/projects', '/']) {
    const { context, page } = await open(path);
    const dwg = page.locator('#henk .dwg');
    await dwg.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const r = await dwg.boundingBox();
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForURL('**/projects/Henk');
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

test('on a phone the opened menu\'s links come next in keyboard order', async () => {
  for (const path of ['/', '/projects']) {
    const { context, page } = await open(path, { width: 390, height: 844 });
    await page.locator('.menu-btn').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('.bar nav')), `${path}: Tab after opening lands in the menu`);
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
    for (const path of ['/', '/projects', '/projects/Henk']) {
      const { context, page } = await open(path, { width, height: 900 });
      const scales = await page.locator('.dwg').evaluateAll(ds => ds.map(d => d.getBoundingClientRect().width / d.viewBox.baseVal.width));
      // 11.5px lettering at the drawing's own scale; 0.9 keeps it above 10px
      for (const k of scales) assert.ok(k >= 0.9 && k <= 1.3, `${path}: scales ${scales.map(x => x.toFixed(2)).join(', ')}`);
      await context.close();
    }
  });
}

test('no project drawing scrolls sideways at any width, and none says it does', async () => {
  for (const path of ['/', '/projects']) for (const [width, height] of [[390, 844], [820, 1180], [844, 390]]) {
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
  await page.goto(BASE + '/projects/HomelabInfrastructure');
  assert.match(await page.locator('main').innerText(), /is the fourth machine on the mesh/);
  await context.close();
});

test('bible-tui has its own sheet, linked to the live reader, the code and the blog post', async () => {
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
