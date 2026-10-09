// The homepage's arrival, the part CSS cannot do alone (the rest is "the arrival" in
// overzicht.css; whether it plays is decided in the layout's head, before first paint).
// It rules the lettering guides under the name, sends the crosshair from the sheet's corner
// to the name, and ends with the name's dimension: its real width, in the sheet's own units.
// When it is over it clears the class and says so ('ovz:arrived'), so the terminal can start
// typing and the ANNA drawing can take its settled ink. Any key, wheel or tap hurries it along.
// (If this script never runs, the layout's head clears the class itself.)
//
// The dimension stays: on every visit, drawn quickly when the arrival is skipped, and simply
// there on reduced motion.
const SVGNS = 'http://www.w3.org/2000/svg';
const html = document.documentElement;
const name = document.querySelector('.name');
// measured against the first sheet: on phones the name's own column is display: contents
const holder = name?.closest('.sheet-you');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const playing = html.classList.contains('intro');
const ARRIVAL = ['develop', 'tilt', 'ink', 'lamp'];
// and what a hurry speeds up besides: the lettering guides and the dimension
const HURRIES = [...ARRIVAL, 'guides', 'dim-run', 'dim-end'];
// in the arrival's own clock (ms), keep in step with overzicht.css
const GUIDES_END = 1100, TRIP_FROM = 250, DIM_AT = 1100;

// the arrival's CSS animations all started on first paint; read their clock
const started = () => {
  const a = document.body.getAnimations().find(x => x.animationName === 'tilt');
  return a?.startTime ?? document.timeline.currentTime;
};
const t0 = playing ? started() : 0;
const since = () => document.timeline.currentTime - t0;

// The sheet may still lie tilted while we measure, and boxes on screen are the tilted ones.
// Measure it square: for one synchronous moment the tilt is put at its end (nothing paints in
// between), then back where it was.
function square(fn) {
  const tilt = document.body.getAnimations().filter(a => a.animationName === 'tilt' && a.playState !== 'finished');
  const at = tilt.map(a => a.currentTime);
  tilt.forEach(a => { a.currentTime = a.effect.getComputedTiming().endTime; });
  try { return fn(); } finally { tilt.forEach((a, i) => { a.currentTime = at[i]; }); }
}

// each line of the name: its extent and baseline, relative to the name's holder, in layout
// pixels
const lines = () => square(() => {
  const hb = holder.getBoundingClientRect();
  return [...name.querySelectorAll('span')].map(span => {
    const range = document.createRange();
    range.selectNodeContents(span);
    const r = range.getBoundingClientRect();
    // a zero-size inline box sits on the baseline
    const probe = document.createElement('i');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    span.append(probe);
    const base = probe.getBoundingClientRect().top - hb.top;
    probe.remove();
    return { left: r.left - hb.left, width: r.width, base };
  });
});

function capHeight() {
  const cs = getComputedStyle(name);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText('H').actualBoundingBoxAscent;
}

// ---------- the lettering guides ----------
function rule() {
  const at = since();
  if (hurried || at > GUIDES_END) return;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'name-guides');
  svg.setAttribute('aria-hidden', 'true');
  const nameTop = square(() => name.getBoundingClientRect().top - holder.getBoundingClientRect().top);
  const cap = capHeight();
  const w = name.offsetWidth;
  for (const l of lines()) {
    for (const y of [l.base, l.base - cap]) {
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', -8); ln.setAttribute('x2', w);
      ln.setAttribute('y1', y - nameTop); ln.setAttribute('y2', y - nameTop);
      svg.append(ln);
    }
  }
  // join the CSS clock: the guides' animation runs from the arrival's start, not from now
  svg.style.animationDelay = `${-at}ms`;
  name.append(svg);
  setTimeout(() => svg.remove(), Math.max(0, 1450 - at) + 50);
}

// ---------- the dimension ----------
const dim = document.createElementNS(SVGNS, 'svg');
dim.setAttribute('class', 'name-dim');
dim.setAttribute('aria-hidden', 'true');
dim.innerHTML = '<path class="dim-end"/><path class="dim-run"/><text text-anchor="middle"></text>';
const [dimEnd, dimRun, dimText] = dim.children;
const GAP = 16; // from the top of the letters to the dimension line

