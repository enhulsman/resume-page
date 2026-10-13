// The homepage's arrival: walking up to the table. On a first visit the sheet lies tilted on
// the table and squares up as its ink develops, the name is lettered between guide lines, and
// a dimension line gives the name's real width. Any key, wheel or tap hurries it along. It never plays twice in a session, never on reduced motion, never on an
// inner page, and never hides content without JS. Needs a running site:
//
//   BASE=http://localhost:4321 node --test tests/intro.e2e.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
import { readFileSync } from 'node:fs';
// the name as the site carries it, split as the homepage sets it: one line per part
const SITE_NAME = readFileSync(new URL('../src/config/site.ts', import.meta.url), 'utf8').match(/^\s*name:\s*'([^']+)'/m)[1];
const NAME_LINES = (([first, ...rest]) => [first, rest.join('')])(SITE_NAME.split(' '));

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(path = '/', { width = 1440, height = 900, reducedMotion = 'no-preference', js = true, hasTouch = false, colorScheme = 'light', isMobile = false, theme } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, javaScriptEnabled: js, hasTouch, isMobile, colorScheme });
  if (theme) await context.addInitScript(t => localStorage.setItem('theme', t), theme);
  // when the intro class came and went, and when the terminal first printed anything
  await context.addInitScript(() => {
    window.__log = { intro: null, arrived: null, typed: null };
    // the init script runs before <html> exists: watch the document for it
    const seen = () => {
      const html = document.documentElement;
      if (!html) return;
      if (html.classList.contains('intro') && window.__log.intro == null) window.__log.intro = performance.now();
      if (window.__log.intro != null && !html.classList.contains('intro') && window.__log.arrived == null) window.__log.arrived = performance.now();
    };
    new MutationObserver(seen).observe(document, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', () => {
      seen();
      const term = document.getElementById('terminal-body');
      if (term) new MutationObserver(() => { if (window.__log.typed == null && term.textContent.trim()) window.__log.typed = performance.now(); }).observe(term, { childList: true, subtree: true, characterData: true });
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + path, { waitUntil: 'load' });
  return { context, page, errors };
}

const log = page => page.evaluate(() => window.__log);
// over, and the dimension drawn after it (a wait on the page, not on the clock)
const settle = async page => {
  await page.waitForFunction(() => window.__log.arrived != null, null, { timeout: 8000 });
  await page.waitForTimeout(700);
};
// a bounding box overlap
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const nameWidth = page => page.evaluate(() => Math.max(...[...document.querySelectorAll('.name span')].map(s => {
  const r = document.createRange(); r.selectNodeContents(s); return r.getBoundingClientRect().width;
})));

test('a first visit plays the arrival once, then leaves the page as it always is', async () => {
  const { context, page, errors } = await open('/');
  assert.ok((await log(page)).intro != null, 'the intro class was set before the page settled');
  await settle(page);
  const l = await log(page);
  assert.ok(l.arrived != null, 'the intro class is removed once it is over');
  assert.ok(l.arrived - l.intro < 2800, `over in under 2.8 s (${Math.round(l.arrived - l.intro)} ms)`);
  // nothing is left transformed, clipped or faded, and the page scrolls again
  assert.equal(await page.locator('main').evaluate(m => getComputedStyle(m).transform), 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).transform), 'none');
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 2), 'the page is long again');
  for (const c of await page.locator('.name span').evaluateAll(ss => ss.map(s => getComputedStyle(s).clipPath))) assert.equal(c, 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(43, 39, 102)', 'full ink');
  assert.equal(await page.locator('.name-guides').count(), 0, 'the guide lines are erased');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('ovz-arrived')), '1');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the sheet starts blank but for its frame and bar, and is drawn in', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
  await seek(page, 0);
  const at0 = await page.evaluate(() => {
    const cover = s => getComputedStyle(document.querySelector(s), '::after');
    return {
      // every line of text lies under a cover of paper, not yet swept off
      covered: ['.role', '.lede', '.status', '.site-photo figcaption', '.titleblock td'].map(s => cover(s).transform),
      // the terminal's head is wiped in with its box
      head: getComputedStyle(document.querySelector('.term-head')).clipPath,
      borders: ['.term', '.titleblock', '.act-main', '.site-photo .photo'].map(s => getComputedStyle(document.querySelector(s)).borderTopColor),
      photo: getComputedStyle(document.querySelector('.site-photo .photo')).opacity,
      wipe: getComputedStyle(document.querySelector('.site-photo .photo')).clipPath,
      bar: getComputedStyle(document.querySelector('.bar')).opacity,
      frame: getComputedStyle(document.querySelector('.frame')).borderTopColor,
    };
  });
  // full width: no transform yet, however the browser writes that
  for (const t of at0.covered) assert.match(t, /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/, 'text covered at the start');
  assert.match(at0.head, /inset\(0px 100%/);
  for (const b of at0.borders) assert.equal(b, 'rgba(0, 0, 0, 0)', 'boxes not yet drawn');
  // the photo is wiped down from under its clip, not faded in
  assert.equal(at0.photo, '1');
  assert.match(at0.wipe, /^inset\(0px 0px 100%/);
  assert.equal(at0.bar, '1', 'the bar is pre-printed');
  assert.equal(at0.frame, 'rgb(43, 39, 102)', 'the frame is pre-printed');
  await context.close();
});

test('boxes are drawn by a pen going round them, on their own borders', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844, hasTouch: true, isMobile: true }]) {
    const { context, page } = await open('/', viewport);
    await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
    const pens = await page.locator('.sheet-you > .pens').evaluate(svg => ({
      hidden: svg.getAttribute('aria-hidden'),
      n: svg.querySelectorAll('path[pathLength="1"]').length,
    }));
    assert.equal(pens.hidden, 'true');
    // the terminal and its head, the photo, the main button, the status mark, the title block and its cells
    assert.ok(pens.n >= 15, `${pens.n} pen lines`);
    await seek(page, 2050);
    await definePenOf(page);
    const off = await page.evaluate(() => {
      return ['.term', '.titleblock', '.act-main', '.site-photo .photo'].map(s => {
        const p = penOf(s).getBoundingClientRect(), r = document.querySelector(s).getBoundingClientRect();
        return Math.max(Math.abs(p.left - r.left), Math.abs(p.top - r.top), Math.abs(p.right - r.right), Math.abs(p.bottom - r.bottom));
      });
    });
    assert.ok(off.every(d => d < 1.5), `drawn on the real borders at ${viewport.width} (${off.map(d => d.toFixed(2)).join(', ')})`);
    await context.close();
  }
});

