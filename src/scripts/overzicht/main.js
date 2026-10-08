// The Overzicht homepage's ANNA section: drives the drawing (scene.js), its labels and
// leaders, and the request. The sheet's chrome (theme, menu, detail drawings, revision
// cloud) is chrome.js, which every page loads. Ported from resume-lab/proto.
import { createScene, LEVELS } from './scene.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// the stacked layout; keep in step with its media query in overzicht.css
const phone = matchMedia('(max-width: 860px) and (orientation: portrait), (max-aspect-ratio: 4/5)');
const review = new URLSearchParams(location.search).has('review');

// ---------- the ANNA drawing ----------
const stage = document.querySelector('.stage');
const canvas = stage.querySelector('.drawing');
const leaders = stage.querySelector('.leaders');
const levelEls = Object.fromEntries([...stage.querySelectorAll('.levels li')].map(li => [li.dataset.level, li]));
const callout = stage.querySelector('.callout');
const calloutInline = document.querySelector('.callout-inline');
const scaleNote = stage.querySelector('.scale-note');
const scaleTip = stage.querySelector('.scale-tip');
const SVGNS = 'http://www.w3.org/2000/svg';
const lines = {};
for (const id of [...LEVELS.map(l => l.id), 'callout']) {
  const g = document.createElementNS(SVGNS, 'g');
  g.innerHTML = '<line/><circle r="2"/>';
  leaders.append(g);
  lines[id] = g;
}

let firstFrame = true;
// sizes of the callout and the first label, measured on layout rather than in every frame
const sizes = { cw: 250, ch: 190, idH: 40 };
const scene = createScene(canvas, {
  reduced,
  onFrame(A, st, cam) {
    const rect = stage.getBoundingClientRect();
    const sx = A.fit ? 1 / (window.devicePixelRatio > 2 ? 2 : (window.devicePixelRatio || 1)) : 1;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const P = k => A[k] && { x: A[k].x / dpr, y: A[k].y / dpr };
    const plotted = reduced ? 1 : Math.min(1, Math.max(0, (performance.now() - (st.plotStart || 0)) / 1000 - 1.8) / 0.6);
    const isPhone = phone.matches;
    const compact = stage.classList.contains('compact');
    const labelX = compact ? rect.width - 116 : rect.width - (stage.classList.contains('short') ? 196 : 262);

    // level labels sit in a column at the right, each on a leader from its plate
    LEVELS.forEach((L, i) => {
      const a = P(L.id), el = levelEls[L.id], g = lines[L.id];
      if (!a) return;
      const o = plotted;
      el.style.setProperty('--x', `${labelX}px`);
      el.style.setProperty('--y', `${a.y}px`);
      el.style.setProperty('--o', o);
      const [ln, dot] = g.children;
      ln.setAttribute('x1', a.x + 6); ln.setAttribute('y1', a.y); ln.setAttribute('x2', labelX - 10); ln.setAttribute('y2', a.y);
      dot.setAttribute('cx', a.x + 6); dot.setAttribute('cy', a.y);
      g.style.opacity = o;
      el.classList.toggle('hot', st.cloud === L.id || (st.lit || []).includes(L.id));
    });

    // the screen callout, only while the drawing is in section
    const lap = P('laptop');
    const co = Math.max(0, 1 - st.q * 3) * plotted;
    if (lap) {
      // measured while shown; a hidden callout reports 0, so fall back to its usual size
      const { cw, ch } = sizes;
      const room = P('room');
      const cx = isPhone ? rect.width - cw - 8 : Math.min(rect.width - cw - 26, room.x + 34);
      const cy = isPhone ? 8 : Math.max(96, room.y + 6);
      callout.style.setProperty('--x', `${cx}px`);
      callout.style.setProperty('--y', `${cy}px`);
      callout.style.setProperty('--o', co);
      callout.style.visibility = co < 0.02 ? 'hidden' : 'visible';
      const [ln, dot] = lines.callout.children;
      ln.setAttribute('x1', lap.x); ln.setAttribute('y1', lap.y); ln.setAttribute('x2', cx); ln.setAttribute('y2', cy + ch * 0.6);
      dot.setAttribute('cx', lap.x); dot.setAttribute('cy', lap.y);
      // no room beside the room (portrait phone, or a short landscape screen): move the chat into the text
      if (st.q < 0.02) {
        const firstLabel = P('identity');
        const tooTight = isPhone || compact || (firstLabel && cy + ch + 14 > firstLabel.y - sizes.idH / 2);
        root.classList.toggle('chat-inline', !!tooTight);
      }
      const inline = root.classList.contains('chat-inline');
      lines.callout.style.opacity = inline ? 0 : co;
      // the question types itself as the request starts; the answer arrives with the redline
      const age = scene.requestAge();
      const qp = reduced ? 1 : Math.min(1, Math.max(0, age / 0.8));
      for (const c of [callout, calloutInline]) {
        c.style.setProperty('--qp', `${(age === Infinity ? 0 : qp) * 100}%`);
        c.style.setProperty('--ap', st.answer);
      }
    }

    // Ezra, for scale
    const ez = P('ezra');
    if (ez) {
      const so = plotted * Math.max(0, 1 - st.q * 2.5);
      for (const el of [scaleNote, scaleTip]) {
        el.style.setProperty('--x', `${ez.x}px`);
        el.style.setProperty('--y', `${ez.y}px`);
      }
      scaleNote.style.setProperty('--o', so);
      scaleNote.style.visibility = so < 0.02 ? 'hidden' : 'visible';
    }
    firstFrame = false;
  },
});

