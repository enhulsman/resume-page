// The Overzicht homepage: drives the ANNA drawing (scene.js), its labels and leaders, the
// detail plot-in, the revision cloud and the theme button. Ported from resume-lab/proto.
import { createScene, LEVELS } from './scene.js';
import { getCurrentTheme, setTheme } from '../../lib/theme';

const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = matchMedia('(max-width: 860px) and (orientation: portrait)');
const review = new URLSearchParams(location.search).has('review');

// ---------- theme: whiteprint by day, light table at night ----------
// One stored choice for the whole site (lib/theme); the terminal's `theme` command uses it too.
const themeBtn = document.querySelector('.theme');
const isDark = () => getCurrentTheme() === 'dark';
function paintThemeButton() {
  themeBtn.querySelector('.theme-label').textContent = isDark() ? 'Whiteprint' : 'Light table';
  themeBtn.setAttribute('aria-pressed', String(isDark()));
  themeBtn.setAttribute('aria-label', isDark() ? 'Switch to the light theme' : 'Switch to the dark theme');
}
themeBtn.addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
paintThemeButton();

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
      const cw = callout.offsetWidth || 250, ch = callout.offsetHeight || 190;
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
        const tooTight = isPhone || compact || (firstLabel && cy + ch + 14 > firstLabel.y - levelEls.identity.offsetHeight / 2);
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
  paintThemeButton();
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
  const top = stacked ? 14 : short ? 84 : 96, bottom = stacked ? 14 : short ? 26 : 50;
  const right = isPhone ? 124 : stage.classList.contains('short') ? 220 : 300;
  const left = isPhone ? 46 : 70;
  scene.setFrame({ x: left, y: top, w: r.width - left - right, h: r.height - top - bottom });
}
new ResizeObserver(() => { scene.resize(); layoutFrame(); }).observe(stage);

// scroll position → q (0 section, 1 exploded), read from where each step sits
const steps = [...document.querySelectorAll('.scrolly .step')];
let hoverCloud = null, lastActive = 0, scrollQueued = false;
function readScroll() {
  const probe = window.scrollY + innerHeight * (phone.matches ? 0.78 : 0.5);
  const ys = steps.map(s => { const r = s.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
  const qs = steps.map(s => +s.dataset.q);
  let q = qs[0], active = 0;
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
  scene.setQ(reduced ? Math.round(q) : q);
  const s = steps[active];
  if (!hoverCloud) scene.setCloud(s.dataset.cloud || null);
  stage.classList.toggle('turnable', q > 0.6);
  if (s.hasAttribute('data-request') && lastActive !== active && scene.requestAge() > 6) scene.request();
  lastActive = active;
}
// one read per frame, however many scroll events arrive
addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; readScroll(); }); } }, { passive: true });
addEventListener('resize', readScroll);

document.querySelector('.replay').addEventListener('click', () => scene.request());

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

// the drawing plots itself once it is actually on screen (on a phone it starts below the hero)
document.fonts.ready.then(() => {
  layoutFrame();
  readScroll();
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    scene.start();
    // the request runs once the drawing has plotted
    setTimeout(() => scene.requestAge() === Infinity && scene.request(), reduced ? 0 : 2300);
  }, { threshold: 0.3 });
  io.observe(stage);
});

// ---------- detail drawings plot themselves in when they arrive ----------
const dwgs = [...document.querySelectorAll('.dwg')];
for (const svg of dwgs) {
  for (const p of svg.querySelectorAll('path')) {
    const L = Math.ceil(p.getTotalLength());
    p.dataset.len = L;
    if (!reduced) { p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; }
    const red = p.closest('.red');
    if (red) p.style.transitionDelay = '.9s';
  }
}
const plotIn = svg => {
  if (svg.classList.contains('drawn')) return;
  svg.classList.add('drawn');
  svg.querySelectorAll('path').forEach(p => {
    p.style.strokeDashoffset = 0;
    const dashed = p.classList.contains('dash') || p.classList.contains('swing') || p.classList.contains('plot');
    // hand the dashed lines back to their own dash pattern once they are drawn
    const release = () => { p.style.transition = 'none'; p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; };
    if (dashed) reduced ? release() : p.addEventListener('transitionend', release, { once: true });
  });
};
if (reduced) dwgs.forEach(plotIn);
else {
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (plotIn(e.target), io.unobserve(e.target))), { threshold: 0.35 });
  dwgs.forEach(d => io.observe(d));
}

// ---------- the revision cloud: a reviewer's mark around whatever you point at ----------
const cloud = document.querySelector('.cloud-hl');
const cloudPath = cloud.querySelector('path');
function cloudD(w, h, r) {
  const segs = [];
  const side = (ax, ay, bx, by) => {
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / (r * 1.7)));
    for (let k = 0; k < n; k++) segs.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n, ax + (bx - ax) * (k + 1) / n, ay + (by - ay) * (k + 1) / n]);
  };
  side(0, 0, w, 0); side(w, 0, w, h); side(w, h, 0, h); side(0, h, 0, 0);
  let d = 'M0 0';
  for (const [ax, ay, bx, by] of segs) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
    const nx = dy, ny = -dx; // outward for a clockwise loop
    d += ` Q${(mx + nx * 0.6).toFixed(1)} ${(my + ny * 0.6).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return d;
}
let cloudTarget = null;
function showCloud(el) {
  if (reduced || !el || cloudTarget === el) return;
  cloudTarget = el;
  const r = el.getBoundingClientRect();
  const pad = 7, w = r.width + pad * 2, h = r.height + pad * 2;
  cloud.style.transform = `translate(${r.left + scrollX - pad}px, ${r.top + scrollY - pad}px)`;
  cloud.classList.remove('on');
  cloudPath.setAttribute('d', cloudD(w, h, Math.min(9, Math.max(6, h / 4))));
  const L = cloudPath.getTotalLength();
  cloudPath.style.strokeDasharray = `${L} ${L}`;
  cloudPath.style.strokeDashoffset = L;
  void cloudPath.getBoundingClientRect();
  cloud.classList.add('on');
  cloudPath.style.strokeDashoffset = 0;
}
function hideCloud(el) {
  if (cloudTarget !== el) return;
  cloudTarget = null;
  cloud.classList.remove('on');
  cloudPath.setAttribute('d', '');
}
const cloudables = 'a.act, .links a, .register td:first-child a, .side a, .diary a, .more, .replay, .theme, .bar nav a';
document.addEventListener('pointerover', e => { const el = e.target.closest(cloudables); if (el) showCloud(el); });
document.addEventListener('pointerout', e => { const el = e.target.closest(cloudables); if (el && !el.contains(e.relatedTarget)) hideCloud(el); });
document.addEventListener('focusin', e => { const el = e.target.closest(cloudables); if (el && el.matches(':focus-visible')) showCloud(el); });
document.addEventListener('focusout', e => { const el = e.target.closest(cloudables); if (el) hideCloud(el); });
addEventListener('scroll', () => cloudTarget && cloudTarget.closest('.bar') && hideCloud(cloudTarget), { passive: true });

if (review) window.__scene = scene;