test('the title block\'s cells share their lines, and the pen draws each line once', async () => {
  // (a desktop's title block: on a phone its cells are stacked rows with borders of their own)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const { context, page } = await open('/', viewport);
    await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
    // the cells' pens, in the order of the cells: each one's left and right side
    const sides = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('[data-pen] :is(th, td)')];
      const paths = [...document.querySelectorAll('.pens path:not([data-for])')];
      const firstRow = cells.filter(c => c.parentElement === cells[0].parentElement).length;
      return paths.slice(0, firstRow).map(p => { const [l, , rt] = p.getAttribute('d').match(/-?[\d.]+/g).map(Number); return [l, rt]; });
    });
    assert.ok(sides.length >= 2, `${sides.length} cells in the first row`);
    for (let i = 1; i < sides.length; i++) assert.ok(Math.abs(sides[i - 1][1] - sides[i][0]) < .01, `cell ${i} starts on the line cell ${i - 1} ends on (${JSON.stringify(sides)})`);
    await context.close();
  }
});

test('once arrived, no cover, pen line or hidden border is left', async () => {
  const { context, page } = await open('/');
  await settle(page);
  const after = await page.evaluate(() => ({
    pens: document.querySelectorAll('.pens').length,
    // the page's own drawings are left alone
    dwgs: document.querySelectorAll('svg.dwg').length,
    covers: ['.role', '.lede', '.status', '.term-head'].map(s => getComputedStyle(document.querySelector(s), '::after').content),
    borders: ['.term', '.titleblock', '.act-main'].map(s => getComputedStyle(document.querySelector(s)).borderTopColor),
    photo: getComputedStyle(document.querySelector('.site-photo .photo')).clipPath,
  }));
  assert.equal(after.pens, 0);
  assert.ok(after.dwgs >= 2, `${after.dwgs} drawings on the page`);
  for (const c of after.covers) assert.equal(c, 'none');
  for (const b of after.borders) assert.equal(b, 'rgb(43, 39, 102)');
  assert.equal(after.photo, 'none');
  await context.close();
});

// a box drawn by a pen, found through the box: the pen's data-for is the box's place among
// the boxes marked data-pen
const definePenOf = page => page.evaluate(() => {
  window.penOf = s => document.querySelector(`.pens [data-for="${[...document.querySelectorAll('[data-pen]')].indexOf(document.querySelector(s))}"]`);
});

test('the boxes a pen draws are marked once, in the markup, each with its own moment', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
  await definePenOf(page);
  const marked = await page.evaluate(() => [...document.querySelectorAll('[data-pen]')].map(el => {
    const [at, dur] = el.dataset.pen.split(' ').map(Number);
    const a = document.querySelector(`.pens [data-for="${[...document.querySelectorAll('[data-pen]')].indexOf(el)}"]`)?.getAnimations()[0]?.effect.getTiming();
    return { at, dur, drawn: a ? [a.delay, a.duration] : null };
  }));
  // the terminal and its head, the photo, the main button, the status mark, the title block
  assert.ok(marked.length >= 6, `${marked.length} boxes marked`);
  for (const m of marked) assert.deepEqual(m.drawn, [m.at, m.dur], 'its pen draws at the moment the markup gives');
  await context.close();
});

test('the real borders show when the drawing goes, in the same frame, not on a clock of their own; the drawn name stays as the name', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
  await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
  // long after every pen and letter is done, the drawing still stands in for them
  await seek(page, 2400);
  const late = await page.evaluate(() => ({
    borders: [...document.querySelectorAll('[data-pen], [data-pen] :is(th, td)')].map(el => getComputedStyle(el).borderTopColor),
    name: [...document.querySelectorAll('.name span')].map(s => getComputedStyle(s).color),
  }));
  assert.ok(late.borders.length >= 6 && late.borders.every(c => c === 'rgba(0, 0, 0, 0)'), `borders still hidden (${late.borders})`);
  assert.ok(late.name.every(c => c === 'rgba(0, 0, 0, 0)'), `name still hidden (${late.name})`);
  await context.close();

  // the moment the class goes: the real borders are there, and the pens fade off them. The
  // finished letters stay: the same shapes a moment later in the browser's text raster would be
  // a change of their own. Ended early (the head's backstop), half-drawn letters go too.
  for (const how of ['itself', 'backstop']) {
    const { context, page } = await open('/');
    await page.evaluate(() => {
      new MutationObserver((_, mo) => {
        if (document.documentElement.classList.contains('intro')) return;
        mo.disconnect();
        const leaving = s => [...document.querySelectorAll(s)].map(o => o.classList.contains('leaving'));
        window.__at = {
          pens: leaving('.pens, .name-guides'), glyphs: leaving('.glyphs'),
          borders: [...document.querySelectorAll('[data-pen], [data-pen] :is(th, td)')].map(el => getComputedStyle(el).borderTopColor),
          name: [...document.querySelectorAll('.name span')].map(s => getComputedStyle(s).color),
        };
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    });
    await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
    if (how === 'backstop') await page.evaluate(() => { document.documentElement.classList.remove('intro'); document.dispatchEvent(new CustomEvent('ovz:arrived')); });
    await page.waitForFunction(() => window.__at, null, { timeout: 8000 });
    // a microtask after the class went: the drawing's own listener has run by then
    const at = await page.evaluate(() => window.__at);
    assert.ok(at.borders.length >= 6 && at.borders.every(c => c !== 'rgba(0, 0, 0, 0)'), `${how}: borders shown (${at.borders})`);
    assert.ok(at.pens.length > 0 && at.pens.every(Boolean), `${how}: the pens are leaving (${at.pens})`);
    assert.equal(at.glyphs.length, 2);
    if (how === 'itself') {
      assert.ok(at.glyphs.every(l => !l), 'itself: the drawn name stays');
      assert.ok(at.name.every(c => c === 'rgba(0, 0, 0, 0)'), 'itself: the text stays under it, unseen');
    } else {
      assert.ok(at.glyphs.every(Boolean), 'backstop: the half-drawn name is leaving');
      assert.ok(at.name.every(c => c === 'rgb(43, 39, 102)'), 'backstop: name inked');
    }
    await page.waitForFunction(() => document.querySelectorAll('.pens, .name-guides').length === 0, null, { timeout: 600 });
    await context.close();
  }
});

test('the lettering guides are ruled with a pen, not faded in', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.name .name-guides', { state: 'attached', timeout: 3000 });
  const at = async t => { await seek(page, t); return page.locator('.name-guides line').evaluateAll(ls => ls.map(l => [l.getAttribute('pathLength'), parseFloat(getComputedStyle(l).strokeDashoffset), +getComputedStyle(l.ownerSVGElement).opacity])); };
  const before = await at(100), mid = await at(420), done = await at(1200);
  assert.ok(before.length >= 4, `${before.length} guides`);
  for (const [len, off] of before) { assert.equal(len, '1'); assert.equal(off, 1, 'not yet drawn'); }
  assert.ok(mid.some(([, off, o]) => off > 0 && off < 1 && o > .5), `half drawn, at full strength (${JSON.stringify(mid)})`);
  for (const [, off] of done) assert.equal(off, 0, 'drawn');
  await context.close();
});

