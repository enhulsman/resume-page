// Every inner page at once, in a real browser (openspec stone-inner-pages, chunk 11: the glass list,
// the windows, their text on glass, the copy, still on request, no sideways scroll, the drawing sheet
// gone; glass-material "Only the three exceptions hold a drawing"; chunk 12: no sketch routes). Needs a running site:
//   BASE=http://127.0.0.1:4399 node --test --test-concurrency=1 tests/inner-site.e2e.mjs
//
// Test cost: one browser context with reduced motion (every window finished on arrival, nothing to
// wait for) visits each inner route once in one page. At 1440x900 it reads the moments, the kinds,
// the grain, the glow beneath each window (one screenshot per window), the copy, the drawing-sheet
// selectors, the running animations and two still screenshots; then the same page is resized to 390
// (and 320 for the article pages) for sideways scroll, and at 1440 and 390 every window's text is
// measured from one screenshot per window with all its text made transparent at once. "Switched on
// after load", which loads /projects with motion (the route its scenario names) and needs its light
// running, is in tests/inner-site.live.e2e.mjs (the live lane, run alone). Turnstile's
// script is stubbed on /contact, as in every inner test of that page. The tests below assert on what
// the sweep collected; waits are on state, never on a fixed sleep.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import * as glassConfig from '../src/config/glass.ts';
import * as homeConfig from '../src/config/home.ts';
import * as resumeConfig from '../src/config/resume.ts';
import { annaDemo } from '../src/config/anna-demo.ts';
import { pageWords } from '../src/config/pages.ts';
import site from '../src/config/site.ts';
import { buildProjects, pageFacts } from '../src/lib/projects.ts';
import { diaryEntries, readFrontmatter } from '../src/lib/frontmatter.ts';
import { factsOf, numbersOf, otherWriting, bare, plainLocation } from '../src/lib/article.ts';
import { timeline } from '../src/scripts/glass/anna-window-model.js';
import { coverer, strings, textsUnder } from './lib/copy.mjs';

const { innerGlass } = glassConfig;
const BASE = process.env.BASE || 'http://localhost:4321';
const ROUTES = Object.keys(innerGlass);
const ARTICLES = ROUTES.filter((r) => /^\/(projects|blog)\/./.test(r));
const END = timeline({ lines: homeConfig.annaCalls.work.lines, reply: annaDemo.reply }).done;
const STUB = "window.turnstile={render:function(){return 'stub'},getResponse:function(){return 'stub-token'},reset:function(){}};if(window.onTurnstileLoad)window.onTurnstileLoad();";
const DIALOG = 'dialog[data-glass-moment="diagram"]';
const OPEN = '.art .dv-open';
// the drawing sheet's selectors (stone-inner-pages "The drawing-sheet look leaves the inner pages")
const SHEET = ['.sheet', '.sheet-head', 'table.titleblock', '.dims', '.revs', '.rev', '.schedule', '.stamp', '.transmittal', '.plate', '.detail', '.register', '.xhair', '.pencil-mark', '.pencil-line', 'main.page'];

