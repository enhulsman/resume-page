// ANNA, staging B (/hero-lab?lab=1&anna=journey): one tall pane. As the reader goes down the
// levels the question (the person's light) goes down through Claude's outlet, out along a
// connector and back, and arrives at the top as one message; the level being read comes nearest.
// Operations, the wash, is always on. The lights are anna-scene.js's journeyScene.
import { paneFor, redrawPane, looping } from './hero.js';
import { journeyScene } from './anna-scene.js';

const clamp = (x) => Math.min(1, Math.max(0, x));
// journey progress when the reading line crosses the middle of each level's step, then the end
const KEYS = [0.08, 0.3, 0.6, 0.78, 1];

const section = document.querySelector('.anna-journey');
if (section) {
  const pane = section.querySelector('.journey-pane');
  const stage = section.querySelector('.journey-stage');
  const steps = [...section.querySelectorAll('.step[data-step]')];
  const marks = [...steps, section.querySelector('.step.end')];
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  let p = 0, pTo = 0, focus = -1, drawn = null, live = false, pending = false, last = performance.now();
  const g = paneFor(pane);
  if (g) g.scene = (t) => journeyScene(t, { p, focus });
  const kick = () => { if (!pending) { pending = true; requestAnimationFrame(frame); } };

  const held = new URLSearchParams(location.search).get('jp'); // ?jp=<0..1>: hold the journey there (screenshots)
  function readPage() {
    if (still.matches) { pTo = 1; focus = -1; return; }
    if (held != null) { pTo = clamp(+held); return; }
    const H = innerHeight;
    const phone = matchMedia('(max-width: 760px)').matches;
    const s = stage.getBoundingClientRect();
    const line = phone ? s.bottom + (H - s.bottom) / 2 : H / 2; // where the eye reads
    const ys = marks.map((el) => { const b = el.getBoundingClientRect(); return (b.top + b.bottom) / 2; });
    if (line <= ys[0]) pTo = KEYS[0] * clamp(1 - (ys[0] - line) / (0.5 * H));
    else if (line >= ys.at(-1)) pTo = 1;
    else {
      let i = 1;
      while (ys[i] < line) i++;
      pTo = KEYS[i - 1] + (KEYS[i] - KEYS[i - 1]) * clamp((line - ys[i - 1]) / (ys[i] - ys[i - 1]));
    }
    focus = -1;
    let best = 0.35 * H;
    steps.forEach((st, i) => { const d = Math.abs(ys[i] - line); if (d < best) { best = d; focus = i; } });
    steps.forEach((st, i) => st.classList.toggle('reading', i === focus));
  }

  function frame(now) {
    pending = false;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    readPage();
    p = still.matches ? pTo : p + (pTo - p) * (1 - Math.exp(-dt / 0.18));
    if (Math.abs(pTo - p) < 1e-4) p = pTo;
    if (g && (!drawn || Math.abs(drawn.p - p) > 0.0005 || drawn.focus !== focus)) {
      drawn = { p, focus };
      if (!looping()) redrawPane(g);
    }
    if (live || Math.abs(pTo - p) > 1e-4) kick();
  }

  new IntersectionObserver(([e]) => {
    const was = live; live = e.isIntersecting;
    if (live && !was) { last = performance.now(); kick(); }
  }, { rootMargin: '50% 0px' }).observe(section);
  kick();

  window.__annaJourney = { state: () => ({ p, focus }) };
}