// What a page-wide repaint looks like from the inside: an inherited property (a colour, a
// custom property) animated on an element with a big subtree restyles all of it, every frame.
const RESTYLES_ALL = () => {
  const INHERITED = /^(color|fill|stroke|fill-?opacity|stroke-?opacity|font|letter-?spacing|word-?spacing|line-?height|visibility|--.*)/i;
  const out = [];
  for (const a of document.getAnimations()) {
    const el = a.effect?.target;
    if (!el || el.querySelectorAll('*').length <= 40) continue;
    const props = new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)));
    for (const p of props) if (INHERITED.test(p)) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${a.animationName || a.transitionProperty || 'script'}: ${p}`);
  }
  return out;
};

test('the arrival never repaints the whole page frame by frame', async () => {
  // a colour animated on a big part of the page restyles every element in it on every frame:
  // phones stutter. Checked on every animation of the arrival, the drawn parts included.
  for (const opts of [{}, { colorScheme: 'dark' }, { width: 390, height: 844, hasTouch: true, isMobile: true }]) {
    const { context, page } = await open('/', opts);
    await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
    assert.deepEqual(await page.evaluate(RESTYLES_ALL), [], JSON.stringify(opts));
    // and the check itself sees one: a colour put on the first sheet
    const caught = await page.evaluate(RESTYLES_ALL => {
      document.querySelector('.sheet-you').animate({ color: ['red', 'blue'] }, 1000);
      return new Function(`return (${RESTYLES_ALL})()`)();
    }, RESTYLES_ALL.toString());
    assert.equal(caught.length, 1, 'the check catches a colour on the sheet');
    await context.close();
  }
});

test('what lies below the first sheet comes in at the end', async () => {
  const { context, page } = await open('/');
  const later = await page.locator('main > section:not(.sheet-you)').evaluateAll(ss => ss.map(s => s.getAnimations({ subtree: false }).map(a => a.animationName)));
  assert.ok(later.length > 0 && later.every(a => a.includes('later')), JSON.stringify(later));
  await context.close();
});

// the first keyframe of the sheet's tilt, as the browser computed it
const tiltFrom = page => page.evaluate(() => {
  const a = document.body.getAnimations().find(x => x.animationName === 'tilt');
  return a && a.effect.getKeyframes()[0].transform;
});
const angle = m => {
  // matrix3d(a1, b1, c1, d1, a2, b2, c2, d2, ...): rotateX(t) puts cos t in b2 and sin t in c2
  const v = m.match(/matrix3d\((.*)\)/)[1].split(',').map(Number);
  return Math.round(Math.atan2(v[6], v[5]) * 180 / Math.PI);
};

test('the sheet starts tilted on the table and squares up', async () => {
  const { context, page } = await open('/');
  const from = await tiltFrom(page);
  assert.ok(from, 'the body has a tilt animation');
  const m = await page.evaluate(f => { const d = document.createElement('div'); d.style.transform = f; document.body.append(d); const t = getComputedStyle(d).transform; d.remove(); return t; }, from);
  assert.equal(angle(m), 22, `tilted 22 degrees on a desktop (${from})`);
  // seen in perspective while it turns, and only then: none is left on the page once it lies square
  assert.match(from, /perspective\(1600px\)/, 'seen in perspective');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).perspective), 'none');
  // the table shows around the sheet while it lies there, and the sheet is one screen tall
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(201, 209, 198)');
  assert.ok(await page.evaluate(() => document.body.getBoundingClientRect().height <= innerHeight + 1), 'one screen while it tilts');
  // its own layer for the whole arrival: dropped when the tilt ended, a phone repainted the
  // whole sheet mid-drawing and flashed the bare table (only a real GPU shows it)
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).willChange), 'transform');
  // squared up, still a layer of its own, but no longer one held at the turn's scale
  await page.waitForFunction(() => document.body.getAnimations().every(a => a.animationName !== 'tilt'), null, { timeout: 3000 });
  if (await page.evaluate(() => document.documentElement.classList.contains('intro'))) assert.equal(await page.evaluate(() => getComputedStyle(document.body).willChange), 'opacity');
  await settle(page);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).transform), 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).willChange), 'auto', 'and lets it go after');
  await context.close();
});

test('at the first frame the whole sheet lies on the table, its near edge too, on any screen', async () => {
  for (const [width, height] of [[1440, 900], [1920, 1200], [1280, 640], [390, 844], [360, 640]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'commit' });
    await page.waitForFunction(() => document.body?.getAnimations().some(a => a.animationName === 'tilt'));
    const box = await page.evaluate(() => {
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; }
      const r = document.body.getBoundingClientRect();
      return { left: r.left, right: innerWidth - r.right, top: r.top, bottom: innerHeight - r.bottom };
    });
    // the table shows on all four sides, not just behind the far edge
    for (const [side, gap] of Object.entries(box)) assert.ok(gap >= 8, `${width}x${height}: the sheet's ${side} edge is ${Math.round(gap)} px from the screen's (${JSON.stringify(box)})`);
    await context.close();
  }
});

test('with scrollbars that take room (Windows), nothing shifts sideways when the arrival ends', async () => {
  // the shared browser hides scrollbars; this one draws them in the page's width, as Windows does
  const classic = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    // wider than 1920 the sheets are centred on the screen's width, which a newer Chrome reads
    // without the scrollbar's room only while that room is kept: so it is kept for good
    for (const viewport of [{ width: 1440, height: 900 }, { width: 2560, height: 1080 }]) {
      const page = await classic.newPage({ viewport });
      await page.goto(BASE + '/', { waitUntil: 'commit' });
      await page.waitForFunction(() => document.documentElement.classList.contains('intro') && document.querySelector('.term'));
      const place = () => page.evaluate(() => ({
        width: document.body.offsetWidth, term: document.querySelector('.term').offsetLeft,
        bar: document.querySelector('.bar a').offsetLeft, gutter: getComputedStyle(document.documentElement).scrollbarGutter,
      }));
      const during = await place();
      await page.waitForFunction(() => !document.documentElement.classList.contains('intro'), null, { timeout: 8000 });
      assert.deepEqual(await place(), during, `at ${viewport.width} the page is as wide, and the terminal and bar where they were, before and after`);
      assert.equal(during.gutter, 'stable');
      await page.close();
    }
  } finally { await classic.close(); }
});

// The arrival held open just before its end: one more animation it waits for
const HOLD = () => {
  const add = () => {
    const s = document.createElement('style');
    s.textContent = 'html.intro .foot { animation: hold 30s linear backwards; } @keyframes hold { from { outline-color: transparent; } }';
    document.head.append(s);
  };
  new MutationObserver((_, mo) => { if (document.head) { mo.disconnect(); add(); } }).observe(document, { childList: true, subtree: true });
};

test('when the arrival ends, the sheet does not change its look: text nothing was drawn over stays as it was', async () => {
  // (desktops: a phone's raster is a real GPU's, which this browser does not have)
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch });
    await context.addInitScript(HOLD);
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load' });
    // everything drawn, the class still on
    await page.waitForFunction(() => document.documentElement.classList.contains('intro') && document.getAnimations().filter(a => a.animationName && a.animationName !== 'hold' && a.playState !== 'finished' && a.effect.getComputedTiming().iterations !== Infinity).length === 0, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    // the text no drawing lies on (the drawn parts: the next test): it was
    // held a little soft in the layer the sheet turned in, and sharpened as the arrival ended
    const TEXT = ['.role', '.lede', '.site-photo figcaption'];
    const shots = async () => Promise.all(TEXT.map(s => page.locator(s).screenshot()));
    const held = await shots();
    await page.evaluate(() => { for (const a of document.getAnimations()) if (a.animationName === 'hold') a.finish(); });
    await page.waitForFunction(() => !document.documentElement.classList.contains('intro'));
    await page.waitForTimeout(600);
    const ended = await shots();
    // the same size, and no edge off by half a pixel: no pixel changes by more than half of what
    // lies between ink and paper (about 190 a channel). A layer held at the turn's scale drew
    // the line wider and its letters blurred; what is left is anti-aliasing.
    for (const [i, s] of TEXT.entries()) {
      const d = await page.evaluate(async ([a, b]) => {
        const px = async src => {
          const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${src}`)).blob());
          const c = new OffscreenCanvas(img.width, img.height).getContext('2d');
          c.drawImage(img, 0, 0);
          return { w: img.width, h: img.height, data: c.getImageData(0, 0, img.width, img.height).data };
        };
        const [x, y] = [await px(a), await px(b)];
        if (x.w !== y.w || x.h !== y.h) return { size: [`${x.w}x${x.h}`, `${y.w}x${y.h}`] };
        let max = 0;
        for (let k = 0; k < x.data.length; k++) max = Math.max(max, Math.abs(x.data[k] - y.data[k]));
        return { max };
      }, [held[i].toString('base64'), ended[i].toString('base64')]);
      assert.ok(!d.size, `${s} keeps its size at ${viewport.width} (${d.size})`);
      assert.ok(d.max <= 95, `${s} keeps its look at ${viewport.width} (edges off by ${d.max} of 255)`);
    }
    await context.close();
  }
});