// ---- the corpus: the homepage's, plus pageWords, resume.ts and what article.ts derives ----
const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const sourcesIn = (dir) => Object.fromEntries(readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.mdx')).map((f) => [`/${dir}${f}`, read(`${dir}${f}`)]));
const projectSrc = sourcesIn('src/pages/projects/');
const blogSrc = sourcesIn('src/pages/blog/');
const published = Object.entries(blogSrc).filter(([p]) => !p.split('/').pop().startsWith('_'));
/** A page's `stats` (YAML flow mappings, which the flat frontmatter reader skips). */
const statsOf = (src) => [...(src.match(/^stats:\n((?:\s+-.*\n)+)/m)?.[1] ?? '').matchAll(/value:\s*"([^"]*)",\s*label:\s*"([^"]*)"/g)].map((m) => ({ value: m[1], label: m[2] }));
const joined = buildProjects(projectSrc);
const CORPUS = strings(
  homeConfig, resumeConfig, site, glassConfig, { annaDemo }, pageWords,
  Object.values(projectSrc).map(readFrontmatter), Object.values(blogSrc).map(readFrontmatter),
  joined, diaryEntries(blogSrc), Object.values(projectSrc).map(pageFacts),
  // what src/lib/article.ts derives: facts, numbers, other writing, bare links, the flagless location
  Object.values(projectSrc).map((s) => factsOf(readFrontmatter(s), 'project')),
  published.map(([, s]) => factsOf(readFrontmatter(s), 'post', 1)),
  Object.values(projectSrc).map(statsOf),
  [...joined.details, ...joined.register].map((d) => numbersOf({ kind: 'post', dims: d.dims })),
  published.map(([p, s]) => otherWriting(blogSrc, { href: `/blog/${p.split('/').pop().slice(0, -4)}`, project: readFrontmatter(s).project, window: false })),
  site.sidePieces.map((p) => bare(p.url)), plainLocation(site.location),
  // the role line's joining word is under three letters, so the derived text joins the corpus
  `${site.role} ${pageWords.resume.at}`,
);

// ---- the browser ----
let browser, context, page;
const errors = [];
const frames = (n = 2) => page.evaluate((n) => new Promise((done) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : done()); f(n); }), n);
const decode = (png, fn, arg) => page.evaluate(async ([b64, fn, arg]) => {
  const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
  const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  return new Function(`return (${fn})`)()(x.getImageData(0, 0, img.width, img.height), arg);
}, [png.toString('base64'), fn.toString(), arg]);

