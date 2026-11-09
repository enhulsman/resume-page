// ANNA, staging A (/hero-lab?lab=1&anna=turn): the ANNA card, turned. Face-on its four level
// lights overlap into the one flame from the hero; scrolling (or a sideways drag) turns the pane,
// each light slides by its depth, and each level's copy appears beside its light as it clears.
// The lights are anna-scene.js's turnScene; this file reads the page and turns the pane.
import { paneFor, redrawPane, looping } from './hero.js';
import { turnScene } from './anna-scene.js';

const clamp = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const k = clamp(x); return k * k * (3 - 2 * k); };
const TILT = { x: 24, y: -6 }; // the pane at a full turn: its top leans back, a touch sideways; never edge-on

const section = document.querySelector('.anna-turn');
if (section) {
  const pane = section.querySelector('.turn-pane');
  const tilt = section.querySelector('.turn-tilt');
  const labels = [...section.querySelectorAll('.levels li')];
  const list = section.querySelector('.levels');
  const marks = [...pane.querySelectorAll('.mark')]; // one per level, at its light's height, tilting with the pane
  const caption = section.querySelector('.turn-caption'); // phones: the newest level's sentence, under the card
  let captioned = -1;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // the copy for level i shows once the turn has carried its light clear: the nearest first
  const show = (i, u) => smooth((u - (0.22 + 0.17 * i)) / 0.16);

  let fromScroll = 0, nudge = 0, turn = 0, drawn = -1, live = false, pending = false, last = performance.now();
  const g = paneFor(pane);
  if (g) g.scene = (t) => turnScene(t, { turn });
  const kick = () => { if (!pending) { pending = true; requestAnimationFrame(frame); } };

  function readScroll() {
    // the stage pins when the section reaches the top; the turn runs over most of the scroll after
    const r = section.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight);
    fromScroll = clamp(-r.top / (0.75 * span));
  }

  function frame(now) {
    pending = false;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    readScroll();
    const to = still.matches ? 1 : clamp(fromScroll + nudge);
    turn = still.matches ? to : turn + (to - turn) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(to - turn) < 1e-4) turn = to;
    tilt.style.transform = `perspective(1400px) rotateX(${(turn * TILT.x).toFixed(2)}deg) rotateY(${(turn * TILT.y).toFixed(2)}deg)`;
    // each level's copy level with its light where the tilted pane puts it now
    const top = list.getBoundingClientRect().top;
    labels.forEach((li, i) => {
      li.style.opacity = show(i, turn).toFixed(3);
      li.style.top = `${(marks[i].getBoundingClientRect().top - top).toFixed(1)}px`;
    });
    let newest = -1;
    labels.forEach((li, i) => { if (show(i, turn) > 0.5) newest = i; });
    if (caption && newest !== captioned) {
      captioned = newest;
      caption.textContent = newest >= 0 ? labels[newest].querySelector('p').textContent : '';
    }
    if (g && Math.abs(turn - drawn) > 0.001) { drawn = turn; if (!looping()) redrawPane(g); }
    if (live || Math.abs(to - turn) > 1e-4) kick();
  }

  new IntersectionObserver(([e]) => {
    const was = live; live = e.isIntersecting;
    if (live && !was) { last = performance.now(); kick(); }
  }, { rootMargin: '50% 0px' }).observe(section);
  kick();

  // a sideways drag turns it further (or back); touch keeps vertical scrolling for the page
  let drag = null;
  pane.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, w: pane.getBoundingClientRect().width || 1 };
    pane.setPointerCapture(e.pointerId);
    pane.classList.add('dragging');
  });
  pane.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const base = clamp(fromScroll);
    nudge = clamp(base + nudge + (e.clientX - drag.x) / (1.1 * drag.w)) - base;
    drag.x = e.clientX;
    kick();
  });
  const end = () => { drag = null; pane.classList.remove('dragging'); };
  pane.addEventListener('pointerup', end);
  pane.addEventListener('pointercancel', end);
  pane.addEventListener('dblclick', () => { nudge = 0; kick(); });

  // for tests: the turn now, and how far each level's copy has appeared
  window.__annaTurn = { state: () => ({ turn, labels: labels.map((li) => +li.style.opacity || 0) }) };
}
