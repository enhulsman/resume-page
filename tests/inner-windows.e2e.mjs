// The project pages' new windows, in a real browser (openspec stone-inner-pages, chunk 4:
// stone-project-pages "Homelab's window is its own health check", "Finance Bot's window is its reply
// to an upload", "pytaiga-mcp's drawing in a frosted pane", "ANNA's page holds her conversation and
// her levels", "The Homelab page's approved texts"; anna-section "On her page"). Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-windows.e2e.mjs
//
// Test cost: each route loads once per motion setting and is reused across widths with
// setViewportSize. Reduced-motion loads read the finished windows (nothing to wait for); a play loads
// separately with ?speed=10 and waits on state (`done` on the lines, ANNA's `done`, the drawing's
// `drawn` class), never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { projectWindows, annaCalls, annaLevels } from '../src/config/home.ts';
import { annaDemo } from '../src/config/anna-demo.ts';
import { projectLights, benched } from '../src/config/glass.ts';
import { readFrontmatter } from '../src/lib/frontmatter.ts';
import { timeline } from '../src/scripts/glass/anna-window-model.js';

const BASE = process.env.BASE || 'http://localhost:4321';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const HOMELAB = '/projects/HomelabInfrastructure';
const FINANCE = '/projects/FinanceBot';
const PYTAIGA = '/projects/PytaigaMcp';
const ANNA = '/projects/AnnaAssistant';
const HERDR = '/projects/HerdrAndroid';

const TL = timeline({ lines: annaCalls.work.lines, reply: annaDemo.reply });
const END = TL.done;
/** Every beat of ANNA's timeline, as her window's state lists them (the homepage's order). */
const SEEN = ['person', 'answer', 'sources', ...annaCalls.work.lines.slice(1).map((_, i) => `step-${i}`), 'question', 'typing', 'reply', 'result'];

let browser;
before(async () => { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); });

// one context per route, motion setting and query, reused across widths and tests
const pages = new Map();
async function at(path, { width = 1440, height = 900, motion = 'reduce', query = '', js = true } = {}) {
  const key = `${path}?${query}|${motion}|${js}`;
  let p = pages.get(key);
  if (!p) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, javaScriptEnabled: js });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + path + (query ? `?${query}` : ''), { waitUntil: 'load' });
    // without JavaScript the page can run no promise; it is only read
    if (js) {
      await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
    }
    p = { context, page, errors };
    pages.set(key, p);
  } else {
    await p.page.setViewportSize({ width, height });
  }
  if (js) {
    await p.page.evaluate(() => window.scrollTo(0, 0));
    await frames(p.page);
  }
  return p.page;
}
after(async () => {
  const errors = [...pages.values()].flatMap((p) => p.errors);
  for (const { context } of pages.values()) await context.close();
  await browser?.close();
  assert.deepEqual(errors, [], 'no page error on any route');
});

const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
const box = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
async function scrollToY(page, y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await frames(page);
}
async function bringTo(page, sel, y) {
  const top = await page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await scrollToY(page, top - y);
}
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** Every line of a window's play: its computed opacity. */
const opacities = (page, play) => page.locator(`${play} .b`).evaluateAll((bs) => bs.map((b) => getComputedStyle(b).opacity));

/**
 * Text on glass at 4.5:1, measured as on the homepage: every text element of one window in view
 * with its own colour, then the window's text made transparent and the screen captured; each
 * element's lowest contrast against the pixels behind it.
 */
async function windowContrast(page, moment, sels) {
  const W = `[data-glass-moment="${moment}"] [data-glass="frosted"]`;
  await page.locator(W).first().evaluate((w) => w.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await frames(page, 4);
  const items = await page.evaluate(([W, sels]) => {
    const w = document.querySelector(W), wb = w.getBoundingClientRect();
    return sels.flatMap((sel) => [...w.querySelectorAll(sel)].map((el) => {
      const r = el.getBoundingClientRect();
      const inside = r.width > 0 && r.height > 0 && el.textContent.trim() && r.top >= Math.max(0, wb.top) && r.bottom <= Math.min(innerHeight, wb.bottom);
      return inside ? { sel, color: getComputedStyle(el).color, box: { x: r.x, y: r.y, w: r.width, h: r.height } } : null;
    }).filter(Boolean));
  }, [W, sels]);
  const tag = await page.addStyleTag({ content: `${W}, ${W} * { color: transparent !important; text-shadow: none !important; } ${W} .aw-dot { visibility: hidden !important; }` });
  await frames(page, 2);
  const png = (await page.screenshot()).toString('base64');
  await tag.evaluate((t) => t.remove());
  return page.evaluate(async ([png, items]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map(({ sel, color, box }) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      const d = x.getImageData(Math.round(box.x), Math.round(box.y), Math.max(1, Math.round(box.w)), Math.max(1, Math.round(box.h))).data;
      let min = 99;
      for (let i = 0; i < d.length; i += 16) {
        const bg = [d[i], d[i + 1], d[i + 2]];
        const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
        const [hi, lo] = [L(bg), L(fg)].sort((p, q) => q - p);
        min = Math.min(min, (hi + 0.05) / (lo + 0.05));
      }
      return { sel, color, ratio: +min.toFixed(2) };
    });
  }, [png, items]);
}