/** Arrive on a route at 1440x900 and wait until everything on it has finished. */
async function arrive(route) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const query = route === '/projects' || route === '/projects/AnnaAssistant' ? `?chat=${END}&t=2.4` : '';
  await page.goto(`${BASE}${route}${query}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    if (document.querySelector('[data-glass="ribbed"]') && window.__glassReady !== true) return false;
    if (document.querySelector('.anna-window') && !window.__annaWindow?.state().done) return false;
    if ([...document.querySelectorAll('[data-play]')].some((p) => !p.classList.contains('done'))) return false;
    if ([...document.querySelectorAll('.dwg')].some((d) => !d.classList.contains('drawn'))) return false;
    return true;
  }, null, { timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames(3);
}

/** Every frosted window outside a closed dialog, as selectors in document order. */
const windowsOn = () => page.evaluate(() => [...document.querySelectorAll('[data-glass="frosted"]')]
  .filter((w) => !w.closest('dialog:not([open])'))
  .map((w, i) => { w.dataset.testWin = String(i); return `[data-test-win="${i}"]`; }));

/**
 * Each text in a window (every text node's own box, and every SVG `text`) with its ink, its lowest
 * contrast against the pixels behind it: the window's text made transparent at once, one screenshot
 * per screenful of the window.
 */
async function windowContrast(W) {
  const all = [];
  const seen = new Set();
  for (let pass = 0; pass < 6; pass++) {
    const info = await page.evaluate(([W, pass]) => {
      const w = document.querySelector(W);
      const inDialog = !!w.closest('dialog[open]');
      const bar = inDialog ? 0 : document.querySelector('.bar').getBoundingClientRect().bottom;
      if (pass === 0) { const r = w.getBoundingClientRect(); window.scrollBy(0, r.top - bar - 8); }
      else window.scrollBy(0, innerHeight - bar - 24);
      return { bar, bottom: w.getBoundingClientRect().bottom };
    }, [W, pass]);
    await frames(2);
    const items = await page.evaluate(([W, bar]) => {
      const w = document.querySelector(W), wb = w.getBoundingClientRect();
      const clipOf = (el) => {
        let l = wb.left, r = wb.right, t = Math.max(wb.top, bar), b = Math.min(wb.bottom, innerHeight);
        for (let a = el.parentElement; a && a !== w; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const ar = a.getBoundingClientRect(); l = Math.max(l, ar.left); r = Math.min(r, ar.right); t = Math.max(t, ar.top); b = Math.min(b, ar.bottom); }
        }
        return { l, r, t, b };
      };
      const shown = (el) => { const cs = getComputedStyle(el); return cs.visibility === 'visible' && cs.display !== 'none' && +cs.opacity > 0; };
      const out = [];
      const add = (key, el, rect, color) => {
        const c = clipOf(el);
        if (rect.width < 1 || rect.height < 1) return;
        if (rect.left < c.l - 0.5 || rect.right > c.r + 0.5 || rect.top < c.t - 0.5 || rect.bottom > c.b + 0.5) return;
        out.push({ key, sel: el.className?.baseVal ?? el.className ?? el.tagName, tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), color, box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height } });
      };
      const walker = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
      let k = 0;
      for (let n = walker.nextNode(); n; n = walker.nextNode(), k++) {
        const el = n.parentElement;
        if (!n.textContent.trim() || el.closest('svg, script, style') || !shown(el)) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        add(`t${k}`, el, range.getBoundingClientRect(), getComputedStyle(el).color);
      }
      [...w.querySelectorAll('svg text')].forEach((t, i) => {
        if (!t.textContent.trim() || !shown(t)) return;
        const fill = getComputedStyle(t).fill;
        if (!/^rgb/.test(fill)) return;
        add(`s${i}`, t, t.getBoundingClientRect(), fill);
      });
      return out;
    }, [W, info.bar]);
    const todo = items.filter((i) => !seen.has(i.key));
    if (todo.length) {
      const tag = await page.addStyleTag({ content: `${W}, ${W} * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; } ${W} svg text, ${W} svg tspan { fill: transparent !important; stroke: transparent !important; } ${W} .aw-dot { visibility: hidden !important; }` });
      await frames(2);
      const png = await page.screenshot();
      await tag.evaluate((t) => t.remove());
      const ratios = await decode(png, (img, items) => {
        const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        return items.map(({ color, box }) => {
          const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
          let min = 99;
          const x0 = Math.max(0, Math.round(box.x)), y0 = Math.max(0, Math.round(box.y));
          const x1 = Math.min(img.width, Math.round(box.x + box.w)), y1 = Math.min(img.height, Math.round(box.y + box.h));
          for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
            const i = (y * img.width + x) * 4, d = img.data;
            const bg = [d[i], d[i + 1], d[i + 2]];
            const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
            const [hi, lo] = [L(bg), L(fg)].sort((p, q) => q - p);
            min = Math.min(min, (hi + 0.05) / (lo + 0.05));
          }
          return +min.toFixed(2);
        });
      }, todo);
      todo.forEach((it, i) => { seen.add(it.key); all.push({ ...it, ratio: ratios[i] }); });
    }
    if (info.bottom <= (await page.evaluate(() => innerHeight)) + 1) break;
  }
  return all;
}

/** Every element's visible horizontal extent in main (clipped by the ancestors that clip it), outside 0..innerWidth. */
const outside = () => page.evaluate(() => {
  const main = document.querySelector('main'), W = innerWidth, bad = [];
  for (const el of main.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let l = r.left, rr = r.right;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible') { const ar = a.getBoundingClientRect(); l = Math.max(l, ar.left); rr = Math.min(rr, ar.right); }
    }
    if (rr - l < 1) continue;
    if (l < -0.5 || rr > W + 0.5) bad.push(`${el.tagName}.${String(el.className?.baseVal ?? el.className).split(' ').join('.')} ${Math.round(l)}..${Math.round(rr)}`);
  }
  return { sw: document.documentElement.scrollWidth, w: W, bad: bad.slice(0, 8) };
});
/** Scroll once to the bottom and back. */
const scrollThrough = async () => {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await frames(3);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await frames(3);
};
const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running')
  .map((a) => `${a.constructor.name} ${a.animationName ?? a.transitionProperty ?? ''} on ${a.effect?.target?.tagName}.${a.effect?.target?.className}`));

const R = {};
before(async () => {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));

  for (const route of ROUTES) {
    const r = R[route] = {};
    await arrive(route);

    // still: nothing running on arrival, and the first screen the same 30 frames later; the frames
    // pass while the checks below only read the page (the mouse waits until the second screenshot)
    r.runningAtLoad = await running();
    const a = await page.screenshot();
    await page.evaluate(() => { window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });

    // the list and the kinds
    Object.assign(r, await page.evaluate(() => {
      const main = document.querySelector('main');
      const moments = [...main.querySelectorAll('[data-glass-moment]')];
      return {
        moments: moments.map((m) => m.dataset.glassMoment),
        loose: [...main.querySelectorAll('*')]
          .filter((el) => el.tagName === 'CANVAS' || getComputedStyle(el).backdropFilter !== 'none')
          .filter((el) => !el.closest('[data-glass-moment]'))
          .map((el) => el.tagName + (el.className ? `.${String(el.className).split(' ').join('.')}` : '')),
        kinds: moments.map((m) => ({
          id: m.dataset.glassMoment,
          ribbed: m.querySelectorAll('[data-glass="ribbed"]').length,
          ribbedShown: [...m.querySelectorAll('[data-glass="ribbed"]')].filter((p) => p.closest('[aria-hidden="true"]')).length,
          frosted: m.querySelectorAll('[data-glass="frosted"]').length,
        })),
        grain: [...document.querySelectorAll('[data-glass="frosted"]')].map((w) => {
          const a = getComputedStyle(w, '::after');
          const kids = [...w.children].map((k) => +getComputedStyle(k).zIndex).filter((z) => !Number.isNaN(z));
          return { noise: /feTurbulence/.test(a.backgroundImage), z: +a.zIndex, under: kids.length > 0 && kids.some((z) => z > +a.zIndex), events: a.pointerEvents };
        }),
      };
    }));

    // the display type: every heavy heading of 32 px and up, with its word gap
    r.display = await page.$$eval('main h1, main h2, main h3', (hs) => hs.map((h) => ({ h, cs: getComputedStyle(h) }))
      .filter(({ h, cs }) => +cs.fontWeight >= 850 && parseFloat(cs.fontSize) >= 32 && !h.closest('[data-glass], .prose'))
      .map(({ h, cs }) => ({ text: h.textContent.trim(), wordSpacing: parseFloat(cs.wordSpacing) || 0, size: parseFloat(cs.fontSize) })));

    // the drawing sheet, gone: selectors, the B612 preload, the layout's defs
    r.sheet = await page.evaluate((SHEET) => ({
      hits: SHEET.filter((s) => document.querySelector(s)),
      b612: [...document.querySelectorAll('link[rel=preload]')].filter((l) => /B612/i.test(l.href)).length,
      defs: document.querySelectorAll('body > svg defs #hatch, body > svg defs #arrow').length,
    }), SHEET);

    // the copy: main and the footer, outside the prose, the drawings' own svg and the dialog's copy
    r.texts = await page.evaluate((fn) => {
      const under = new Function(`return (${fn})`)();
      const skip = '.prose, .dwg, dialog.dv .dv-body, iframe';
      return [...under(document.querySelector('main'), skip), ...under(document.querySelector('footer'), skip)];
    }, textsUnder.toString());
    // the contents list holds the prose's h2s (contentsOf): content, so the route's corpus holds them
    r.headings = await page.$$eval('.art .prose h2', (hs) => hs.map((h) => h.textContent));

    await page.waitForFunction(() => window.__frames >= 30);
    r.still = a.equals(await page.screenshot());

    // the mouse over the page adds no pencil and no crosshair
    for (const [x, y] of [[300, 300], [1100, 600]]) await page.mouse.move(x, y, { steps: 2 });
    await frames(3);
    r.pointer = await page.evaluate(() => document.querySelectorAll('.pencil-mark, .pencil-line, .xhair, .dim-hl').length);
    await page.mouse.move(4, 4); // rest on the bar, clear of its links

    // nothing running at the bottom either
    await frames(3);
    await scrollThrough();
    r.runningAtEnd = await running();

    // From here on the page is measured, not watched: its transitions go (reduced motion leaves them
    // .01 ms long but keeps their delays, so a style a measurement adds or removes would otherwise read
    // its old value for a while)
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });

    // something behind every window: a glow beneath, and with the windows hidden the area varies
    // without an edge
    r.behind = [];
    const wins = await windowsOn();
    const hide = await page.addStyleTag({ content: '[data-glass="frosted"] { visibility: hidden !important; }' });
    for (const W of wins) {
      const under = await page.evaluate((W) => {
        const w = document.querySelector(W);
        w.scrollIntoView({ block: 'center', behavior: 'instant' });
        const glow = w.parentElement.querySelector(':scope > [data-glow]');
        if (!glow) return null;
        const a = w.getBoundingClientRect(), g = glow.getBoundingClientRect();
        const ix = Math.max(0, Math.min(a.right, g.right) - Math.max(a.left, g.left));
        const iy = Math.max(0, Math.min(a.bottom, g.bottom) - Math.max(a.top, g.top));
        return {
          hidden: glow.getAttribute('aria-hidden'), before: !!(glow.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING),
          z: [+getComputedStyle(glow).zIndex, +getComputedStyle(w).zIndex], cover: (ix * iy) / (a.width * a.height),
        };
      }, W);
      await frames(2);
      const clip = await page.evaluate((W) => {
        const r = document.querySelector(W).getBoundingClientRect(), bar = document.querySelector('.bar').getBoundingClientRect().bottom;
        const top = Math.max(r.top, bar + 1), bottom = Math.min(r.bottom, innerHeight);
        return { x: Math.ceil(r.left), y: Math.ceil(top), width: Math.floor(r.width) - 1, height: Math.floor(bottom - top) - 1 };
      }, W);
      const png = await page.screenshot({ clip });
      const look = await decode(png, (img) => {
        const d = img.data, w = img.width, mid = Math.floor(img.height / 2);
        let spread = 0;
        for (let ch = 0; ch < 3; ch++) { let lo = 255, hi = 0; for (let k = ch; k < d.length; k += 4) { lo = Math.min(lo, d[k]); hi = Math.max(hi, d[k]); } spread = Math.max(spread, hi - lo); }
        let jump = 0;
        for (let x = 1; x < w; x++) for (let ch = 0; ch < 3; ch++) jump = Math.max(jump, Math.abs(d[(mid * w + x) * 4 + ch] - d[(mid * w + x - 1) * 4 + ch]));
        return { spread, jump, n: w };
      });
      r.behind.push({ W, under, ...look });
    }
    await hide.evaluate((t) => t.remove());

    // every window's text at 1440
    r.contrast = [];
    for (const W of await windowsOn()) r.contrast.push(...(await windowContrast(W)).map((c) => ({ ...c, width: 1440 })));

    // the phone: 390 (and 320 for an article page), scrolled once to the bottom and back
    r.phone = {};
    for (const [w, h] of ARTICLES.includes(route) ? [[390, 844], [320, 800]] : [[390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await frames(3);
      await scrollThrough();
      r.phone[w] = await outside();
    }

    // at 390: every window's text; then the dialog opened where the page has one, its text and the
    // svgs in glass
    await page.setViewportSize({ width: 390, height: 844 });
    await frames(3);
    r.contrast390 = [];
    for (const W of await windowsOn()) r.contrast390.push(...(await windowContrast(W)).map((c) => ({ ...c, width: 390 })));
    const dialog = await page.locator(DIALOG).count();
    if (dialog) {
      await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, OPEN, { timeout: 5000 });
      await page.locator(OPEN).first().click();
      await page.waitForFunction((sel) => document.querySelector(sel).open, DIALOG);
      await frames(2);
    }
    r.dialogOpened = dialog > 0;
    r.svgs = await page.evaluate(() => ({
      inGlass: [...document.querySelectorAll('[data-glass] svg')].map((s) => {
        const b = s.getBoundingClientRect();
        return {
          moment: s.closest('[data-glass-moment]')?.dataset.glassMoment ?? null, dwg: s.classList.contains('dwg'),
          copy: !!s.closest('dialog[open] .dv-body'), icon: s.closest('.glass-dots') !== null || (b.width <= 48 && b.height <= 48),
          label: s.getAttribute('aria-label') ?? s.getAttribute('aria-labelledby') ?? s.getAttribute('class') ?? '',
        };
      }),
      proseOrLevels: [...document.querySelectorAll('.art .prose svg, .anna-levels')].filter((s) => s.closest('[data-glass]')).length,
    }));
    if (dialog) {
      r.contrast390.push(...(await windowContrast(`${DIALOG} [data-glass="frosted"]`)).map((c) => ({ ...c, width: 390, dialog: true })));
      await page.keyboard.press('Escape');
      await page.waitForFunction((sel) => !document.querySelector(sel).open, DIALOG);
    }
  }
});
after(async () => {
  await context?.close();
  await browser?.close();
});

// ---------- inner-page glass is listed per route ----------

test('The pages match the list: each route\'s moments, read in document order, are its innerGlass entry; every canvas and blur in main inside one', () => {
  for (const route of ROUTES) {
    assert.deepEqual(R[route].moments, innerGlass[route], route);
    assert.deepEqual(R[route].loose, [], route);
  }
});

test('The kinds: project-cards holds only ribbed panes hidden from readers; every other moment exactly one frosted window', () => {
  for (const route of ROUTES) {
    for (const k of R[route].kinds) {
      if (k.id === 'project-cards') {
        assert.ok(k.ribbed > 0 && k.frosted === 0, `${route} ${k.id}: ${k.ribbed} ribbed, ${k.frosted} frosted`);
        assert.equal(k.ribbedShown, k.ribbed, `${route}: every pane aria-hidden`);
      } else {
        assert.deepEqual([k.frosted, k.ribbed], [1, 0], `${route} ${k.id}`);
      }
    }
  }
});

test('The display type keeps its word gaps: every heavy heading on every inner page has a positive word-spacing, at most 0.2em', () => {
  for (const route of ROUTES) {
    assert.ok(R[route].display.length > 0, `${route} has display headings`);
    for (const d of R[route].display) {
      assert.ok(d.wordSpacing > 0 && d.wordSpacing <= d.size * 0.2, `${route} "${d.text}": word-spacing ${d.wordSpacing}px at ${d.size}px`);
    }
  }
});

// ---------- inner windows are the homepage's windows ----------

test('Something behind every window: a glow beneath it; with the window hidden the area varies by more than 20 levels, with no step over 6 on a line through it', () => {
  let n = 0;
  for (const route of ROUTES) {
    for (const b of R[route].behind) {
      n++;
      const where = `${route} ${b.W}`;
      assert.ok(b.under, `${where}: a [data-glow] beside the window, in its stage`);
      assert.equal(b.under.hidden, 'true', where);
      assert.ok(b.under.before && b.under.z[0] < b.under.z[1], `${where}: painted beneath it (z ${b.under.z})`);
      assert.ok(b.under.cover > 0.6, `${where}: it lies behind most of the window (${b.under.cover.toFixed(2)})`);
      assert.ok(b.n > 100, `${where}: a line ${b.n} px long`);
      assert.ok(b.spread > 20, `${where}: the covered area varies by ${b.spread} levels`);
      assert.ok(b.jump <= 6, `${where}: neighbouring pixels differ by ${b.jump} levels`);
    }
  }
  assert.ok(n >= 12, `${n} windows looked behind`);
});

test('Grain in every inner window: its ::after a feTurbulence noise, under the window\'s text, ignoring the pointer', () => {
  let n = 0;
  for (const route of ROUTES) {
    for (const g of R[route].grain) { n++; assert.deepEqual([g.noise, g.under, g.events], [true, true, 'none'], `${route}: ${JSON.stringify(g)}`); }
  }
  assert.ok(n >= 16, `${n} windows read (the closed dialogs' panels included)`);
});

