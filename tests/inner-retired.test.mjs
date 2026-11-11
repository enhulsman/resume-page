// The drawing-sheet files and the sketches are gone (openspec stone-inner-pages, chunk 12):
// stone-inner-pages "The retired files are gone" (Files, Nothing of the plate on the built site) and
// "The sketches are gone" (No sketch routes, the files half; the 404 on the running site is in
// tests/inner-site.e2e.mjs). The link preview is a still of the stone hero now (Ezra, 2026-11-10).
// The dist/ checks read the last build: run `npm run build` first.
//
//   node --test tests/inner-retired.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { windowGlows } from '../src/config/glass.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const has = (p) => existsSync(new URL(p, root));
const walk = (dir) => readdirSync(new URL(dir, root), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(`${dir}${d.name}/`) : [`${dir}${d.name}`]));

const DRAWINGS = 'src/components/overzicht/drawings/';
const RETIRED = [
  ...['HenkDrawing', 'BibleDrawing', 'HomelabDrawing', 'SandboxDrawing', 'FinanceDrawing'].map((d) => `${DRAWINGS}${d}.astro`),
  'src/components/overzicht/AnnaPlate.astro',
  'src/scripts/overzicht/plate.js', 'src/scripts/overzicht/scene.js', 'src/scripts/overzicht/depth.js', 'tests/depth.test.mjs',
  'src/scripts/overzicht/pointer.js',
  'src/components/StatStrip.astro', 'src/components/overzicht/DetailCard.astro', 'src/components/overzicht/ProjectCard.astro',
  'scripts/og-image.mjs',
];
const KEPT = [
  'public/og-image.png', `${DRAWINGS}PytaigaDrawing.astro`, `${DRAWINGS}PostHenkDrawing.astro`,
  'src/components/diagrams/HenkFlow.astro', 'src/components/diagrams/SandboxArchitecture.astro',
  // the glass pointer (the light under the mouse) is not the overzicht one
  'src/scripts/glass/pointer.js',
];

test('Files: the retired files are gone, the kept ones stay, no og-image script, nothing names what went', () => {
  assert.deepEqual(RETIRED.filter(has), []);
  assert.deepEqual(KEPT.filter((p) => !has(p)), []);
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts['og-image'], undefined);
  assert.doesNotMatch(scripts.test, /depth\.test/);
  const code = [...walk('src/'), ...walk('scripts/')].filter((p) => /\.(astro|ts|js|mjs|mdx|css)$/.test(p));
  assert.ok(code.length > 50, `${code.length} files read`);
  const hits = code.flatMap((p) => {
    const s = read(p);
    const words = ['AnnaPlate', 'plate.js', 'scene.js', 'depth.js', 'StatStrip', 'overzicht/pointer', 'DetailCard', 'ProjectCard.astro',
      'HenkDrawing', 'BibleDrawing', 'HomelabDrawing', 'SandboxDrawing', 'FinanceDrawing', 'og-image.mjs'];
    // whole names: PostHenkDrawing stays, HenkDrawing went
    return words.filter((w) => new RegExp(`(?<![\\w-])${w.replace(/\./g, '\\.')}`).test(s)).map((w) => `${p}: ${w}`);
  });
  assert.deepEqual(hits, []);
});

test('Files: the drawings index exports only pytaiga-mcp\'s drawing and the henk-exactly-once post\'s', () => {
  const src = read(`${DRAWINGS}index.ts`);
  const imports = [...src.matchAll(/import\s+(\w+)\s+from/g)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['PostHenkDrawing', 'PytaigaDrawing']);
  assert.match(src, /export const drawings\s*=\s*\{\s*pytaiga:\s*PytaigaDrawing\s*\}/);
  assert.match(src, /"henk-exactly-once":\s*PostHenkDrawing/);
});

test('Files: the sketches\' glow alias went with them: windowGlows has no hidden `homelab`', () => {
  assert.equal(Object.getOwnPropertyNames(windowGlows).includes('homelab'), false);
  assert.equal(windowGlows.homelab, undefined);
  assert.doesNotMatch(read('src/config/glass.ts'), /defineProperty\(windowGlows/);
});

test('The link preview: public/og-image.png is a 1200x630 PNG', () => {
  const png = readFileSync(new URL('public/og-image.png', root));
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});

test('No sketch routes: src/pages/sketches/ does not exist, and no page outside it links there', () => {
  assert.equal(has('src/pages/sketches/'), false);
  const pages = walk('src/').filter((p) => /\.(astro|ts|js|mdx)$/.test(p));
  assert.deepEqual(pages.filter((p) => /["'`(]\/sketches\//.test(read(p))), []);
});

const built = has('dist/index.html');

test('No sketch routes: the build has no sketches directory and its sitemap lists no /sketches/ page', { skip: !built && 'no build in dist/: run `npm run build` first' }, () => {
  assert.equal(has('dist/sketches/'), false);
  const sitemap = read('dist/sitemap-index.xml');
  assert.match(sitemap, /<loc>/);
  assert.doesNotMatch(sitemap, /\/sketches\//);
});

test('Nothing of the plate on the built site: no page in dist/ contains plate-stage, titleblock or class="stamp"', { skip: !built && 'no build in dist/: run `npm run build` first' }, () => {
  const pages = walk('dist/').filter((p) => p.endsWith('.html'));
  assert.ok(pages.length >= 18, `${pages.length} pages read`);
  const hits = pages.flatMap((p) => {
    const s = read(p);
    return ['plate-stage', 'titleblock', 'class="stamp"'].filter((w) => s.includes(w)).map((w) => `${p}: ${w}`);
  });
  assert.deepEqual(hits, []);
});
