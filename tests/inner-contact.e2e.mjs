// /contact in stone, in a real browser (openspec stone-inner-pages, chunk 8: stone-contact, C2 wide):
// the heading and the address set large on the left, the form in a frosted "New message" window on
// the right, over the moss's glow (pageLights.contact); the form works as before; its text on glass reads clearly; the
// transmittal is gone. Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-contact.e2e.mjs
//
// Test cost: /contact loads once with reduced motion and is reused across widths with
// setViewportSize. Turnstile's script is stubbed for every load (no third-party frame), and
// /api/contact is answered by the test. Waits are on state, never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import site from '../src/config/site.ts';
import { homeSections, siteNav } from '../src/config/home.ts';
import { pageWords } from '../src/config/pages.ts';
import { pageLights } from '../src/config/glass.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const W = pageWords.contact;
const WIN = '[data-glass-moment="compose"] [data-glass="frosted"]';
const INK = 'rgb(17, 17, 16)';
const RED = 'rgb(143, 51, 32)'; // --glass-ink-red, #8F3320
const norm = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

// Turnstile stands in: a widget that renders nothing and always yields one token
const TOKEN = 'stub-token';
const STUB = `window.turnstile={render:function(){return 'stub'},getResponse:function(){return '${TOKEN}'},reset:function(){}};if(window.onTurnstileLoad)window.onTurnstileLoad();`;

let browser, context, page;
const errors = [];
before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  // the mocked failed send's 500 is the test's own answer, not an error of the page
  page.on('console', (m) => m.type() === 'error' && !/\/api\/contact$/.test(m.location().url) && errors.push(m.text()));
  await page.goto(`${BASE}/contact`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !!window.turnstile);
});
after(async () => {
  await context?.close();
  await browser?.close();
  assert.deepEqual(errors, [], 'no page or console error on /contact');
});

const frames = (n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
async function width(w, h = w <= 400 ? 844 : 900) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames();
}
/** How far the page scrolls sideways (0 when it cannot). */
const sideways = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
/** The boxes the layout scenarios measure, in page coordinates. */
const layout = () => page.evaluate((WIN) => {
  const b = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width }; };
  const h1 = document.querySelector('main h1');
  const lead = h1?.nextElementSibling;
  const win = document.querySelector(WIN);
  const mail = document.querySelector(`main a[href^="mailto:"]`);
  return { h1: b(h1), lead: b(lead), win: b(win), mail: b(mail), col: b(h1?.parentElement) };
}, WIN);