// ---------- every text on inner-page glass reads at 4.5:1 ----------

test('Measured on every window: every text in every frosted window at 4.5:1, at 1440 and at 390 (the diagram dialog open there), opaque inks', () => {
  const all = ROUTES.flatMap((route) => [...R[route].contrast, ...R[route].contrast390].map((c) => ({ route, ...c })));
  assert.ok(all.length > 250, `${all.length} texts measured`);
  // every window with words had some measured, at both widths; the open dialogs' Close and labels too
  for (const route of ROUTES) {
    if (!R[route].behind.length) continue;
    assert.ok(R[route].contrast.length > 0 && R[route].contrast390.length > 0, `${route}: measured at 1440 and 390`);
    if (R[route].dialogOpened) {
      const inDialog = R[route].contrast390.filter((c) => c.tag === 'text' || c.text === pageWords.article.close);
      assert.ok(inDialog.some((c) => c.text === pageWords.article.close), `${route}: the dialog's "Close" measured`);
    }
  }
  const translucent = all.filter((c) => { const a = c.color.match(/[\d.]+/g).map(Number)[3]; return a !== undefined && a < 1; });
  assert.deepEqual(translucent, [], 'opaque inks only');
  const low = all.filter((c) => c.ratio < 4.5).map(({ route, width, sel, text, color, ratio }) => ({ route, width, sel, text, color, ratio }));
  assert.deepEqual(low, [], JSON.stringify(low, null, 1));
});

