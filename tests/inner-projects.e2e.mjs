// /projects in stone, in a real browser (openspec stone-inner-pages, chunk 9: stone-projects-index,
// I2e with its three fixes; anna-section "On /projects"): the header, ANNA's lead with her window and
// her four levels, one ribbed card per project under its group, and "Made for fun". Needs a running
// site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-projects.e2e.mjs
//
// Test cost: three loads in all. /projects loads once with reduced motion (every window finished,
// the lights still, ANNA held at her end with ?chat=) and is reused across widths with
// setViewportSize for the layout, the cards' contents, the still frame and the contrast across the
// loop (__glass.at(t), one screenshot per moment and width). One load runs the loop (?guard=off,
// WebGL contexts counted) for "One context, and only what shows"; one has no WebGL. Waits are on
// state (__glassReady, frames), never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { glassCards, hueInk } from '../src/config/glass.ts';
import { annaLevels, annaCalls, details as detailListings, groups, register as registerListings } from '../src/config/home.ts';
import { annaDemo } from '../src/config/anna-demo.ts';
import { pageWords } from '../src/config/pages.ts';
import { buildProjects } from '../src/lib/projects.ts';
import { readFrontmatter } from '../src/lib/frontmatter.ts';
import { timeline } from '../src/scripts/glass/anna-window-model.js';
import site from '../src/config/site.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const PROJECT_FILES = readdirSync(new URL('src/pages/projects/', root)).filter((f) => f.endsWith('.mdx'));
const { annaLead, details, register } = buildProjects(Object.fromEntries(PROJECT_FILES.map((f) => [`/src/pages/projects/${f}`, read(`src/pages/projects/${f}`)])));
const norm = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const END = timeline({ lines: annaCalls.work.lines, reply: annaDemo.reply }).done;

const LEAD = '.pi-lead';
const AW = `${LEAD} [data-glass-moment="anna"]`;
const CARD = '[data-glass-moment="project-cards"] .pc';
const TEXTS = ['.pc-title', '.pc-idx', '.pc-status', '.pc-intro', '.pc-nums dt', '.pc-nums dd'];

/** Count every canvas that got a WebGL context, before any page script runs. */
function countGL() {
  const orig = HTMLCanvasElement.prototype.getContext;
  const gl = new Set();
  window.__glCanvases = gl;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    const ctx = orig.call(this, kind, ...rest);
    if (ctx && /webgl/i.test(kind)) gl.add(this);
    return ctx;
  };
}
/** A browser without WebGL: both getContext('webgl2') and getContext('webgl') give null. */
function noGL() {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    return /webgl/i.test(kind) ? null : orig.call(this, kind, ...rest);
  };
}

let browser;
const loads = [];
async function load(query, { motion = 'reduce', init = [], ready = true, scale = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: motion, deviceScaleFactor: scale });
  for (const s of init) await context.addInitScript(s);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${BASE}/projects${query}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  if (ready) await page.waitForFunction(() => window.__glassReady === true);
  loads.push({ context, errors });
  return page;
}

// the reduced-motion load, shared by every test that reads the page's still state
let still;
before(async () => {
  browser = await chromium.launch();
  still = await load(`?chat=${END}`);
});
after(async () => {
  const errors = loads.flatMap((l) => l.errors);
  for (const { context } of loads) await context.close();
  await browser?.close();
  assert.deepEqual(errors, [], 'no error on any load of /projects');
});

const frames = (page, n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
async function width(page, w, h = w <= 400 ? 844 : 900) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames(page, 3);
}
const box = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Every listing in its group, as /projects shows them: `details` then `register`, in home.ts order. */
const GROUPS = groups.map((g) => ({
  label: g.label,
  items: [
    ...details.filter((d) => d.group === g.id).map((d) => ({ id: d.id, title: d.title, href: d.href })),
    ...register.filter((r) => r.group === g.id).map((r) => ({ id: r.id, title: r.title, href: r.href })),
  ],
}));

// ---------- stone-projects-index: /projects in order ----------

