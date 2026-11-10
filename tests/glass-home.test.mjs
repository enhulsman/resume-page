// The glass as site code (openspec stone-glass-homepage, glass-material): what may be glass, the
// one-moment check, the slow-device guard's decision, the shared inks on glass, the no-WebGL
// fallback. The model's own tests (unlit pane, lit seam, loop closes, distance 1) stay in
// tests/glass-hero.test.mjs.
//
//   node --test tests/glass-home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { glassMoments, glassCards, fallbackFor, windowGlows } from '../src/config/glass.ts';
import { momentsOverlap, visibleShare } from './lib/moments.mjs';
import { slowFrom } from '../src/scripts/glass/guard.js';
import { parseColor, contrast } from './lib/contrast.mjs';
import * as home from '../src/config/home.ts';
import site from '../src/config/site.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const list = (dir, ext) => (existsSync(new URL(dir, root)) ? readdirSync(new URL(dir, root)).filter((f) => f.endsWith(ext)).map((f) => `${dir}${f}`) : []);

// ---- what may be glass ----

test('the list in config: exactly the hero, ANNA and the terminal, in that order', () => {
  assert.deepEqual(glassMoments, ['hero', 'anna', 'terminal']);
});

test('the shipped picks: each card at Ezra\'s distance, Homelab\'s sun nearer still', () => {
  assert.deepEqual(glassCards.map((c) => c.distance), [0.35, 0.8, 0.5, 0.45]);
  const homelab = glassCards.find((c) => c.id === 'homelab');
  assert.equal(homelab.tune[0].dist, 0.45, 'the sun layer');
  for (const c of glassCards) assert.ok(c.distance >= 0 && c.distance <= 1.5, `${c.id} within 0..1.5`);
});

// ---- one moment per screen ----

test('the overlap check itself: a window close under the hero shares the screen, one far enough does not', () => {
  assert.equal(momentsOverlap([200, 530], [630, 1230], 900), true);
  assert.equal(momentsOverlap([200, 530], [1150, 1750], 900), false);
  // order does not matter: the upper box is found from the offsets
  assert.equal(momentsOverlap([630, 1230], [200, 530], 900), true);
  assert.equal(momentsOverlap([1150, 1750], [200, 530], 900), false);
  // the edge: (b0 + hB/3) - (a1 - hA/3) equal to the viewport still overlaps
  // a = [0, 300] (a1 - hA/3 = 200), b = [1000, 1300] (b0 + hB/3 = 1100): 900 apart
  assert.equal(momentsOverlap([0, 300], [1000, 1300], 900), true);
  assert.equal(momentsOverlap([0, 300], [1000.5, 1300.5], 900), false);
});

test('the visible share of a glass box, for the scroll walk', () => {
  assert.equal(visibleShare([200, 530], 0, 900), 1);
  assert.equal(visibleShare([1000, 1300], 0, 900), 0);
  assert.ok(Math.abs(visibleShare([800, 1100], 0, 900) - 1 / 3) < 1e-9);
  assert.equal(visibleShare([0, 2000], 500, 900), 900 / 2000);
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
  for (const target of ['.glass-title', '.aw-replay', '.msg .who', '.sources', '.rec-head', '.terminal-dim']) {
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

test('texts already in a darker opaque ink keep it: the steps and the record\'s items', () => {
  assert.deepEqual(inksFor('.steps').map((c) => c.toLowerCase()), ['#4a453f']);
  assert.deepEqual(inksFor('.record ul').map((c) => c.toLowerCase()), ['#3a3632']);
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

test('each window has a glow of soft radial lights in config: the flame for ANNA, the four cards for the terminal', () => {
  assert.deepEqual(Object.keys(windowGlows).sort(), ['cards', 'flame']);
  assert.equal(windowGlows.flame.lights.length, 3);
  assert.equal(windowGlows.cards.lights.length, 4);
  for (const g of Object.values(windowGlows)) {
    for (const l of g.lights) {
      assert.equal(l.color.length, 3);
      assert.ok(l.opacity > 0 && l.opacity < 1, 'faint, never a solid panel');
    }
    assert.ok(g.blur >= 20, 'blurred well past any edge');
  }
});

// ---- the components and the driver, as written ----

test('GlassCard: ribbed, its canvas hidden from readers, its text real HTML', () => {
  const src = read('src/components/stone/GlassCard.astro');
  assert.match(src, /data-glass"?\s*[:=]\s*"ribbed"/);
  assert.match(src, /<canvas aria-hidden="true"/);
  assert.match(src, /\{card\.title\}/);
  assert.match(src, /\{card\.readout\}/);
});

test('GlassWindow: frosted, a title bar, a hidden glow beneath it', () => {
  const src = read('src/components/stone/GlassWindow.astro');
  assert.match(src, /data-glass="frosted"/);
  assert.match(src, /data-glow aria-hidden="true"/);
  assert.match(src, /class="glass-title"/);
  assert.match(src, /backdrop-filter/);
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
