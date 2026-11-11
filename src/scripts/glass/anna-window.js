// ANNA in a glass window (the homepage's ANNA section): the site's 'week' conversation plays once
// when the window is about 40% in view (40% of the screen, for a window taller than the screen);
// Replay plays it again. Every beat is in the page from the start (anna-window-model.js says when
// each shows). The window is as tall as the finished conversation, so nothing scrolls (Ezra,
// 2026-11-11, sketch C2). Her work is one line under her answer: what she read, then each step
// crossfading into the next (out 0.25 s, in 0.4 s), settling into a summary when her question lands.
// ?chat=<seconds> holds one moment; reduced motion (also when switched on later) shows the end at once.
import { timeline, moment, held, workText } from './anna-window-model.js';
import { pageSpeed } from './speed.js';

const section = document.querySelector('.anna-window');
if (section) {
  const win = section.querySelector('.aw-window');
  const compose = section.querySelector('.aw-compose');
  const typedEl = section.querySelector('.aw-typed');
  const work = section.querySelector('.aw-work');
  const workT = work.querySelector('.aw-work-t');
  const lines = JSON.parse(work.dataset.lines);
  const done = work.dataset.done;
  const els = [...section.querySelectorAll('[data-beat]')];
  const byId = Object.fromEntries(els.map((e) => [e.dataset.beat, e]));
  const reply = byId.reply.querySelector('.text').textContent.trim();
  const tl = timeline({ lines, reply });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const hold = held(new URLSearchParams(location.search).get('chat'));
  const speed = pageSpeed(); // ?speed=<n>, a test hook: the play runs n times faster (1..10)

  let cur = moment(tl, 0), seen = [], t0 = 0, playing = false, played = false;

  // the line of work: a new text crossfades in, unless the line is not showing yet or nothing moves
  let line = workT.textContent.trim(), swap = 0;
  function setLine(text, instant) {
    if (text === line) return;
    line = text;
    clearTimeout(swap);
    if (instant) { workT.classList.remove('out'); workT.textContent = text; return; }
    workT.classList.add('out');
    swap = setTimeout(() => { workT.textContent = line; workT.classList.remove('out'); }, 250 / speed);
  }

  function apply(m) {
    for (const id of m.shown) if (!seen.includes(id)) seen.push(id);
    const wasOn = work.classList.contains('on');
    for (const e of els) e.classList.toggle('on', m.shown.includes(e.dataset.beat));
    const text = m.shown.includes('sources') || !playing ? workText(m.shown, lines, done) : lines[0];
    setLine(text, still.matches || hold != null || !wasOn);
    const asked = m.shown.includes('question') || m.done;
    work.classList.toggle('working', m.shown.includes('sources') && !asked && !still.matches);
    work.classList.toggle('settled', !work.classList.contains('working'));
    const typed = reply.slice(0, m.typed);
    if (typedEl.textContent !== typed) typedEl.textContent = typed;
    compose.classList.toggle('typing', m.beat === 'typing');
    cur = m;
  }

  function frame(now) {
    if (!playing) return;
    // reduced motion switched on mid-play: reading .matches every frame (apply does) updates the
    // query's state, so Chromium may never fire its change event; check here instead
    if (still.matches) { finish(); return; }
    const m = moment(tl, Math.min(tl.done, ((now - t0) / 1000) * speed));
    apply(m);
    if (m.done) playing = false; else requestAnimationFrame(frame);
  }

  function finish() { playing = false; apply(moment(tl, tl.done)); }

  function play() {
    played = true; seen = [];
    playing = true;
    apply(moment(tl, 0));
    t0 = performance.now();
    requestAnimationFrame(frame);
  }

  if (still.matches) apply(moment(tl, tl.done));
  else if (hold != null) apply(moment(tl, hold));
  else apply(moment(tl, 0));

  // it plays when 40% of the window is in view, or, where the window is taller than the screen (a
  // short, narrow or zoomed one), 40% of the screen's height: 40% of a window over 2.5 screens tall
  // never fits at once. Fine thresholds, so the second case fires near its moment too.
  const steps = [...Array.from({ length: 51 }, (_, i) => i / 50), 0.4].sort((x, y) => x - y);
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    const screen = e.rootBounds?.height || innerHeight;
    const enough = e.intersectionRect.height >= 0.4 * Math.min(e.boundingClientRect.height, screen) - 0.5;
    if (still.matches && !cur.done) finish();
    else if (enough && !played && !still.matches && hold == null) play();
  }, { threshold: steps }).observe(win);
  // reduced motion switched on while the page is open: stop, and show the end
  still.addEventListener('change', () => { if (still.matches) finish(); });

  section.querySelector('.aw-replay').addEventListener('click', play);

  // the driver has the beats: until now they were hidden by the section's inline script (or, with
  // no script at all, all shown)
  section.classList.add('aw-live');

  // for tests: the moment now, the beats in the order they showed, and what the work line says
  window.__annaWindow = { state: () => ({ t: cur.t, beat: cur.beat, done: cur.done, typed: cur.typed, seen: [...seen], line }) };
}