test('The order: "Projects", "ANNA", "Running", "Paused", "Done", "Made for fun"', async () => {
  await width(still, 1440);
  const heads = await still.$$eval('main h1, main h2', (hs) => hs.map((h) => [h.tagName, h.textContent.replace(/\s+/g, ' ').trim()]));
  assert.deepEqual(heads, [['H1', 'Projects'], ['H2', 'ANNA'], ['H2', 'Running'], ['H2', 'Paused'], ['H2', 'Done'], ['H2', 'Made for fun']]);
  const line = await still.$eval('main h1', (h) => h.nextElementSibling?.textContent.trim());
  assert.equal(line, 'Detailed write-ups for selected work.');
  assert.equal(line, pageWords.projects.line);
});

test('Every project once, in its group: each card links to its project page; ANNA has no card', async () => {
  const shown = await still.$$eval('.pi-group', (gs) => gs.map((g) => ({
    label: g.querySelector('h2').textContent.trim(),
    items: [...g.querySelectorAll('.pc')].map((c) => ({ tag: c.tagName, title: c.querySelector('.pc-title').textContent.trim(), href: c.getAttribute('href') })),
  })));
  assert.deepEqual(shown.map((g) => g.label), ['Running', 'Paused', 'Done']);
  assert.deepEqual(shown.map((g) => g.items.map((i) => i.title)), [
    ['Henk, homelab agent', 'Finance Bot', 'Homelab infrastructure', 'This site'],
    ['bible-tui', 'Encrypted Chat TUI'],
    ['pytaiga-mcp', 'Claude Sandbox'],
  ]);
  assert.deepEqual(shown.map((g) => g.items.map(({ title, href }) => ({ title, href }))), GROUPS.map((g) => g.items.map(({ title, href }) => ({ title, href }))));
  const all = shown.flatMap((g) => g.items);
  assert.ok(all.every((i) => i.tag === 'A'), 'each card is one link');
  // every project page except ANNA's, each exactly once
  const pages = PROJECT_FILES.map((f) => `/projects/${f.slice(0, -4)}`).filter((h) => h !== annaLead.href).sort();
  assert.deepEqual(all.map((i) => i.href).sort(), pages);
  assert.equal(await still.locator(`.pc[href="${annaLead.href}"]`).count(), 0, 'ANNA has no card');
  assert.equal(await still.locator(CARD).count(), detailListings.length + registerListings.length);
});

test('Made for fun: the last section lists every side piece as a link reading its address, beside its line', async () => {
  const s = await still.evaluate(() => {
    const sections = [...document.querySelectorAll('.pi > section')];
    const last = sections.at(-1);
    return {
      heading: last.querySelector('h2').textContent.trim(),
      last: last.classList.contains('pi-side') && !last.nextElementSibling,
      rows: [...last.querySelectorAll('li')].map((li) => ({ text: li.querySelector('a').textContent.trim(), href: li.querySelector('a').getAttribute('href'), line: li.querySelector('a').nextElementSibling?.textContent.trim() })),
      body: document.body.textContent,
    };
  });
  assert.equal(s.heading, 'Made for fun');
  assert.equal(s.heading, pageWords.projects.madeForFun);
  assert.ok(s.last, '"Made for fun" ends the page');
  assert.deepEqual(s.rows, site.sidePieces.map((p) => ({ text: p.url.replace('https://', ''), href: p.url, line: p.line })));
  assert.ok(!s.body.includes('Other sheets, drawn for fun'));
});

// ---------- stone-projects-index: ANNA leads in her window; anna-section "On /projects" ----------