test('when the arrival ends, the drawn lines and letters are already what stays: nothing on them changes', async () => {
  // the pens lie on the device pixels the real borders are painted on, as wide as those are
  // painted (whole device pixels); the drawn name stays. A Windows laptop at 125 % and a phone
  // (whose text has no colour fringes) get a browser at their pixel density, which lays out in
  // device pixels as theirs do; an emulated density does not.
  const SCREENS = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 2560, height: 1080 },
    { width: 1440, height: 900, scale: 1.25 }, { width: 412, height: 892, scale: 2.625, phone: true }];
  for (const viewport of SCREENS) {
    const own = viewport.scale && await chromium.launch({ args: [`--force-device-scale-factor=${viewport.scale}`, `--window-size=${viewport.width},${viewport.height}`, ...(viewport.phone ? ['--disable-lcd-text'] : [])] });
    const context = own ? await own.newContext({ viewport: null }) : await browser.newContext({ viewport });
    await context.addInitScript(HOLD);
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.classList.contains('intro') && document.getAnimations().filter(a => a.animationName && a.animationName !== 'hold' && a.playState !== 'finished' && a.effect.getComputedTiming().iterations !== Infinity).length === 0, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    // each part with a little paper round it; the terminal by its frame's top, which its typing
    // (it starts as the arrival ends) leaves alone
    const clips = await page.evaluate(() => ['.name', '.titleblock', '.site-photo .photo', '.act-main[data-pen]', '.term'].map(s => {
      const r = document.querySelector(s).getBoundingClientRect();
      const h = s === '.term' ? document.querySelector('.term-head').getBoundingClientRect().bottom - r.top : r.height;
      return { s, clip: { x: Math.floor(r.left) - 3, y: Math.floor(r.top) - 3, width: Math.ceil(r.width) + 6, height: Math.ceil(h) + 6 } };
    }));
    const shots = () => Promise.all(clips.map(({ clip }) => page.screenshot({ clip })));
    const held = await shots();
    await page.evaluate(() => { for (const a of document.getAnimations()) if (a.animationName === 'hold') a.finish(); });
    await page.waitForFunction(() => !document.documentElement.classList.contains('intro'));
    await page.waitForTimeout(600);
    const ended = await shots();
    for (const [i, { s }] of clips.entries()) {
      const d = await page.evaluate(async ([a, b]) => {
        const px = async src => {
          const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${src}`)).blob());
          const c = new OffscreenCanvas(img.width, img.height).getContext('2d');
          c.drawImage(img, 0, 0);
          return c.getImageData(0, 0, img.width, img.height).data;
        };
        const [x, y] = [await px(a), await px(b)];
        let max = 0;
        for (let k = 0; k < x.length; k++) max = Math.max(max, Math.abs(x[k] - y[k]));
        return max;
      }, [held[i].toString('base64'), ended[i].toString('base64')]);
      // a line half a pixel off, a device pixel wider, or a letter in another raster changes its
      // edges by 90 and more; what is left is anti-aliasing (a corner, a hair of phase)
      assert.ok(d <= 75, `${s} unchanged at ${viewport.width}x${viewport.scale ?? 1} (off by ${d} of 255)`);
    }
    await context.close();
    await own?.close();
  }
});

test('while the sheet lies tilted there is nothing to scroll to sideways, so a phone cannot start it off-centre', async () => {
  // the tilt projects the long page below the screen far out sideways; uncontained, that
  // was a page thousands of pixels wide that a phone could start scrolled or zoomed into
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.body?.getAnimations().some(a => a.animationName === 'tilt'));
  for (const at of [0, 600, 1199]) {
    const r = await page.evaluate(at => {
      const tilt = document.body.getAnimations().find(a => a.animationName === 'tilt');
      tilt.pause(); tilt.currentTime = at;
      scrollTo(200, 0);
      const out = { wide: document.documentElement.scrollWidth, x: scrollX };
      scrollTo(0, 0);
      return out;
    }, at);
    assert.deepEqual(r, { wide: 390, x: 0 }, `at ${at} ms into the tilt`);
  }
  await context.close();
});

test('the top bar has its final shape from the first frame, before any script file has come', async () => {
  for (const [width, shown] of [[390, '.menu-btn'], [1440, '.theme']]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    // only the page's own inline scripts run: what a slow phone paints before the rest arrives
    await page.route('**/*', r => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    assert.ok(await page.locator(shown).isVisible(), `${width} px: ${shown} shows from the start`);
    await context.close();
  }
});

test('the sheet walks up in 1.2 s, easing in as well as out, so the table registers first', async () => {
  const { context, page } = await open('/');
  const t = await page.evaluate(() => ({
    d: document.body.getAnimations().find(a => a.animationName === 'tilt').effect.getComputedTiming().duration,
    e: getComputedStyle(document.body).animationTimingFunction,
  }));
  assert.equal(t.d, 1200);
  assert.equal(t.e, 'cubic-bezier(0.5, 0, 0.25, 1)');
  await context.close();
});

test('on a phone the sheet tilts less', async () => {
  const { context, page } = await open('/', { width: 390, height: 844, hasTouch: true, isMobile: true });
  const from = await tiltFrom(page);
  const m = await page.evaluate(f => { const d = document.createElement('div'); d.style.transform = f; document.body.append(d); const t = getComputedStyle(d).transform; d.remove(); return t; }, from);
  assert.equal(angle(m), 14, from);
  await context.close();
});

test('the table is drafting-board green around every sheet, and stays dark by night', async () => {
  for (const [opts, table] of [[{}, 'rgb(201, 209, 198)'], [{ colorScheme: 'dark' }, 'rgb(14, 13, 19)'], [{ theme: 'dark' }, 'rgb(14, 13, 19)']]) {
    const { context, page } = await open('/projects', opts);
    assert.match(await page.locator('.frame').evaluate(f => getComputedStyle(f).boxShadow), new RegExp(table.replace(/[()]/g, '\\$&')), JSON.stringify(opts));
    await context.close();
  }
});

test('any key, wheel or tap hurries the arrival along', async () => {
  const { context, page } = await open('/');
  await page.keyboard.press('Shift');
  await page.waitForFunction(() => window.__log.arrived != null, null, { timeout: 4000 });
  const l = await log(page);
  // left alone it takes about 2 s
  assert.ok(l.arrived - l.intro < 1200, `over ${Math.round(l.arrived - l.intro)} ms after it began`);
  // hurried, not cut: the dimension still ends up there, with the name's width
  await page.waitForTimeout(600);
  assert.equal((await page.locator('.name-dim text').textContent()).trim(), String(Math.round(await nameWidth(page))));
  await context.close();
});

test('a wheel turned while the sheet squares up is not lost: it scrolls once it has', async () => {
  const { context, page } = await open('/');
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 700);
  await page.waitForFunction(() => window.__log.arrived != null, null, { timeout: 4000 });
  await page.waitForTimeout(800);
  assert.ok(await page.evaluate(() => scrollY) > 300, `scrolled to ${await page.evaluate(() => scrollY)}`);
  await context.close();
});

test('a wheel turned before the arrival script has loaded still hurries it and still scrolls', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route(PAGE_SCRIPT, async r => { await new Promise(res => setTimeout(res, 900)); await r.continue(); });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.documentElement.classList.contains('intro'));
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 700);
  await page.waitForFunction(() => !document.documentElement.classList.contains('intro'), null, { timeout: 5000 });
  await page.waitForTimeout(900);
  assert.ok(await page.evaluate(() => scrollY) > 300, `scrolled to ${await page.evaluate(() => scrollY)}`);
  await context.close();
});

test('printed mid-arrival, the page prints whole', async () => {
  const { context, page } = await open('/');
  await page.emulateMedia({ media: 'print' });
  // printing stops the animations, which ends the arrival soon after; the print itself may be
  // laid out before that, with the class still on
  const body = await page.evaluate(() => (document.documentElement.classList.add('intro'), { overflow: getComputedStyle(document.body).overflowY, long: document.documentElement.scrollHeight > innerHeight * 2, transform: getComputedStyle(document.body).transform }));
  assert.deepEqual(body, { overflow: 'visible', long: true, transform: 'none' });
  await context.close();
});

test('a font that arrives late leaves nothing half-drawn behind', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route(/Archivo\.woff2/, async r => { await new Promise(res => setTimeout(res, 3000)); await r.continue(); });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForTimeout(5500);
  const left = await page.evaluate(() => ({
    intro: document.documentElement.classList.contains('intro'),
    overlays: document.querySelectorAll('.glyphs, .pens, .name-guides').length,
    name: getComputedStyle(document.querySelector('.name span')).color,
  }));
  assert.deepEqual(left, { intro: false, overlays: 0, name: 'rgb(43, 39, 102)' });
  await context.close();
});

test('resizing the window mid-arrival hurries it to the end, rather than misdraw it', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForFunction(() => window.__log.arrived != null, null, { timeout: 3000 });
  const l = await log(page);
  assert.ok(l.arrived - l.intro < 1500, `over ${Math.round(l.arrived - l.intro)} ms after it began`);
  assert.equal(await page.locator('.glyphs, .pens').count(), 0);
  await context.close();
});

// the homepage's script: intro.js on its own in dev, bundled into the page's script in a build
const PAGE_SCRIPT = /intro\.js|index\.astro.*type=script|index\.astro_astro_type_script/;

test('ended by anyone else (the head\'s backstop), the arrival still leaves no drawing behind', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 3000 });
  await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
  await page.evaluate(() => { document.documentElement.classList.remove('intro'); document.dispatchEvent(new CustomEvent('ovz:arrived')); });
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.glyphs, .pens, .name-guides').count(), 0);
  await context.close();
});

test('the crosshair parks with its reading clear of the name', async () => {
  const { context, page } = await open('/');
  await page.waitForFunction(() => performance.now() - window.__log.intro > 2250, null, { timeout: 6000 });
  const [read, name] = await page.evaluate(() => [document.querySelector('.xhair-read'), document.querySelector('.name')].map(e => e.getBoundingClientRect().toJSON()));
  assert.ok(await page.locator('.xhair').evaluate(x => x.classList.contains('on')), 'still parked');
  assert.ok(!overlaps(read, name), `reading ${JSON.stringify(read)} clear of the name ${JSON.stringify(name)}`);
  await context.close();
});

test('the drawn parts keep the arrival\'s own clock, even on a slow phone', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForSelector('.sheet-you > .pens', { state: 'attached', timeout: 4000 });
  await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 4000 });
  // when each one's drawing begins, in the tilt's clock (ms)
  const at = await page.evaluate(() => {
    const t0 = document.body.getAnimations().find(a => a.animationName === 'tilt').startTime;
    const begins = el => { const a = el.getAnimations()[0]; return Math.round(a.startTime + a.effect.getTiming().delay - t0); };
    const term = document.querySelector(`.pens [data-for="${[...document.querySelectorAll('[data-pen]')].indexOf(document.querySelector('.term'))}"]`);
    return { letter: begins(document.querySelector('.glyph .g-line')), term: begins(term) };
  });
  assert.ok(Math.abs(at.letter - 670) <= 5, `first letter traced at ${at.letter} ms`);
  assert.ok(Math.abs(at.term - 700) <= 5, `terminal drawn from ${at.term} ms`);
  await context.close();
});

test('if the arrival script never runs, the page settles by itself', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let blocked = 0;
  await context.route(PAGE_SCRIPT, r => { blocked++; return r.abort(); });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  assert.ok(blocked > 0, 'the script really was kept out');
  await page.waitForFunction(() => !document.documentElement.classList.contains('intro'), null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).transform), 'none');
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 2), 'and scrolls');
  await context.close();
});

// the arrival's CSS animations, all paused at t ms in their own clock
const seek = (page, t) => page.evaluate(t => {
  const t0 = document.body.getAnimations().find(a => a.animationName === 'tilt')?.startTime ?? 0;
  for (const a of document.getAnimations()) if (a.animationName) { a.pause(); a.currentTime = Math.max(0, t - ((a.startTime ?? t0) - t0)); }
}, t);

test('each letter of the name is drawn from construction lines, then inked', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
  const lines = await page.locator('.name .glyphs').evaluateAll(ss => ss.map(s => ({
    hidden: s.getAttribute('aria-hidden'),
    letters: s.querySelectorAll('.glyph').length,
    boxes: s.querySelectorAll('.glyph .g-box').length,
    outlines: [...s.querySelectorAll('.glyph .g-line')].filter(p => p.getAttribute('pathLength') === '1').length,
  })));
  assert.deepEqual(lines, [
    ...NAME_LINES.map(l => ({ hidden: 'true', letters: l.length, boxes: l.length, outlines: l.length })),
  ]);
  // the letters come one after another, not all at once
  const delays = await page.locator('.name .glyph .g-line').evaluateAll(ps => ps.map(p => p.getAnimations()[0]?.effect.getComputedTiming().delay));
  assert.ok(delays.every((d, i) => i === 0 || d > delays[i - 1]), `staggered (${delays.join(', ')})`);
  // the real text waits, invisible, under the drawing; the page itself starts blank
  assert.equal(await page.locator('.name').evaluate(n => getComputedStyle(n.querySelector('span')).color), 'rgba(0, 0, 0, 0)');
  await context.close();
});

test('an inked letter is the font\'s own weight: the pen\'s outline goes as the ink comes in', async () => {
  const { context, page } = await open('/');
  await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
  await seek(page, 2300);
  const lines = await page.locator('.name .g-line').evaluateAll(ps => ps.map(p => [getComputedStyle(p).strokeOpacity, getComputedStyle(p).fillOpacity]));
  assert.ok(lines.length > 0 && lines.every(([s, f]) => s === '0' && f === '1'), JSON.stringify(lines));
  await context.close();
});

test('the drawn letters lie exactly on the real ones', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844, hasTouch: true, isMobile: true }]) {
    const { context, page } = await open('/', viewport);
    await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
    await seek(page, 1500);
    // each drawn letter's origin against the same letter in the real text, and each line's ink
    // against its line box
    const lines = await page.evaluate(() => [...document.querySelectorAll('.name > span')].map((span, n) => {
      const svg = document.querySelectorAll('.name .glyphs')[n];
      const sb = svg.getBoundingClientRect(), k = sb.width / svg.viewBox.baseVal.width;
      const text = span.firstChild, chars = [];
      for (let i = 0; i < text.length; i++) {
        if (!text.data[i].trim()) continue;
        const r = document.createRange(); r.setStart(text, i); r.setEnd(text, i + 1);
        chars.push(r.getBoundingClientRect().left);
      }
      const origins = [...svg.querySelectorAll('.glyph')].map(g => sb.left + g.transform.baseVal[0].matrix.e * k);
      // the real baseline: where a zero-size inline box sits
      const probe = document.createElement('i');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      span.append(probe);
      const base = probe.getBoundingClientRect().top;
      probe.remove();
      // the letters that stand flat on it (round ones overshoot, as type does)
      const flat = [...svg.querySelectorAll('.glyph')].filter(g => /^[EHzrlmnu]$/.test(g.dataset.char ?? ''));
      const ink = flat.map(g => +(g.querySelector('.g-line').getBoundingClientRect().bottom - base).toFixed(2));
      return { off: origins.map((o, i) => +(o - chars[i]).toFixed(2)), ink };
    }));
    for (const l of lines) {
      assert.ok(l.off.every(d => Math.abs(d) < 1), `letters within 1 px of the text at ${viewport.width} (${l.off.join(', ')})`);
      assert.ok(l.ink.length >= 2 && l.ink.every(d => Math.abs(d) < 2), `flat letters stand on the baseline within 2 px at ${viewport.width} (${l.ink.join(', ')})`);
    }
    await context.close();
  }
});

test('once arrived the drawn name stands for the text, which readers and copying still get, until the width changes or it is printed', async () => {
  const { context, page } = await open('/');
  await settle(page);
  assert.equal(await page.locator('.name .glyphs').count(), 2);
  assert.equal(await page.locator('.name').evaluate(n => getComputedStyle(n.querySelector('span')).color), 'rgba(0, 0, 0, 0)');
  assert.equal((await page.locator('h1.name').textContent()).replace(/\s+/g, ' ').trim(), 'Ezra Hulsman');
  // printed, the text is printed
  await page.emulateMedia({ media: 'print' });
  const printed = await page.evaluate(() => [getComputedStyle(document.querySelector('.name .glyphs')).display, getComputedStyle(document.querySelector('.name span')).color]);
  assert.equal(printed[0], 'none');
  assert.notEqual(printed[1], 'rgba(0, 0, 0, 0)', 'the text prints');
  await page.emulateMedia({ media: null });
  // another width sets the text anew, where the drawing would lie wrong: the text takes over
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForFunction(() => document.querySelectorAll('.name .glyphs').length === 0, null, { timeout: 1000 });
  // (the ink eases back from the print's black)
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.name span')).color === 'rgb(43, 39, 102)', null, { timeout: 1500 });
  await context.close();
});

test('a second visit, reduced motion and no JS never draw the letters', async () => {
  for (const opts of [{ reducedMotion: 'reduce' }, { js: false }]) {
    const { context, page } = await open('/', opts);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.name .glyphs').count(), 0, JSON.stringify(opts));
    await context.close();
  }
  const { context, page } = await open('/?intro=0');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.name .glyphs').count(), 0, 'second visit');
  await context.close();
});

test('the name gets a dimension line with its real width', async () => {
  const { context, page } = await open('/');
  await settle(page);
  const dim = page.locator('.name-dim');
  assert.equal(await dim.count(), 1);
  const w = await nameWidth(page);
  assert.equal((await dim.locator('text').textContent()).trim(), String(Math.round(w)));
  const [d, n] = await Promise.all([dim.boundingBox(), page.locator('.name').boundingBox()]);
  assert.ok(Math.abs(d.width - w) < 12, `as wide as the name (${Math.round(d.width)} vs ${Math.round(w)})`);
  assert.ok(d.y + d.height <= n.y + 4, 'drawn above the name');
  assert.equal(await dim.getAttribute('aria-hidden'), 'true');
  await context.close();
});

test('the dimension\'s extension lines reach the line it measures', async () => {
  const { context, page } = await open('/');
  await settle(page);
  // the right one runs down past the shorter first line to the widest line's cap height
  const [ext, widest] = await page.evaluate(() => {
    const d = document.querySelector('.name-dim');
    const right = d.querySelector('.dim-end').getBBox();
    const top = d.getBoundingClientRect().top;
    const spans = [...document.querySelectorAll('.name > span')].map(s => { const r = document.createRange(); r.selectNodeContents(s); return r.getBoundingClientRect(); });
    const w = spans.reduce((a, b) => (b.width > a.width ? b : a));
    return [top + right.y + right.height, w.top];
  });
  assert.ok(ext > widest, `extension line reaches down to ${Math.round(ext)}, the widest line's box starts at ${Math.round(widest)}`);
  await context.close();
});

test('the dimension follows the name when the window changes size', async () => {
  const { context, page } = await open('/');
  await settle(page);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(300);
  assert.equal((await page.locator('.name-dim text').textContent()).trim(), String(Math.round(await nameWidth(page))));
  await context.close();
});

test('the ANNA drawing is sized for the page, not for the tilted sheet it was measured on', async () => {
  // measured mid-tilt, perspective made the stage look larger than it is, and nothing measured
  // it again: the model drawn too large, the lower level labels off the screen
  const { context, page } = await open('/');
  await settle(page);
  const r = await page.evaluate(() => {
    const stage = document.querySelector('canvas').parentElement, c = stage.querySelector('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1);
    return { w: stage.clientWidth * dpr, h: stage.clientHeight * dpr, cw: c.width, ch: c.height };
  });
  assert.ok(Math.abs(r.cw - r.w) <= 1 && Math.abs(r.ch - r.h) <= 1, JSON.stringify(r));
  await context.close();
});

test('the terminal waits for the arrival before it types', async () => {
  const { context, page } = await open('/');
  await page.waitForFunction(() => window.__log.typed != null, null, { timeout: 8000 });
  const l = await log(page);
  assert.ok(l.typed >= l.arrived, `typed at ${Math.round(l.typed)} ms, arrival over at ${Math.round(l.arrived)} ms`);
  await context.close();
});

test('the canvas takes its ink after the arrival, not the developing grey', async () => {
  const { context, page } = await open('/');
  await settle(page);
  await page.locator('#anna').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(2500);
  // the darkest stroke on the canvas is full ink, not the hairline grey it started from
  const darkest = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let min = 765;
    for (let i = 0; i < d.length; i += 4 * 7) if (d[i + 3] > 200) min = Math.min(min, d[i] + d[i + 1] + d[i + 2]);
    return min;
  });
  assert.ok(darkest < 300, `darkest canvas pixel sums to ${darkest}`);
  await context.close();
});

test('on a desktop the crosshair travels to the name by itself', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(1400);
  assert.equal(await page.locator('.xhair').evaluate(x => x.classList.contains('on')), true, 'the crosshair is out, with no mouse moved');
  assert.match(await page.locator('.xhair-read').textContent(), /^x \d+ {2}y \d+$/);
  await context.close();
});

test('a second visit in the same session skips straight to the dimension', async () => {
  const { context, page } = await open('/');
  await settle(page);
  // back to Home from another page (a reload at the top is the exception, below)
  await page.goto(BASE + '/blog', { waitUntil: 'load' });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  assert.equal((await log(page)).intro, null, 'no intro on the second visit');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.name-dim').count(), 1);
  await context.close();
});

test('reloaded at the top, it plays again, letters and boxes drawn anew', async () => {
  const { context, page } = await open('/');
  await settle(page);
  await page.reload({ waitUntil: 'load' });
  assert.ok((await log(page)).intro != null, 'the arrival plays on the reload');
  await page.waitForSelector('.name .glyphs', { state: 'attached', timeout: 3000 });
  assert.ok(await page.locator('.pens').count() > 0, 'the boxes are drawn again');
  await settle(page);
  assert.equal(await page.locator('.pens').count(), 0);
  assert.equal(await page.locator('.name .glyphs').count(), 2, 'one drawn name, its two lines');
  await context.close();
});

test('reloaded further down, it does not play and the page keeps its place', async () => {
  const { context, page } = await open('/');
  await settle(page);
  await page.evaluate(() => scrollTo(0, 1600));
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'load' });
  assert.equal((await log(page)).intro, null, 'no arrival');
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => scrollY) > 1200, 'still where it was read');
  await context.close();
});

