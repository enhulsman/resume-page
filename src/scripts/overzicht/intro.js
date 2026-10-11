// The homepage's arrival, the part CSS cannot do alone (the rest is "the arrival" in
// overzicht.css; whether it plays is decided in the layout's head, before first paint).
// It rules the lettering guides under the name, draws each letter of the name from sketch
// lines (outlines from src/data/name-glyphs.json, see scripts/name-glyphs.mjs), draws the
// first sheet's boxes with a pen going round their borders, sends the
// crosshair from the sheet's corner to the name, and ends with the name's dimension: its real
// width, in the sheet's own units.
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
// the arrival is every finite animation running from first paint (the endless ones, a
// blinking cursor, are the page's own), and the drawn parts added to it below
const finite = a => a.animationName && a.effect?.getComputedTiming().iterations !== Infinity;
// in the arrival's own clock (ms); the boxes' pens are in the markup (data-pen), the text's
// sweeps in overzicht.css. The real name and borders need no time: they show when it is over.
const GUIDES_LATEST = 1800, LETTERS_AT = 550, STAGGER = 60, TRIP_FROM = 1000, DIM_AT = 1950;

// The arrival's clock: the tilt's start, its first frame (read in start(), once the tilt has
// really started). Every drawn part added later is put on this clock (lock), with delays
// in it, so a slow phone delays nothing relative to the CSS.
let t0 = document.timeline.currentTime;
const since = () => document.timeline.currentTime - t0;
const drawnParts = [];
function lock(el) {
  for (const a of el.getAnimations({ subtree: true })) { a.startTime = t0; drawnParts.push(a.finished); }
}

// The sheet may still lie tilted while we measure, and boxes on screen are the tilted ones.
// Measure it square: for one synchronous moment the tilt is put at its end (nothing paints in
// between), then back where it was.
function square(fn) {
  const tilt = document.body.getAnimations().filter(a => a.animationName === 'tilt' && a.playState !== 'finished');
  const at = tilt.map(a => a.currentTime);
  tilt.forEach(a => { a.currentTime = a.effect.getComputedTiming().endTime; });
  try { return fn(); } finally { tilt.forEach((a, i) => { a.currentTime = at[i]; }); }
}

// One line of the name (a span), as laid out: its extent and baseline relative to ref, and
// with letters, each letter's left edge from the line's start. Call it inside square().
function measureLine(span, ref, letters = false) {
  const rb = ref.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(span);
  const r = range.getBoundingClientRect();
  // a zero-size inline box sits on the baseline
  const probe = document.createElement('i');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  span.append(probe);
  const base = probe.getBoundingClientRect().top - rb.top;
  probe.remove();
  const xs = [];
  const text = span.firstChild;
  for (let i = 0; letters && text && i < text.length; i++) {
    if (!text.data[i].trim()) continue;
    const c = document.createRange();
    c.setStart(text, i); c.setEnd(text, i + 1);
    xs.push(c.getBoundingClientRect().left - r.left);
  }
  return { left: r.left - rb.left, width: r.width, base, xs };
}
const nameLines = () => [...name.querySelectorAll(':scope > span')];

// each line of the name, relative to the name's holder, in layout pixels
const lines = () => square(() => nameLines().map(span => measureLine(span, holder)));

function capHeight() {
  const cs = getComputedStyle(name);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText('H').actualBoundingBoxAscent;
}

// ---------- the lettering guides ----------
// ruled with a pen (overzicht.css), each line of the name between its baseline and cap line
function ruleGuides() {
  const at = since();
  if (!live() || at > GUIDES_LATEST) return;
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
      ln.setAttribute('pathLength', 1);
      svg.append(ln);
    }
  }
  name.append(svg);
  lock(svg);
}

// ---------- the letters, drawn ----------
// One svg per line of the name, in font units, laid over the real (still invisible) text:
// its left edge on the text's start, its origin on the baseline. Each letter stands where
// the browser set that letter (it may round advances to whole pixels; the font data cannot
// know). Each letter: sketch lines round its extent that overshoot the corners, then its
// outline, then its fill.
const OVER = 70; // how far the sketch lines run past the corners, in font units
const PX = 1.1; // outline width on screen