test('The lead: "01" in her hue, her name to her page, her text, status and "Case study", the four rows, her window to their right', async () => {
  await width(still, 1440);
  const a = await still.evaluate(([LEAD, AW]) => {
    const lead = document.querySelector(LEAD);
    const idx = lead.querySelector('.pi-idx');
    const name = lead.querySelector('h2 a');
    const levels = lead.querySelector('.anna-levels');
    const win = document.querySelector(AW);
    const glass = win?.querySelector('[data-glass="frosted"]');
    const more = [...lead.querySelectorAll('a')].find((x) => x.textContent.trim() === 'Case study');
    return {
      idx: idx?.textContent.trim(), idxColor: idx && getComputedStyle(idx).color,
      name: name && [name.textContent.trim(), name.getAttribute('href')],
      text: lead.querySelector('.pi-lead-line')?.textContent.trim(),
      status: lead.querySelector('.pi-status')?.textContent.trim(),
      more: more?.getAttribute('href'),
      rows: [...(levels?.querySelectorAll(':scope > li') ?? [])].map((li) => [li.querySelector('b')?.textContent, li.querySelector('span')?.textContent]),
      windows: lead.querySelectorAll('[data-glass="frosted"]').length,
      inLead: !!win && lead.contains(win),
      title: glass?.querySelector('.glass-title')?.textContent.trim(),
      beats: [...(glass?.querySelectorAll('[data-beat]') ?? [])].map((b) => ({ on: b.classList.contains('on'), op: getComputedStyle(b).opacity })),
      right: levels && glass ? glass.getBoundingClientRect().left >= levels.getBoundingClientRect().right : false,
      plate: lead.querySelectorAll('.plate, .plate-stage, .anna-plate, canvas').length,
    };
  }, [LEAD, AW]);
  assert.equal(a.idx, '01');
  assert.equal(a.idxColor.replace(/,\s*/g, ' '), hueInk(glassCards.find((c) => c.id === 'anna')), 'her index in her card\'s hue ink');
  assert.deepEqual(a.name, ['ANNA', '/projects/AnnaAssistant']);
  assert.equal(a.text, annaLead.text);
  assert.equal(a.status, annaLead.status);
  assert.equal(a.more, annaLead.href);
  assert.deepEqual(a.rows.map((r) => r[0]), ['Identity', 'Claude', 'MCP connectors', 'Operations']);
  assert.deepEqual(a.rows, annaLevels.map((l) => [l.name, l.text]));
  assert.ok(a.inLead, 'her window is part of the lead');
  assert.equal(a.windows, 1, 'one frosted window');
  assert.equal(a.title, annaCalls.window);
  assert.equal(a.beats.length, 6);
  assert.ok(a.beats.every((b) => b.on && b.op === '1'), 'every beat shows');
  assert.ok(a.right, 'the window stands to the right of the levels');
  assert.equal(a.plate, 0, 'no plate, no plate stage, no canvas in the lead');
});

test('On /projects (anna-section): four rows under her lead text, named in order, no glass, canvas or plate around them', async () => {
  const l = await still.evaluate((LEAD) => {
    const lead = document.querySelector(LEAD);
    const levels = lead.querySelector('.anna-levels');
    const text = lead.querySelector('.pi-lead-line');
    return {
      names: [...levels.querySelectorAll(':scope > li > b')].map((b) => b.textContent),
      texts: [...levels.querySelectorAll(':scope > li > span')].map((s) => s.textContent),
      under: levels.getBoundingClientRect().top >= text.getBoundingClientRect().bottom,
      around: !!levels.closest('[data-glass], [data-glass-moment], .plate, .anna-plate'),
      inside: levels.querySelectorAll('[data-glass], canvas, .plate').length,
    };
  }, LEAD);
  assert.deepEqual(l.names, ['Identity', 'Claude', 'MCP connectors', 'Operations']);
  assert.deepEqual(l.texts, annaLevels.map((x) => x.text));
  assert.ok(l.under, 'under her text');
  assert.equal(l.around, false, 'no glass or plate around them');
  assert.equal(l.inside, 0, 'no glass or canvas in them');
});

// ---------- stone-projects-index: each project is one piece of ribbed glass ----------

