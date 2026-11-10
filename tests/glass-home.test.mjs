// The glass as site code (openspec stone-glass-homepage, glass-material): what may be glass, the
// pointer as a light, the slow-device guard's decision, the shared inks on glass, the no-WebGL
// fallback. The model's own tests (unlit pane, lit seam, loop closes, distance 1) stay in
// tests/glass-hero.test.mjs.
//
//   node --test tests/glass-home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { glassMoments, glassCards, fallbackFor, windowGlows } from '../src/config/glass.ts';
import { leanToward, LEAN } from '../src/scripts/glass/pointer.js';
import { slowFrom, busyFrom, BUSY_MAX } from '../src/scripts/glass/guard.js';
import { speedFrom, SPEED_MAX } from '../src/scripts/glass/speed.js';
import { parseColor, contrast } from './lib/contrast.mjs';
import * as home from '../src/config/home.ts';
import site from '../src/config/site.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const list = (dir, ext) => (existsSync(new URL(dir, root)) ? readdirSync(new URL(dir, root)).filter((f) => f.endsWith(ext)).map((f) => `${dir}${f}`) : []);

// ---- what may be glass ----

test('the list in config: the hero, ANNA, the three project windows and the terminal, in page order', () => {
  assert.deepEqual(glassMoments, ['hero', 'anna', 'henk', 'sandbox', 'bible', 'terminal']);
  assert.deepEqual(glassMoments.slice(2, 5), [...home.projectChapters], 'the project windows, in their chapters\' order');
});

test('the shipped picks: each card at Ezra\'s distance, Homelab\'s sun nearer still', () => {
  assert.deepEqual(glassCards.map((c) => c.distance), [0.35, 0.8, 0.5, 0.45]);
  const homelab = glassCards.find((c) => c.id === 'homelab');
  assert.equal(homelab.tune[0].dist, 0.45, 'the sun layer');
  for (const c of glassCards) assert.ok(c.distance >= 0 && c.distance <= 1.5, `${c.id} within 0..1.5`);
});

// ---- the pointer as a light (B1, 2026-11-11) ----

test('the lean, as a function: none without a pointer, near on the card, toward a pointer within reach, none far away', () => {
  const box = { left: 100, top: 100, width: 300, height: 360 };
  const cx = 250, cy = 280;
  assert.deepEqual(leanToward(null, box), { x: 0, y: 0, near: 0 });
  const on = leanToward([cx, cy], box);
  assert.equal(on.near, 1);
  assert.ok(Math.abs(on.x) < 1e-9 && Math.abs(on.y) < 1e-9, `no lean at the centre: ${JSON.stringify(on)}`);
  const right = leanToward([cx + 200, cy], box);
  assert.ok(right.x > 0 && right.x <= LEAN.x, `leans right: ${right.x}`);
  assert.ok(Math.abs(right.y) <= LEAN.y);
  assert.equal(right.near, 0);
  const below = leanToward([cx, cy + 200], box);
  assert.ok(below.y > 0 && below.y <= LEAN.y && Math.abs(below.x) < 1e-9, `leans down: ${JSON.stringify(below)}`);
  assert.deepEqual(leanToward([cx + 2000, cy], box), { x: 0, y: 0, near: 0 });
  assert.deepEqual(LEAN, { x: 52, y: 32 });
});

// ---- the slow-device guard's decision ----

/** Samples from `from` to `to` seconds (both ends included), every `interval` ms or as near as divides evenly. */
function run(from, to, interval, draw) {
  const n = Math.max(1, Math.round(((to - from) * 1000) / interval));
  const step = (to - from) / n;
  return Array.from({ length: n + 1 }, (_, k) => ({ t: from + k * step, interval: step * 1000, draw }));
}

test('a capped frame rate is not a slow device: 30 Hz with cheap draws stays', () => {
  assert.equal(slowFrom(run(0, 3, 33, 5)), false);
});

test('expensive drawing is a slow device', () => {
  assert.equal(slowFrom(run(0, 3, 16, 30)), true);
});

test('the interval never counts, only the draw time', () => {
  assert.equal(slowFrom(run(0, 3, 200, 5)), false, 'a long gap between frames is not slow drawing');
  assert.equal(slowFrom(run(0, 3, 60, 21)), true, 'draws over 20 ms are, whatever the frame rate');
  assert.equal(slowFrom(run(0, 3, 16, 20)), false, '20 ms itself is not over the line');
});

test('the first second and the window are ignored', () => {
  const settle = [...run(0, 0.99, 16, 40), ...run(1, 3, 16, 5)];
  assert.equal(slowFrom(settle), false, 'expensive draws before t = 1 s do not count');
  const old = [...run(1, 1.9, 16, 30), ...run(2, 4, 16, 5)];
  assert.equal(slowFrom(old), false, 'expensive draws more than 2 s before the last sample do not count');
});

test('no verdict before a full window', () => {
  const early = run(1, 1.2, 16, 60);
  assert.equal(slowFrom(early), false);
  assert.equal(slowFrom([...early, ...run(1.216, 3.1, 16, 60)]), true);
  assert.equal(slowFrom(run(0, 2.9, 16, 60)), false, 'never before t = 3 s');
  assert.equal(slowFrom(run(2, 3.5, 16, 60)), false, 'eligible samples must span 2 s, not just reach t = 3 s');
  assert.equal(slowFrom([]), false);
});

// ---- the busy-work test hook (?busy=, __glass.busy): a test hook that ships, so it cannot freeze a tab ----

test('the busy-work hook takes only a small finite number of ms: anything else is none, more is 50', () => {
  for (const v of ['Infinity', Infinity, '-Infinity', -Infinity, 'abc', NaN, null, undefined, '', -5, '-5', '1e999'])
    assert.equal(busyFrom(v), 0, `${String(v)} adds no work`);
  assert.equal(busyFrom('30'), 30);
  assert.equal(busyFrom(30), 30);
  assert.equal(busyFrom('0.5'), 0.5);
  assert.equal(busyFrom(50), 50);
  assert.equal(busyFrom(51), 50, 'clamped to 50 ms a frame');
  assert.equal(busyFrom('1e9'), 50);
  assert.equal(BUSY_MAX, 50);
});