// ---------- copy comes only from config on inner pages ----------

test('The rendered inner pages are all config: every text, alt, title and aria-label in main and the footer, outside the prose, the drawings and the dialog\'s copy', () => {
  const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
  // a value under three letters ("rp5", "13.3 MB") is too short for the covering check, so a text
  // passes when it is a corpus value whole
  const whole = new Set(CORPUS.map(norm));
  const left = [];
  for (const route of ROUTES) {
    assert.ok(R[route].texts.length > 8, `${route}: ${R[route].texts.length} texts read`);
    const check = coverer([...CORPUS, ...R[route].headings]);
    for (const t of R[route].texts) {
      if (whole.has(norm(t))) continue;
      const rest = check(t);
      if (rest) left.push(`${route}: ${rest}`);
    }
  }
  assert.deepEqual([...new Set(left)], [], 'typed into the markup');
});

// ---------- inner pages are still on request ----------

test('No running animations: with reduced motion nothing runs after load or at the bottom, and the first screen holds still for 30 frames', () => {
  for (const route of ROUTES) {
    assert.deepEqual(R[route].runningAtLoad, [], `${route}: after load`);
    assert.deepEqual(R[route].runningAtEnd, [], `${route}: after scrolling to the bottom`);
    assert.ok(R[route].still, `${route}: two screenshots 30 frames apart differ`);
  }
});