test('A card\'s contents: Henk\'s link holds its title, "02", status, text and two figures; This site\'s its hook and no figures', async () => {
  await width(still, 1440);
  const read_ = (href) => still.$eval(`.pc[href="${href}"]`, (c) => ({
    tag: c.tagName,
    title: c.querySelector('.pc-title')?.textContent.trim(), titleTag: c.querySelector('.pc-title')?.tagName,
    idx: c.querySelector('.pc-idx')?.textContent.trim() ?? null,
    status: c.querySelector('.pc-status')?.textContent.trim(),
    intro: c.querySelector('.pc-intro')?.textContent.trim(),
    nums: [...c.querySelectorAll('.pc-nums > div')].map((d) => [d.querySelector('dt').textContent.trim(), d.querySelector('dd').textContent.trim()]),
    canvases: [...c.querySelectorAll('canvas')].map((cv) => cv.getAttribute('aria-hidden') === 'true' || !!cv.closest('[aria-hidden="true"]')),
  }));
  const henk = details.find((d) => d.id === 'henk');
  const h = await read_('/projects/Henk');
  assert.equal(h.tag, 'A');
  assert.equal(h.title, 'Henk, homelab agent');
  assert.equal(h.titleTag, 'H3');
  assert.equal(h.idx, '02');
  assert.equal(h.status, henk.status);
  assert.equal(h.intro, henk.text);
  assert.deepEqual(h.nums, [['4', henk.dims[0].label], ['3,660', henk.dims[1].label]]);
  assert.ok(h.canvases.length >= 1 && h.canvases.every(Boolean), 'every canvas is hidden from readers');
  const site_ = register.find((r) => r.href === '/projects/ResumePage');
  const s = await read_('/projects/ResumePage');
  assert.equal(s.title, 'This site');
  assert.equal(s.idx, null, 'no card index');
  assert.equal(s.status, site_.status);
  // the approved hook of ResumePage.mdx, verbatim
  const HOOK = 'A static-first portfolio at hulsman.dev, built with Astro: plain stone, glass only where something sits behind it, and a fully interactive terminal on the homepage.';
  assert.equal(s.intro, HOOK);
  assert.equal(readFrontmatter(read('src/pages/projects/ResumePage.mdx')).hook, HOOK, 'read from the page\'s hook');
  assert.deepEqual(s.nums, [], 'no figures');
  // Encrypted Chat TUI's intro is its one line
  const chat = await read_('/projects/EncryptedChatTUI');
  assert.equal(chat.intro, register.find((r) => r.id === 'chat').what);
  assert.deepEqual(chat.nums, []);
});

test('The text column: 60% of the card at 1440; the light\'s pane starts at the card\'s middle', async () => {
  await width(still, 1440);
  const m = await still.$$eval(CARD, (cs) => cs.map((c) => {
    const cb = c.getBoundingClientRect(), t = c.querySelector('.pc-text').getBoundingClientRect(), l = c.querySelector('.pc-light').getBoundingClientRect();
    return { href: c.getAttribute('href'), share: t.width / cb.width, textLeft: t.left - cb.left, lightAt: (l.left - cb.left) / cb.width, lightEnd: l.right - cb.right };
  }));
  assert.equal(m.length, 8);
  for (const x of m) {
    assert.ok(Math.abs(x.share - 0.6) <= 0.01, `${x.href}: text column ${(x.share * 100).toFixed(1)}%`);
    assert.ok(Math.abs(x.textLeft) <= 0.5, `${x.href}: the text column starts at the card's edge`);
    assert.ok(Math.abs(x.lightAt - 0.5) <= 0.005, `${x.href}: light pane starts at ${(x.lightAt * 100).toFixed(1)}%`);
    assert.ok(Math.abs(x.lightEnd) <= 0.5, `${x.href}: and runs to the card's right edge`);
  }
});