test('?intro=1 replays it, ?intro=0 skips it', async () => {
  const { context, page } = await open('/');
  await settle(page);
  await page.goto(BASE + '/?intro=1', { waitUntil: 'load' });
  assert.ok((await log(page)).intro != null, 'replayed');
  await context.close();
  const fresh = await open('/?intro=0');
  assert.equal((await log(fresh.page)).intro, null, 'skipped');
  await fresh.context.close();
});

test('reduced motion: no arrival, the dimension is simply there', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  assert.equal((await log(page)).intro, null);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.name-dim').count(), 1);
  await context.close();
});

test('without JS nothing is hidden and nothing animates', async () => {
  const { context, page } = await open('/', { js: false });
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro')), false);
  for (const c of await page.locator('.name span').evaluateAll(ss => ss.map(s => getComputedStyle(s).clipPath))) assert.equal(c, 'none');
  await context.close();
});

test('inner pages and links into the page never play it', async () => {
  for (const path of ['/projects', '/blog', '/#contact']) {
    const { context, page } = await open(path);
    assert.equal((await log(page)).intro, null, `${path} plays no intro`);
    await context.close();
  }
});

test('on a phone it plays without the crosshair, and the dimension fits the screen', async () => {
  const { context, page, errors } = await open('/', { width: 390, height: 844, hasTouch: true, isMobile: true });
  assert.ok((await log(page)).intro != null);
  await settle(page);
  assert.equal(await page.locator('.xhair').evaluate(x => getComputedStyle(x).display), 'none');
  const d = await page.locator('.name-dim').boundingBox();
  assert.ok(d.x >= 0 && d.x + d.width <= 390);
  assert.deepEqual(errors, []);
  await context.close();
});