async function fill() {
  await page.fill('#name', 'Ada Lovelace');
  await page.fill('#email', 'ada@example.com');
  await page.fill('#message', 'Hello from the test.');
}
/** Sends the form with /api/contact answered by `answer`; resolves once the status line shows. */
async function send(answer) {
  await page.route('**/api/contact', answer);
  await page.click('#submitButton');
  await page.locator('#statusMessage').waitFor({ state: 'visible' });
  await page.unroute('**/api/contact');
}
const ok = (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
const fail = (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"error":"The mail server said no."}' });

test('Wide: at 1440 the window stands right of the heading, at most 820 px and 1.4 times the left column, titled "New message" over a glow; the address under the lead', async () => {
  await width(1440);
  const L = await layout();
  assert.equal(norm(await page.locator('main h1').innerText()), siteNav.cta.label);
  assert.equal(norm(await page.locator('main h1').innerText()), 'Get in touch');
  assert.equal(norm(await page.evaluate(() => document.querySelector('main h1').nextElementSibling.textContent)), site.contactMessage);
  assert.ok(L.win.l >= L.col.r, `the window (${L.win.l}) right of the heading's column (${L.col.r})`);
  assert.ok(L.win.t < L.lead.b, 'beside the heading, not under it');
  assert.ok(L.win.w <= 820.5, `window ${L.win.w} px wide`);
  assert.ok(L.win.w >= 1.4 * L.col.w, `window ${L.win.w} vs left column ${L.col.w}`);
  const g = await page.evaluate((WIN) => {
    const win = document.querySelector(WIN), moment = win.closest('[data-glass-moment]');
    const glow = moment.querySelector('[data-glow]');
    const t = win.querySelector('.glass-title');
    const gz = glow && +getComputedStyle(glow).zIndex, wz = +getComputedStyle(win).zIndex;
    const gb = glow?.getBoundingClientRect(), wb = win.getBoundingClientRect();
    const colours = glow ? [...new Set([...getComputedStyle(glow).backgroundImage.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map((m) => `${m[1]},${m[2]},${m[3]}`))] : [];
    return { title: t?.textContent.trim(), glow: !!glow, colours, beneath: glow && gz < wz && !!(glow.compareDocumentPosition(win) & Node.DOCUMENT_POSITION_FOLLOWING), overlaps: gb && gb.left < wb.right && gb.right > wb.left && gb.top < wb.bottom && gb.bottom > wb.top };
  }, WIN);
  assert.equal(g.title, W.window);
  assert.equal(g.title, 'New message');
  assert.ok(g.glow && g.beneath && g.overlaps, 'a [data-glow] beneath the window');
  // the moss, /contact's own light (Ezra, 2026-11-10: the bar mapping carries into the pages, Contact = moss)
  assert.deepEqual(g.colours.sort(), [pageLights.contact.near, pageLights.contact.deep].map((c) => c.join()).sort(), `the glow's lights: ${g.colours}`);
  // the address, a mailto link, set large in the left column under the lead
  const mail = page.locator('main a[href^="mailto:"]');
  assert.equal(await mail.count(), 1);
  assert.equal(await mail.getAttribute('href'), `mailto:${site.social.email}`);
  assert.equal(norm(await mail.innerText()), site.social.email);
  assert.ok(L.mail.r <= L.win.l && L.mail.l >= L.col.l - 1, 'in the left column');
  assert.ok(L.mail.t >= L.lead.b, 'under the lead');
  assert.ok(parseFloat(await mail.evaluate((a) => getComputedStyle(a).fontSize)) >= 36, 'set large');
  // LinkedIn and GitHub under it, labels from homeSections.contact, hrefs from site.social
  const links = await page.evaluate(() => {
    const a = document.querySelector('main a[href^="mailto:"]'), r = a.getBoundingClientRect();
    return [...document.querySelectorAll('main a')].filter((l) => l !== a && !l.closest('form') && l.getBoundingClientRect().top >= r.bottom - 1).map((l) => [l.textContent.trim(), l.getAttribute('href')]);
  });
  assert.deepEqual(links, [[homeSections.contact.linkedin, site.social.LinkedIn], [homeSections.contact.github, site.social.GitHub]]);
  assert.equal(await sideways(), 0);
});

test('The 980 px boundary: at 980 the window beside the heading; at 979 the window under the lead and the address under the window', async () => {
  await width(980);
  let L = await layout();
  assert.ok(L.win.l >= L.col.r && L.win.t < L.lead.b, `980: window beside the heading (${JSON.stringify([L.win.l, L.col.r, L.win.t, L.lead.b])})`);
  await width(979);
  L = await layout();
  assert.ok(L.win.t >= L.lead.b, `979: the window's top (${L.win.t}) below the lead's bottom (${L.lead.b})`);
  assert.ok(L.mail.t >= L.win.b, `979: the address's top (${L.mail.t}) below the window's bottom (${L.win.b})`);
});

test('On a phone: heading, lead, window, address in that order, the window within 0..390, no sideways scroll', async () => {
  await width(390);
  const L = await layout();
  assert.ok(L.h1.b <= L.lead.t + 1 && L.lead.b <= L.win.t && L.win.b <= L.mail.t, JSON.stringify(L));
  assert.ok(L.win.l >= 0 && L.win.r <= 390, `window ${L.win.l}..${L.win.r}`);
  assert.equal(await sideways(), 0);
  await width(1440);
});

test('The fields: labelled required name, email, message; the honeypot unseen; elapsed, Turnstile, the button and the status line, all inside the frosted window', async () => {
  await width(1440);
  const f = await page.evaluate((WIN) => {
    const win = document.querySelector(WIN);
    const field = (id) => {
      const el = document.getElementById(id), label = document.querySelector(`label[for="${id}"]`);
      return { tag: el?.tagName, type: el?.getAttribute('type'), required: el?.required, label: label?.textContent.trim(), inside: !!el && win.contains(el) && win.contains(label) };
    };
    const hp = document.getElementById('website'), hr = hp.getBoundingClientRect();
    const button = document.getElementById('submitButton'), status = document.getElementById('statusMessage');
    return {
      name: field('name'), email: field('email'), message: field('message'),
      hp: { name: hp.name, tabindex: hp.getAttribute('tabindex'), hidden: hp.closest('[aria-hidden="true"]') !== null, offscreen: hr.right <= 0 || hr.bottom <= 0 || hr.left >= innerWidth, inside: win.contains(hp) },
      elapsed: (() => { const e = document.querySelector('input[name="elapsed"]'); return e && { type: e.type, inside: win.contains(e) }; })(),
      turnstile: (() => { const t = document.getElementById('turnstile-container'); return !!t && win.contains(t); })(),
      button: { text: button.querySelector('.submit-text').textContent.trim(), type: button.type, inside: win.contains(button) },
      status: { role: status.getAttribute('role'), inside: win.contains(status) },
      form: !!document.getElementById('contactForm') && win.contains(document.getElementById('contactForm')),
    };
  }, WIN);
  assert.ok(f.form, 'the form inside the frosted window');
  assert.deepEqual(f.name, { tag: 'INPUT', type: null, required: true, label: W.name, inside: true });
  assert.deepEqual(f.email, { tag: 'INPUT', type: 'email', required: true, label: W.email, inside: true });
  assert.deepEqual(f.message, { tag: 'TEXTAREA', type: null, required: true, label: W.message, inside: true });
  assert.deepEqual(f.hp, { name: 'website', tabindex: '-1', hidden: true, offscreen: true, inside: true });
  assert.deepEqual(f.elapsed, { type: 'hidden', inside: true });
  assert.ok(f.turnstile, '#turnstile-container in the window');
  assert.deepEqual(f.button, { text: W.send, type: 'submit', inside: true });
  assert.equal(f.button.text, 'Send Message');
  assert.deepEqual(f.status, { role: 'status', inside: true });
  // Turnstile rendered explicitly, in its light theme (the inline script, unchanged)
  const src = await page.locator('script[src*="challenges.cloudflare.com"]').getAttribute('src');
  assert.match(src, /render=explicit/);
  assert.match(await page.content(), /theme: 'light'/);
});

test('A send, mocked: one POST with the fields, elapsed and the token; "Sending..." while it waits; then the success text', async () => {
  await width(1440);
  await fill();
  const posts = [];
  let release;
  const held = new Promise((r) => { release = r; });
  await page.route('**/api/contact', async (r) => { posts.push(r.request()); await held; await ok(r); });
  await page.click('#submitButton');
  await page.waitForFunction(() => !document.querySelector('#submitButton .submit-loading').hidden);
  const sending = await page.evaluate(() => { const b = document.getElementById('submitButton'); return { text: b.innerText.trim(), disabled: b.disabled }; });
  assert.deepEqual(sending, { text: W.sending, disabled: true });
  assert.equal(sending.text, 'Sending...');
  release();
  await page.locator('#statusMessage').waitFor({ state: 'visible' });
  await page.unroute('**/api/contact');
  assert.equal(posts.length, 1, 'one POST');
  assert.equal(posts[0].method(), 'POST');
  const body = posts[0].postData();
  const field = (k) => body.match(new RegExp(`name="${k}"\\r\\n\\r\\n([^\\r]*)`))?.[1];
  assert.equal(field('name'), 'Ada Lovelace');
  assert.equal(field('email'), 'ada@example.com');
  assert.equal(field('message'), 'Hello from the test.');
  assert.match(field('elapsed') ?? '', /^\d+$/);
  assert.equal(field('cf-turnstile-response'), TOKEN);
  assert.equal(field('website'), '');
  const status = await page.evaluate(() => { const s = document.getElementById('statusMessage'); return { text: s.textContent.trim(), kind: s.dataset.kind }; });
  assert.deepEqual(status, { text: W.sent, kind: 'sent' });
  assert.equal(norm(await page.locator('#submitButton').innerText()), W.send);
});

test('A failed send: the error in the status line, data-kind="error", in --glass-ink-red', async () => {
  await width(1440);
  await fill();
  await send(fail);
  const s = await page.evaluate(() => { const s = document.getElementById('statusMessage'); return { text: s.textContent.trim(), kind: s.dataset.kind, color: getComputedStyle(s).color, red: getComputedStyle(s).getPropertyValue('--glass-ink-red').trim() }; });
  assert.equal(s.text, 'The mail server said no.');
  assert.equal(s.kind, 'error');
  assert.equal(s.red.toLowerCase(), '#8f3320');
  assert.equal(s.color, RED);
});

/**
 * Every text of the window (title, labels, typed text, button, status line) with its own colour, the
 * window's text made transparent at once, one screenshot; each text's lowest contrast against the
 * pixels behind it (an input's content box, every other element's own text), and each input's
 * outline (its darkest edge pixels) against the pixels just outside it.
 */
async function measure() {
  // the pointer rests in the bar, off the window (a hover state is not what is measured)
  await page.mouse.move(2, 2);
  await page.evaluate((WIN) => {
    const win = document.querySelector(WIN), bar = document.querySelector('header.bar');
    window.scrollTo(0, win.getBoundingClientRect().top + scrollY - bar.getBoundingClientRect().bottom - 8);
  }, WIN);
  await frames(4);
  const { items, edges } = await page.evaluate((WIN) => {
    const win = document.querySelector(WIN);
    const rangeBox = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
    const items = [];
    const add = (sel, el, r) => { if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight) items.push({ sel, color: getComputedStyle(el).color, box: { x: r.x, y: r.y, w: r.width, h: r.height } }); else items.push({ sel, out: true }); };
    for (const el of win.querySelectorAll('.glass-title, label:not(.hp-field label), .submit-text, #statusMessage')) if (el.offsetParent && el.textContent.trim()) add(el.matches('label') ? `label[for=${el.htmlFor}]` : (el.id ? `#${el.id}` : `.${el.className}`), el, rangeBox(el));
    const edges = [];
    for (const el of win.querySelectorAll('#name, #email, #message')) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const px = (p) => parseFloat(cs[p]) || 0;
      add(`#${el.id} text`, el, new DOMRect(r.x + px('paddingLeft') + px('borderLeftWidth'), r.y + px('paddingTop') + px('borderTopWidth'), r.width - px('paddingLeft') - px('paddingRight') - px('borderLeftWidth') - px('borderRightWidth'), Math.min(r.height - px('paddingTop') - px('paddingBottom'), 40)));
      edges.push({ id: el.id, x0: r.left + 12, x1: r.right - 12, top: r.top });
    }
    return { items, edges };
  }, WIN);
  const tag = await page.addStyleTag({ content: `${WIN}, ${WIN} * { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }` });
  await frames(2);
  const png = (await page.screenshot()).toString('base64');
  await tag.evaluate((t) => t.remove());
  return page.evaluate(async ([png, items, edges]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (p, q) => { const [hi, lo] = [L(p), L(q)].sort((a, b) => b - a); return (hi + 0.05) / (lo + 0.05); };
    const at = (px, py) => { const d = x.getImageData(Math.round(px), Math.round(py), 1, 1).data; return [d[0], d[1], d[2]]; };
    const texts = items.map(({ sel, color, box, out }) => {
      if (out) return { sel, ratio: 0, out: true };
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      const d = x.getImageData(Math.round(box.x), Math.round(box.y), Math.max(1, Math.round(box.w)), Math.max(1, Math.round(box.h))).data;
      let min = 99;
      for (let i = 0; i < d.length; i += 16) {
        const bg = [d[i], d[i + 1], d[i + 2]];
        min = Math.min(min, ratio(bg, [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]));
      }
      return { sel, color, ratio: +min.toFixed(2) };
    });
    const outlines = edges.map(({ id, x0, x1, top }) => {
      let min = 99;
      for (let k = 0; k <= 4; k++) {
        const px = x0 + ((x1 - x0) * k) / 4;
        const band = [0, 1, 2].map((dy) => at(px, Math.floor(top) + dy)).sort((p, q) => L(p) - L(q))[0];
        min = Math.min(min, ratio(band, at(px, Math.floor(top) - 3)));
      }
      return { id, ratio: +min.toFixed(2) };
    });
    return { texts, outlines };
  }, [png, items, edges]);
}