function recolour() {
  // colours change over half a second; re-read them along the way
  [0, 120, 260, 520].forEach(t => setTimeout(() => scene.theme(), t));
}
addEventListener('theme-changed', recolour);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolour);

function layoutFrame() {
  const r = stage.getBoundingClientRect();
  stage.classList.toggle('compact', r.width < 640);
  stage.classList.toggle('short', r.height < 560);
  const isPhone = stage.classList.contains('compact');
  // keep room for the label column on the right and the bar on top
  // side by side, the stage runs under the fixed bar; stacked, it starts below it
  const stacked = phone.matches, short = r.height < 560;
  const top = stacked ? 14 : short ? 84 : 96, bottom = stacked ? 46 : short ? 46 : 50;
  const right = isPhone ? 124 : stage.classList.contains('short') ? 220 : 300;
  const left = isPhone ? 46 : 70;
  scene.setFrame({ x: left, y: top, w: r.width - left - right, h: r.height - top - bottom });
  // a hidden callout reports 0, so keep the last real size
  sizes.cw = callout.offsetWidth || sizes.cw;
  sizes.ch = callout.offsetHeight || sizes.ch;
  sizes.idH = levelEls.identity.offsetHeight || sizes.idH;
}
new ResizeObserver(() => { scene.resize(); layoutFrame(); }).observe(stage);

// scroll position → q (0 section, 1 exploded), read from where each step sits. Side by side,
// the scroll scrubs it between the steps. On a portrait phone the drawing sits above the text,
// so it holds each step's view while that step is read, and turns to the next view once the
// next step's text reaches the middle of the reading window below the drawing.
const steps = [...document.querySelectorAll('.scrolly .step')];
let hoverCloud = null, lastActive = 0, scrollQueued = false, tween = null;
function goTo(q) {
  if (reduced) { scene.setQ(q); return; }
  if (tween ? tween.to === q : Math.abs(scene.state.q - q) < 1e-3) return;
  if (tween) cancelAnimationFrame(tween.raf);
  const from = scene.state.q, t0 = performance.now(), dur = 300 + 700 * Math.abs(q - from);
  const tick = now => {
    const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
    scene.setQ(from + (q - from) * e);
    tween = t < 1 ? { to: q, raf: requestAnimationFrame(tick) } : null;
  };
  tween = { to: q, raf: requestAnimationFrame(tick) };
}
function readScroll() {
  let q, active = 0;
  if (phone.matches) {
    const below = Math.max(0, stage.getBoundingClientRect().bottom);
    const line = below + (innerHeight - below) * 0.5;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < line) active = i; });
    q = +steps[active].dataset.q;
    goTo(q);
  } else {
    const probe = window.scrollY + innerHeight * 0.5;
    const ys = steps.map(s => { const r = s.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
    const qs = steps.map(s => +s.dataset.q);
    q = qs[0];
    if (probe <= ys[0]) q = qs[0];
    else if (probe >= ys.at(-1)) { q = qs.at(-1); active = steps.length - 1; }
    else for (let i = 0; i < ys.length - 1; i++) {
      if (probe >= ys[i] && probe < ys[i + 1]) {
        const t = (probe - ys[i]) / (ys[i + 1] - ys[i]);
        q = qs[i] + (qs[i + 1] - qs[i]) * t;
        active = t < 0.5 ? i : i + 1;
        break;
      }
    }
    if (tween) { cancelAnimationFrame(tween.raf); tween = null; }
    scene.setQ(reduced ? Math.round(q) : q);
  }
  const s = steps[active];
  if (!hoverCloud) scene.setCloud(s.dataset.cloud || null);
  stage.classList.toggle('turnable', q > 0.6);
  if (s.hasAttribute('data-request') && lastActive !== active && scene.started() && scene.requestAge() > 6) scene.request();
  lastActive = active;
}
// one read per frame, however many scroll events arrive
addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; readScroll(); revealInView(); }); } }, { passive: true });
addEventListener('resize', readScroll);