function measure() {
  const ls = lines();
  const widest = ls.reduce((a, b) => (b.width > a.width ? b : a));
  const x = Math.min(...ls.map(l => l.left));
  return { x, w: widest.width, y: ls[0].base - capHeight() - GAP };
}

function drawDim() {
  const { x, w, y } = measure();
  // the svg's own origin sits on the dimension line's left end
  dim.style.left = `${x}px`;
  dim.style.top = `${y}px`;
  dim.setAttribute('width', Math.ceil(w));
  dim.setAttribute('height', 1);
  const W = w.toFixed(1);
  // extension lines down towards the name, architectural ticks through both ends
  dimEnd.setAttribute('d', `M0 -5V10M${W} -5V10M-4 4L4 -4M${(w - 4).toFixed(1)} 4L${(w + 4).toFixed(1)} -4`);
  dimRun.setAttribute('d', `M0 0H${W}`);
  dimText.setAttribute('x', (w / 2).toFixed(1));
  dimText.setAttribute('y', -6);
  dimText.textContent = String(Math.round(w));
  return { x, w, y };
}

// ---------- the crosshair's trip (chrome.js owns the crosshair) ----------
// The crosshair is fixed inside the body, so it tilts with the sheet: it travels in the
// sheet's own (square) coordinates.
function trip(target) {
  if (!fine.matches) return;
  const at = since();
  if (hurried || at > DIM_AT) return;
  const f = square(() => document.querySelector('.frame').getBoundingClientRect());
  document.dispatchEvent(new CustomEvent('ovz:xhair-trip', { detail: {
    from: [f.left + 6, f.top + 6],
    // the foot of the dimension's first extension line, parked there it leaves the dimension
    // line itself clear; read live, in case the page moves under it
    to: () => { const hb = square(() => holder.getBoundingClientRect()); return [hb.left + target.x, hb.top + target.y + 10]; },
    delay: Math.max(0, TRIP_FROM - at),
    dur: Math.max(200, DIM_AT - Math.max(TRIP_FROM, at)),
  } }));
}

function arrive() {
  INPUTS.forEach(t => removeEventListener(t, hurry, true));
  if (!html.classList.contains('intro')) return;
  html.classList.remove('intro');
  document.dispatchEvent(new CustomEvent('ovz:arrived'));
  // the sheet was one screen while it squared up: a wheel turned meanwhile scrolls now
  if (wheeled) scrollBy({ top: wheeled, behavior: 'smooth' });
}

// Hurried, not cut: everything still plays to its end, six times as fast, and the crosshair
// stays home. A mouse merely moving is not asking for anything.
const INPUTS = ['keydown', 'wheel', 'pointerdown', 'touchstart'];
const RUSH = 6;
let hurried = false, wheeled = 0;
function hurry(e) {
  if (e.type === 'wheel') wheeled += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  if (hurried) return;
  hurried = true;
  for (const a of document.getAnimations()) if (HURRIES.includes(a.animationName)) a.playbackRate = RUSH;
  document.dispatchEvent(new CustomEvent('ovz:xhair-home'));
}

async function start() {
  if (!name || !holder) return;
  // measuring before Archivo is in would measure the fallback font
  await document.fonts.ready;
  // the crosshair's listener is in chrome.js, which has run by DOMContentLoaded
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';

  if (playing) rule();
  const target = drawDim();
  holder.append(dim);
  if (playing && !hurried) {
    trip(target);
    dim.style.setProperty('--at', `${Math.max(0, DIM_AT - since())}ms`);
    dim.classList.add('plot');
  } else if (!reduced) {
    dim.style.setProperty('--at', '150ms');
    dim.classList.add('plot');
  }

  // a resize redraws it as it is; the first call is the observer saying hello, not a resize
  let first = true;
  new ResizeObserver(() => {
    if (first) { first = false; return; }
    dim.classList.remove('plot');
    drawDim();
  }).observe(name);
}

if (playing) {
  // over when every part of it is (the head's backstop is never the clock)
  Promise.all(document.getAnimations().filter(a => ARRIVAL.includes(a.animationName)).map(a => a.finished))
    .then(arrive, arrive);
  INPUTS.forEach(t => addEventListener(t, hurry, { capture: true, passive: true }));
}
start();