// ---------- Homelab: its own health check, and its approved texts ----------

const HL = `.art-window[data-glass-moment="homelab"]`;
const HL_PLAY = `${HL} [data-play]`;

test('Homelab: the output verbatim in mono that scales from 12 to 10 px, nothing private, every line at once with reduced motion; the texts verbatim', async () => {
  const page = await at(HOMELAB);
  const w = await page.evaluate((HL) => {
    const win = document.querySelector(HL);
    const play = win.querySelector('[data-play]');
    const cs = getComputedStyle(play);
    return {
      first: win.closest('aside')?.firstElementChild === win,
      frosted: win.querySelectorAll('[data-glass="frosted"]').length,
      title: win.querySelector('.glass-title')?.textContent,
      dots: win.querySelectorAll('.glass-dots i').length,
      glow: win.querySelectorAll('[data-glow]').length,
      size: cs.fontSize, family: cs.fontFamily,
      wrapped: [...play.querySelectorAll('.hl-row .pw-text')].filter((s) => s.getBoundingClientRect().height > parseFloat(getComputedStyle(s).lineHeight) * 1.5).length,
      lines: [...play.querySelectorAll('.b')].map((b) => ({
        cls: b.className, text: b.textContent,
        cells: [...b.querySelectorAll(':scope > span, :scope > b')].map((s) => s.textContent),
        op: getComputedStyle(b).opacity,
      })),
      text: win.textContent,
    };
  }, HL);
  const hl = projectWindows.homelab;
  assert.ok(w.first, 'the window opens the right column');
  assert.equal(w.frosted, 1);
  assert.equal(w.title, 'ezra@workstation: ~');
  assert.equal(w.dots, 3, 'three window dots');
  assert.equal(w.glow, 1, 'its glow beneath');
  assert.ok(parseFloat(w.size) >= 10 && parseFloat(w.size) <= 12, `font-size ${w.size} within 10-12px`);
  if (page.viewportSize().width >= 1440) assert.equal(w.wrapped, 0, 'every row on one line at 1440');
  assert.match(w.family, /mono/i);
  // the command, the heading, then each row: marker | host | text, the spacing inside kept
  assert.equal(w.lines.length, 2 + hl.rows.length);
  assert.deepEqual(w.lines[0].cells, ['$', 'homelab-health']);
  assert.deepEqual([hl.prompt, hl.command, hl.heading], ['$', 'homelab-health', '=== Homelab Health ===']);
  assert.equal(w.lines[1].text, '=== Homelab Health ===');
  assert.deepEqual(w.lines.slice(2).map((l) => l.cells), [
    ['[+]', 'workstation', 'load:0.82  mem:8975/15994MB disk: 41% docker:NA  (this machine)'],
    ['[+]', 'rp5', 'load:1.28  mem:3508/8063MB  disk: 46% docker:19  dns:ok'],
    ['[!]', '', 'hygiene: journal 3686MB'],
    ['[+]', 'vps', 'load:0.43  mem:2039/3819MB  disk: 73% docker:19  dns:ok'],
    ['', '', 'hygiene: ok'],
    ['[+]', 'rp2', 'load:0.37  mem:422/921MB    disk: 73% docker:NA  dns:ok'],
    ['', '', 'hygiene: ok'],
    ['[+]', '', 'Prometheus: all targets up'],
  ]);
  assert.ok(w.lines.every((l) => l.op === '1'), 'reduced motion: every line shows on arrival');
  // at a desktop too, nothing is cut and nothing scrolls inside the window
  const body = await page.locator(HL_PLAY).evaluate((el) => [el.scrollWidth, el.clientWidth]);
  assert.ok(body[0] <= body[1], `the body scrolls at 1440: ${body}`);

  // nothing private, in config and on the page
  for (const text of [JSON.stringify(hl), w.text]) {
    assert.doesNotMatch(text, /\b\d{1,3}(\.\d{1,3}){3}\b/, 'no IPv4 address');
    assert.doesNotMatch(text, /[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,}/i, 'no IPv6 address');
    assert.doesNotMatch(text, /(token|key|secret|password)/i);
    assert.doesNotMatch(text, /\/(etc|home|var|root)\//, 'no internal path');
  }
  assert.deepEqual([...new Set(hl.rows.map((r) => r.host).filter(Boolean))], ['workstation', 'rp5', 'vps', 'rp2']);

  // The texts, verbatim
  const fm = readFrontmatter(read(`src/pages${HOMELAB}.mdx`));
  const DESCRIPTION = 'Three servers and the workstation that runs them: automated cross-device backups, Prometheus monitoring and alerting, recursive DNSSEC resolution, and Cloudflare Zero Trust networking';
  const HOOK = 'A homelab of a Raspberry Pi 5, a Hetzner VPS and a Raspberry Pi 2, run from my workstation: joined by a Tailscale mesh, fronted by Cloudflare tunnels, monitored by Prometheus, and backed up cross-device every night.';
  const WORKSTATION = 'My workstation, a PC I built myself around a Ryzen 7 7800X3D on AM5 with 32 GB of DDR5-6000 and an RTX 2080 Ti, running WSL2, is the fourth machine on the mesh and the one I use most: where I build, and the admin seat that reaches every host and runs the orchestration, from deploys to the scripts and agents I run the lab with.';
  const ONE = 'One command for the whole lab. homelab-health, a script I wrote, checks every machine from the workstation at once: load, memory, disk, containers and DNS, plus slow-burn problems such as a service stuck in a restart loop, and any Prometheus target that is down. An offline host shows as unreachable within ten seconds instead of hanging the check. The restart-loop check exists because a sync service once crash-looped 472,000 times over 110 days without a single alert.';
  assert.equal(fm.description, DESCRIPTION);
  assert.equal(fm.hook, HOOK);
  const t = await page.evaluate(() => ({
    meta: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    lead: document.querySelector('.art-lead')?.textContent,
    prose: document.querySelector('.art .prose').textContent,
    paras: [...document.querySelectorAll('.art .prose p')].map((p) => p.textContent),
    code: [...document.querySelectorAll('.art .prose p code')].map((c) => c.textContent),
  }));
  assert.equal(t.meta, DESCRIPTION);
  assert.equal(t.lead, HOOK);
  assert.ok(norm(t.prose).includes(WORKSTATION), 'the workstation sentence');
  assert.ok(!t.prose.includes('a Ryzen 7 PC running WSL2, is the fourth machine'), 'not the old one');
  const k = t.paras.findIndex((p) => p.startsWith('Monitoring and alerting.'));
  assert.ok(k >= 0, 'the monitoring paragraph');
  assert.equal(norm(t.paras[k + 1]), ONE, 'the new paragraph right after it');
  assert.ok(t.code.includes('homelab-health'), 'the tool set as code');

  const c = await windowContrast(page, 'homelab', ['.glass-title', '.pw-text', '.pw-quiet', '.pw-strong']);
  for (const sel of ['.glass-title', '.pw-text', '.pw-strong']) assert.ok(c.some((x) => x.sel === sel), `${sel} measured`);
  for (const x of c) assert.ok(x.ratio >= 4.5, `Homelab ${x.sel} at ${x.ratio}:1 (${x.color})`);
});

test('Homelab on a phone: the window within 0..390 px, its body never scrolls sideways, nor the page', async () => {
  const page = await at(HOMELAB, { width: 390, height: 844 });
  const b = await box(page, `${HL} [data-glass="frosted"]`);
  assert.ok(b.left >= 0 && b.right <= 390, `the window lies at ${b.left}..${b.right}`);
  const body = await page.locator(HL_PLAY).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, ws: getComputedStyle(el.querySelector('.b')).whiteSpace }));
  assert.ok(body.sw <= body.cw, `the body scrolls: ${body.sw} > ${body.cw}`);
  assert.equal(body.ws, 'pre-wrap', 'its lines may wrap');
  // the empty host column folds away
  const hosts = await page.locator(`${HL} .hl-host`).evaluateAll((hs) => hs.filter((h) => !h.textContent).map((h) => getComputedStyle(h).display));
  assert.ok(hosts.length > 0 && hosts.every((d) => d === 'none'), `the empty host cells: ${hosts}`);
  assert.ok(await sideways(page) <= 0, 'no sideways scroll');
});

