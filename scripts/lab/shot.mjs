import { chromium } from 'playwright';
const [,, url, out, w = 1440, h = 900, t = '2.4'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto(url + (url.includes('?') ? '&' : '?') + 't=' + t);
await p.waitForFunction(() => window.__glassReady === true);
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
