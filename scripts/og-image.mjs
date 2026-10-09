// scripts/og-image.mjs
// Draws public/og-image.png, the 1200x630 link preview: the name, the role and the ANNA
// section drawing from the homepage's own renderer, with heavier lines so it still reads
// as a small thumbnail. Needs the dev server: `npx astro dev --port 4321`, then
// `npm run og-image`.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4321';
const out = fileURLToPath(new URL('../public/og-image.png', import.meta.url));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo"; src: url(/fonts/Archivo.woff2) format("woff2-variations"); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: "B612 Mono"; src: url(/fonts/B612Mono.woff2) format("woff2"); }
:root { --sheet:#EFEDF3; --ink:#2B2766; --ink-2:#57528C; --faint:#8A86AE; --red:#B8301A; }
html,body { margin:0; width:1200px; height:630px; background:var(--sheet); overflow:hidden; }
body { position:relative; font-family:"Archivo"; color:var(--ink); }
.frame { position:absolute; inset:20px; border:4px solid var(--ink); }
.txt { position:absolute; left:72px; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; }
h1 { margin:0; font-size:112px; line-height:.86; font-weight:820; font-stretch:125%; letter-spacing:-.02em; }
h1 span { display:block; }
p { margin:30px 0 0; font-size:43px; font-weight:650; font-stretch:92%; color:var(--ink); }
p b { color:var(--red); font-weight:650; }
canvas { position:absolute; left:742px; top:44px; width:420px; height:542px; }
</style></head><body><div class="frame"></div>
<div class="txt"><h1><span>Ezra</span><span>Hulsman</span></h1><p>Forward Deployed Engineer</p></div>
<canvas></canvas>
<script type="module">
const k = 2.6; // lines about 2.6 times the site's weight, so they survive a 300px preview
const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'lineWidth');
Object.defineProperty(CanvasRenderingContext2D.prototype, 'lineWidth', { set(v) { d.set.call(this, v * k); }, get() { return d.get.call(this) / k; } });
await document.fonts.load('820 40px Archivo'); await document.fonts.load('12px "B612 Mono"');
const { createScene } = await import('/src/scripts/overzicht/scene.js');
const c = document.querySelector('canvas');
const s = createScene(c, { reduced: true });
s.start();
const r = c.getBoundingClientRect();
s.setFrame({ x: 10, y: 10, w: r.width - 20, h: r.height - 20 });
s.request();
setTimeout(() => document.body.dataset.ready = '1', 600);
</script></body></html>`;

const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  // served from the dev server's origin so the page can import the renderer and the fonts
  await page.route(`${BASE}/__og`, r => r.fulfill({ contentType: 'text/html', body: html }));
  page.on('pageerror', e => { throw e; });
  await page.goto(`${BASE}/__og`);
  await page.waitForSelector('body[data-ready]');
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