// ---------- Finance Bot: its reply to an upload ----------

const FIN = `.art-window[data-glass-moment="finance"]`;
const FIN_PLAY = `${FIN} [data-play]`;
const FINANCE_LINES = [
  'Ezra used /upload asn-export.csv',
  'Finance Bot APP Processing 1 file(s) as upload 20261124-201508-3fa1; progress and the summary follow in your thread #Approvals-Ezra',
  '11/2026: 164 rows written, 2 flagged',
  'Upload 20261124-201508-3fa1: complete',
  '164 rows read from 1 file; 164 new.',
  'Periods:',
  '11/2026: written, 164 rows (151 expenses, 13 income), sheet created, 2 flagged, 0 marked',
  'Flagged rows (the AI guess that was not used):',
  '06-11-2026  18.95  Kruidvat  -> Persoonlijke verzorging (0.61)',
  '13-11-2026  42.50  Bol.com  -> Huishouden (0.68)',
];

test('Finance Bot: the reply verbatim, every line at once with reduced motion, its own light, the summary\'s green bar; the drawing is gone', async () => {
  const page = await at(FINANCE);
  const w = await page.evaluate((FIN) => {
    const win = document.querySelector(FIN);
    const glow = win.querySelector('[data-glow]');
    return {
      first: win.closest('aside')?.firstElementChild === win,
      frosted: win.querySelectorAll('[data-glass="frosted"]').length,
      title: win.querySelector('.glass-title')?.textContent,
      dots: win.querySelectorAll('.glass-dots').length,
      glow: glow ? getComputedStyle(glow).backgroundImage : '',
      lines: [...win.querySelectorAll('[data-play] .b')].map((b) => ({ text: b.textContent, op: getComputedStyle(b).opacity })),
      summary: [...win.querySelectorAll('.dc-em')].map((e) => ({ width: getComputedStyle(e).borderLeftWidth, color: getComputedStyle(e).borderLeftColor, indent: e.classList.contains('ind') })),
      gone: document.querySelectorAll('.dwg, .plate, .dwg-wrap').length,
    };
  }, FIN);
  assert.ok(w.first, 'the window opens the right column');
  assert.equal(w.frosted, 1);
  assert.equal(w.title, 'Discord · #finance');
  assert.equal(w.dots, 0, 'no dots');
  // the lines, word for word, the spacing inside kept
  assert.deepEqual(w.lines.map((l) => l.text.replace(/\s*\n\s*/g, ' ').trim()), FINANCE_LINES);
  assert.ok(w.lines.every((l) => l.op === '1'), 'reduced motion: every line shows on arrival');
  // its own light: Finance Bot's near and deep, not the benched mist
  const rgb = (c) => `rgba(${c.join(', ')}`;
  const { near, deep } = projectLights.finance;
  assert.ok(w.glow.includes(rgb(near)) && w.glow.includes(rgb(deep)), `the glow: ${w.glow}`);
  const mist = benched.find((c) => c.id === 'finance');
  const mistColours = JSON.stringify(mist).match(/\[\d+,\d+,\d+\]/g).map((s) => JSON.parse(s));
  for (const m of mistColours) assert.ok(!w.glow.includes(rgb(m)), `not the mist's ${m}`);
  // the summary: a green bar along its left edge, title and lines
  assert.equal(w.summary.length, 7);
  for (const s of w.summary) {
    assert.ok(parseFloat(s.width) >= 3, `a bar ${s.width} wide`);
    const [r, g, b] = s.color.match(/\d+/g).map(Number);
    assert.ok(g > r + 40 && g > b + 20, `green: ${s.color}`);
  }
  assert.deepEqual(w.summary.map((s) => s.indent), [false, false, false, true, false, true, true]);
  // The drawing is gone
  assert.equal(w.gone, 0, 'no .dwg, .plate or .dwg-wrap');

  const c = await windowContrast(page, 'finance', ['.glass-title', '.pw-text', '.pw-quiet', '.pw-strong']);
  for (const sel of ['.glass-title', '.pw-text', '.pw-quiet', '.pw-strong']) assert.ok(c.some((x) => x.sel === sel), `${sel} measured`);
  for (const x of c) assert.ok(x.ratio >= 4.5, `Finance Bot ${x.sel} at ${x.ratio}:1 (${x.color})`);
});

