// End-to-end checks for the Overzicht homepage, derived from resume-lab/MUST-STAY-TRUE.md
// and the port plan. Needs a running site (npm run dev, or npm run build && npm run preview).
//
//   BASE=http://localhost:4321 node --test tests/overzicht.e2e.mjs
//
// The copy-parity test also needs the prototype (PROTO, default ~/Coding/resume-lab/proto);
// it is skipped when the prototype is not on this machine.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4321';
const PROTO = process.env.PROTO || `${homedir()}/Coding/resume-lab/proto`;

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(path = '/', { width = 1440, height = 900, reducedMotion = 'no-preference', js = true, storage } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, javaScriptEnabled: js });
  // the homepage's arrival is tested on its own (tests/intro.e2e.mjs); here the page is as it settles
  await context.addInitScript(() => { try { sessionStorage.setItem('ovz-arrived', '1'); } catch {} });
  if (storage) await context.addInitScript(s => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  return { context, page, errors, res };
}

// Visible text of the page chrome and content, with the live terminal left out:
// its output is the real terminal's, not prototype copy.
const pageText = () => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, .term-out, #terminal-body, .term-line, .skip, svg title').forEach(n => n.remove());
  // innerText needs layout; mount the clone off screen
  clone.style.cssText = 'position:absolute;left:-99999px;top:0;width:1400px';
  document.documentElement.append(clone);
  const t = clone.innerText;
  clone.remove();
  return t.replace(/\s+/g, ' ').trim();
};
// The same text as lines, one per block, so moved copy still matches.
const pageLines = () => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, .term-out, #terminal-body, .term-line, .skip, svg title').forEach(n => n.remove());
  clone.style.cssText = 'position:absolute;left:-99999px;top:0;width:1400px';
  document.documentElement.append(clone);
  const t = clone.innerText;
  clone.remove();
  return t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
};

async function activeTerminal(page) {
  await page.locator('#terminal-body').scrollIntoViewIfNeeded();
  await page.waitForSelector('.terminal-input-line', { timeout: 30000 });
}

async function run(page, cmd) {
  await page.click('#terminal-body');
  // the "real shell" hint leaves the body 1.5s after activation; read past it, or the slice is off
  await page.locator('#terminal-body .terminal-hint').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  const before = await page.locator('#terminal-body').innerText();
  await page.locator('#terminal-input').fill(cmd);
  await page.locator('#terminal-input').press('Enter');
  await page.waitForTimeout(250);
  const after = await page.locator('#terminal-body').innerText();
  return after.slice(before.length);
}

// The homepage started as a port of the prototype; it has since moved on (the person first,
// the terminal beside the photo), so this checks that no line of its copy was lost on the way.
// Lines retired on purpose are named here.
const RETIRED = new Set([
  'NOTE 7: A TERMINAL IS PROVIDED', // as rendered: the head is uppercase
  // the bar links to the pages now, the same on every sheet
  'ANNA', 'WORK', 'EXPERIENCE', 'ABOUT',
  // the homepage draws two projects; each drawn project keeps its two strongest dimensions
  'Four more things I built, each drawn at the point where it gets interesting. Not to scale.',
  'The rest of the set: smaller builds, each with its own sheet.',
  '0', 'mutating tools shipped', '13+', 'kinds of sensitive path hidden', '14', 'alert rules', '14%', 'less server code',
  'PROJECT WHAT IT IS STATUS', // the register is a list now, not a table with a header row
  // corrected after the 2026-10-09 fact-check against the repos, the homelab docs and the owner
  '233', '6', '−207 lines',
  'Three devices on a Tailscale mesh, fronted by Cloudflare tunnels, so no home device has a public port. Prometheus watches all of them, DNS resolves recursively with DNSSEC on every box, and backups cross devices every night.',
  'devices, one mesh', 'Also in the set', // the workstation makes four machines; the cards are "More projects"
  'Finance Bot Discord bot that turns bank exports into a categorized budget, with Claude for the hard cases Running since Jul 2025', // drawn now
  'A terminal Bible reader in Rust, running in the browser', // bible-tui has its own project now, not a side piece
  "About 32,000 lines of Python: a service layer, a command registry and two Claude backends. Every connected system is an MCP server, so adding one means registering a connector and granting access, not changing ANNA's core.",
  'Encrypted Chat TUI Self-hosted terminal chat in Rust: Tokio, a typed ndjson protocol, checked SQL Started Aug 2025',
  'This site Static-first Astro portfolio on Cloudflare Workers Launched Mar 2026',
  'Replaced a daily 10 to 15 minute manual health report across about 50 VMs with a Java and Playwright automation, delivered by CI/CD with Teams alerts. A Bash toolbox of scheduled scripts keeps storage from running out.',
  "Pega platform and DevOps engineering for Anamata's clients, alongside the Forward Deployed Engineer role. Pega Certified System Architect and Business Architect, 2023.",
  'Replaced plaintext passwords in documentation with a Python one-time-pad encryption system on a secure remote VPS. Looked after client Synology NAS infrastructure.',
  // 2026-10-09: experience is headed Experience; the notes and the scale note are in the third person
  'Revisions', 'Experience, newest first, the way a drawing records its changes.',
  'At 2 meters tall, I have a good overview of both the codebase and the room it gets deployed in.',
  "I'm a Forward Deployed Engineer at Anamata, where I own ANNA, our AI assistant in Microsoft Teams, and much of what we build around it.",
  'Most of that work is Python: connecting ANNA to the tools teams already use, and keeping it secure and reliable in production.',
  "I came to AI coding agents as a sceptic. Now they write a lot of my code, and I still build like one: tests first, a spec for anything bigger, and nothing ships that I can't explain.",
  'In my free time I work on personal projects like a self-hosted chat TUI in Rust, and contribute to open source when I can.',
  "I'm a big Formula 1 fan. There's something satisfying about both well-tuned race cars and well-optimized code.",
  // 2026-10-09: ANNA is read one level per step; the drawing labels the levels by name, −4 is Operations
  'Exploded view', 'What holds it up', '−4 RUNNING IT',
  "Memory, documents and connector access are scoped to the person asking. Connector secrets are stored encrypted, and when a login is needed, ANNA keeps the token, not the user's chat.",
]);
// the drawn projects the homepage leaves out are drawn on /projects, so their copy counts from there
test('every line of the prototype\'s copy is still on the homepage or /projects', { skip: !existsSync(`${PROTO}/index.html`) && 'prototype not found' }, async () => {
  const proto = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const pp = await proto.newPage();
  await pp.goto(`file://${PROTO}/index.html`);
  const want = await pp.evaluate(pageLines);
  await proto.close();

  const { context, page } = await open('/', { js: false });
  const got = new Set(await page.evaluate(pageLines));
  // a register row read as one line, the way the prototype's table row reads
  for (const l of await page.locator('.register li').evaluateAll(lis => lis.map(li => [...li.children].map(c => c.textContent.trim()).join(' ')))) got.add(l);
  await page.goto(BASE + '/projects');
  for (const l of await page.evaluate(pageLines)) got.add(l);
  await context.close();

  assert.deepEqual(want.filter(l => !got.has(l) && !RETIRED.has(l)), [], 'prototype lines missing from the site');
});

