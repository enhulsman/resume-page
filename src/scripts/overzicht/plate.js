// ANNA's plate on /projects and on its case study: the homepage's model (scene.js) shown
// exploded, plotted once it is on screen, turned by hand or by its buttons. Pointing at a
// level's label clouds that plate, as on the homepage. No scroll is read here.
import { createScene } from './scene.js';

const plate = document.querySelector('.anna-plate');
if (plate) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = plate.querySelector('.plate-stage');
  const scene = createScene(stage.querySelector('canvas'), { reduced });
  scene.setQ(1);
  window.__plate = scene;

  const layout = () => {
    const r = stage.getBoundingClientRect();
    const pad = Math.max(14, Math.min(40, r.width * 0.05));
    scene.setFrame({ x: pad, y: pad, w: r.width - pad * 2, h: r.height - pad * 2 - 34 });
  };
  new ResizeObserver(() => { scene.resize(); layout(); }).observe(stage);

  const start = () => {
    if (scene.started()) return;
    scene.start();
    setTimeout(() => scene.requestAge() === Infinity && scene.request(), reduced ? 0 : 2300);
  };
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); start(); } }, { threshold: 0.3 });
  document.fonts.ready.then(() => { layout(); io.observe(stage); });
  // backstop where an IntersectionObserver does not fire
  addEventListener('scroll', () => {
    if (scene.started()) return;
    const r = stage.getBoundingClientRect();
    if (r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2) start();
  }, { passive: true });

  plate.querySelector('.replay').addEventListener('click', () => (scene.started() ? scene.request() : start()));

  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    drag = { x: e.clientX, spin: scene.state.spin, id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('turning');
  });
  stage.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) scene.setSpin(drag.spin + (e.clientX - drag.x) / 260); });
  const endDrag = e => { if (drag && e.pointerId === drag.id) { drag = null; stage.classList.remove('turning'); } };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  for (const b of stage.querySelectorAll('[data-turn]')) b.addEventListener('click', () => scene.setSpin(scene.state.spin + 0.18 * +b.dataset.turn));

  for (const li of plate.querySelectorAll('.plate-levels li')) {
    const on = () => { li.classList.add('hot'); scene.setCloud(li.dataset.level); };
    const off = () => { li.classList.remove('hot'); scene.setCloud(null); };
    li.addEventListener('pointerenter', on); li.addEventListener('pointerleave', off);
  }

  const recolour = () => [0, 120, 260, 520].forEach(t => setTimeout(() => scene.theme(), t));
  addEventListener('theme-changed', recolour);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolour);
}
