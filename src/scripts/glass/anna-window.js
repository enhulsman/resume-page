// ANNA in a glass window (the homepage's ANNA section): the
// site's 'week' conversation plays once when the window is about 40% in view; Replay plays it again.
// Every beat is in the page from the start (anna-window-model.js says when each shows). The window
// keeps its height and scrolls itself to the newest beat, unless the reader has scrolled it
// themselves. ?chat=<seconds> holds one moment; reduced motion (also when switched on later) shows
// the end at once.
import { timeline, moment, held } from './anna-window-model.js';

const section = document.querySelector('.anna-window');
if (section) {
  const win = section.querySelector('.aw-window');
  const chat = section.querySelector('.aw-chat');
  const compose = section.querySelector('.aw-compose');
  const typedEl = section.querySelector('.aw-typed');
  const els = [...section.querySelectorAll('[data-beat]')];
  const byId = Object.fromEntries(els.map((e) => [e.dataset.beat, e]));
  const reply = byId.reply.querySelector('.text').textContent.trim();
  const tl = timeline({ steps: section.querySelectorAll('.steps [data-beat]').length, reply });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const hold = held(new URLSearchParams(location.search).get('chat'));

  let cur = moment(tl, 0), seen = [], t0 = 0, playing = false, played = false, running = false, last = 0, sy = 0;
  let reading = false, setTo = 0; // the reader scrolled the chat: leave it where they put it

  function apply(m) {
    for (const id of m.shown) if (!seen.includes(id)) seen.push(id);
    for (const e of els) e.classList.toggle('on', m.shown.includes(e.dataset.beat));
    const text = reply.slice(0, m.typed);
    if (typedEl.textContent !== text) typedEl.textContent = text;
    compose.classList.toggle('typing', m.beat === 'typing');
    cur = m;
  }

  /** Where the chat should be scrolled: the newest shown beat's bottom, just in view. */
  function target() {
    const max = Math.max(0, chat.scrollHeight - chat.clientHeight);
    const newest = [...cur.shown].reverse().map((id) => byId[id]).find(Boolean);
    if (!newest) return 0;
    const pad = parseFloat(getComputedStyle(newest.closest('.aw-log')).paddingBottom) || 0;
    return Math.min(max, Math.max(0, newest.offsetTop + newest.offsetHeight + pad - chat.clientHeight));
  }

  /** Ease the chat towards its target; true once it is there (or the reader has it). */
  function follow(dt, instant) {
    if (reading) { sy = chat.scrollTop; return true; }
    if (!playing) sy = chat.scrollTop;
    const to = target();
    if (instant || Math.abs(to - sy) < 1) sy = to;
    else {
      // at least a whole pixel a frame: the browser rounds scrollTop, and once idle sy is read back
      // from it, so a sub-pixel step would be undone every frame and stall a few pixels short
      const step = (to - sy) * (1 - Math.exp(-dt / 0.16));
      sy += Math.sign(step) * Math.max(1, Math.abs(step));
    }
    chat.scrollTop = sy;
    setTo = chat.scrollTop;
    return sy === to;
  }
  // a wheel or a finger up takes over at once (before the follow can undo it); scrolling back down
  // to where the follow would be hands it back
  chat.addEventListener('wheel', (e) => { if (e.deltaY < 0) reading = true; }, { passive: true });
  chat.addEventListener('touchmove', () => { reading = true; }, { passive: true });
  chat.addEventListener('scroll', () => {
    if (Math.abs(chat.scrollTop - setTo) > 2) reading = true; // the keyboard or the scrollbar
    if (reading && chat.scrollTop >= target() - 4) reading = false;
  }, { passive: true });

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) {
      const m = moment(tl, Math.min(tl.done, (now - t0) / 1000));
      apply(m);
      if (m.done) playing = false;
    }
    const there = follow(dt, !playing && (still.matches || hold != null));
    if (playing || !there) requestAnimationFrame(frame); else running = false;
  }
  const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };

  function finish() { playing = false; apply(moment(tl, tl.done)); kick(); }

  function play() {
    played = true; seen = []; sy = 0; reading = false; chat.scrollTop = 0; setTo = 0;
    apply(moment(tl, 0));
    t0 = performance.now(); playing = true;
    kick();
  }

  if (still.matches) apply(moment(tl, tl.done));
  else if (hold != null) apply(moment(tl, hold));

  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    if (still.matches && !cur.done) finish();
    else if (e.intersectionRatio >= 0.4 && !played && !still.matches && hold == null) play();
    else kick(); // shown again (a resize, a font swap): settle the scroll where it belongs
  }, { threshold: [0, 0.4] }).observe(win);
  document.fonts.ready.then(kick);
  // reduced motion switched on while the page is open: stop, and show the end
  still.addEventListener('change', () => { if (still.matches) finish(); });
  // a window resized (or text reflowed) keeps the newest beat in view
  const ro = new ResizeObserver(() => kick());
  ro.observe(chat); ro.observe(section.querySelector('.aw-log'));

  section.querySelector('.aw-replay').addEventListener('click', play);

  // for tests: the moment now, and the beats in the order they showed
  window.__annaWindow = { state: () => ({ t: cur.t, beat: cur.beat, done: cur.done, typed: cur.typed, seen: [...seen] }) };
}