// ---------- no inner page scrolls sideways ----------

test('Every route: at 390 (and 320 for the article pages) no sideways scroll, every box in main within the screen', () => {
  for (const route of ROUTES) {
    const widths = Object.keys(R[route].phone);
    assert.deepEqual(widths.sort(), ARTICLES.includes(route) ? ['320', '390'] : ['390'], route);
    for (const [w, o] of Object.entries(R[route].phone)) {
      assert.ok(o.sw <= o.w, `${route} at ${w}: scrollWidth ${o.sw} over ${o.w}`);
      assert.deepEqual(o.bad, [], `${route} at ${w}`);
    }
  }
});

// ---------- the drawing-sheet look leaves the inner pages ----------

test('None on any inner page: no drawing-sheet selector, no B612 preload, no hatch or arrow in the layout, no pencil or crosshair under the mouse', () => {
  for (const route of ROUTES) {
    assert.deepEqual(R[route].sheet, { hits: [], b612: 0, defs: 0 }, route);
    assert.equal(R[route].pointer, 0, `${route}: the mouse drew`);
  }
});

// ---------- glass-material: only the three exceptions hold a drawing ----------

test('Only the three exceptions hold a drawing: at 390, the dialog open, every svg in glass is pytaiga-mcp\'s, the exactly-once drawing, or a dialog\'s copy, apart from dots and icons', () => {
  let drawings = 0;
  for (const route of ROUTES) {
    for (const s of R[route].svgs.inGlass) {
      if (s.icon && !s.dwg && !s.copy) continue;
      drawings++;
      const ok = (s.moment === 'pytaiga' && s.dwg) || (s.moment === 'post-drawing' && s.dwg) || (s.moment === 'diagram' && s.copy);
      assert.ok(ok, `${route}: an svg in glass (${JSON.stringify(s)})`);
    }
    assert.equal(R[route].svgs.proseOrLevels, 0, `${route}: a prose diagram or ANNA's levels in glass`);
  }
  assert.ok(drawings >= 6, `${drawings} drawings in glass: two panes and four opened copies`);
  assert.deepEqual(ROUTES.filter((r) => R[r].dialogOpened).sort(), ['/blog/henk-exactly-once', '/projects/ClaudeSandbox', '/projects/Henk', '/projects/PytaigaMcp']);
});

test('No page or console error on any inner route', () => {
  assert.deepEqual(errors, []);
});

// ---- the sketches are gone (chunk 12; the files and dist/: tests/inner-retired.test.mjs) ----
test('No sketch routes: /sketches/inner/ answers 404 and the sitemap lists no /sketches/ page', async () => {
  for (const path of ['/sketches/inner/', '/sketches/inner/r2-i2e-projects', '/sketches/inner/p1-homelab']) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
    assert.equal(res.status, 404, path);
  }
  const sitemap = await (await fetch(`${BASE}/sitemap-index.xml`)).text();
  assert.match(sitemap, /<loc>/);
  assert.doesNotMatch(sitemap, /\/sketches\//);
});