test('Still on request: with reduced motion a card holds one frame for 30 frames, and a hovered card does not move', async () => {
  await width(still, 1440);
  const sel = `${CARD}[href="/projects/Henk"]`;
  await still.locator(sel).evaluate((c) => c.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await frames(still, 2);
  const shot = () => still.$$eval(`${sel} canvas`, (cs) => cs.map((c) => c.toDataURL()));
  const a = await shot();
  await frames(still, 30);
  const b = await shot();
  assert.ok(a.length >= 3);
  a.forEach((x, i) => assert.equal(x, b[i], `pane ${i + 1} moved`));
  const before = await box(still, sel);
  await still.hover(sel);
  await frames(still, 3);
  const after_ = await box(still, sel);
  const transform = await still.$eval(sel, (c) => getComputedStyle(c).transform);
  await still.mouse.move(0, 0);
  assert.equal(after_.top, before.top, 'the hovered card stays put');
  assert.equal(transform, 'none');
});

// (the tests that end at 390 come last among the still page's layout checks: each width change on
// /projects redraws every pane, so the page changes width as few times as it can)
test('Two per row, then one: at 1440 and 999 two cards share each row; at 390 one, as wide as the column, within the screen', async () => {
  const rows = () => still.$$eval('.pi-group .pi-cards', (uls) => uls.map((ul) => ({
    col: ul.getBoundingClientRect().width,
    cards: [...ul.querySelectorAll(':scope > li > .pc')].map((c) => { const r = c.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: r.left, right: r.right, width: r.width }; }),
  })));
  for (const w of [1440, 999]) {
    await width(still, w);
    for (const g of await rows()) {
      for (let i = 0; i < g.cards.length; i += 2) {
        const pair = g.cards.slice(i, i + 2);
        if (pair.length === 2) {
          assert.equal(pair[0].top, pair[1].top, `${w}: cards ${i + 1} and ${i + 2} share a row`);
          assert.ok(pair[1].left > pair[0].right, `${w}: side by side`);
        }
        if (g.cards[i + 2]) assert.ok(g.cards[i + 2].top > pair[0].top, `${w}: a third card starts a new row`);
      }
    }
  }
  await width(still, 390);
  for (const g of await rows()) {
    const tops = g.cards.map((c) => c.top);
    assert.equal(new Set(tops).size, tops.length, '390: one card per row');
    for (const c of g.cards) {
      assert.ok(Math.abs(c.width - g.col) <= 1, `390: card ${c.width} as wide as the column ${g.col}`);
      assert.ok(c.left >= 0 && c.right <= 390, `390: card spans ${c.left}..${c.right}`);
    }
  }
  assert.ok(await sideways(still) <= 0, 'no sideways scroll');
});

test('The light keeps its band on a phone: as wide as the card, 300 px tall, at its bottom; the text ends 84 px above it', async () => {
  await width(still, 390);
  const m = await still.$$eval(CARD, (cs, TEXTS) => cs.map((c) => {
    const cb = c.getBoundingClientRect(), band = c.querySelector('.pc-band').getBoundingClientRect();
    const lowest = Math.max(...TEXTS.flatMap((s) => [...c.querySelectorAll(s)]).map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => r.bottom));
    return { href: c.getAttribute('href'), w: band.width, cw: cb.width, h: band.height, gap: cb.bottom - band.bottom, left: band.left - cb.left, clear: cb.bottom - lowest };
  }), TEXTS);
  for (const x of m) {
    assert.ok(Math.abs(x.w - x.cw) <= 0.5 && Math.abs(x.left) <= 0.5, `${x.href}: band ${x.w} wide, card ${x.cw}`);
    assert.ok(Math.abs(x.h - 300) <= 0.5, `${x.href}: band ${x.h} px tall`);
    assert.ok(Math.abs(x.gap) <= 0.5, `${x.href}: band bottom ${x.gap} px off the card's bottom`);
    assert.ok(x.clear >= 83.5, `${x.href}: the lowest text ends ${x.clear.toFixed(1)} px above the bottom`);
  }
});

test('On a phone (lead): the window after the levels, within 0..390, no sideways scroll', async () => {
  await width(still, 390);
  const levels = await box(still, `${LEAD} .anna-levels`);
  const win = await box(still, `${AW} [data-glass="frosted"]`);
  assert.ok(win.top >= levels.bottom, `window top ${win.top} under the levels' bottom ${levels.bottom}`);
  assert.ok(win.left >= 0 && win.right <= 390, `window spans ${win.left}..${win.right}`);
  assert.ok(await sideways(still) <= 0, 'no sideways scroll');
});

// ---------- stone-projects-index: every word on a card reads at 4.5:1 ----------

/**
 * The cards' text against the light at seven moments of the loop: every card's text made
 * transparent, the light drawn at each moment (__glass.at(t); under reduced motion nothing redraws
 * it in between), and each text element's lowest contrast against the pixels behind it. The cards
 * are captured in a few tall slices per moment (a viewport as tall as the page renders blank past
 * the GPU's texture size), each card wholly inside one slice.
 */