test('page title and description are the prototype\'s', { skip: !existsSync(`${PROTO}/index.html`) && 'prototype not found' }, async () => {
  const html = readFileSync(`${PROTO}/index.html`, 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const desc = html.match(/name="description" content="(.*?)"/)[1];
  const { context, page } = await open('/', { js: false });
  assert.equal(await page.title(), title);
  assert.equal(await page.getAttribute('meta[name="description"]', 'content'), desc);
  await context.close();
});

test('the real terminal is on the homepage with all 42 commands', async () => {
  const src = readFileSync(new URL('../src/scripts/interactive-terminal.ts', import.meta.url), 'utf8');
  const names = [...src.matchAll(/this\.commands\.set\('([^']+)'/g)].map(m => m[1]);
  assert.equal(names.length, 42, 'the terminal registers 42 commands');

  const { context, page, errors } = await open('/');
  await activeTerminal(page);
  // the intro typed itself, then the shell became real
  const intro = await page.locator('#terminal-body').innerText();
  assert.match(intro, /whoami/);
  assert.match(await run(page, 'cat resume'), /Forward Deployed Engineer/);
  assert.match(await run(page, 'cat resume | grep Engineer | wc -l'), /^\s*\d+\s*$/m);
  // everything except the ones that leave, navigate or take over the screen
  const skip = new Set(['open', 'exit', 'logout', 'sl', 'matrix', 'clear', 'theme']);
  for (const n of names.filter(n => !skip.has(n))) {
    const out = await run(page, n);
    assert.doesNotMatch(out, /command not found/, `${n} is wired up`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('the theme toggle, the terminal and the inner pages share one stored theme', async () => {
  const { context, page } = await open('/', { storage: { theme: 'light' } });
  const html = page.locator('html');
  assert.equal(await html.getAttribute('data-theme'), 'light');
  const toggle = page.locator('.theme');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');

  await toggle.click();
  assert.equal(await html.getAttribute('data-theme'), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await toggle.innerText(), 'WHITEPRINT');

  await page.reload();
  assert.equal(await html.getAttribute('data-theme'), 'dark');

  // the terminal's theme command moves the toggle too
  await activeTerminal(page);
  await run(page, 'theme light');
  assert.equal(await html.getAttribute('data-theme'), 'light');
  assert.equal(await page.locator('.theme').getAttribute('aria-pressed'), 'false');

  // and an inner page starts in the same theme
  await page.goto(BASE + '/resume');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await context.close();
});

test('dark chosen on a light system stays dark', async () => {
  const context = await browser.newContext({ colorScheme: 'light' });
  await context.addInitScript(() => localStorage.setItem('theme', 'dark'));
  // settled, not mid-arrival (the light table flickers on first; tests/intro.e2e.mjs)
  await context.addInitScript(() => sessionStorage.setItem('ovz-arrived', '1'));
  const page = await context.newPage();
  await page.goto(BASE + '/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(bg, 'rgb(22, 20, 29)');
  await context.close();
});

for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
  test(`no sideways scroll at ${w}x${h}`, async () => {
    const { context, page } = await open('/', { width: w, height: h });
    await page.waitForTimeout(800);
    for (let y = 0; y < 30; y++) {
      await page.mouse.wheel(0, h);
      await page.waitForTimeout(60);
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `page is ${over}px wider than the viewport`);
    await context.close();
  });
}

test('reduced motion: drawings arrive drawn, the terminal arrives filled', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.dwg:not(.drawn)').count(), 0);
  await page.locator('#terminal-body').scrollIntoViewIfNeeded();
  await page.waitForSelector('.terminal-input-line', { timeout: 1500 });
  await context.close();
});

test('the ANNA drawing plots, with native scroll and no errors', async () => {
  const { context, page, errors } = await open('/');
  // it sits below the first sheet, and plots once it is on screen
  await page.locator('#anna').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3500);
  const inked = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
    return n;
  });
  assert.ok(inked > 500, `canvas has ink (${inked} sampled pixels)`);
  // none of the old site's stylesheet (global.css, Tailwind) on this page
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary')), '');
  assert.equal(await page.evaluate(() => 'lenis' in window || '__lenis' in window || document.documentElement.classList.contains('lenis')), false);
  // scrolling turns the section into the exploded view
  await page.locator('[data-cloud="connectors"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.stage.turnable').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('ANNA is read level by level: one step per level, the drawing labelled with names only', async () => {
  const { context, page } = await open('/', { js: false });
  const levels = await page.locator('.stage .levels li').evaluateAll(ls => ls.map(l => l.dataset.level));
  assert.deepEqual(levels, ['identity', 'claude', 'connectors', 'ops']);
  // after the request, one step per level, top to bottom, each clouding its own level
  const steps = await page.locator('.scrolly .step').evaluateAll(ss => ss.map(s => s.dataset.request !== undefined ? 'request' : s.dataset.cloud));
  assert.deepEqual(steps, ['request', ...levels]);
  assert.deepEqual(await page.locator('.stage .levels li').allTextContents(), ['−1 Identity', '−2 Claude', '−3 MCP connectors', '−4 Operations']);
  await context.close();
});

test('side by side, the drawing explodes once, on a timer, when the first level is read to; the scroll never holds it half open', async () => {
  const { context, page } = await open('/?review');
  await page.locator('[data-request] h2').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  const q = () => page.evaluate(() => window.__scene.state.q);
  assert.equal(await q(), 0);
  // halfway between the request and the first level, the old scrub would sit half open
  const mid = await page.evaluate(() => {
    const a = document.querySelector('[data-request]').getBoundingClientRect(), b = document.querySelector('[data-cloud="identity"]').getBoundingClientRect();
    return scrollY + (a.top + a.height / 2 + b.top + b.height / 2) / 2 - innerHeight / 2;
  });
  for (const y of [mid - 200, mid, mid + 200]) {
    await page.evaluate(y => scrollTo(0, y), y);
    await page.waitForTimeout(1300);
    const v = await q();
    assert.ok(v === 0 || v === 1, `settled at ${v} at scroll ${Math.round(y)}`);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('[data-request] h2').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  await page.locator('[data-cloud="identity"] h2').evaluate(h => h.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  const during = await q();
  assert.ok(during > 0 && during < 1, `a transition, not a jump: ${during}`);
  await page.waitForTimeout(1200);
  assert.equal(await q(), 1);
  assert.equal(await page.evaluate(() => window.__scene.state.cloud), 'identity');
  // the later levels keep it open and cloud their own plate
  await page.locator('[data-cloud="ops"] h2').evaluate(h => h.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  assert.equal(await q(), 1);
  assert.equal(await page.evaluate(() => window.__scene.state.cloud), 'ops');
  await context.close();
});

// the step a level's text is read in sits on screen, roughly in the middle
const readingStep = (page, id) => page.locator(`[data-cloud="${id}"] h2`).evaluate(h => { const r = h.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; });

test('a level\'s label, or its plate, takes you to its text', async () => {
  const { context, page } = await open('/?review');
  await page.locator('[data-cloud="identity"] h2').evaluate(h => h.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1800);
  // the label is a link to the level's step
  await page.locator('.stage .levels li[data-level="ops"] a').click();
  await page.waitForTimeout(1200);
  assert.ok(await readingStep(page, 'ops'), 'the label scrolled to Operations');
  await page.waitForTimeout(600);
  // and the plate itself, clicked on the drawing
  const at = await page.evaluate(() => { const s = document.querySelector('.stage').getBoundingClientRect(), c = window.__scene.plateCenter('connectors'); return { x: s.left + c.x, y: s.top + c.y }; });
  assert.equal(await page.evaluate(([x, y]) => window.__scene.levelAt(x - document.querySelector('.stage').getBoundingClientRect().left, y - document.querySelector('.stage').getBoundingClientRect().top), [at.x, at.y]), 'connectors');
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(1200);
  assert.ok(await readingStep(page, 'connectors'), 'the plate scrolled to MCP connectors');
  await context.close();
});

test('the level being read slides out of the stack, and the others step back', async () => {
  const { context, page } = await open('/?review');
  await page.locator('[data-request] h2').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  const dim = () => page.locator('.stage .levels li').evaluateAll(ls => Object.fromEntries(ls.map(l => [l.dataset.level, l.classList.contains('dim')])));
  assert.deepEqual(Object.values(await dim()), [false, false, false, false], 'nothing stepped back in section');
  await page.locator('[data-cloud="claude"] h2').evaluate(h => h.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1600);
  const out = await page.evaluate(() => window.__scene.plateCenter('claude'));
  const still = await page.evaluate(() => window.__scene.plateCenter('identity'));
  assert.equal(await page.evaluate(() => window.__scene.state.focus), 'claude');
  assert.deepEqual(await dim(), { identity: true, claude: false, connectors: true, ops: true });
  // the next level takes over: Claude slides back in, MCP connectors out
  await page.locator('[data-cloud="connectors"] h2').evaluate(h => h.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => window.__scene.plateCenter('claude'));
  assert.ok(out.x - back.x > 12, `Claude slid out by ${Math.round(out.x - back.x)}px and back`);
  const idNow = await page.evaluate(() => window.__scene.plateCenter('identity'));
  assert.ok(Math.abs(idNow.x - still.x) < 2, 'a level that is not read stays put');
  await context.close();
});

test('the employment status line is shown', async () => {
  const { context, page } = await open('/', { js: false });
  assert.equal((await page.locator('.status').innerText()).trim(), 'Currently employed • Open to connect');
  await context.close();
});

test('keyboard focus is visible', async () => {
  const { context, page } = await open('/');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // first bar link
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, 'none');
  await context.close();
});

// The inner pages have their own checks in tests/sheets.e2e.mjs.

test('the drawings appear even if IntersectionObserver never fires', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(3500);
  const inked = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
    return n;
  });
  assert.ok(inked > 500, 'the ANNA drawing plotted');
  for (const id of ['henk', 'finance']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  assert.equal(await page.locator('.dwg.drawn').count(), 2);
  await context.close();
});

test('reduced motion on a dark phone: the drawing is never inked in black', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.waitForTimeout(400);
  const black = await page.evaluate(() => {
    const c = document.querySelector('canvas.drawing');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4 * 8) if (d[i + 3] > 200 && d[i] + d[i + 1] + d[i + 2] < 30) n++;
    return n;
  });
  assert.equal(black, 0);
  await context.close();
});

test('the light table has depth: darker round the sheet, panels a hair lighter, more grain; the whiteprint stays flat', async () => {
  const read = async scheme => {
    const { context, page } = await open('/', { storage: { theme: scheme } });
    const r = await page.evaluate(() => {
      // relative luminance of an rgb() string, alpha folded onto the sheet
      const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const css = getComputedStyle(document.documentElement);
      const probe = v => { const d = document.createElement('div'); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      return {
        sheet: lum(getComputedStyle(document.body).backgroundColor),
        table: lum(probe('--table')),
        panel: lum(probe('--panel')),
        detail: getComputedStyle(document.querySelector('.detail')).backgroundColor,
        card: getComputedStyle(document.querySelector('#register .card')).backgroundColor,
        grain: +css.getPropertyValue('--grain-a'),
      };
    });
    await context.close();
    return r;
  };
  const dark = await read('dark');
  assert.ok(dark.table < dark.sheet - 3, `table ${dark.table} under sheet ${dark.sheet}`);
  assert.ok(dark.panel > dark.sheet && dark.panel < dark.sheet + 12, `panel ${dark.panel} a hair over sheet ${dark.sheet}`);
  assert.notEqual(dark.detail, 'rgba(0, 0, 0, 0)', 'drawn panels are lifted');
  assert.notEqual(dark.card, 'rgba(0, 0, 0, 0)', 'cards are lifted');
  assert.ok(dark.grain > 0.035, `grain ${dark.grain}`);
  const light = await read('light');
  assert.equal(light.table, light.sheet);
  assert.equal(light.detail, 'rgba(0, 0, 0, 0)');
});

test('the browser bar colour follows the chosen theme', async () => {
  const context = await browser.newContext({ colorScheme: 'light' });
  await context.addInitScript(() => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark'); });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.waitForTimeout(300);
  const bar = () => page.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content.toUpperCase()));
  assert.deepEqual([...new Set(await bar())], ['#16141D']);
  await page.locator('.theme').click();
  await page.waitForTimeout(700);
  assert.deepEqual([...new Set(await bar())], ['#EFEDF3']);
  await context.close();
});

test('Henk\'s blocked call stays a dashed redline once drawn', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  const dash = await page.evaluate(() => getComputedStyle(document.querySelector('#henk .red .dash')).strokeDasharray);
  assert.notEqual(dash, 'none');
  await context.close();
});

test('phones reach every section through the menu button', async () => {
  const { context, page } = await open('/', { width: 390, height: 844 });
  const btn = page.locator('.menu-btn');
  const links = page.locator('.bar nav a');
  assert.equal(await btn.isVisible(), true);
  assert.equal(await links.first().isVisible(), false);
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  assert.equal(await btn.getAttribute('aria-label'), 'Menu');

  await btn.click();
  assert.equal(await btn.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(await links.allInnerTexts(), ['PROJECTS', 'BLOG', 'RÉSUMÉ', 'CONTACT']);

  // Escape closes it and gives focus back to the button
  await page.keyboard.press('Escape');
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('menu-btn')), true);

  // a tap outside closes it too
  await btn.click();
  await page.mouse.click(200, 600);
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');

  // the links go to the pages, the same as on every other sheet
  await btn.click();
  await page.waitForTimeout(700);
  await links.filter({ hasText: 'Résumé' }).click();
  await page.waitForURL(/\/resume$/);
  await context.close();
});

