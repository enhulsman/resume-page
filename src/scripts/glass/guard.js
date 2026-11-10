// The slow-device guard's decision (glass-material): is drawing the lights too slow on this device?
// panes.js collects one sample per frame that drew a pane and asks this. A pure function, so the
// rules are unit-tested on made-up samples (tests/glass-home.test.mjs): an e2e run cannot tell a
// capped frame rate from swiftshader's own slowness.

const SETTLE = 1; // s after __glassReady before any sample counts
const WINDOW = 2; // s of samples averaged
const LIMIT = 20; // ms of drawing per frame, on average, above which the device is slow
const EPS = 1e-6;

/**
 * @param {{ t: number, interval: number, draw: number }[]} samples in time order: `t` seconds since
 *   __glassReady, `interval` ms since the previous frame, `draw` ms spent in the frame's draw calls.
 * @returns {boolean} true when the mean `draw` over the last 2 s exceeds 20 ms; false until the
 *   samples after the first second span 2 s. `interval` never counts.
 */
export function slowFrom(samples) {
  const ok = samples.filter((s) => s.t >= SETTLE);
  if (!ok.length) return false;
  const last = ok[ok.length - 1].t;
  // the first eligible frame covers the time since the frame before it, never before the settle
  const from = Math.max(SETTLE, ok[0].t - (ok[0].interval || 0) / 1000);
  if (last - from < WINDOW - EPS) return false;
  const recent = ok.filter((s) => s.t >= last - WINDOW - EPS);
  const mean = recent.reduce((a, s) => a + s.draw, 0) / recent.length;
  return mean > LIMIT;
}
