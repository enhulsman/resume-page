// Mounts the [04] glass on every [data-glass="ribbed"] pane on the page, all on one shared 10 s
// loop (glass-material). One WebGL context draws every pane in turn and each pane's own canvas (2D)
// gets a copy: phones keep only a few WebGL contexts alive and drop the oldest, so one context per
// pane left the first panes blank once a page had a dozen. Still on reduced motion (also when
// switched on later), paused off screen, and held still for the visit when drawing is slow
// (guard.js decides). Without WebGL a pane keeps its CSS ground and soft gradient, and its text.
//
// Test hooks: ?t=<seconds> freezes the light; ?guard=off switches the guard off; ?busy=<ms> adds
// busy work to every frame's draw. window.__glass: at(t), count, draws (per pane), slow,
// guard(on), busy(ms). window.__glassReady once the panes are fitted and drawn.
import { cardState, GLASS, PERIOD, REF, toRef } from './model.js';
import { createRenderer } from './shader.js';
import { slowFrom } from './guard.js';

const params = new URLSearchParams(location.search);
const still = matchMedia('(prefers-reduced-motion: reduce)');
const frozen = params.has('t') ? +params.get('t') : null;
const STILL_T = 2.4; // a moment where every light is well inside its card

let guardOn = params.get('guard') !== 'off';
let busyMs = params.has('busy') ? +params.get('busy') : 0;
let slow = false;
let readyAt = null; // performance.now() at __glassReady
let samples = [];
let lastFrame = null;

const shared = document.createElement('canvas');
let r = null;
try { r = createRenderer(shared); } catch (e) { console.warn('glass: no WebGL renderer', e); }

const panes = [...document.querySelectorAll('[data-glass="ribbed"]')].map((el) => {
  const canvas = el.querySelector('canvas');
  const ctx = r && canvas?.getContext('2d');
  if (!ctx) return null;
  el.classList.add('lit');
  return {
    el, canvas, ctx,
    light: +el.dataset.light,
    base: JSON.parse(el.dataset.base),
    tune: el.dataset.tune ? JSON.parse(el.dataset.tune) : undefined,
    distance: +(el.dataset.distance ?? 1),
    wash: el.dataset.wash ? JSON.parse(el.dataset.wash) : undefined,
    visible: true, size: null, draws: 0,
  };
}).filter(Boolean);

function fit(c) {
  // the layout size, not getBoundingClientRect: a pane under a CSS transform (the terminal's
  // mirrored reflection) would report its transformed box
  const cs = getComputedStyle(c.el);
  const box = { width: parseFloat(cs.width) || 0, height: parseFloat(cs.height) || 0 };
  if (!box.width || cs.display === 'none' || !c.el.offsetParent) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
  if (c.canvas.width !== w || c.canvas.height !== h) { c.canvas.width = w; c.canvas.height = h; }
  // the shared canvas only ever grows: resizing it clears it, which is fine between panes
  if (shared.width < w || shared.height < h) { shared.width = Math.max(shared.width, w); shared.height = Math.max(shared.height, h); }
  const k = toRef(box.width);
  c.size = { w: REF.w, h: box.height * k };
  c.radius = (parseFloat(cs.borderTopLeftRadius) || 0) * k;
  c.px = k / dpr;
  // behind the readout; a pane with no readout (data-quiet="off") has none
  c.quiet = c.el.dataset.quiet === 'off' ? null : { y0: c.size.h * 0.79, y1: c.size.h * 0.88, keep: 0.3 };
}

/** Draw one pane at time t; false when it could not be drawn (hidden, no size). */
function drawPane(c, t) {
  if (!c.size) fit(c);
  if (!c.size) return false;
  const state = cardState(c.light, t, c.base, c.tune, c.distance, c.wash);
  state.quiet = c.quiet;
  const w = c.canvas.width, h = c.canvas.height;
  r.draw(state, { size: c.size, radius: c.radius, px: c.px, glass: GLASS, target: { w, h } });
  // WebGL draws from the bottom-left corner up: that corner of the shared canvas is this pane
  c.ctx.clearRect(0, 0, w, h);
  c.ctx.drawImage(shared, 0, shared.height - h, w, h, 0, 0, w, h);
  c.draws++;
  return true;
}

const looping = () => frozen == null && !still.matches && !slow;
const now = () => frozen ?? (still.matches || slow ? STILL_T : (performance.now() / 1000) % PERIOD);
function drawAll(t = now()) { for (const c of panes) drawPane(c, t); }

const busy = (ms) => { const end = performance.now() + ms; while (performance.now() < end); };

function tick(stamp) {
  if (looping()) {
    const t = now();
    const start = performance.now();
    let drawn = 0;
    for (const c of panes) if (c.visible && drawPane(c, t)) drawn++;
    if (drawn && busyMs > 0) busy(busyMs);
    const draw = performance.now() - start;
    // only frames that drew a pane are sampled, so idle frames off screen do not dilute the mean
    if (drawn && guardOn && readyAt != null) {
      samples.push({ t: (start - readyAt) / 1000, interval: lastFrame == null ? 0 : stamp - lastFrame, draw });
      // keep the first sample (where the window starts) and the last 2 s
      const cut = samples[samples.length - 1].t - 2.1;
      if (samples.length > 2 && samples[1].t < cut) samples = [samples[0], ...samples.filter((s) => s.t >= cut)];
      if (slowFrom(samples)) {
        slow = true;
        drawAll(STILL_T);
      }
    }
  }
  lastFrame = stamp;
  requestAnimationFrame(tick);
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) { const c = panes.find((x) => x.el === e.target); if (c) c.visible = e.isIntersecting; }
});
panes.forEach((c) => io.observe(c.el));

const ro = new ResizeObserver(() => { panes.forEach(fit); if (panes.length) drawAll(); });
panes.forEach((c) => ro.observe(c.el));

// reduced motion switched on (or off) while the page is open
still.addEventListener('change', () => drawAll());

window.__glass = {
  /** Draw every pane at that moment of the loop (tests, screenshots). */
  at(t) { drawAll(t); },
  count: panes.length,
  /** How often each pane has been drawn, in page order. */
  get draws() { return panes.map((c) => c.draws); },
  /** True once the guard has held the lights still for this visit. */
  get slow() { return slow; },
  /** Switch the slow-device guard on or off; off also lets a held loop run again. */
  guard(on) { guardOn = !!on; samples = []; if (!on) slow = false; },
  /** Add this much busy work (ms) to every frame's draw. */
  busy(ms) { busyMs = +ms || 0; },
};
document.fonts.ready.then(() => {
  panes.forEach(fit);
  if (panes.length) drawAll();
  readyAt = performance.now();
  window.__glassReady = true;
});
requestAnimationFrame(tick);