test('the homepage draws two projects in full and shows the rest as cards, ending on a way to all of them', async () => {
  const { context, page } = await open('/');
  assert.deepEqual(await page.locator('#details .detail').evaluateAll(els => els.map(e => e.id)), ['henk', 'finance']);
  for (const id of ['henk', 'finance']) assert.equal(await page.locator(`#${id} .dims > div`).count(), 1, `${id}: one dimension`);
  assert.match(await page.locator('#details .sheet-head p').innerText(), /^Two more things I built/);
  // the drawn ones a row each, with room round them
  for (const id of ['henk', 'finance']) {
    const [art, text, pad] = await page.locator(`#${id}`).evaluate(a => [a.querySelector('.dwg-wrap').getBoundingClientRect().right, a.querySelector('.detail-text').getBoundingClientRect().left, parseFloat(getComputedStyle(a).paddingTop)]);
    assert.ok(text >= art, `${id}: text beside the drawing`);
    assert.ok(pad >= 56, `${id}: ${pad}px above it`);
  }
  // the rest as cards, each once; this site is the page you are on, so it waits on /projects
  assert.equal(await page.locator('#register-h').innerText(), 'More projects');
  const reg = await page.locator('#register .reg-title a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  assert.deepEqual(reg, ['/projects/HomelabInfrastructure', '/projects/BibleTui', '/projects/EncryptedChatTUI', '/projects/PytaigaMcp', '/projects/ClaudeSandbox']);
  const size = await page.locator('#register .reg-title').first().evaluate(t => parseFloat(getComputedStyle(t).fontSize));
  assert.ok(size >= 18, `card titles are ${size}px`);
  // cards: framed like the drawn ones (the list draws top and left, each card its right and bottom), side by side
  const cards = page.locator('#register .register > li');
  assert.ok(await page.locator('#register .register').evaluate(l => parseFloat(getComputedStyle(l).borderTopWidth) > 0 && parseFloat(getComputedStyle(l).borderLeftWidth) > 0));
  for (const c of await cards.all()) assert.ok(await c.evaluate(li => parseFloat(getComputedStyle(li).borderRightWidth) > 0 && parseFloat(getComputedStyle(li).borderBottomWidth) > 0), 'a card has a frame');
  const xs = new Set(await cards.evaluateAll(lis => lis.map(li => Math.round(li.getBoundingClientRect().left))));
  assert.ok(xs.size >= 3, `cards in ${xs.size} columns`);
  // the last card is the way to all of them, and a whole card is the link
  const all = cards.last().locator('a.all-projects');
  assert.equal(await all.getAttribute('href'), '/projects');
  const [card, link] = await Promise.all([cards.last().boundingBox(), all.boundingBox()]);
  assert.ok(link.width >= card.width - 2 && link.height >= card.height - 2, 'the All projects link fills its card');
  await context.close();
});

test('wide screens keep the links in the bar and no menu button', async () => {
  const { context, page } = await open('/', { width: 1440, height: 900 });
  assert.equal(await page.locator('.menu-btn').isVisible(), false);
  assert.equal(await page.locator('.bar nav a').first().isVisible(), true);
  await context.close();
});

// ---------- portrait phones: the drawing leaves room to read, and holds still while you do ----------

const PHONE = { width: 390, height: 844 };

test('on a phone the stage leaves most of the screen for the text', async () => {
  const { context, page } = await open('/', PHONE);
  await page.locator('[data-request] h2').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const h = await page.locator('.stage').evaluate(s => s.getBoundingClientRect().height);
  assert.ok(h <= PHONE.height * 0.45, `the stage is ${Math.round(h)}px of ${PHONE.height}`);
  await context.close();
});

test('on a phone the request replays in section, with the chat in view', async () => {
  const { context, page } = await open('/?review', PHONE);
  await page.waitForTimeout(600);
  // scroll the way a thumb does until the replay button sits fully in the reading window
  for (let i = 0; i < 80; i++) {
    const bottom = await page.locator('.replay').evaluate(b => b.getBoundingClientRect().bottom);
    if (bottom < PHONE.height - 12) break;
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => window.__scene.state.q) < 0.05, 'still the section, not half exploded');
  // the chat sits below the stage, on screen, not under it
  const [stageBottom, chat] = await page.evaluate(() => [
    document.querySelector('.stage').getBoundingClientRect().bottom,
    document.querySelector('.callout-inline .bubble-q').getBoundingClientRect().toJSON(),
  ]);
  assert.ok(chat.top >= stageBottom - 1 && chat.bottom <= PHONE.height, `chat at ${Math.round(chat.top)}, stage ends at ${Math.round(stageBottom)}`);
  await page.locator('.replay').click();
  assert.ok(await page.evaluate(() => window.__scene.requestAge()) < 1, 'the request restarted');
  await context.close();
});