test('Finance Bot on a phone: an indented line that wraps keeps its indent; no sideways scroll', async () => {
  const page = await at(FINANCE, { width: 390, height: 844 });
  // each line box of the text (a hanging space at a wrap makes a sliver of its own; not a line)
  const lines = await page.locator(`${FIN} .dc-em.ind span`).evaluateAll((ss) => ss.map((s) => [...s.getClientRects()].filter((r) => r.width > 8).map((r) => Math.round(r.left))));
  const wrapped = lines.filter((rs) => rs.length > 1);
  assert.ok(wrapped.length > 0, 'at 390 an indented line wraps');
  for (const rs of wrapped) assert.ok(rs.every((l) => Math.abs(l - rs[0]) <= 1), `each of its lines starts at the indent: ${rs}`);
  const plain = await page.locator(`${FIN} .dc-em:not(.ind):not(.dc-em-t) span`).first().evaluate((s) => s.getBoundingClientRect().left);
  assert.ok(lines[0][0] > plain + 4, 'indented past the plain lines');
  const b = await box(page, `${FIN} [data-glass="frosted"]`);
  assert.ok(b.left >= 0 && b.right <= 390);
  assert.ok(await sideways(page) <= 0, 'no sideways scroll');
});

// ---------- herdr-android: the agent list on a phone ----------

