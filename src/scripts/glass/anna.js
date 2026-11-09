// ANNA's stack (/hero-lab?lab=1): four glass panes over one flame. Scrolling in pulls the block
// apart, the level being read slides out and sharpens, and a drag (or the buttons) turns it.
// The numbers live in anna-model.js; this file reads the page and moves the panes.
import { paneFor, redraw, looping } from './hero.js';
import { paneTarget, gapShare, turnBy, TURN } from './anna-model.js';

const section = document.querySelector('.anna-x');
if (section) {
  const stage = section.querySelector('.anna-stage');
  const slabs = [...section.querySelectorAll('.slab')];
  const steps = [...section.querySelectorAll('.step[data-step]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const panes = slabs.map((el) => ({ el, conf: { distance: +el.dataset.distance, tune: JSON.parse(el.dataset.tune) } }));

  // current values chase their targets; reduced motion jumps straight there
  const cur = panes.map((p, i) => ({ ...paneTarget(p.conf, i, { open: 0, active: -1 }), y: 0 }));
  let turn = { ...TURN.rest }, turnTo = { ...TURN.rest };
  let open = 0, active = -1, last = performance.now(), live = false, pending = false;
  const kick = () => { if (!pending) { pending = true; requestAnimationFrame(frame); } };

  function readPage() {
    const H = innerHeight, r = section.getBoundingClientRect();
    // shut until the stage is pinned, then apart over the next half screen
    open = still.matches ? 1 : Math.min(1, Math.max(0, (-r.top + 0.1 * H) / (0.55 * H)));
    const s = stage.getBoundingClientRect();
    const phone = matchMedia('(max-width: 760px)').matches;
    const line = phone ? s.bottom + (H - s.bottom) / 2 : H / 2; // where the eye reads
    active = -1;
    if (open > 0.95) {
      let best = 0.35 * H;
      steps.forEach((st, i) => {
        const b = st.getBoundingClientRect(), d = Math.abs((b.top + b.bottom) / 2 - line);
        if (d < best) { best = d; active = i; }
      });
    }
    steps.forEach((st, i) => st.classList.toggle('reading', i === active));
  }

  function frame(now) {
    pending = false;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = still.matches ? 1 : 1 - Math.exp(-dt / 0.14);
    readPage();
    turn = { rx: turn.rx + (turnTo.rx - turn.rx) * k, rz: turn.rz + (turnTo.rz - turn.rz) * k };
    const S = slabs[0].offsetWidth, gap = 0.44 * S * gapShare(open);
    panes.forEach((p, i) => {
      const t = paneTarget(p.conf, i, { open, active });
      const c = cur[i];
      for (const key of ['distance', 'tongue', 'halo', 'slide']) c[key] += (t[key] - c[key]) * k;
      const x = -0.24 * S * c.slide, y = (i - 1.5) * gap;
      p.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotateX(${turn.rx.toFixed(2)}deg) rotateZ(${turn.rz.toFixed(2)}deg)`;
      const g = paneFor(p.el);
      if (g) {
        g.distance = c.distance;
        const tune = structuredClone(p.conf.tune);
        tune[0].set.opacity = c.halo; tune[2].set.opacity = c.tongue;
        g.tune = tune;
      }
    });
    if (!looping()) redraw();
    if (live) kick();
  }

  // run only while the section is near the screen
  new IntersectionObserver(([e]) => {
    const was = live; live = e.isIntersecting;
    if (live && !was) { last = performance.now(); kick(); }
  }, { rootMargin: '50% 0px' }).observe(section);
  kick(); // place the panes once, whatever the scroll

  // turning: drag on the stage (sideways turns, up and down tilts; touch only turns, so the page still scrolls)
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    turnTo = turn = turnBy(turn, e.clientX - drag.x, drag.touch ? 0 : e.clientY - drag.y);
    drag.x = e.clientX; drag.y = e.clientY;
    kick();
  });
  const end = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('dblclick', () => { turnTo = { ...TURN.rest }; kick(); });
  section.querySelectorAll('[data-turn]').forEach((b) => b.addEventListener('click', () => {
    turnTo = { ...turnTo, rz: turnTo.rz + 45 * +b.dataset.turn }; kick();
  }));
  section.querySelector('[data-tilt]')?.addEventListener('click', () => {
    turnTo = { ...turnTo, rx: turnTo.rx > 80 ? TURN.rest.rx : 86 }; kick();
  });

  // for tests: the stack's state now
  window.__anna = { state: () => ({ open, active, turn: { ...turn }, distances: cur.map((c) => c.distance), slides: cur.map((c) => c.slide) }) };
}