test('on a phone the next step explodes the drawing once it is read to', async () => {
  const { context, page } = await open('/?review', PHONE);
  await page.waitForTimeout(600);
  await page.locator('[data-cloud="connectors"] p').first().scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy(0, innerHeight * 0.2));
  await page.waitForTimeout(1400);
  assert.ok(await page.evaluate(() => window.__scene.state.q) > 0.95, 'exploded');
  assert.equal(await page.locator('.stage.turnable').count(), 1);
  await context.close();
});

for (const [w, h] of [[390, 844], [912, 1368]]) test(`on a ${w}x${h} portrait screen no step trails a screen of blank paper`, async () => {
  const { context, page } = await open('/', { width: w, height: h });
  const blanks = await page.locator('.step:not(.step-hero)').evaluateAll(steps => steps.map(s => {
    const last = [...s.children].filter(c => getComputedStyle(c).display !== 'none').at(-1);
    return Math.round(s.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom);
  }));
  for (const b of blanks) assert.ok(b <= 120, `blank under a step: ${blanks.join(', ')}px`);
  const pads = await page.locator('main > .sheet').evaluateAll(ss => ss.map(s => parseFloat(getComputedStyle(s).paddingTop)));
  // a phone's sheets close up; wider screens keep the desktop spacing
  if (w <= 860) for (const p of pads) assert.ok(p <= 64, `sheet top padding ${pads.join(', ')}px`);
  await context.close();
});