// ---- the play-speed test hook (?speed=): it ships too, so it only ever speeds a play up, a little ----

test('the play-speed hook is a small finite factor from 1 to 10: anything else plays at 1, more is 10', () => {
  for (const v of ['Infinity', Infinity, '-Infinity', -Infinity, 'abc', NaN, null, undefined, '', ' ', 0, '0', -5, '-5', '1e999', 0.5, '0.5', 1])
    assert.equal(speedFrom(v), 1, `${String(v)} plays at normal speed`);
  assert.equal(speedFrom('4'), 4);
  assert.equal(speedFrom(4), 4);
  assert.equal(speedFrom('2.5'), 2.5);
  assert.equal(speedFrom(10), 10);
  assert.equal(speedFrom(11), 10, 'clamped to 10x');
  assert.equal(speedFrom('1e9'), 10);
  assert.equal(SPEED_MAX, 10);
});

test('the play-speed hook is read by every play: ANNA\'s conversation, the artefacts, the terminal\'s intro and its hint', () => {
  for (const f of ['src/scripts/glass/anna-window.js', 'src/scripts/glass/artefacts.js', 'src/scripts/terminal-animation.ts', 'src/scripts/interactive-terminal.ts'])
    assert.match(read(f), /pageSpeed\(\)/, `${f} reads ?speed=`);
  // the light's loop and the guard keep real time: the hook never touches them
  for (const f of ['src/scripts/glass/panes.js', 'src/scripts/glass/guard.js', 'src/scripts/glass/pointer.js'])
    assert.doesNotMatch(read(f), /speed/i, `${f} keeps real time`);
});

// ---- the shared inks on glass ----

/** Rules of a stylesheet, @media and @supports flattened; @font-face and @keyframes skipped. */
function rules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    const at = head.match(/@[\w-]+/)?.[0];
    if (at === '@media' || at === '@supports' || at === '@layer' || at === '@container') out.push(...rules(body));
    else if (!at) out.push({ selector: head.replace(/:global\(([^()]*)\)/g, '$1').replace(/^[;}\s]+/, ''), body });
    i = j;
  }
  return out;
}
const styleBlocks = (src) => [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const colorOf = (body) => body.match(/(?<![-\w])color\s*:\s*([^;]+)/)?.[1].replace(/!important/, '').trim();

// every stylesheet and <style> block the homepage can use: the site's sheets, the layout, the
// stone components and the page itself
const sources = [
  ...list('src/styles/', '.css').map((p) => ({ path: p, css: read(p) })),
  ...[...list('src/layouts/', '.astro'), ...list('src/components/stone/', '.astro'), 'src/pages/index.astro']
    .map((p) => ({ path: p, css: styleBlocks(read(p)) })),
];
const GLASS_FILES = ['src/components/stone/GlassCard.astro', 'src/components/stone/GlassWindow.astro'];
const glassRules = sources.flatMap((s) => rules(s.css).filter((r) => GLASS_FILES.includes(s.path) || /\[data-glass|\.glass-/.test(r.selector)).map((r) => ({ ...r, path: s.path })));
const items = (r) => r.selector.split(',').map((x) => x.trim());
/** Custom properties defined anywhere in the sources, for resolving var(). */
const props = Object.fromEntries(sources.flatMap((s) => [...s.css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1], m[2].trim()])));
const resolve = (v) => { let k = 0; while (v && /^var\(/.test(v) && k++ < 5) v = props[v.match(/^var\((--[\w-]+)/)[1]]; return v; };

test('the tokens are opaque, defined once, in stone.css, and read at 4.5:1 on white and on stone', () => {
  for (const token of ['--glass-ink-quiet', '--glass-ink-red']) {
    const defs = sources.flatMap((s) => [...s.css.matchAll(new RegExp(`${token}\\s*:\\s*([^;}]+)`, 'g'))].map((m) => ({ path: s.path, value: m[1].trim() })));
    assert.equal(defs.length, 1, `${token} defined exactly once (${defs.map((d) => d.path).join(', ')})`);
    assert.equal(defs[0].path, 'src/styles/stone.css');
    const c = parseColor(defs[0].value);
    assert.ok(c, `${token}: ${defs[0].value} is a plain colour`);
    assert.equal(c[3], 1, `${token} is opaque`);
    for (const ground of ['#FFFFFF', '#EEEAE3']) {
      const k = contrast(c.slice(0, 3), ground);
      assert.ok(k >= 4.5, `${token} ${defs[0].value} on ${ground}: ${k.toFixed(2)}:1`);
    }
  }
  assert.equal(parseColor(props['--glass-ink-quiet']).slice(0, 3).join(), parseColor('#5C5650').slice(0, 3).join(), 'quiet starts at #5C5650');
  assert.equal(parseColor(props['--glass-ink-red']).slice(0, 3).join(), parseColor('#8F3320').slice(0, 3).join(), 'red starts at #8F3320');
});

/** The colour every glass rule that ends in `target` sets: all of them, and at least one. */
function inksFor(target) {
  const hits = glassRules.filter((r) => items(r).some((s) => s === target || s.endsWith(` ${target}`) || s.endsWith(`>${target}`)) && colorOf(r.body));
  return hits.map((r) => colorOf(r.body));
}

test('the texts the lab coloured with alpha inks, and the terminal\'s dim text, use --glass-ink-quiet', () => {
  for (const target of ['.glass-title', '.aw-replay', '.msg .who', '.terminal-dim', '.aw-work.settled']) {
    const inks = inksFor(target);
    assert.ok(inks.length, `${target} has a colour on glass`);
    for (const ink of inks) assert.equal(ink, 'var(--glass-ink-quiet)', `${target}: ${ink}`);
  }
});

test('the terminal\'s prompt and error use --glass-ink-red', () => {
  for (const target of ['.terminal-user', '.terminal-separator', '.terminal-path', '.terminal-dollar', '.terminal-error']) {
    const inks = inksFor(target);
    assert.ok(inks.length, `${target} has a colour on glass`);
    for (const ink of inks) assert.equal(ink, 'var(--glass-ink-red)', `${target}: ${ink}`);
  }
});

test('texts in a darker opaque ink keep it: ANNA\'s work line while she works, the projects\' artefacts', () => {
  assert.deepEqual(inksFor('.aw-work').map((c) => c.toLowerCase()), ['#4a453f']);
  assert.deepEqual(inksFor('.pw-quiet').map((c) => c.toLowerCase()), ['#4a453f'], 'over the projects\' brighter glows');
  assert.deepEqual(inksFor('.pw-text').map((c) => c.toLowerCase()), ['#3a3632']);
  // the steps list and the record left the window (Ezra, 2026-11-11): no ink kept for them
  for (const gone of ['.steps', '.record ul', '.rec-head', '.sources']) assert.deepEqual(inksFor(gone), [], gone);
});

test('no text inside a glass object is set in an alpha-blended colour', () => {
  assert.ok(glassRules.length > 10, 'the glass rules were found');
  for (const r of glassRules) {
    const v = colorOf(r.body);
    if (!v) continue;
    const c = parseColor(resolve(v) ?? '');
    if (!c) continue; // inherit, currentColor
    assert.equal(c[3], 1, `${r.path}: ${r.selector} { color: ${v} }`);
  }
});

// ---- without WebGL ----

test('each card\'s no-WebGL ground is a soft radial gradient of its own light\'s colour', () => {
  for (const c of glassCards) {
    const bg = fallbackFor(c);
    assert.match(bg, /radial-gradient/, c.id);
    assert.doesNotMatch(bg, /linear-gradient|conic-gradient/, `${c.id}: no hard shapes`);
    // the light's colour is the card's own: its hard-edged layer's
    const layer = c.tune.find((t) => t?.set?.color2) ?? c.tune.find((t) => t?.set?.color);
    assert.ok(bg.includes(`rgb(${layer.set.color.join(' ')}`), `${c.id}: ${bg}`);
    // soft: every gradient fades out to nothing, never a hard stop
    for (const g of bg.match(/radial-gradient\((?:[^()]|\([^()]*\))*\)/g)) assert.match(g, /\/ 0\)\s*100%\)$/, `${c.id}: ${g}`);
  }
});

