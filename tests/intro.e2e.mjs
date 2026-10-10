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
      bar: getComputedStyle(document.querySelector('.bar')).opacity,
      frame: getComputedStyle(document.querySelector('.frame')).borderTopColor,
    };
  });
  // full width: no transform yet, however the browser writes that
  for (const t of at0.covered) assert.match(t, /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/, 'text covered at the start');
  assert.match(at0.head, /inset\(0px 100%/);
  for (const b of at0.borders) assert.equal(b, 'rgba(0, 0, 0, 0)', 'boxes not yet drawn');
  assert.equal(at0.photo, '0');
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
    const off = await page.evaluate(() => {
      const svg = document.querySelector('.sheet-you > .pens');
      return ['.term', '.titleblock', '.act-main', '.site-photo .photo'].map(s => {
        const p = svg.querySelector(`[data-for="${s}"]`).getBoundingClientRect(), r = document.querySelector(s).getBoundingClientRect();
        return Math.max(Math.abs(p.left - r.left), Math.abs(p.top - r.top), Math.abs(p.right - r.right), Math.abs(p.bottom - r.bottom));
      });
    });
    assert.ok(off.every(d => d < 1.5), `drawn on the real borders at ${viewport.width} (${off.map(d => d.toFixed(2)).join(', ')})`);
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
    photo: getComputedStyle(document.querySelector('.site-photo .photo')).opacity,
  }));
  assert.equal(after.pens, 0);
  assert.ok(after.dwgs >= 2, `${after.dwgs} drawings on the page`);
  for (const c of after.covers) assert.equal(c, 'none');
  for (const b of after.borders) assert.equal(b, 'rgb(43, 39, 102)');
  assert.equal(after.photo, '1');
  await context.close();
});

test('the arrival never repaints the whole page frame by frame', async () => {
  // a colour animated on the root restyles every element on every frame: phones stutter
  for (const opts of [{}, { colorScheme: 'dark' }]) {
    const { context, page } = await open('/', opts);
    const on = await page.evaluate(() => ({
      html: document.documentElement.getAnimations({ subtree: false }).map(a => a.animationName),
      body: document.body.getAnimations({ subtree: false }).map(a => a.animationName),
    }));
    assert.deepEqual(on.html, []);
    assert.deepEqual(on.body, ['tilt']);
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
  assert.ok(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).perspective) > 0), 'seen in perspective');
  // the table shows around the sheet while it lies there, and the sheet is one screen tall
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(201, 209, 198)');
  assert.ok(await page.evaluate(() => document.body.getBoundingClientRect().height <= innerHeight + 1), 'one screen while it tilts');
  await settle(page);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).transform), 'none');
  await context.close();
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
  await page.waitForTimeout(100);
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
    return { letter: begins(document.querySelector('.glyph .g-line')), term: begins(document.querySelector('.pens [data-for=".term"]')) };
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
      const line = document.createRange(); line.selectNodeContents(span);
      const t = line.getBoundingClientRect();
      const ink = Math.max(...[...svg.querySelectorAll('.g-line')].map(p => p.getBoundingClientRect().bottom));
      return { off: origins.map((o, i) => +(o - chars[i]).toFixed(2)), bottom: t.bottom - ink, h: t.height };
    }));
    for (const l of lines) {
      assert.ok(l.off.every(d => Math.abs(d) < 1), `letters within 1 px of the text at ${viewport.width} (${l.off.join(', ')})`);
      assert.ok(l.bottom > -2 && l.bottom < l.h * .4, `stands in its line box (${l.bottom.toFixed(1)})`);
    }
    await context.close();
  }
});

test('once arrived the drawing is gone and the name is plain text again', async () => {
  const { context, page } = await open('/');
  await settle(page);
  assert.equal(await page.locator('.name .glyphs').count(), 0);
  assert.equal(await page.locator('.name').evaluate(n => getComputedStyle(n.querySelector('span')).color), 'rgb(43, 39, 102)');
  assert.equal((await page.locator('h1.name').textContent()).replace(/\s+/g, ' ').trim(), 'Ezra Hulsman');
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
  await page.reload({ waitUntil: 'load' });
  assert.equal((await log(page)).intro, null, 'no intro on the second visit');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.name-dim').count(), 1);
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