test('without JavaScript a phone gets no empty stage over the text, and still has the links', async () => {
  const { context, page } = await open('/', { ...PHONE, js: false });
  // nothing would draw it, so no sticky box covers the text; ANNA's levels read as a list
  assert.notEqual(await page.locator('.stage').evaluate(s => getComputedStyle(s).position), 'sticky');
  assert.ok(await page.locator('.stage').evaluate(s => s.getBoundingClientRect().height) < 600);
  for (const li of await page.locator('.levels li').all()) assert.equal(await li.evaluate(l => getComputedStyle(l).opacity), '1');
  assert.ok(await page.locator('.bar nav a').first().isVisible(), 'the section links are reachable');
  await context.close();
});

test('on a phone, tapping "for scale" shows the note, and a tap elsewhere hides it', async () => {
  const context = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.locator('[data-request] h2').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3500);
  await page.locator('.scale-note').tap();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.scale-tip').evaluate(t => getComputedStyle(t).opacity), '1');
  await page.touchscreen.tap(200, 780);
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.scale-tip').evaluate(t => getComputedStyle(t).opacity), '0');
  await context.close();
});

test('a landscape phone keeps the turn hint off the drawing', async () => {
  const { context, page } = await open('/', { width: 844, height: 390 });
  await page.locator('[data-cloud="connectors"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.stage .turn span').evaluate(s => getComputedStyle(s).display), 'none');
  await context.close();
});

// A link or button gets a dimension line drawn in under it: its own width, ticked at both ends.
const dimUnder = (page, sel) => page.evaluate(sel => {
  const el = document.querySelector(sel), dim = document.querySelector('.dim-hl');
  if (!dim || !dim.classList.contains('on')) return null;
  const r = el.getBoundingClientRect(), line = dim.querySelector('.dim-line').getBoundingClientRect();
  return { left: line.left - r.left, right: line.right - r.right, below: line.top - r.bottom, ticks: dim.querySelectorAll('.dim-tick').length,
    z: +getComputedStyle(dim).zIndex, bar: +getComputedStyle(document.querySelector('.bar')).zIndex };
}, sel);

test('pointing at a link draws a dimension line under it, over the bar too; no revision cloud is left', async () => {
  const { context, page } = await open('/');
  assert.equal(await page.locator('.cloud-hl').count(), 0, 'the cloud stays inside the drawings');
  await page.locator('.bar nav a').nth(1).hover();
  await page.waitForTimeout(600);
  const d = await dimUnder(page, '.bar nav a:nth-child(2)');
  assert.ok(d, 'a dimension line is shown');
  assert.ok(Math.abs(d.left) <= 1.5 && Math.abs(d.right) <= 1.5, `spans the link: ${d.left}, ${d.right}`);
  assert.ok(d.below >= 0 && d.below <= 10, `just under it: ${d.below}px`);
  assert.equal(d.ticks, 2);
  assert.ok(d.z > d.bar, `line z ${d.z}, bar z ${d.bar}`);
  // a button on the paper gets one too, and it goes again when the pointer leaves
  await page.locator('.actions .act').nth(1).hover();
  await page.waitForTimeout(600);
  assert.ok(await dimUnder(page, '.actions .act:nth-child(2)'), 'under a button-like link');
  await page.mouse.move(5, 500);
  await page.waitForTimeout(300);
  assert.equal(await dimUnder(page, '.actions .act:nth-child(2)'), null);
  await context.close();
});

