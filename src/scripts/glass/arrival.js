// The hero's arrival and the name's light, in the page (stone-homepage: "The hero arrives and the
// cards' light reaches the name"; the timeline and the geometry are arrival-model.js). The cards
// fade in one after another while panes.js brings each light up from dim and far behind the glass;
// then the cards' colours rise in the name and settle into a resting tint that follows each card's
// light over the loop, at each card's live position (a phone's swipe row moves it). A mouse over
// the name adds a soft light at the pointer in the colour of the card nearest it.
//
// The name's light is the h1's ::after (Hero.astro): a copy of the name, silent to readers, whose
// background (--spill) is clipped to the letters. Reduced motion: no arrival, no light (the CSS hides
// the ::after). ?t=: no arrival, no mouse light. Without WebGL (no hero panes) nothing happens.
// The cards wait from the first paint (Hero.astro's `arrive-pending`); if that class is already gone
// when this runs (its 2.5 s safety), the cards are shown and there is no arrival.
//
// Test hooks: ?at=<0..1> holds the arrival at that share of its T s. window.__hero: ready, t (the
// arrival's clock, s), lt (the light's loop time at the last paint), spill (each card's share of
// the peak), layers (what lights the name: { kind: 'card', i, x, y, rx, ry, a } and
// { kind: 'mouse', x, y, a, c }, px in the name's box).
import { heroPanes, setGlow, lightTime } from './panes.js';
import { pointer } from './pointer.js';
import { T, cardIn, glowIn, spillK, amountAt, softLight, spillPlace, hueAt, SPILL_A, HOVER_A } from './arrival-model.js';

const q = new URLSearchParams(location.search);
const html = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 760px)');
const frozen = q.has('t');
const name = document.querySelector('#hero-name');
const row = document.querySelector('[data-glass-moment="hero"] .cards');
const items = row ? [...row.querySelectorAll(':scope > li')] : [];
const cards = items.map((li) => li.querySelector('.glass-card'));
const hues = items.map((li) => li.dataset.spill.split(' ').map(Number));
const amounts = items.map((li) => li.dataset.amount.split(' ').map(Number));
const lit = !!name && heroPanes.length === items.length && items.length > 0;
const hook = { ready: false, t: T, lt: 0, spill: items.map(() => 0), layers: [] };
window.__hero = hook;

// the arrival runs once, only if the cards are still waiting for it
const pending = html.classList.contains('arrive-pending');
const arrives = () => lit && pending && !still.matches && !frozen;
const held = q.has('at') ? Math.min(1, Math.max(0, +q.get('at') || 0)) * T : null;
let t0 = null; // performance.now() when it started
if (arrives()) items.forEach((li, i) => { li.style.opacity = '0'; setGlow(i, 0); });
html.classList.remove('arrive-pending');

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const hover = { a: 0, x: 0, y: 0, c: hues[0] };
let last = null, shown = true, painted = '';
const faded = items.map(() => -1);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
  last = now;
  // the arrival's clock: held by ?at, running once, else finished
  const t = !arrives() ? T : held != null ? held : t0 == null ? 0 : Math.min(T, (now - t0) / 1000);
  hook.t = t;
  items.forEach((li, i) => {
    setGlow(i, glowIn(i, t)); // a no-op once it is full
    const o = cardIn(i, t);
    if (o === faded[i]) return;
    faded[i] = o;
    if (o >= 1) { li.style.removeProperty('opacity'); li.style.removeProperty('transform'); }
    else { li.style.opacity = o.toFixed(3); li.style.transform = `translateY(${(10 * (1 - o)).toFixed(2)}px)`; }
  });
  if (!shown) return;

  // read every box first, then write once
  const lt = lightTime();
  const nb = name.getBoundingClientRect(), rb = row.getBoundingClientRect();
  const cb = cards.map((c) => c.getBoundingClientRect());
  const on = !still.matches;
  hook.lt = lt;
  hook.spill = items.map((_, i) => (on ? spillK(t, amountAt(amounts[i], lt)) : 0));
  const layers = [];

  // the mouse: full over the name, fading out over 140 px around it; only once the hero has arrived
  let want = 0;
  if (pointer && on && !frozen && t >= T) {
    const dx = Math.max(nb.left - pointer[0], 0, pointer[0] - nb.right);
    const dy = Math.max(nb.top - pointer[1], 0, pointer[1] - nb.bottom);
    want = 1 - ease(Math.hypot(dx, dy) / 140);
  }
  hover.a += (want - hover.a) * (1 - Math.exp(-dt / (want > hover.a ? 0.22 : 0.45)));
  if (Math.abs(want - hover.a) < 0.002) hover.a = want;
  if (pointer && want > 0) {
    hover.x = pointer[0] - nb.left; hover.y = pointer[1] - nb.top;
    const target = hueAt(pointer[0], cb.map((b, i) => ({ left: b.left, width: b.width, hue: hues[i] })));
    hover.c = hover.c.map((v, j) => v + (target[j] - v) * (1 - Math.exp(-dt / 0.2)));
  }
  if (hover.a > 0.002) {
    const r = 1.5 * parseFloat(getComputedStyle(name).fontSize);
    layers.push({ kind: 'mouse', x: hover.x, y: hover.y, rx: r, ry: r * 0.85, a: HOVER_A * hover.a, c: hover.c });
  }

  // each card's light, from below, where the card is now
  hook.spill.forEach((k, i) => {
    if (k < 0.002) return;
    const p = spillPlace(cb[i], rb, nb, innerWidth, phone.matches);
    const a = Math.min(1, SPILL_A * k * p.seen ** 1.5 * p.gain);
    if (a >= 0.002) layers.push({ kind: 'card', i, x: p.x, y: p.y, rx: p.rx, ry: p.ry, a, c: hues[i] });
  });
  hook.layers = layers;

  const css = layers.map((L) => softLight(L.c, L.a, L.rx, L.ry, L.x, L.y)).join(', ');
  if (css !== painted) {
    painted = css;
    if (css) name.style.setProperty('--spill', css);
    else name.style.removeProperty('--spill');
  }
}

if (lit) {
  // the name's light pauses with the hero off screen
  new IntersectionObserver(([e]) => { shown = e.isIntersecting; }).observe(name.closest('section') ?? name);
  document.fonts.ready.then(() => {
    t0 = performance.now();
    requestAnimationFrame(frame);
    hook.ready = true;
  });
} else hook.ready = true;