const HD = `.art-window[data-glass-moment="herdr"]`;
const HD_PLAY = `${HD} [data-play]`;

test('herdr-android: a phone of frosted glass with the agent list, verbatim from config, in its own light; every line at once with reduced motion', async () => {
  const page = await at(HERDR);
  const w = await page.evaluate((HD) => {
    const win = document.querySelector(HD);
    const glass = win.querySelector('[data-glass="frosted"]');
    const glow = win.querySelector('[data-glow]');
    const r = glass.getBoundingClientRect();
    return {
      first: win.closest('aside')?.firstElementChild === win,
      frosted: win.querySelectorAll('[data-glass="frosted"]').length,
      title: win.querySelector('.glass-title')?.textContent,
      dots: win.querySelectorAll('.glass-dots').length,
      glow: glow ? getComputedStyle(glow).backgroundImage : '',
      width: r.width, height: r.height, radius: parseFloat(getComputedStyle(glass).borderTopLeftRadius),
      centred: Math.abs((r.left + r.right) / 2 - (win.getBoundingClientRect().left + win.getBoundingClientRect().right) / 2),
      groups: [...win.querySelectorAll('.ag-group')].map((g) => ({
        state: g.dataset.state,
        head: [g.querySelector('.ag-label')?.textContent, g.querySelector('.ag-count')?.textContent],
        rows: [...g.querySelectorAll('.ag-row')].map((row) => ({
          title: row.querySelector('.ag-title')?.textContent, where: row.querySelector('.ag-where')?.textContent,
          age: row.querySelector('.ag-age')?.textContent, kind: row.querySelector('.ag-kind')?.textContent ?? null,
          ask: row.querySelector('.ag-ask')?.textContent ?? null, askFamily: row.querySelector('.ag-ask') ? getComputedStyle(row.querySelector('.ag-ask')).fontFamily : null,
          marks: row.querySelectorAll('.ag-mark[aria-hidden="true"]').length,
        })),
      })),
      ops: [...win.querySelectorAll('[data-play] .b')].map((b) => getComputedStyle(b).opacity),
      images: win.querySelectorAll('img').length,
    };
  }, HD);
  const h = projectWindows.herdr;
  assert.ok(w.first, 'the window opens the right column');
  assert.equal(w.frosted, 1);
  assert.equal(w.title, 'Agents');
  assert.equal(w.dots, 0, 'a phone has no window dots');
  // a phone: narrow, upright, well rounded, centred in its column
  assert.ok(w.width >= 260 && w.width <= 340, `as wide as a phone: ${w.width}`);
  assert.ok(w.height >= w.width * 1.5, `upright: ${w.width} x ${w.height}`);
  assert.ok(w.radius >= 28, `rounded like a phone: ${w.radius}`);
  assert.ok(w.centred <= 1, 'centred in the column');
  // the list, word for word from config: each group its label and count, each agent its row
  assert.deepEqual(w.groups.map((g) => g.state), h.groups.map((g) => g.state));
  assert.deepEqual(w.groups.map((g) => g.head), h.groups.map((g) => [g.label, String(g.rows.length)]));
  assert.deepEqual(w.groups.flatMap((g) => g.rows.map((r) => [r.title, r.where, r.age, r.kind, r.ask])),
    h.groups.flatMap((g) => g.rows.map((r) => [r.title, r.where, r.age, r.kind ?? null, r.ask ?? null])));
  const needs = w.groups[0].rows[0];
  assert.match(needs.askFamily, /mono/i, 'the request in terminal type');
  for (const r of w.groups.flatMap((g) => g.rows)) assert.equal(r.marks, 1, `${r.title}: one status mark, hidden from readers`);
  assert.equal(w.ops.length, 7, 'three headings and four agents');
  assert.ok(w.ops.every((o) => o === '1'), 'reduced motion: every line shows on arrival');
  assert.equal(w.images, 0, 'drawn in the page, not a screenshot');
  // its own light
  const rgb = (c) => `rgba(${c.join(', ')}`;
  const { near, deep } = projectLights.herdr;
  assert.ok(w.glow.includes(rgb(near)) && w.glow.includes(rgb(deep)), `the glow: ${w.glow}`);

  const c = await windowContrast(page, 'herdr', ['.glass-title', '.pw-text', '.pw-quiet', '.pw-strong']);
  for (const sel of ['.glass-title', '.pw-text', '.pw-quiet', '.pw-strong']) assert.ok(c.some((x) => x.sel === sel), `${sel} measured`);
  for (const x of c) assert.ok(x.ratio >= 4.5, `herdr-android ${x.sel} at ${x.ratio}:1 (${x.color})`);
});