test('a link in a list is only as wide as its words, so its dimension line is too', async () => {
  const { context, page } = await open('/');
  const widths = await page.locator('.side a, .diary a').evaluateAll(as => as.map(a => {
    const r = document.createRange(); r.selectNodeContents(a);
    return [a.textContent, Math.round(a.getBoundingClientRect().width - r.getBoundingClientRect().width)];
  }));
  // a wrapped title keeps the space at its break, a few px
  for (const [t, extra] of widths) assert.ok(extra <= 6, `"${t}" is ${extra}px wider than its words`);
  await context.close();
});

test('pointing at a drawn project shades it, the way a card is shaded', async () => {
  const { context, page } = await open('/');
  const card = page.locator('#henk');
  await card.scrollIntoViewIfNeeded();
  const bg = () => card.evaluate(c => getComputedStyle(c).backgroundColor);
  const rest = await bg();
  const b = await card.locator('p').first().boundingBox();
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.waitForTimeout(400);
  assert.notEqual(await bg(), rest, 'shaded on hover');
  await context.close();
});

test('pointing at a project card draws registration marks round it, not a dimension line', async () => {
  const { context, page } = await open('/');
  const card = page.locator('#register .card').first();
  await card.scrollIntoViewIfNeeded();
  const corners = () => card.evaluate(c => +getComputedStyle(c, '::before').opacity);
  assert.equal(await corners(), 0);
  const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);
  assert.ok(await corners() > 0.9, 'registration marks round the card');
  assert.equal(await page.locator('.dim-hl.on').count(), 0, 'no dimension line on a card');
  await context.close();
});

// ---------- you first: the first sheet is the person, then ANNA as the thing he builds ----------

test('the first screen shows who built this: name, photo and the terminal, before ANNA', async () => {
  for (const [width, height] of [[1440, 900], [1280, 800]]) {
    const { context, page } = await open('/', { width, height });
    const box = sel => page.locator(sel).first().boundingBox();
    const photo = await box('.site-photo img');
    assert.ok(photo && photo.y + photo.height <= height, `the photo is in the first screen at ${width}`);
    assert.match(await page.locator('.site-photo img').getAttribute('alt'), /Ezra Hulsman/);
    const term = await box('.term');
    assert.ok(term && term.y < height - 120, `the terminal starts in the first screen at ${width}`);
    // ANNA's section comes after the person, not in the first screen's place
    const anna = await box('#anna');
    assert.ok(anna.y >= height * 0.9, `ANNA's section starts below the first screen at ${width}`);
    await context.close();
  }
  // a phone sees the face in the first screen and reaches the terminal within a second one
  const { context, page } = await open('/', { width: 390, height: 844 });
  const photo = await page.locator('.site-photo img').boundingBox();
  assert.ok(photo.y + photo.height <= 844, 'the photo is in the phone\'s first screen');
  const term = await page.locator('.term').boundingBox();
  assert.ok(term.y < 844 * 2, 'the terminal is within two phone screens');
  await context.close();
});

test('the terminal greets from the first sheet, and the general notes keep their six notes', async () => {
  const { context, page } = await open('/');
  assert.equal(await page.locator('#notes .term').count(), 0, 'the terminal moved out of the notes');
  assert.equal(await page.locator('#notes ol.notes > li').count(), 6);
  // it types its intro without any scrolling, since it is on the first screen
  await page.waitForSelector('.terminal-input-line', { timeout: 30000 });
  assert.match(await page.locator('#terminal-body').innerText(), /whoami/);
  await context.close();
});

test('experience is headed Experience, and the notes and the scale note read as approved', async () => {
  const { context, page } = await open('/', { js: false });
  assert.equal(await page.locator('#rev-h').textContent(), 'Experience');
  assert.equal(await page.locator('#revisions .sheet-head p').textContent(), 'Newest first, the way a drawing records its revisions.');
  assert.deepEqual(await page.locator('#notes ol.notes > li').allTextContents(), [
    'Forward Deployed Engineer at Anamata. Owns ANNA, its AI assistant in Microsoft Teams, and much of what\'s built around it.',
    'At 2 meters tall, has a good overview of both the codebase and the room it\'s deployed in.',
    'Works mostly in Python, connecting ANNA to the tools teams already use and keeping it secure and reliable in production.',
    'Came to AI coding agents as a sceptic. They now write much of the code; it\'s still built tests first, with a spec for anything bigger, and nothing ships that can\'t be explained.',
    'Builds side projects in spare time, like Henk, a homelab agent, and a terminal Bible reader in Rust, and contributes to open source.',
    'Formula 1 fan: well-tuned race cars and well-optimized code are satisfying in the same way.',
  ]);
  assert.equal(await page.locator('.scale-tip').textContent(), 'E. Hulsman, 2 m. Tall enough to oversee both the codebase and the room it\'s deployed in.');
  await context.close();
});

test('the photo is a light file, not the 1.4 MB original', async () => {
  const { context, page } = await open('/');
  const src = await page.locator('.site-photo img').evaluate(i => i.currentSrc);
  const res = await page.request.get(src);
  assert.ok(res.ok());
  assert.ok((await res.body()).length < 80_000, 'under 80 KB');
  await context.close();
});

// ---------- the page answers the pointer, in the drawing's own terms ----------

test('a mouse gets a drafting crosshair that follows it, with a coordinate readout', async () => {
  const { context, page } = await open('/');
  await page.mouse.move(500, 420);
  await page.waitForTimeout(100);
  const x = await page.evaluate(() => {
    const v = document.querySelector('.xhair-v').getBoundingClientRect(), h = document.querySelector('.xhair-h').getBoundingClientRect();
    return { v: v.left + v.width / 2, h: h.top + h.height / 2, shown: getComputedStyle(document.querySelector('.xhair')).opacity, read: document.querySelector('.xhair-read').textContent };
  });
  assert.ok(Math.abs(x.v - 500) <= 1 && Math.abs(x.h - 420) <= 1, `crosshair at the pointer, got ${x.v}, ${x.h}`);
  assert.ok(+x.shown > 0);
  assert.match(x.read, /\d/);
  await context.close();
});

