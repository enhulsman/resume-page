// One Chromium per test file, and every context a test opens closed once that test ends, passed or
// failed. A test that fails before its own context.close() would otherwise leave its page open, and
// a homepage left open keeps its light running for the rest of the file: every later test then
// waits on a starved GPU process, and one slow failure becomes six (CI, 2026-11-11).
//
//   const pw = useBrowser({ args: SWIFTSHADER });
//   const context = await pw.newContext({ viewport: ... }); // closed after this test
//   const shared = await pw.browser.newContext(...);        // in a before(): yours to close
import { before, after, afterEach } from 'node:test';
import { chromium } from 'playwright';

/** The glass files' GL: SwiftShader through ANGLE, as every glass test has run it. */
export const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

/** Launch Chromium before the file's tests, close it after them; newContext() is closed after each test. */
export function useBrowser(launchOptions = {}) {
  const open = new Set();
  const pw = {
    browser: null,
    async newContext(options) {
      const context = await pw.browser.newContext(options);
      open.add(context);
      context.once('close', () => open.delete(context));
      return context;
    },
  };
  before(async () => { pw.browser = await chromium.launch(launchOptions); });
  afterEach(async () => {
    const left = [...open];
    open.clear();
    await Promise.all(left.map((c) => c.close().catch(() => {})));
  });
  after(async () => { await pw.browser?.close(); });
  return pw;
}