// no drawing (too late, no glyph data): the real name shows as it is
const plainName = () => name.classList.add('as-is');

function drawLetters(data) {
  const at = since();
  if (!live() || at > LETTERS_AT + 200) return plainName();
  const scale = parseFloat(getComputedStyle(name).fontSize) / data.upm;
  const ls = square(() => nameLines().map(span => measureLine(span, name, true)));
  let i = 0;
  data.lines.forEach((line, n) => {
    const l = ls[n];
    if (!l) return;
    const top = data.upm, h = data.upm * 1.3, w = line.width;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'glyphs');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `0 ${-top} ${w} ${h}`);
    svg.setAttribute('width', (w * scale).toFixed(2));
    svg.setAttribute('height', (h * scale).toFixed(2));
    svg.style.left = `${l.left}px`;
    svg.style.top = `${l.base - top * scale}px`;
    svg.style.setProperty('--sw', (PX / scale).toFixed(2));
    const measured = l.xs.length === line.glyphs.length;
    line.glyphs.forEach((g, j) => {
      const [x0, y0, x1, y1] = g.box;
      const x = measured ? (l.xs[j] / scale).toFixed(1) : g.x;
      const gl = document.createElementNS(SVGNS, 'g');
      gl.setAttribute('class', 'glyph');
      gl.dataset.char = g.char;
      gl.setAttribute('transform', `translate(${x} 0)`);
      gl.style.setProperty('--d', `${LETTERS_AT + i++ * STAGGER}ms`);
      gl.innerHTML = `<path class="g-box" pathLength="1" d="M${x0 - OVER} ${y0}H${x1 + OVER}M${x1} ${y0 - OVER}V${y1 + OVER}M${x1 + OVER} ${y1}H${x0 - OVER}M${x0} ${y1 + OVER}V${y0 - OVER}"/><path class="g-line" pathLength="1" d="${g.d}"/>`;
      svg.append(gl);
    });
    name.append(svg);
    lock(svg);
  });
}

// ---------- the boxes, drawn ----------
// One svg over the first sheet: for each box marked data-pen="start duration" (the arrival's
// clock, ms) a pen line on its borders, the sides it has, in the order a hand goes round (top,
// right, bottom, left); a marked table's cells follow it, one by one. The real borders show
// when the arrival is over, under the finished lines.
const CELLS_AT = 1600, CELL_STAGGER = 30, CELL_FOR = 200, PENS_LATEST = 1200;

// on a box's border, or for a cell of a collapsed table on its edge: the cells there share
// their borders, which lie across the line between them (drawn inside each, they doubled)
function pen(r, cs, shared = false) {
  const w = ['Top', 'Right', 'Bottom', 'Left'].map(s => parseFloat(cs[`border${s}Width`]) || 0);
  // a shared border lies on the line, half a device pixel past it when it is an odd number wide
  const on = n => (n * devicePixelRatio % 2) / 2 / devicePixelRatio;
  const [t, rt, b, l] = shared ? [r.top + on(w[0]), r.right + on(w[1]), r.bottom + on(w[2]), r.left + on(w[3])]
    : [r.top + w[0] / 2, r.right - w[1] / 2, r.bottom - w[2] / 2, r.left + w[3] / 2];
  const f = n => n.toFixed(2);
  const d = w.every(Boolean) ? `M${f(l)} ${f(t)}H${f(rt)}V${f(b)}H${f(l)}Z`
    : [w[0] && `M${f(r.left)} ${f(t)}H${f(r.right)}`, w[1] && `M${f(rt)} ${f(r.top)}V${f(r.bottom)}`,
       w[2] && `M${f(r.right)} ${f(b)}H${f(r.left)}`, w[3] && `M${f(l)} ${f(r.bottom)}V${f(r.top)}`].filter(Boolean).join('');
  return d && { d, w: Math.max(...w) };
}