test('the crosshair readout follows the sheet when the page scrolls under a still mouse', async () => {
  const { context, page } = await open('/');
  await page.mouse.move(500, 420);
  await page.waitForTimeout(100);
  const y = () => page.locator('.xhair-read').evaluate(r => +r.textContent.match(/y (\d+)/)[1]);
  const y0 = await y();
  await page.evaluate(() => scrollBy(0, 300));
  await page.waitForTimeout(150);
  assert.equal(await y() - y0, 300, 'y reads the sheet, not the screen');
  await context.close();
});

test('touch screens get no crosshair', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  const shown = await page.evaluate(() => { const x = document.querySelector('.xhair'); return !!x && getComputedStyle(x).display !== 'none'; });
  assert.equal(shown, false);
  await context.close();
});

test('a click on the paper leaves a red pencil mark that fades; links and reduced motion get none', async () => {
  const { context, page } = await open('/');
  // blank paper inside the general notes sheet
  const head = page.locator('#notes .sheet-head p');
  await head.scrollIntoViewIfNeeded();
  const r = await head.boundingBox();
  await page.mouse.click(r.x + r.width + 40, r.y + r.height / 2);
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.pencil-mark').count(), 1, 'a mark where the paper was clicked');
  const m = await page.locator('.pencil-mark').boundingBox();
  assert.ok(Math.abs(m.x + m.width / 2 - (r.x + r.width + 40)) <= 3, 'centred on the click');
  // it stays long enough to point at something, about 8 s, then fades
  await page.waitForTimeout(4000);
  assert.equal(await page.locator('.pencil-mark').evaluate(m => getComputedStyle(m).opacity), '1', 'still there after 4 s');
  await page.waitForTimeout(5200);
  assert.equal(await page.locator('.pencil-mark').count(), 0, 'gone again');
  // a link is a link, not paper: a real click on one leaves no mark (the navigation itself is held back)
  await page.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('a')) e.preventDefault(); }));
  await page.locator('.bar nav a').first().click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.pencil-mark').count(), 0, 'no mark on a link');
  await context.close();

  const reduced = await open('/', { reducedMotion: 'reduce' });
  const h2 = reduced.page.locator('#notes .sheet-head p');
  await h2.scrollIntoViewIfNeeded();
  const r2 = await h2.boundingBox();
  await reduced.page.mouse.click(r2.x + r2.width + 40, r2.y + r2.height / 2);
  await reduced.page.waitForTimeout(150);
  assert.equal(await reduced.page.locator('.pencil-mark').count(), 0);
  await reduced.context.close();
});

// a mouse drag across blank paper beside the general notes' head
async function dragOnPaper(page, { from, dx = 160, dy = 40 } = {}) {
  const head = page.locator('#notes .sheet-head p');
  await head.scrollIntoViewIfNeeded();
  const r = await head.boundingBox();
  const [x, y] = from || [r.x + r.width + 40, r.y + r.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + dx * i / 12, y + dy * Math.sin(i / 2));
  await page.mouse.up();
  await page.waitForTimeout(150);
  return [x, y];
}

test('a mouse drag on blank paper draws a pencil line; it lasts a while, and Escape clears it', async () => {
  const { context, page } = await open('/');
  const [x] = await dragOnPaper(page);
  assert.equal(await page.locator('.pencil-line').count(), 1, 'a line where the mouse went');
  const b = await page.locator('.pencil-line path').boundingBox();
  assert.ok(b.width > 140 && Math.abs(b.x - x) <= 4, `the line follows the drag: ${Math.round(b.x)} +${Math.round(b.width)}`);
  assert.equal(await page.locator('.pencil-mark').count(), 0, 'a drag is a line, not a mark');
  assert.equal(await page.evaluate(() => String(getSelection())), '', 'and selects no text');
  await page.waitForTimeout(4000);
  assert.equal(await page.locator('.pencil-line').count(), 1, 'still there after 4 s');
  await page.mouse.click(x, (await page.locator('#notes .sheet-head p').boundingBox()).y + 4);
  assert.ok(await page.locator('.pencil-mark, .pencil-line').count() >= 2);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.pencil-mark, .pencil-line').count(), 0, 'Escape clears the paper');
  // and the line fades by itself after about 8 s
  await dragOnPaper(page);
  await page.waitForTimeout(9200);
  assert.equal(await page.locator('.pencil-line').count(), 0, 'gone again');
  await context.close();
});

test('a drag that starts on text still selects it; reduced motion draws no line', async () => {
  const { context, page } = await open('/');
  const li = page.locator('#notes ol.notes > li').first();
  await li.scrollIntoViewIfNeeded();
  // start on the first word, not the list item's padding
  const r = await li.evaluate(l => { const g = document.createRange(); g.selectNodeContents(l.firstChild); return g.getClientRects()[0].toJSON(); });
  await page.mouse.move(r.x + 10, r.y + r.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(r.x + 10 + 30 * i, r.y + r.height / 2);
  await page.mouse.up();
  assert.ok((await page.evaluate(() => String(getSelection()))).length > 5, 'text is selected');
  assert.equal(await page.locator('.pencil-line').count(), 0);
  await context.close();

  const reduced = await open('/', { reducedMotion: 'reduce' });
  await dragOnPaper(reduced.page);
  assert.equal(await reduced.page.locator('.pencil-line, .pencil-mark').count(), 0);
  await reduced.context.close();
});

test('pointing at a project draws registration marks round it and replots its redline', async () => {
  const { context, page } = await open('/');
  const card = page.locator('#henk');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500); // let it plot in first
  const corners = () => card.evaluate(c => +getComputedStyle(c, '::before').opacity);
  assert.equal(await corners(), 0);
  const b = await card.locator('h3, h2').first().boundingBox();
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.waitForTimeout(120);
  const off = await card.locator('.dwg .red path').first().evaluate(p => parseFloat(getComputedStyle(p).strokeDashoffset));
  assert.ok(off > 0, 'the redline is being drawn again');
  await page.waitForTimeout(1500);
  assert.ok(await corners() > 0.9, 'registration marks round the card');
  assert.equal(await card.locator('.dwg .red path').first().evaluate(p => parseFloat(getComputedStyle(p).strokeDashoffset) || 0), 0, 'and the redline is whole again');
  await context.close();
});