test('herdr-android on a phone: the window within 0..390 px, no title cut, no sideways scroll', async () => {
  const page = await at(HERDR, { width: 390, height: 844 });
  const b = await box(page, `${HD} [data-glass="frosted"]`);
  assert.ok(b.left >= 0 && b.right <= 390, `${b.left}..${b.right}`);
  const over = await page.locator(`${HD} .ag-title, ${HD} .ag-where, ${HD} .ag-ask`).evaluateAll((es) => es.map((e) => e.scrollWidth - e.clientWidth));
  assert.ok(over.every((o) => o <= 0), `no text cut: ${over}`);
  assert.ok(await sideways(page) <= 0, 'no sideways scroll');
});

// ---------- Homelab and Finance Bot: still without JavaScript; the lines land once ----------

test('Still and without JavaScript: Homelab\'s and Finance Bot\'s lines all show', async () => {
  for (const [route, play, n] of [[HOMELAB, HL_PLAY, 10], [FINANCE, FIN_PLAY, 10], [HERDR, HD_PLAY, 7]]) {
    const page = await at(route, { js: false, motion: 'no-preference' });
    const ops = await opacities(page, play);
    assert.ok(ops.length >= n, `${route}: ${ops.length} lines`);
    assert.ok(ops.every((o) => o === '1'), `${route}: every line shows without JavaScript`);
  }
});

for (const [name, route, play] of [['Finance Bot', FINANCE, FIN_PLAY], ['Homelab', HOMELAB, HL_PLAY]]) {
  test(`The lines land once: ${name}'s window, not yet half in view at 390, lands when it is and stays`, async () => {
    // a short screen, so the window is not yet half in view under the head
    const page = await at(route, { width: 390, height: 480, motion: 'no-preference', query: 'speed=10' });
    const visible = await page.locator(play).evaluate((el) => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height; });
    assert.ok(visible < 0.5, `the window starts less than half in view (${visible.toFixed(2)})`);
    assert.ok((await opacities(page, play)).every((o) => o === '0'), 'before, its lines are hidden');
    await bringTo(page, play, 20);
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      return el.classList.contains('done') && [...el.querySelectorAll('.b')].every((b) => getComputedStyle(b).opacity === '1');
    }, play);
    await scrollToY(page, 0);
    await bringTo(page, play, 20);
    assert.ok((await opacities(page, play)).every((o) => o === '1'), 'scrolling away and back hides none');
  });
}

// ---------- pytaiga-mcp: its drawing in a frosted pane ----------

const PT = `.art-window[data-glass-moment="pytaiga"]`;