test('Measured: at 1440 and 390, every text in the window at 4.5:1 (title, labels, typed text, button, the success and the error) and every input outline at 3:1', async () => {
  const report = [];
  for (const w of [1440, 390]) {
    await width(w);
    // the success, then the fields filled again (a sent form resets), measured at once
    await fill();
    await send(ok);
    await fill();
    const sent = await measure();
    // the error, the fields still filled
    await send(fail);
    const failed = await measure();
    for (const [state, m] of [['sent', sent], ['error', failed]]) {
      const sels = m.texts.map((t) => t.sel);
      for (const need of ['.glass-title', 'label[for=name]', 'label[for=email]', 'label[for=message]', '#name text', '#email text', '#message text', '.submit-text', '#statusMessage']) assert.ok(sels.includes(need), `${w} ${state}: ${need} measured (${sels.join(', ')})`);
      for (const t of m.texts) report.push({ w, state, ...t, ok: !t.out && t.ratio >= 4.5 });
      for (const o of m.outlines) report.push({ w, state, sel: `${o.id} outline`, ratio: o.ratio, ok: o.ratio >= 3 });
    }
  }
  await width(1440);
  const bad = report.filter((r) => !r.ok);
  assert.deepEqual(bad, [], JSON.stringify(report));
});

test('Focus: the Name input, reached with Tab, draws a 2 px ring in the ink', async () => {
  await width(1440);
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  let n = 0;
  while (n < 30 && (await page.evaluate(() => document.activeElement?.id)) !== 'name') { await page.keyboard.press('Tab'); n++; }
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'name', 'Tab reaches Name');
  // overzicht's reduced-motion rule gives every change a 0.01 ms transition: read it a frame later
  await frames(2);
  const r = await page.locator('#name').evaluate((el) => { const cs = getComputedStyle(el); return { shadow: cs.boxShadow, outline: [cs.outlineStyle, cs.outlineWidth, cs.outlineColor] }; });
  const ring = r.shadow.includes(`${INK} 0px 0px 0px 2px`) || (r.outline[0] !== 'none' && r.outline[1] === '2px' && r.outline[2] === INK);
  assert.ok(ring, JSON.stringify(r));
});

test('Gone: no stamp, no transmittal, no mail line', async () => {
  await width(1440);
  const g = await page.evaluate(() => ({
    stamp: document.querySelectorAll('.stamp').length,
    transmittal: document.querySelectorAll('.transmittal, .sheet-transmittal').length,
    mailLine: document.querySelectorAll('.tm-mail').length,
    text: document.body.innerText,
  }));
  assert.deepEqual([g.stamp, g.transmittal, g.mailLine], [0, 0, 0]);
  assert.doesNotMatch(g.text, /Issued for/i);
  assert.doesNotMatch(g.text, /Prefer your own mail app/);
});