// ---- the frosted windows' glows ----

test('each window has a glow of soft radial lights in config: the flame for ANNA, two card lights for the terminal, each project its own', () => {
  // the homepage's five, plus Homelab's dusk and Finance Bot's own (decision 2026-11-10: their windows get their own glows),
  // and /contact's moss (Ezra, 2026-11-10: the bar mapping carries into the pages, Contact = moss)
  assert.deepEqual(Object.keys(windowGlows).sort(), ['bible', 'cards', 'dusk', 'finance', 'flame', 'henk', 'moss', 'sandbox']);
  // the projects' windows: two lights each, near high on the left, deep low on the right
  for (const id of home.projectChapters) {
    const g = windowGlows[id];
    assert.equal(g.lights.length, 2, id);
    assert.ok(g.lights[0].at[0] < g.lights[1].at[0] && g.lights[0].at[1] < g.lights[1].at[1], `${id}: diagonal`);
  }
  // Henk's and the sandbox's are their cards' own lights
  const deep = (id) => glassCards.find((c) => c.id === id).tune.find((t) => t?.set?.color2).set.color2.join();
  assert.equal(windowGlows.henk.lights[1].color.join(), deep('henk'));
  assert.equal(windowGlows.sandbox.lights[1].color.join(), deep('sandbox'));
  assert.equal(windowGlows.flame.lights.length, 3);
  assert.ok(windowGlows.cards.lights.length >= 1 && windowGlows.cards.lights.length <= 2, `the terminal's glow: ${windowGlows.cards.lights.length} lights`);
  for (const g of Object.values(windowGlows)) {
    for (const l of g.lights) {
      assert.equal(l.color.length, 3);
      assert.ok(l.opacity > 0 && l.opacity < 1, 'faint, never a solid panel');
    }
    assert.ok(g.blur >= 20, 'blurred well past any edge');
  }
});

// ---- the terminal's reflection: one or two hues, soft, not a row (Ezra, 2026-11-10) ----

import { terminalReflection } from '../src/config/glass.ts';

/** A colour's hue in degrees. */
const hueOf = ([r, g, b]) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
/** How many hue families: hues within `near` degrees of a family's first hue join it. */
const families = (rgbs, near = 25) => rgbs.map(hueOf).reduce((fs, h) => {
  if (!fs.some((f) => Math.min(Math.abs(f - h), 360 - Math.abs(f - h)) < near)) fs.push(h);
  return fs;
}, []).length;

test('the terminal\'s reflection: one or two of the hero\'s lights, each a card in config, none twice', () => {
  const ids = terminalReflection.panes.map((p) => p.card);
  assert.ok(ids.length >= 1 && ids.length <= 2, `${ids.length} reflection panes`);
  assert.equal(new Set(ids).size, ids.length, 'no card twice');
  for (const id of ids) assert.ok(glassCards.some((c) => c.id === id), `${id} is a hero card`);
});

test('the reflection and its glow use at most two hues: the glow\'s lights are the reflected cards\' own washes', () => {
  const cards = terminalReflection.panes.map((p) => glassCards.find((c) => c.id === p.card));
  const washes = cards.map((c) => c.wash.color);
  for (const l of windowGlows.cards.lights) {
    assert.ok(washes.some((w) => w.join() === l.color.join()), `glow light ${l.color} is a reflected card's wash`);
  }
  assert.ok(families([...washes, ...windowGlows.cards.lights.map((l) => l.color)]) <= 2, 'at most two hues');
});