function penBoxes() {
  const at = since();
  const sheet = document.querySelector('.sheet-you');
  // too late for the pen (a slow font): the borders simply show when it is over
  if (!sheet || !live() || at > PENS_LATEST) return;
  const boxes = [...sheet.querySelectorAll('[data-pen]')];
  const cells = [...sheet.querySelectorAll('[data-pen] :is(th, td)')];
  // the cells' text sweeps were timed at first paint; only their moment changes
  cells.forEach((c, i) => c.style.setProperty('--sweep-at', `${CELLS_AT + 50 + i * CELL_STAGGER}ms`));
  // [box, its place among the marked ones (the pen's data-for), start, duration]
  const jobs = [
    ...boxes.map((el, i) => [el, i, ...el.dataset.pen.split(' ').map(Number)]),
    ...cells.map((el, i) => [el, null, CELLS_AT + i * CELL_STAGGER, CELL_FOR]),
  ];
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'pens');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', sheet.offsetWidth);
  svg.setAttribute('height', sheet.offsetHeight);
  sheet.append(svg);
  const strokes = square(() => {
    const sb = sheet.getBoundingClientRect();
    return jobs.map(([el, n, start, dur]) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const shared = cs.display === 'table-cell' && getComputedStyle(el.closest('table')).borderCollapse === 'collapse';
      const p = pen({ top: r.top - sb.top, right: r.right - sb.left, bottom: r.bottom - sb.top, left: r.left - sb.left }, cs, shared);
      return p && { ...p, n, start, dur };
    }).filter(Boolean);
  });
  for (const { d, w, n, start, dur } of strokes) {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', 1);
    p.setAttribute('stroke-width', w);
    if (n != null) p.dataset.for = n;
    p.style.setProperty('--at', `${start}ms`);
    p.style.setProperty('--for', `${dur}ms`);
    svg.append(p);
  }
  lock(svg);
}

// ---------- the dimension ----------
const dim = document.createElementNS(SVGNS, 'svg');
dim.setAttribute('class', 'name-dim');
dim.setAttribute('aria-hidden', 'true');
dim.innerHTML = '<path class="dim-end"/><path class="dim-run"/><text text-anchor="middle"></text>';
const [dimEnd, dimRun, dimText] = dim.children;
const GAP = 16; // from the top of the letters to the dimension line

function measure() {
  const ls = lines(), cap = capHeight();
  const widest = ls.reduce((a, b) => (b.width > a.width ? b : a));
  const x = Math.min(...ls.map(l => l.left));
  const y = ls[0].base - cap - GAP;
  // extension lines stop just short of what they measure: the left one at the first line,
  // the right one down past a shorter first line to the widest line's cap height
  return { x, w: widest.width, y, left: GAP - 3, right: widest.base - cap - y - 3 };
}

function drawDim() {
  const { x, w, y, left, right } = measure();
  // the svg's own origin sits on the dimension line's left end
  dim.style.left = `${x}px`;
  dim.style.top = `${y}px`;
  dim.setAttribute('width', Math.ceil(w));
  dim.setAttribute('height', 1);
  const W = w.toFixed(1);
  // extension lines down towards the name, architectural ticks through both ends
  dimEnd.setAttribute('d', `M0 -5V${left}M${W} -5V${right.toFixed(1)}M-4 4L4 -4M${(w - 4).toFixed(1)} 4L${(w + 4).toFixed(1)} -4`);
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
  if (!live() || at > DIM_AT) return;
  const f = square(() => document.querySelector('.frame').getBoundingClientRect());
  document.dispatchEvent(new CustomEvent('ovz:xhair-trip', { detail: {
    from: [f.left + 6, f.top + 6],
    // the foot of the dimension's first extension line, parked there it leaves the dimension
    // line itself clear; read live, in case the page moves under it
    to: () => { const hb = square(() => holder.getBoundingClientRect()); return [hb.left + target.x, hb.top + target.y + 10]; },
    // the reading goes above it, clear of the name
    readout: 'above',
    delay: Math.max(0, TRIP_FROM - at),
    dur: Math.max(200, DIM_AT - Math.max(TRIP_FROM, at)),
  } }));
}