const SLICE = 2400;
/** The viewport made SLICE tall at width w, and the cards packed into slices below the bar, each card wholly in one. */
async function cardSlices(page, w) {
  await page.setViewportSize({ width: w, height: SLICE });
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames(page, 3);
  const { cards, bar } = await page.evaluate((CARD) => ({
    cards: [...document.querySelectorAll(CARD)].map((c) => { const r = c.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; }),
    bar: document.querySelector('.bar').getBoundingClientRect().bottom,
  }), CARD);
  const slices = [];
  for (const [ci, c] of cards.entries()) {
    const last = slices.at(-1);
    if (last && c.bottom - last.top <= SLICE - bar - 16) { last.bottom = c.bottom; last.cards.push(ci); } else slices.push({ top: c.top, bottom: c.bottom, cards: [ci] });
  }
  return { bar, slices };
}
/** One slice in view and captured (only its cards' rows): the PNG and the page y of its top edge. */
async function shootSlice(page, w, bar, sl) {
  const y = await page.evaluate((y) => { window.scrollTo(0, y); return scrollY; }, sl.top - bar - 8);
  await frames(page, 2);
  const png = (await page.screenshot({ clip: { x: 0, y: sl.top - y, width: w, height: sl.bottom - sl.top } })).toString('base64');
  return { png, y0: sl.top };
}
async function acrossTheLoop(page, w) {
  const { bar, slices } = await cardSlices(page, w);
  // the mouse rests on the bar, off the cards
  await page.mouse.move(w / 2, 20);
  const items = await page.$$eval(CARD, (cs, TEXTS) => cs.flatMap((c, ci) => TEXTS.flatMap((s) => [...c.querySelectorAll(s)].map((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { ci, card: c.getAttribute('href'), sel: s, color: getComputedStyle(el).color, box: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height } } : null;
  }).filter(Boolean))), TEXTS);
  const tag = await page.addStyleTag({ content: `${CARD}, ${CARD} * { color: transparent !important; text-shadow: none !important; }` });
  const worst = {};
  for (const t of [0, 1.5, 3, 4.5, 6, 7.5, 9]) {
    await page.evaluate((t) => window.__glass.at(t), t);
    for (const sl of slices) {
      const mine = items.filter((it) => sl.cards.includes(it.ci));
      const { png, y0: y } = await shootSlice(page, w, bar, sl);
      const res = await page.evaluate(async ([png, mine, y]) => {
        const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
        const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        return mine.map(({ color, box }) => {
          const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
          const d = x.getImageData(Math.round(box.x), Math.round(box.y - y), Math.max(1, Math.round(box.w)), Math.max(1, Math.round(box.h))).data;
          let min = 99;
          for (let i = 0; i < d.length; i += 8) {
            const bg = [d[i], d[i + 1], d[i + 2]];
            const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
            const [hi, lo] = [L(bg), L(fg)].sort((p, q) => q - p);
            min = Math.min(min, (hi + 0.05) / (lo + 0.05));
          }
          return +min.toFixed(2);
        });
      }, [png, mine, y]);
      res.forEach((ratio, i) => {
        const it = mine[i];
        const k = `${w} ${it.card} ${it.sel} #${items.indexOf(it)}`;
        if (!(k in worst) || ratio < worst[k].ratio) worst[k] = { ratio, t };
      });
    }
  }
  await tag.evaluate((t) => t.remove());
  return { worst, n: items.length };
}

test('Measured across the loop: every text on every card at 4.5:1 at seven moments, at 1440 and at 390', async () => {
  const fails = [];
  for (const w of [1440, 390]) {
    const { worst, n } = await acrossTheLoop(still, w);
    assert.ok(n >= 8 * 4, `${w}: ${n} texts measured`);
    for (const sel of TEXTS) assert.ok(Object.keys(worst).some((k) => k.includes(` ${sel} `)), `${w}: ${sel} measured`);
    for (const [k, { ratio, t }] of Object.entries(worst)) if (ratio < 4.5) fails.push(`${k}: ${ratio}:1 at t = ${t}`);
  }
  await width(still, 1440);
  assert.deepEqual(fails, []);
});