test('the reflection is soft and not a row: blurred well, two panes at different heights and sizes, the glow\'s lights apart on both axes', () => {
  assert.ok(terminalReflection.blur >= 6, `blurred (${terminalReflection.blur}px)`);
  assert.ok(terminalReflection.opacity > 0 && terminalReflection.opacity < 0.5, 'faint');
  const [a, b] = terminalReflection.panes;
  if (b) {
    const [, ta, wa, ha] = a.box, [, tb, wb, hb] = b.box;
    assert.ok(Math.abs(ta - tb) >= 5, `different heights (${ta}% and ${tb}%)`);
    assert.ok(Math.max(wa, wb) / Math.min(wa, wb) >= 1.4 && Math.max(ha, hb) / Math.min(ha, hb) >= 1.2, 'different sizes');
  }
  const ls = windowGlows.cards.lights;
  if (ls.length === 2) {
    assert.ok(Math.abs(ls[0].at[0] - ls[1].at[0]) >= 20 && Math.abs(ls[0].at[1] - ls[1].at[1]) >= 15, `the glow's lights diagonal, not a row: ${ls.map((l) => l.at)}`);
  }
  // in the markup: each pane an oval that fades to nothing (no straight side), no four-column grid
  const src = read('src/components/stone/About.astro');
  assert.match(src, /terminalReflection\.panes\.map/);
  assert.match(src, /mask-image:\s*radial-gradient\(closest-side/);
  assert.doesNotMatch(src, /repeat\(4/);
});

// ---- the components and the driver, as written ----

test('GlassCard: ribbed, its canvas hidden from readers, its text real HTML', () => {
  const src = read('src/components/stone/GlassCard.astro');
  assert.match(src, /data-glass"?\s*[:=]\s*"ribbed"/);
  assert.match(src, /<canvas aria-hidden="true"/);
  assert.match(src, /\{card\.title\}/);
  assert.match(src, /\{card\.readout\}/);
});

test('GlassWindow: frosted, a title bar, a hidden glow beneath it, grain in its frost, a sheen the pointer can move', () => {
  const src = read('src/components/stone/GlassWindow.astro');
  assert.match(src, /data-glass="frosted"/);
  assert.match(src, /data-glow aria-hidden="true"/);
  assert.match(src, /class="glass-title"/);
  assert.match(src, /backdrop-filter/);
  // B2: the grain is the window's ::after, two noise layers, letting the pointer through
  const after = rules(styleBlocks(src)).find((r) => r.selector === '.glass-window::after');
  assert.ok(after, 'a .glass-window::after rule');
  assert.equal((after.body.match(/feTurbulence/g) || []).length, 2, 'two noise layers');
  assert.match(after.body, /pointer-events:\s*none/);
  // B1: the sheen sits where --sx/--sy say
  assert.match(src, /var\(--sx/);
  assert.match(src, /var\(--sy/);
});

test('panes.js mounts every ribbed pane and drops the lab\'s dial, look and hooks', () => {
  const src = read('src/scripts/glass/panes.js');
  assert.match(src, /\[data-glass="ribbed"\]/);
  assert.match(src, /from '\.\/guard\.js'/);
  assert.doesNotMatch(src, /#blur|dataset\.look|tuneBefore|paneFor|redrawPane/);
  assert.doesNotMatch(src, /function slowFrom/, 'the decision lives in guard.js only');
  assert.match(src, /guard/);
});

test('model.js says which features only the retired stagings used', () => {
  const src = read('src/scripts/glass/model.js');
  assert.match(src, /retired ANNA stagings/);
});

// ---- the hero arrives, the old homepage leaves (chunk 2) ----

const { details } = home;
const homeSections = home.homeSections ?? {};

test('readouts from the project data: ANNA is "In production", every other card one of its project\'s dims verbatim', () => {
  assert.equal(glassCards[0].id, 'anna');
  assert.equal(glassCards[0].readout, 'In production');
  for (const c of glassCards.slice(1)) {
    const d = details.find((x) => x.id === c.id);
    assert.ok(d, `${c.id} has a listing in home.ts`);
    assert.ok(d.dims.some((dim) => c.readout.includes(dim.value)), `${c.id}: "${c.readout}" holds one of ${d.dims.map((x) => x.value).join(', ')}`);
  }
});

test('headings and labels live in config: homeSections', () => {
  assert.deepEqual(
    [homeSections.headings.projects, homeSections.headings.experience, homeSections.headings.writing, homeSections.headings.about, homeSections.headings.contact],
    ['Projects', 'Experience', 'Writing', 'About', 'Contact'],
  );
  assert.deepEqual([homeSections.links.projects, homeSections.links.resume, homeSections.links.writing], ['See all projects', 'Full résumé', 'All writing']);
  assert.equal(homeSections.now, 'now');
  assert.equal(homeSections.terminalTitle, 'ezra@hulsman: ~');
  assert.equal(homeSections.photoAlt, 'Ezra Hulsman, photographed from below');
  // the hero's lines, moved from the lab unchanged
  assert.equal(homeSections.role, `${site.role} at ${site.company}.`);
  assert.equal(homeSections.intro.replace(/ /g, ' '), 'I build ANNA, an AI assistant in Microsoft Teams that does the admin no one should spend their day on.');
});

test('homeDim: pytaiga-mcp shows its third dimension on the homepage; its dims keep their order for /projects', () => {
  const py = details.find((d) => d.id === 'pytaiga');
  assert.equal(py.homeDim, 2);
  assert.equal(py.dims[py.homeDim].value, '50 → 5');
  assert.deepEqual(py.dims.map((d) => d.value), ['11', '3', '50 → 5']);
  for (const d of details.filter((x) => x.id !== 'pytaiga')) assert.equal(d.homeDim, undefined, `${d.id} defaults to 0`);
});

test('the homepage is the stone hero: Hero.astro from config, panes.js, none of the drawing sheets', () => {
  const index = read('src/pages/index.astro');
  assert.match(index, /import Hero from "\.\.\/components\/stone\/Hero\.astro"/);
  assert.match(index, /scripts\/glass\/panes\.js/);
  assert.doesNotMatch(index, /components\/overzicht\/(YouSheet|AnnaSection|DetailsSheet|RegisterSheet|RevisionsSheet|NotesSheet|ContactSheet)/);
  assert.doesNotMatch(index, /overzicht\/(intro|main)\.js/);
  const hero = read('src/components/stone/Hero.astro');
  assert.match(hero, /data-glass-moment="hero"/);
  assert.match(hero, /\{site\.name\}/, 'the h1 is site.name');
  assert.match(hero, /glassCards\.map/);
  assert.match(hero, /<GlassCard /);
  assert.doesNotMatch(hero, /data-glare|glare/, 'the name is plain');
});

test('the arrival is gone: no html.intro in the layout or the sheet, no intro.js, no wait for ovz:arrived', () => {
  assert.equal(existsSync(new URL('src/scripts/overzicht/intro.js', root)), false);
  const layout = read('src/layouts/OverzichtLayout.astro');
  assert.doesNotMatch(layout, /classList\.add\('intro'\)|ovz:arrived|ovz-arrived|ovzEarly/);
  assert.doesNotMatch(read('src/styles/overzicht.css'), /html\.intro/);
  assert.doesNotMatch(read('src/components/overzicht/Terminal.astro'), /ovz:arrived|classList\.contains\('intro'\)/);
  // its suites went with it
  assert.equal(existsSync(new URL('tests/intro.e2e.mjs', root)), false);
  assert.equal(existsSync(new URL('tests/overzicht.e2e.mjs', root)), false);
  assert.doesNotMatch(JSON.parse(read('package.json')).scripts['test:e2e'], /intro\.e2e|overzicht\.e2e/);
});

// ---- ANNA's section (chunk 4, anna-section) ----

import { coverer, strings } from './lib/copy.mjs';

test('the copy check covers joined config values and catches a typed-in word', () => {
  const check = coverer(['Made in Utrecht by', 'Ezra Hulsman', 'Blog', 'Proverbs 3:5-7', home.annaLead.text]);
  assert.equal(check('Projects'), 'Projects', 'a heading typed into the markup');
  assert.equal(check('See all'), 'See all', 'a link label typed inside a mapped list');
  assert.equal(check('Blogs about'), 'Blogs about', 'a corpus value inside a longer word is not removed');
  assert.equal(check('Made in Utrecht by Ezra Hulsman.'), null, 'the footer line, joined with a full stop');
  assert.equal(check(`${home.annaLead.text}.`), null, 'the lead and its full stop');
  assert.equal(check('Ezra Hulsman · Blog'), null, 'values joined by punctuation');
  assert.equal(check('01 → 4'), null, 'no letters, nothing to cover');
  assert.deepEqual(strings({ a: 'x', b: ['y', { c: 'z' }], n: 3 }), ['x', 'y', 'z']);
});

// rewritten (openspec stone-inner-pages 4.2, decision 2026-11-10): the levels are rows on /projects
// and ANNA's page, and AnnaLevels.astro lives in src/components/stone/, so the check names the
// homepage's own components (anna-section "Nothing on the homepage imports them")
test('nothing on the homepage imports the four levels: the page and its named components', () => {
  const files = ['src/pages/index.astro', ...['Hero', 'AnnaSection', 'AnnaWindow', 'Projects', 'Experience', 'Writing', 'About', 'Contact'].map((n) => `src/components/stone/${n}.astro`)];
  for (const f of files) assert.doesNotMatch(read(f), /annaLevels|AnnaLevels/, f);
  // and the homepage renders exactly those stone components (no other one could bring them in)
  const used = [...read('src/pages/index.astro').matchAll(/components\/stone\/(\w+)\.astro/g)].map((m) => m[1]);
  for (const n of used) assert.ok(['Hero', 'AnnaSection', 'Projects', 'Experience', 'Writing', 'About', 'Contact'].includes(n), `index.astro uses ${n}`);
});

test('nothing on the homepage imports the four levels: glass.ts', () => {
  assert.doesNotMatch(read('src/config/glass.ts'), /annaLevels/);
});

// reads AnnaSection.astro and AnnaWindow.astro together (openspec stone-inner-pages 4.2, decision
// 2026-11-10: her window also opens her page and /projects, so its markup lives in AnnaWindow.astro)
test('AnnaSection: one frosted window from config, the moment named, the window driver reused', () => {
  const section = read('src/components/stone/AnnaSection.astro');
  assert.match(section, /import AnnaWindow from "\.\/AnnaWindow\.astro"/);
  assert.match(section, /<AnnaWindow\b/);
  const src = section + read('src/components/stone/AnnaWindow.astro');
  // the class names anna-window.js keys on stay
  for (const c of ['anna-window', 'aw-window', 'aw-compose', 'aw-replay']) assert.match(src, new RegExp(`\\b${c}\\b`), c);
  assert.match(src, /data-beat=/);
  // one line of work (Ezra, 2026-11-11): no steps list, no record
  assert.match(src, /annaCalls\.work/);
  assert.doesNotMatch(src, /annaDemo\.(steps|record|recordHeading)/);
  assert.doesNotMatch(src, /class="(steps|record|rec-head)"/);
  assert.match(src, /data-glass-moment="anna"/);
  assert.match(src, /<GlassWindow /);
  assert.match(src, /title=\{annaCalls\.window\}/);
  assert.match(src, /glow="flame"/);
  assert.match(src, /\{annaLead\.title\}/, 'the heading and her message name');
  assert.match(src, /\{annaDemo\.who\}/, 'his message name');
  assert.doesNotMatch(src, /data-glass="/, 'the one glass object is GlassWindow\'s');
  const index = read('src/pages/index.astro');
  assert.match(index, /import AnnaSection from "\.\.\/components\/stone\/AnnaSection\.astro"/);
  assert.match(index, /scripts\/glass\/anna-window\.js/);
});

// ---- Projects, Experience, Writing (chunk 5): type on stone ----

import { buildProjects, homeRows } from '../src/lib/projects.ts';
import { diaryEntries, latestEntries } from '../src/lib/frontmatter.ts';
import { hueInk } from '../src/config/glass.ts';
import { experience } from '../src/config/resume.ts';

const projectSources = Object.fromEntries(list('src/pages/projects/', '.mdx').map((p) => [p, read(p)]));
const blogSources = Object.fromEntries(list('src/pages/blog/', '.mdx').map((p) => [p, read(p)]));
const cardIds = glassCards.map((c) => c.id);
const listing = (id) => details.find((d) => d.id === id);

test('the rows: the hero-card projects first in card order with their index, then the rest in home.ts order; no ANNA, no hidden ones', () => {
  const { details: joined, register } = buildProjects(projectSources);
  const rows = homeRows(joined, register, cardIds);
  assert.deepEqual(rows.map((r) => r.title), [
    listing('henk').title, listing('homelab').title, listing('sandbox').title,
    'Finance Bot', 'bible-tui', 'pytaiga-mcp', 'Encrypted Chat TUI',
  ]);
  assert.deepEqual(rows.map((r) => r.index ?? null), ['02', '03', '04', null, null, null, null]);
  assert.ok(!rows.some((r) => r.title === 'This site' || r.title === home.annaLead.title));
  // each row is its listing joined to its page: link, line and status, nothing rewritten
  for (const r of rows) {
    const src = [...joined, ...register].find((p) => p.href === r.href);
    assert.ok(src, r.href);
    assert.equal(r.title, src.title);
    assert.equal(r.what, src.what);
    assert.equal(r.status, src.status);
    assert.match(r.status, /\d{4}/, `${r.title}: a status from its page's frontmatter`);
  }
});

test('the number is the project\'s: dims[homeDim ?? 0] with its label; the register\'s entries have none', () => {
  const { details: joined, register } = buildProjects(projectSources);
  const rows = homeRows(joined, register, cardIds);
  assert.deepEqual(rows.map((r) => r.number?.value ?? null), ['4', '4', '3,700', '0.75', '102', '50 → 5', null]);
  for (const r of rows.filter((x) => x.number)) {
    const d = details.find((x) => x.href === r.href);
    assert.deepEqual(r.number, d.dims[d.homeDim ?? 0], r.title);
  }
});

test('a number changes at its source: a changed dims[homeDim] shows in its row with no other edit', () => {
  const { details: joined, register } = buildProjects(projectSources);
  const changed = joined.map((d) => (d.id === 'pytaiga' || d.id === 'henk'
    ? { ...d, dims: d.dims.map((x, i) => (i === (d.homeDim ?? 0) ? { ...x, value: d.id === 'henk' ? '5' : '60 → 6' } : x)) }
    : d));
  const rows = homeRows(changed, register, cardIds);
  assert.equal(rows.find((r) => r.title === 'pytaiga-mcp').number.value, '60 → 6');
  assert.equal(rows.find((r) => r.href === listing('henk').href).number.value, '5');
  // and the untouched rows are as they were
  assert.equal(rows.find((r) => r.title === 'bible-tui').number.value, '102');
});

test('the index mark\'s colour is its card\'s light, darkened only as far as 4.5:1 on stone', () => {
  const hue = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  for (const c of glassCards.filter((x) => x.id !== 'anna')) {
    const ink = parseColor(hueInk(c));
    assert.ok(ink && ink[3] === 1, `${c.id}: ${hueInk(c)} is an opaque colour`);
    const k = contrast(ink.slice(0, 3), '#EEEAE3');
    assert.ok(k >= 4.5, `${c.id}: ${k.toFixed(2)}:1 on stone`);
    assert.ok(k < 6.5, `${c.id}: not darkened past what it needs (${k.toFixed(2)}:1)`);
    const layer = c.tune.find((t) => t?.set?.color2);
    const from = layer.set.color2;
    const dh = Math.abs(hue(from) - hue(ink));
    assert.ok(Math.min(dh, 360 - dh) < 4, `${c.id}: hue ${hue(ink).toFixed(0)} keeps its light's ${hue(from).toFixed(0)}`);
  }
});

test('a new post: first in Writing, at most five, each with its line, never a draft', () => {
  const sources = {
    ...blogSources,
    './blog/a-new-post.mdx': '---\ntitle: "A new post"\ndescription: "described"\ndiary: "One line about it"\ndate: 2099-01-01\n---\nbody',
    './blog/_a-newer-draft.mdx': '---\ntitle: "A newer draft"\ndiary: "not yet"\ndate: 2100-01-01\n---\nbody',
  };
  const list5 = latestEntries(sources);
  assert.deepEqual(list5, diaryEntries(sources).slice(0, 5), 'Writing is diaryEntries(...).slice(0, 5), no sorting of its own');
  assert.equal(list5[0].title, 'A new post');
  assert.equal(list5[0].line, 'One line about it');
  assert.ok(list5.length <= 5 && list5.length >= 1, `${list5.length} entries`);
  for (const e of list5) {
    assert.ok(e.line, `${e.title} has its line`);
    assert.ok(!e.href.includes('/_'), `${e.href} is no draft`);
  }
  // the real list today: the five newest published posts
  assert.deepEqual(latestEntries(blogSources), diaryEntries(blogSources).slice(0, 5));
});

test('Projects, Experience and Writing: type on stone from their sources, no glass, after ANNA in the page', () => {
  const read_ = (n) => read(`src/components/stone/${n}.astro`);
  for (const n of ['Experience', 'Writing']) assert.doesNotMatch(read_(n), /data-glass|GlassWindow|GlassCard|<canvas|backdrop-filter/, `${n} has no glass`);
  // Projects: glass only in its three chapters, each its own moment; the rows hold none
  assert.match(read_('Projects'), /data-glass-moment=\{/);
  assert.match(read_('Projects'), /projectChapters/);
  assert.doesNotMatch(read_('Projects'), /GlassCard|<canvas|backdrop-filter|data-glass="/);
  for (const n of ['Projects', 'Experience', 'Writing']) {
    const src = read_(n);
    assert.doesNotMatch(src, /\.sort\(/, `${n} sorts nothing of its own`);
    assert.match(src, /homeSections\.headings\./, `${n}'s heading from config`);
  }
  assert.match(read_('Projects'), /homeRows\(/);
  assert.match(read_('Projects'), /homeSections\.links\.projects/);
  assert.match(read_('Experience'), /experience/);
  assert.match(read_('Experience'), /homeSections\.now/);
  assert.match(read_('Experience'), /homeSections\.links\.resume/);
  assert.match(read_('Writing'), /latestEntries\(/);
  assert.match(read_('Writing'), /homeSections\.links\.writing/);
  const index = read('src/pages/index.astro');
  const at = (tag) => index.indexOf(`<${tag} />`);
  for (const tag of ['AnnaSection', 'Projects', 'Experience', 'Writing']) assert.ok(at(tag) > 0, `${tag} on the page`);
  assert.ok(at('AnnaSection') < at('Projects') && at('Projects') < at('Experience') && at('Experience') < at('Writing'), 'in order');
  assert.ok(experience.length >= 1);
});

test('the projects\' windows in config: Henk\'s chat, the sandbox\'s report, bible-tui\'s reader, in that order', () => {
  const w = home.projectWindows;
  assert.deepEqual([...home.projectChapters], ['henk', 'sandbox', 'bible']);
  for (const id of home.projectChapters) assert.ok(w[id].title.length > 3, `${id} has a window title`);
  assert.ok(w.henk.alert.text && w.henk.messages.length >= 3);
  assert.ok(w.henk.messages.every((m) => m.from === 'henk' || m.from === 'me'));
  assert.ok(w.sandbox.command && w.sandbox.lines.length >= 3 && w.sandbox.risk.score);
  assert.equal(w.bible.verses.length, 5);
  assert.equal(w.bible.verses[0], 'In the beginning God created the heaven and the earth.');
  // each chapter is a project with a listing, and none is ANNA or hidden
  for (const id of home.projectChapters) assert.ok(details.some((d) => d.id === id), id);
});

// ---- Experience, newest first (Ezra, 2026-11-10) ----

import { byRecency } from '../src/lib/experience.ts';

test('Experience newest first: current jobs first, then by end year, then by start year, each descending', () => {
  const e = (role, startDate, endDate) => ({ role, client: 'x', startDate, endDate, stack: [], summary: '', group: 'prior' });
  const input = [
    e('old', '2015', '2017'),
    e('current, older start', '2021'),
    e('ended 2024, started 2020', '2020', '2024'),
    e('ended 2024, started 2022', '2022', '2024'),
    e('current, newer start', '2024'),
    e('ended 2025', '2019', '2025'),
  ];
  const before = input.map((x) => x.role);
  assert.deepEqual(byRecency(input).map((x) => x.role), [
    'current, newer start', 'current, older start', 'ended 2025', 'ended 2024, started 2022', 'ended 2024, started 2020', 'old',
  ]);
  assert.deepEqual(input.map((x) => x.role), before, 'the input keeps its order');
  // a full tie keeps the source order
  assert.deepEqual(byRecency([e('a', '2025'), e('b', '2025')]).map((x) => x.role), ['a', 'b']);
  assert.deepEqual(byRecency([e('b', '2025'), e('a', '2025')]).map((x) => x.role), ['b', 'a']);
});

test('Experience newest first, on the real résumé: the two jobs without an end year lead, then by end year (Pega DevOps ended 2025, started before the regulator job)', () => {
  const rows = byRecency(experience).map((x) => `${x.role} @ ${x.client}`);
  assert.deepEqual(rows, [
    'Forward Deployed Engineer @ Anamata',
    'DevOps & Software Engineer @ Major European bank',
    'Platform & Software Engineer @ Nordic financial regulator',
    'Pega DevOps Engineer @ Anamata',
    'DevOps Engineer @ European staffing company',
    'Junior Support Engineer @ MovingMedia BV',
    'Tutoring Teacher @ Self-employed',
  ]);
  assert.equal(rows.length, experience.length, 'every entry, once');
});

test('the homepage sorts Experience through byRecency; /resume keeps the résumé order (it groups under Anamata)', () => {
  const src = read('src/components/stone/Experience.astro');
  assert.match(src, /byRecency\(experience\)\.map/);
  assert.doesNotMatch(read('src/pages/resume.astro'), /byRecency/);
});

// ---- About and Contact (chunk 6) ----

test('Contact\'s link labels live in config, moved from the old contact sheet', () => {
  assert.deepEqual(home.homeSections.contact, { message: 'Send a message', linkedin: 'LinkedIn', github: 'GitHub' });
  assert.equal(typeof home.homeSections.terminalInput, 'string', 'the terminal\'s input label');
});

test('About: the notes, the photo with its alt from config, the terminal in a frosted window over its glow, its reflections', () => {
  const src = read('src/components/stone/About.astro');
  assert.match(src, /data-glass-moment="terminal"/);
  assert.match(src, /<GlassWindow /);
  assert.match(src, /title=\{homeSections\.terminalTitle\}/);
  assert.match(src, /glow="cards"/);
  assert.match(src, /<GlassCard [^>]*mini/, 'the reflection minis');
  assert.match(src, /terminalReflection\.panes\.map/);
  assert.match(src, /<Terminal /);
  assert.match(src, /notes\.map/);
  assert.match(src, /alt=\{homeSections\.photoAlt\}/);
  assert.match(src, /homeSections\.headings\.about/);
  assert.doesNotMatch(src, /data-glass="/, 'its glass objects are GlassWindow\'s and GlassCard\'s');
});

test('Contact: the address as a mailto link, then the contact page, LinkedIn and GitHub; no glass', () => {
  const src = read('src/components/stone/Contact.astro');
  assert.match(src, /mailto:\$\{site\.social\.email\}/);
  assert.match(src, /\{site\.social\.email\}/);
  assert.match(src, /site\.social\.LinkedIn/);
  assert.match(src, /site\.social\.GitHub/);
  assert.match(src, /homeSections\.contact\./);
  assert.match(src, /homeSections\.headings\.contact/);
  assert.doesNotMatch(src, /data-glass|GlassWindow|GlassCard|<canvas|backdrop-filter/, 'no contact strip');
});

test('the page ends with About, then Contact', () => {
  const index = read('src/pages/index.astro');
  const at = (tag) => index.indexOf(`<${tag} />`);
  for (const tag of ['Writing', 'About', 'Contact']) assert.ok(at(tag) > 0, `${tag} on the page`);
  assert.ok(at('Writing') < at('About') && at('About') < at('Contact'), 'in order');
});

test('the terminal listens for reduced motion switched on, and its window version has no drawing-sheet head', () => {
  const anim = read('src/scripts/terminal-animation.ts');
  assert.match(anim, /addEventListener\('change'/, 'a change listener on the reduced-motion query');
  assert.doesNotMatch(read('src/components/overzicht/Terminal.astro'), /term-head/);
});

test('the terminal\'s theme command no longer switches anything: the theme helper is gone', () => {
  const term = read('src/scripts/interactive-terminal.ts');
  assert.doesNotMatch(term, /lib\/theme|setTheme|getCurrentTheme/);
  assert.match(term, /commands\.set\('theme'/, 'the command stays, and answers');
  assert.equal(existsSync(new URL('src/lib/theme.ts', root)), false);
});

// ---- the whole page (chunk 7): what the old homepage alone used is gone ----

// Deleted with the drawing-sheet homepage. scene.js and depth.js are not on this list: AnnaPlate's
// plate.js on /projects draws scene.js's model, and scene.js orders its planes with depth.js.
const RETIRED = [
  'src/scripts/overzicht/intro.js',
  'src/scripts/overzicht/main.js',
  'src/scripts/overzicht/span.js',
  ...['YouSheet', 'AnnaSection', 'DetailsSheet', 'RegisterSheet', 'RevisionsSheet', 'NotesSheet', 'ContactSheet'].map((s) => `src/components/overzicht/${s}.astro`),
  // the arrival drew the name from these glyphs; the stone hero sets it as type
  'src/data/name-glyphs.json', 'scripts/name-glyphs.mjs', 'tests/name-glyphs.test.mjs',
  // the revision chart's span, with its unit test
  'tests/span.test.mjs',
  // the paper grain left with the drawing sheet (chunk 3)
  'public/tex/grain.jpg',
];

test('retired files are gone: the old homepage\'s scripts and sheets; AnnaPlate and plate.js stay, with the model plate.js draws', () => {
  const left = RETIRED.filter((p) => existsSync(new URL(p, root)));
  assert.deepEqual(left, []);
  for (const p of ['src/components/overzicht/AnnaPlate.astro', 'src/scripts/overzicht/plate.js', 'src/scripts/overzicht/scene.js', 'src/scripts/overzicht/depth.js']) {
    assert.ok(existsSync(new URL(p, root)), `${p} stays`);
  }
  assert.match(read('src/scripts/overzicht/plate.js'), /from '\.\/scene\.js'/, 'scene.js stays because plate.js draws it');
  assert.match(read('src/components/overzicht/AnnaPlate.astro'), /overzicht\/plate\.js/);
  // nothing still imports what went
  const srcFiles = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? srcFiles(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
  const code = [...srcFiles('src/'), ...srcFiles('scripts/')].filter((p) => /\.(astro|ts|js|mjs|mdx)$/.test(p));
  for (const p of code) {
    assert.doesNotMatch(read(p), /overzicht\/(intro|main|span)(\.js)?['"]|(YouSheet|DetailsSheet|RegisterSheet|RevisionsSheet|NotesSheet|ContactSheet)\.astro|overzicht\/AnnaSection|name-glyphs|tex\/grain/, p);
  }
});

test('npm test runs only files that exist, and no script regenerates the retired glyphs', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  const files = scripts.test.match(/tests\/\S+/g);
  assert.ok(files.length >= 5, scripts.test);
  for (const f of files) assert.ok(existsSync(new URL(f, root)), `npm test names ${f}`);
  assert.doesNotMatch(scripts.test, /span\.test|name-glyphs/);
  assert.equal(scripts['name-glyphs'], undefined);
});

test('nothing listens for what is gone: no theme-changed event, no arrival event, anywhere under src/', () => {
  const walk = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
  const code = walk('src/').filter((p) => /\.(astro|ts|js|mjs)$/.test(p));
  const hits = code.filter((p) => /theme-changed|ovz:arrived|ovz-arrived/.test(read(p)));
  assert.deepEqual(hits, []);
});

test('overzicht.css holds no rule for the old homepage: no sheet-you, scrolly, stage, terminal head or kbd, and the layout\'s noscript no stage', () => {
  const css = rules(read('src/styles/overzicht.css'));
  const sel = css.flatMap(items);
  const OLD = /(^|[\s>+~,(])(\.(sheet-you|you-text|you-side|scrolly|step|stage|leaders|levels|callout|callout-inline|chat-inline|bubble|bubble-q|bubble-a|scale-note|scale-tip|status-mark|term-head|sheet-contact|contact-msg|site-photo|name|tag|status|notes)(?![\w-])|kbd(?![\w-]))/;
  assert.deepEqual(sel.filter((s) => OLD.test(s)), []);
  assert.doesNotMatch(read('src/layouts/OverzichtLayout.astro'), /\.stage\b/);
});

test('every class overzicht.css styles is used by a page, a component, a layout or a script', () => {
  const walk = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));
  const code = walk('src/').filter((p) => /\.(astro|ts|js|mjs|mdx)$/.test(p)).map(read).join('\n');
  const classes = [...new Set(rules(read('src/styles/overzicht.css')).flatMap((r) => [...r.selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])))];
  // set from the layout's `current` prop: page-projects, page-blog, ...
  const dynamic = new Set(['js']);
  const unused = classes.filter((c) => !dynamic.has(c) && !new RegExp(`(?<![\\w-])${c}(?![\\w-])`).test(code));
  assert.deepEqual(unused, []);
});