test('in the dark theme the sheet is simply dark from the start: no flicker, no lagging colours', async () => {
  const { context, page } = await open('/', { colorScheme: 'dark' });
  // a flickering lamp read as the page failing to render (Ezra, 2026-10-10)
  const anims = await page.evaluate(() => document.getAnimations().map(a => a.animationName));
  assert.ok(!anims.includes('lamp'), `no lamp (got ${anims.join(', ')})`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(22, 20, 29)');
  // the sheet's colour transitions would lag while the paper covering the text does not:
  // blocks of other paper on a dark sheet
  assert.deepEqual(await page.evaluate(() => [document.body, document.querySelector('.frame')].map(e => getComputedStyle(e).transitionDuration)), ['0s', '0s']);
  await settle(page);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(22, 20, 29)');
  await context.close();
});

test('the name is lettered in full ink while the rest develops, in either dark theme too', async () => {
  for (const [opts, ink] of [[{}, 'rgb(43, 39, 102)'], [{ colorScheme: 'dark' }, 'rgb(216, 212, 240)'], [{ theme: 'dark' }, 'rgb(216, 212, 240)']]) {
    const { context, page } = await open('/', opts);
    assert.ok((await log(page)).intro != null);
    assert.equal(await page.locator('.name').evaluate(n => getComputedStyle(n).color), ink, JSON.stringify(opts));
    await context.close();
  }
});
