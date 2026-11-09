// Screenshot one element of a lab page: node scripts/lab/section-shot.mjs <url> <selector> <out.png> [width] [height] [t]
import { chromium } from 'playwright';
const [,, url, sel, out, w = 1440, h = 900, t = '2.4'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto(url + (url.includes('?') ? '&' : '?') + 't=' + t);
await p.waitForFunction(() => window.__glassReady === true);
const el = p.locator(sel);
await el.scrollIntoViewIfNeeded();
await p.evaluate((t) => window.__glass.at(+t), t);
await p.waitForTimeout(300);
await el.screenshot({ path: out });
await b.close();