test('an ultra-wide screen centres the set at the 1920 layout; 1920 and below keep theirs', async () => {
  const edges = async (width, height) => {
    const { context, page } = await open('/', { width, height, reducedMotion: 'reduce' });
    const r = await page.evaluate(() => {
      const box = s => document.querySelector(s).getBoundingClientRect();
      return { name: box('.sheet-you .name').left, term: box('.sheet-you .term').right,
        head: box('#work .sheet-head h2, .sheet .sheet-head h2').left, step: box('.scrolly .step').left,
        barName: box('.bar-name').left, foot: box('.foot p').left, stamp: box('.sheet-contact .stamp').left };
    });
    await context.close();
    return r;
  };
  const fhd = await edges(1920, 1080);
  const uw = await edges(3440, 1440);
  const shift = (3440 - 1920) / 2;
  for (const k of ['name', 'head', 'step', 'barName', 'foot', 'stamp']) {
    assert.ok(Math.abs(uw[k] - (fhd[k] + shift)) <= 2, `${k}: ${uw[k]} vs ${fhd[k] + shift}`);
  }
  assert.ok(uw.term < 3440 - shift, `the terminal stays inside the centred set: ${uw.term}`);
  assert.ok(fhd.name < 100, `1920 keeps the name at the left: ${fhd.name}`);
});

// Lines a block's text breaks into, by the tops of its words' boxes.
const lineCount = el => {
  const tops = new Set();
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const re = /\S+/g; let m;
    while ((m = re.exec(n.data))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); tops.add(Math.round(r.getBoundingClientRect().top)); }
  }
  return tops.size;
};

test('on a phone the title block reads one line per value', async () => {
  const { context, page } = await open('/', { width: 390, height: 844 });
  const cells = await page.locator('.sheet-you .titleblock td').evaluateAll((tds, f) => tds.map(td => [td.innerText, new Function('return ' + f)()(td)]), lineCount.toString());
  for (const [text, lines] of cells) assert.equal(lines, 1, `"${text}" breaks over ${lines} lines`);
  await context.close();
});

test('a portrait tablet shows the photo at a size you can see the face', async () => {
  const { context, page } = await open('/', { width: 834, height: 1194 });
  const w = await page.locator('.site-photo .photo').evaluate(p => p.getBoundingClientRect().width);
  assert.ok(w >= 180, `photo is ${Math.round(w)}px`);
  await context.close();
});

test('section titles never leave one short word on a line of its own', async () => {
  for (const width of [1194, 1440]) {
    const { context, page } = await open('/', { width, height: 900 });
    const words = await page.locator('.sheet-head h2').evaluateAll(hs => hs.map(h => {
      const lines = new Map();
      const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const t = Math.round(r.getBoundingClientRect().top); lines.set(t, [...(lines.get(t) || []), m[0]]); } }
      return [h.innerText, [...lines.values()].map(l => l.join(' '))];
    }));
    for (const [title, lines] of words) if (lines.length > 1) for (const l of lines) assert.ok(!(l.split(' ').length === 1 && l.length <= 4), `${width}: "${title}" breaks as ${JSON.stringify(lines)}`);
    await context.close();
  }
});

test('the theme button carries a lamp mark and says what it does on hover', async () => {
  const { context, page } = await open('/', { storage: { theme: 'light' } });
  const btn = page.locator('.theme');
  assert.equal(await btn.locator('svg.lamp').count(), 1);
  assert.equal(await btn.getAttribute('title'), 'Switch to the dark sheet');
  await btn.click();
  assert.equal(await btn.getAttribute('title'), 'Switch to the light sheet');
  await context.close();
});

test('on a phone the drawing\'s lower edge fades into the text scrolling under it', async () => {
  const { context, page } = await open('/', { width: 390, height: 844 });
  const r = await page.locator('.stage').evaluate(s => { const a = getComputedStyle(s, '::after'); return { img: a.backgroundImage, h: parseFloat(a.height) }; });
  assert.match(r.img, /gradient/);
  assert.ok(r.h >= 12, `fade is ${r.h}px`);
  await context.close();
});

test('a mouse draws with a pencil: its tip on the paper, the usual cursors on links and text fields', async () => {
  const { context, page } = await open('/');
  const cur = sel => page.locator(sel).first().evaluate(el => getComputedStyle(el).cursor);
  assert.match(await cur('.sheet-you .lede'), /^url\(.+\) 2 30, crosshair$/);
  assert.equal(await cur('.sheet-you .act-main'), 'pointer');
  assert.equal(await cur('.term-body'), 'text');
  // the light table gets a pencil drawn in its own inks
  const light = await cur('main');
  await page.locator('.theme').click();
  assert.notEqual(await cur('main'), light);
  await context.close();
  // touch screens keep their own
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await touch.newPage();
  await p.goto(BASE + '/');
  assert.ok(!(await p.locator('main').evaluate(el => getComputedStyle(el).cursor)).startsWith('url('));
  await touch.close();
});

test('the terminal on the first sheet lists the projects that lead the set, ANNA first', async () => {
  const { context, page } = await open('/', { reducedMotion: 'reduce' });
  await page.waitForTimeout(500);
  const text = await page.locator('#terminal-body').innerText();
  const after = text.split('ls projects/')[1].split('\n').map(l => l.trim()).filter(Boolean).slice(0, 4);
  assert.deepEqual(after, ['anna', 'henk-homelab-agent', 'finance-bot', 'homelab-infrastructure']);
  await context.close();
});