test('pytaiga-mcp: the pane opens the right column, titled, its drawing with its own defs, plotted on arrival with reduced motion, no paper halo', async () => {
  const page = await at(PYTAIGA);
  const p = await page.evaluate((PT) => {
    const win = document.querySelector(PT);
    const pane = win.querySelector('[data-glass="frosted"]');
    const svg = pane?.querySelector('svg.dwg');
    const hatch = document.getElementById('hatch'), arrow = document.getElementById('arrow');
    const paths = [...(svg?.querySelectorAll('path') ?? [])];
    return {
      first: win.closest('aside')?.firstElementChild === win,
      frosted: win.querySelectorAll('[data-glass="frosted"]').length,
      title: pane?.querySelector('.glass-title')?.textContent,
      dots: pane?.querySelectorAll('.glass-dots i').length,
      dwg: pane?.querySelectorAll('svg.dwg').length,
      glow: win.querySelectorAll('[data-glow]').length,
      defs: [hatch?.tagName, arrow?.tagName, !!hatch && win.contains(hatch), !!arrow && win.contains(arrow)],
      drawn: svg?.classList.contains('drawn'),
      offsets: paths.map((q) => parseFloat(getComputedStyle(q).strokeDashoffset) || 0),
      running: document.getAnimations().filter((a) => svg?.contains(a.effect?.target)).length,
      halo: [...(svg?.querySelectorAll('.lbl text') ?? [])].map((t) => getComputedStyle(t).stroke),
    };
  }, PT);
  const fm = readFrontmatter(read(`src/pages${PYTAIGA}.mdx`));
  assert.ok(p.first, 'the pane opens the right column');
  assert.equal(p.frosted, 1);
  assert.equal(p.title, fm.title);
  assert.equal(p.title, 'pytaiga-mcp');
  assert.equal(p.dots, 3, 'window dots');
  assert.equal(p.dwg, 1, 'one svg.dwg');
  assert.equal(p.glow, 1, 'a glow beneath');
  assert.deepEqual(p.defs, ['pattern', 'marker', true, true], 'url(#hatch) and url(#arrow) resolve inside the pane');
  assert.equal(p.drawn, true, 'drawn on arrival');
  assert.ok(p.offsets.length > 0 && p.offsets.every((o) => o === 0), `every path at 0: ${p.offsets}`);
  assert.equal(p.running, 0, 'no transition runs');
  assert.ok(p.halo.length > 0 && p.halo.every((s) => s === 'none'), `no paper halo: ${p.halo}`);
});