document.querySelector('.replay').addEventListener('click', () => (scene.started() ? scene.request() : startStage()));

// in the exploded view the model can be turned by hand, about its vertical axis only
let drag = null;
stage.addEventListener('pointerdown', e => {
  if (scene.state.q < 0.6 || e.button !== 0 || e.target.closest('button, a')) return;
  drag = { x: e.clientX, spin: scene.state.spin, id: e.pointerId };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('turning');
});
stage.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) scene.setSpin(drag.spin + (e.clientX - drag.x) / 260); });
const endDrag = e => { if (drag && e.pointerId === drag.id) { drag = null; stage.classList.remove('turning'); } };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
for (const b of stage.querySelectorAll('[data-turn]')) b.addEventListener('click', () => scene.setSpin(scene.state.spin + 0.18 * +b.dataset.turn));

// pointing at a level's label clouds its plate
for (const li of Object.values(levelEls)) {
  li.addEventListener('pointerenter', () => { hoverCloud = li.dataset.level; scene.setCloud(hoverCloud); });
  li.addEventListener('pointerleave', () => { hoverCloud = null; readScroll(); });
}
scaleNote.addEventListener('mouseenter', () => scene.setHover('ezra'));
scaleNote.addEventListener('mouseleave', () => scene.setHover(null));
scaleNote.addEventListener('focus', () => scene.setHover('ezra'));
scaleNote.addEventListener('blur', () => scene.setHover(null));
// a tap has no hover: it opens the note, and a tap elsewhere, Escape or a scroll closes it
scaleNote.setAttribute('aria-expanded', 'false');
const setNote = open => { scaleNote.setAttribute('aria-expanded', String(open)); scene.setHover(open ? 'ezra' : null); };
scaleNote.addEventListener('click', () => setNote(!noteOpen()));
const noteOpen = () => scaleNote.getAttribute('aria-expanded') === 'true';
document.addEventListener('pointerdown', e => { if (noteOpen() && !scaleNote.contains(e.target)) setNote(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && noteOpen()) setNote(false); });
addEventListener('scroll', () => noteOpen() && setNote(false), { passive: true });

// the drawing plots itself once it is actually on screen (on a phone it starts below the hero)
function startStage() {
  if (scene.started()) return;
  scene.start();
  // the request runs once the drawing has plotted
  setTimeout(() => scene.requestAge() === Infinity && scene.request(), reduced ? 0 : 2300);
}
let fontsReady = false;
document.fonts.ready.then(() => {
  fontsReady = true;
  layoutFrame();
  readScroll();
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    startStage();
  }, { threshold: 0.3 });
  io.observe(stage);
  revealInView();
});

// The observer above does the work; this is the backstop, run on scroll, so the
// drawings never stay hidden where an IntersectionObserver does not fire.
const shown = (el, part) => {
  const r = el.getBoundingClientRect();
  const seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  return r.height > 0 && seen >= Math.min(r.height, innerHeight) * part;
};
function revealInView() {
  if (fontsReady && !scene.started() && shown(stage, 0.3)) startStage();
}

if (review) window.__scene = scene;