// The drawing goes, whoever ended the arrival (this script, or the layout head's backstop). It
// lies on the real borders and name, which show as the class goes, so it fades off them rather
// than being cut; after a resize it lies wrong, and goes at once.
function clear(e) {
  for (const s of document.querySelectorAll('.glyphs, .pens, .name-guides')) {
    if (e?.type === 'resize') { s.remove(); continue; }
    s.classList.add('leaving');
    setTimeout(() => s.remove(), 300);
  }
}

function arrive() {
  INPUTS.forEach(t => removeEventListener(t, hurry, true));
  removeEventListener('resize', resized);
  clear();
  if (!html.classList.contains('intro')) return;
  html.classList.remove('intro', 'square');
  document.dispatchEvent(new CustomEvent('ovz:arrived'));
  // the sheet was one screen while it squared up: a wheel turned meanwhile scrolls now, and
  // a link tabbed to meanwhile is brought into view
  if (wheeled) scrollBy({ top: Math.max(-innerHeight, Math.min(innerHeight, wheeled)), behavior: 'smooth' });
  else if (document.activeElement && document.activeElement !== document.body) document.activeElement.scrollIntoView({ block: 'nearest' });
}

// Hurried, not cut: everything still plays to its end, six times as fast, and the crosshair
// stays home. A mouse merely moving is not asking for anything.
const INPUTS = ['keydown', 'wheel', 'pointerdown', 'touchstart'];
const RUSH = 6;
let hurried = false, wheeled = 0;
// still playing, and at its own pace: anything drawn late or hurried would be drawn wrong
const live = () => html.classList.contains('intro') && !hurried;
function hurry(e) {
  if (e.type === 'wheel') wheeled += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  if (hurried) return;
  hurried = true;
  for (const a of document.getAnimations()) if (finite(a)) a.playbackRate = RUSH;
  document.dispatchEvent(new CustomEvent('ovz:xhair-home'));
}
// a new width moves everything the overlays were laid on: drop them and hurry to the end
// (only the width: a phone's toolbar changes the height on its own)
const width0 = innerWidth;
function resized(e) {
  if (innerWidth === width0) return;
  clear(e);
  hurry(e);
}

async function start() {
  if (!name || !holder) return;
  // measuring before Archivo is in would measure the fallback font
  await document.fonts.ready;
  // the crosshair's listener is in chrome.js, which has run by DOMContentLoaded
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  const tilt = document.body.getAnimations().find(a => a.animationName === 'tilt');
  if (tilt) { await tilt.ready; t0 = tilt.startTime ?? t0; }

  if (playing) {
    penBoxes();
    ruleGuides();
    // only fetched for the arrival; a first visit is the only time it is needed. Without it
    // the real name simply shows.
    try { drawLetters((await import('../../data/name-glyphs.json')).default); } catch { plainName(); }
  }
  const target = drawDim();
  holder.append(dim);
  if (playing && live()) {
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
  // over when every part of it is, the drawn parts included (the head's backstop is never
  // the clock)
  const css = Promise.all(document.getAnimations().filter(finite).map(a => a.finished));
  css.then(() => Promise.all(drawnParts)).then(arrive, arrive);
  document.addEventListener('ovz:arrived', clear);
  document.body.getAnimations().find(a => a.animationName === 'tilt')?.finished.then(() => html.classList.add('square'), () => {});
  INPUTS.forEach(t => addEventListener(t, hurry, { capture: true, passive: true }));
  addEventListener('resize', resized);
  // what the visitor did before this script had loaded (the layout's head kept it)
  const early = window.ovzEarly;
  if (early) {
    early.taken = true;
    early.off();
    wheeled += early.wheel;
    if (early.asked) hurry({ type: 'early' });
  }
}
start();