test('pytaiga-mcp: plotted when it comes into view', async () => {
  const page = await at(PYTAIGA, { width: 390, height: 600, motion: 'no-preference' });
  await page.locator(`${PT} svg.dwg`).evaluate((s) => s.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction((sel) => {
    const svg = document.querySelector(sel);
    return svg.classList.contains('drawn') && [...svg.querySelectorAll('path')].every((q) => (parseFloat(getComputedStyle(q).strokeDashoffset) || 0) === 0);
  }, `${PT} svg.dwg`, { timeout: 10000 });
});

test('pytaiga-mcp: it fits, at 390 and at 1000', async () => {
  for (const [width, height] of [[390, 844], [1000, 900]]) {
    const page = await at(PYTAIGA, { width, height });
    const pane = await box(page, `${PT} [data-glass="frosted"]`);
    const svg = await box(page, `${PT} svg.dwg`);
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    assert.ok(svg.left >= pane.left - 0.5 && svg.right <= pane.right + 0.5 && svg.top >= pane.top - 0.5 && svg.bottom <= pane.bottom + 0.5, `${width}: the drawing inside its pane`);
    assert.ok(pane.left >= 0 && pane.right <= vw + 0.5, `${width}: the pane within the viewport (${pane.left}..${pane.right})`);
    assert.ok(await sideways(page) <= 0, `${width}: no sideways scroll`);
  }
});

// ---------- ANNA's page: her conversation and her levels ----------

const AW = '.art-window[data-glass-moment="anna"]';

test('ANNA\'s page: window and levels; on her page the same four rows stand under her window; no canvas, no plate', async () => {
  const page = await at(ANNA, { motion: 'no-preference', query: `chat=${END}` });
  // held at the end: every beat lands at once (its fade is the only motion)
  await page.waitForFunction((AW) => [...document.querySelectorAll(`${AW} [data-beat]`)].every((b) => getComputedStyle(b).opacity === '1'), AW);
  const a = await page.evaluate((AW) => {
    const win = document.querySelector(AW);
    const glass = win.querySelector('[data-glass="frosted"]');
    const levels = win.querySelector('.anna-levels');
    return {
      first: win.closest('aside')?.firstElementChild === win,
      frosted: win.querySelectorAll('[data-glass="frosted"]').length,
      title: glass?.querySelector('.glass-title')?.textContent,
      beats: [...glass.querySelectorAll('[data-beat]')].map((b) => ({ id: b.dataset.beat, on: b.classList.contains('on'), op: getComputedStyle(b).opacity })),
      levels: [...(levels?.querySelectorAll(':scope > li') ?? [])].map((li) => [li.querySelector('b')?.textContent, li.querySelector('span')?.textContent]),
      under: levels ? levels.getBoundingClientRect().top >= glass.getBoundingClientRect().bottom : false,
      levelGlass: levels ? levels.querySelectorAll('[data-glass], canvas').length : -1,
      canvas: document.querySelectorAll('main canvas').length,
      plate: document.querySelectorAll('.plate, .anna-plate').length,
    };
  }, AW);
  assert.ok(a.first, 'the window opens the right column');
  assert.equal(a.frosted, 1);
  assert.equal(a.title, annaCalls.window);
  assert.deepEqual(a.beats.map((b) => b.id), ['person', 'answer', 'sources', 'question', 'reply', 'result']);
  assert.ok(a.beats.every((b) => b.on && b.op === '1'), 'every beat shows');
  assert.deepEqual(a.levels.map((l) => l[0]), ['Identity', 'Claude', 'MCP connectors', 'Operations']);
  assert.deepEqual(a.levels, annaLevels.map((l) => [l.name, l.text]));
  assert.ok(a.under, 'the levels under her window');
  assert.equal(a.levelGlass, 0, 'the levels are type on stone');
  assert.equal(a.canvas, 0, 'no canvas in main');
  assert.equal(a.plate, 0, 'no plate');
});

test('ANNA\'s page: it plays once at ?speed=10, in timeline order; Replay plays it again from the start', async () => {
  const page = await at(ANNA, { motion: 'no-preference', query: 'speed=10' });
  const state = () => page.evaluate(() => window.__annaWindow.state());
  await page.locator(`${AW} .aw-window`).evaluate((w) => w.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(() => window.__annaWindow.state().done, null, { timeout: 20000 });
  assert.deepEqual((await state()).seen, SEEN);
  assert.equal(await page.isVisible(`${AW} .aw-replay`), true, 'Replay is shown');
  await page.click(`${AW} .aw-replay`);
  const again = await state();
  assert.equal(again.done, false, 'playing again');
  assert.ok(again.t < 3, `from the start: ${again.t}`);
  await page.waitForFunction(() => window.__annaWindow.state().done, null, { timeout: 20000 });
  assert.deepEqual((await state()).seen, SEEN);
});

test('ANNA\'s page: still on request; the finished conversation at once, no Replay', async () => {
  const page = await at(ANNA);
  await page.locator(`${AW} .aw-window`).evaluate((w) => w.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await frames(page);
  const ops = await page.locator(`${AW} [data-beat]`).evaluateAll((bs) => bs.map((b) => getComputedStyle(b).opacity));
  assert.ok(ops.length === 6 && ops.every((o) => o === '1'), `every beat at once: ${ops}`);
  assert.equal((await page.evaluate(() => window.__annaWindow.state())).done, true);
  assert.equal(await page.isVisible(`${AW} .aw-replay`), false, 'no Replay');

  const c = await windowContrast(page, 'anna', ['.glass-title', '.msg .who', '.msg .text', '.aw-work-t']);
  for (const sel of ['.glass-title', '.msg .text', '.aw-work-t']) assert.ok(c.some((x) => x.sel === sel), `${sel} measured`);
  for (const x of c) assert.ok(x.ratio >= 4.5, `ANNA ${x.sel} at ${x.ratio}:1 (${x.color})`);
});

test('ANNA\'s page on a phone: the window under the lead, the levels under the window, each name above its text', async () => {
  const page = await at(ANNA, { width: 390, height: 844 });
  const lead = await box(page, '.art-lead');
  const win = await box(page, `${AW} [data-glass="frosted"]`);
  const levels = await box(page, `${AW} .anna-levels`);
  assert.ok(win.top >= lead.bottom, 'the window below the lead');
  assert.ok(levels.top >= win.bottom, 'the levels below the window');
  const rows = await page.locator(`${AW} .anna-levels > li`).evaluateAll((lis) => lis.map((li) => {
    const n = li.querySelector('b').getBoundingClientRect(), t = li.querySelector('span').getBoundingClientRect();
    return { above: n.bottom <= t.top + 1, oneColumn: Math.abs(n.left - t.left) <= 1 };
  }));
  assert.equal(rows.length, 4);
  for (const r of rows) assert.deepEqual(r, { above: true, oneColumn: true });
  assert.ok(await sideways(page) <= 0, 'no sideways scroll');
});
