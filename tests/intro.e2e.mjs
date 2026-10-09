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
const SETTLED = 3200; // the whole arrival is about 2 s, the dimension .55 s more; margin for a slow box

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
const nameWidth = page => page.evaluate(() => Math.max(...[...document.querySelectorAll('.name span')].map(s => {
  const r = document.createRange(); r.selectNodeContents(s); return r.getBoundingClientRect().width;
})));

test('a first visit plays the arrival once, then leaves the page as it always is', async () => {
  const { context, page, errors } = await open('/');
  assert.ok((await log(page)).intro != null, 'the intro class was set before the page settled');
  await page.waitForTimeout(SETTLED);
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

test('the arrival develops the ink and letters the name, without hiding the page', async () => {
  const { context, page } = await open('/');
  const anims = await page.evaluate(() => document.getAnimations().map(a => a.animationName).filter(Boolean));
  for (const name of ['develop', 'tilt', 'letters']) assert.ok(anims.includes(name), `${name} runs (got ${anims.join(', ')})`);
  // develop fades ink, never opacity: the page reads from the first frame
  assert.equal(await page.locator('main').evaluate(m => getComputedStyle(m).opacity), '1');
  assert.equal(await page.locator('.lede').evaluate(m => getComputedStyle(m).opacity), '1');
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
  await page.waitForTimeout(SETTLED);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).transform), 'none');
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

test('if the arrival script never runs, the page settles by itself', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route(/intro\.js/, r => r.abort());
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
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
    { hidden: 'true', letters: 4, boxes: 4, outlines: 4 },
    { hidden: 'true', letters: 7, boxes: 7, outlines: 7 },
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
  await page.waitForTimeout(SETTLED);
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
  await page.waitForTimeout(SETTLED);
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

test('the dimension follows the name when the window changes size', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(300);
  assert.equal((await page.locator('.name-dim text').textContent()).trim(), String(Math.round(await nameWidth(page))));
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
  await page.waitForTimeout(SETTLED);
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
  await page.waitForTimeout(SETTLED);
  await page.reload({ waitUntil: 'load' });
  assert.equal((await log(page)).intro, null, 'no intro on the second visit');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.name-dim').count(), 1);
  await context.close();
});

test('?intro=1 replays it, ?intro=0 skips it', async () => {
  const { context, page } = await open('/');
  await page.waitForTimeout(SETTLED);
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
  await page.waitForTimeout(SETTLED);
  assert.equal(await page.locator('.xhair').evaluate(x => getComputedStyle(x).display), 'none');
  const d = await page.locator('.name-dim').boundingBox();
  assert.ok(d.x >= 0 && d.x + d.width <= 390);
  assert.deepEqual(errors, []);
  await context.close();
});

test('in the dark theme the light table switches on, and ends on the dark sheet', async () => {
  const { context, page } = await open('/', { colorScheme: 'dark' });
  const anims = await page.evaluate(() => document.getAnimations().map(a => a.animationName));
  assert.ok(anims.includes('lamp'), `the lamp flickers on (got ${anims.join(', ')})`);
  await page.waitForTimeout(SETTLED);
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
