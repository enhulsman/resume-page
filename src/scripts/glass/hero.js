// Mounts the [04] glass on every .glass-card[data-light] on the page: one WebGL canvas per
// card, all on one shared 10 s loop. Still on reduced motion, paused off screen and in a
// background tab. Without WebGL the card keeps its CSS colour and its text.
import { cardState, GLASS, PERIOD, REF, toRef } from './model.js';
import { createRenderer } from './shader.js';

const params = new URLSearchParams(location.search);
const still = matchMedia('(prefers-reduced-motion: reduce)');
const frozen = params.has('t') ? +params.get('t') : null;
const STILL_T = 2.4; // a moment where every light is well inside its card
// the distance dial: 0 = the light pressed to the glass, hard edges; 1 = the study's softness.
// Each card has its own (data-distance); the lab slider, or ?blur=, sets one for all.
let blur = params.has('blur') ? +params.get('blur') : null;

const cards = [...document.querySelectorAll('.glass-card[data-light]')].map((el) => {
  const canvas = el.querySelector('canvas');
  const r = canvas && createRenderer(canvas);
  if (!r) return null;
  el.classList.add('lit');
  return { el, canvas, r, light: +el.dataset.light, base: JSON.parse(el.dataset.base), tune: el.dataset.tune ? JSON.parse(el.dataset.tune) : undefined, tuneBefore: el.dataset.tuneBefore ? JSON.parse(el.dataset.tuneBefore) : undefined, distance: +(el.dataset.distance ?? 1), wash: el.dataset.wash ? JSON.parse(el.dataset.wash) : undefined, visible: true, size: null };
}).filter(Boolean);

function fit(c) {
  // the layout size, not getBoundingClientRect: a pane under a CSS transform (ANNA's exploded
  // stack) would report its rotated outline's box and the light would be fitted to that
  const cs = getComputedStyle(c.el);
  const box = { width: parseFloat(cs.width) || 0, height: parseFloat(cs.height) || 0 };
  if (!box.width || cs.display === 'none' || !c.el.offsetParent) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
  if (c.canvas.width !== w || c.canvas.height !== h) { c.canvas.width = w; c.canvas.height = h; }
  const k = toRef(box.width);
  const radius = parseFloat(getComputedStyle(c.el).borderTopLeftRadius) || 0;
  c.size = { w: REF.w, h: box.height * k };
  c.radius = radius * k;
  c.px = k / dpr;
  // behind the readout; a pane whose text sits beside its light (data-quiet="off") has none
  c.quiet = c.el.dataset.quiet === 'off' ? null : { y0: c.size.h * 0.79, y1: c.size.h * 0.88, keep: 0.3 };
}

function drawCard(c, t) {
  if (!c.size) fit(c);
  if (!c.size) return;
  const before = document.documentElement.dataset.look === 'before'; // lab: the cards before review round 3
  const state = cardState(c.light, t, c.base, before ? (c.tuneBefore ?? c.tune) : c.tune, blur ?? c.distance, before ? undefined : c.wash);
  state.quiet = c.quiet;
  c.r.draw(state, { size: c.size, radius: c.radius, px: c.px, glass: GLASS });
}

const now = () => (frozen ?? (still.matches ? STILL_T : (performance.now() / 1000) % PERIOD));
function drawAll(t = now()) { for (const c of cards) drawCard(c, t); }

const io = new IntersectionObserver((entries) => {
  for (const e of entries) { const c = cards.find((x) => x.el === e.target); if (c) c.visible = e.isIntersecting; }
});
cards.forEach((c) => io.observe(c.el));

const ro = new ResizeObserver(() => { cards.forEach(fit); drawAll(); });
cards.forEach((c) => ro.observe(c.el));

function tick() {
  if (frozen == null && !still.matches) {
    const t = now();
    for (const c of cards) if (c.visible) drawCard(c, t);
  }
  requestAnimationFrame(tick);
}
still.addEventListener('change', () => drawAll());

// lab: the distance dial
const dial = document.querySelector('#blur');
if (dial) {
  const out = document.querySelector('#blur-out');
  const show = () => { dial.value = String(blur ?? 0.5); if (out) out.textContent = blur == null ? 'per card' : blur.toFixed(2); };
  out?.addEventListener('click', () => {
    blur = null; show(); drawAll();
    const u = new URL(location.href); u.searchParams.delete('blur'); history.replaceState(null, '', u);
  });
  show();
  dial.addEventListener('input', () => {
    blur = +dial.value; show(); drawAll();
    const u = new URL(location.href); u.searchParams.set('blur', String(blur)); history.replaceState(null, '', u);
  });
  // the switches change the page in place: H3/H2, four or five cards, now or before round 3
  document.querySelectorAll('.lab a[data-key]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.documentElement.dataset[a.dataset.key] = a.dataset.val;
    const u = new URL(location.href); u.searchParams.set(a.dataset.key, a.dataset.val); history.replaceState(null, '', u);
    requestAnimationFrame(() => { cards.forEach(fit); drawAll(); });
  }));
}

// for page scripts that change a pane while it runs (ANNA's stack): its live state, by element.
// Set `distance` and `tune` on it; call redraw() when the loop is not running (reduced motion, ?t=).
export const paneFor = (el) => cards.find((c) => c.el === el);
export const redraw = () => drawAll();
export const looping = () => frozen == null && !still.matches;

// for tests and screenshots: window.__glass.at(seconds) draws every card at that moment
window.__glass = { at(t) { drawAll(t); }, count: cards.length };
document.fonts.ready.then(() => { cards.forEach(fit); drawAll(); window.__glassReady = true; });
requestAnimationFrame(tick);