// ---------- the loop: one context, only the panes that show ----------

test('One context, and only what shows: one WebGL context; at 1440 and at 390 the visible panes are lit and drawn, the hidden never', async () => {
  // which panes draw is all this reads: at half the device pixels each draw costs a quarter
  const page = await load('?guard=off', { motion: 'no-preference', init: [countGL], scale: 0.5 });
  assert.equal(await page.evaluate(() => window.__glCanvases.size), 1, 'one WebGL context on the page');
  const panes = () => page.$$eval('[data-glass="ribbed"]', (ps) => ps.map((p) => ({ shown: getComputedStyle(p).display !== 'none', lit: p.classList.contains('lit'), card: !!p.closest('.pc') })));
  const draws = () => page.evaluate(() => window.__glass.draws);
  // 30 frames in all, every row of cards scrolled into view in turn
  const tour = async () => {
    const rows = await page.$$eval(CARD, (cs) => [...new Set(cs.map((c) => Math.round(c.getBoundingClientRect().top + scrollY)))]);
    const each = Math.ceil(30 / rows.length);
    for (const top of rows) {
      await page.evaluate((y) => window.scrollTo(0, y - innerHeight / 3), top);
      await frames(page, each);
    }
  };
  for (const w of [1440, 390]) {
    await width(page, w);
    const p = await panes();
    assert.equal(p.length, 8 * 5, 'five panes per card');
    assert.ok(p.every((x) => x.card), 'every ribbed pane is a card\'s');
    const a = await draws();
    await tour();
    const b = await draws();
    p.forEach((x, i) => {
      if (x.shown) {
        assert.ok(x.lit, `${w}: pane ${i} is lit`);
        assert.ok(b[i] > a[i], `${w}: pane ${i} was drawn (${a[i]} -> ${b[i]})`);
      } else {
        assert.equal(b[i], a[i], `${w}: hidden pane ${i} was drawn (${a[i]} -> ${b[i]})`);
        if (w === 1440) assert.equal(b[i], 0, `${w}: hidden pane ${i} never drawn`);
      }
    });
    assert.equal(p.filter((x) => x.shown).length, 8 * (w === 1440 ? 3 : 2), `${w}: panes shown`);
  }
});

test('Without WebGL: no error, every card links to its page, and every card\'s ground varies', async () => {
  const page = await load('', { init: [noGL] });
  const hrefs = await page.$$eval(CARD, (cs) => cs.map((c) => (c.tagName === 'A' ? c.getAttribute('href') : null)));
  assert.deepEqual(hrefs, GROUPS.flatMap((g) => g.items.map((i) => i.href)));
  assert.equal(await page.$$eval(CARD, (cs) => cs.filter((c) => c.querySelector('.lit')).length), 0, 'no pane claims a light it cannot draw');
  await page.addStyleTag({ content: `${CARD} .pc-text { visibility: hidden !important; } ${CARD}::after { display: none !important; }` });
  const { bar, slices } = await cardSlices(page, 1440);
  const boxes = await page.$$eval(CARD, (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; }));
  for (const sl of slices) {
    const { png, y0 } = await shootSlice(page, 1440, bar, sl);
    const vs = await page.evaluate(async ([b64, boxes, y0]) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      return boxes.map((b) => {
        const d = x.getImageData(Math.round(b.x + b.w * 0.04), Math.round(b.y - y0 + b.h * 0.06), Math.round(b.w * 0.92), Math.round(b.h * 0.88)).data;
        let lo = 255, hi = 0;
        for (let k = 0; k < d.length; k += 8) { const l = (d[k] + d[k + 1] + d[k + 2]) / 3; lo = Math.min(lo, l); hi = Math.max(hi, l); }
        return hi - lo;
      });
    }, [png, sl.cards.map((ci) => boxes[ci]), y0]);
    vs.forEach((v, i) => assert.ok(v > 10, `${hrefs[sl.cards[i]]}: its ground varies by ${v} levels`));
  }
});
