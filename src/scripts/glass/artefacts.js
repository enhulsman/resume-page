// The projects' windows (Projects.astro, sketch A2): each artefact lands once, line by line, when it
// is half in view: Henk's chat a message at a time, the sandbox's report a line at a time, the
// reader its verses; then the reader's highlighted verse steps down the way `j` does, while it is on
// screen. Every line is in the page from the start: without this script they all show; with
// reduced motion (also when switched on later) they show at once and nothing steps. `.done` on an
// artefact once every line has landed (tests wait on it).
const still = matchMedia('(prefers-reduced-motion: reduce)');

for (const el of document.querySelectorAll('[data-play]')) {
  const beats = [...el.querySelectorAll('.b')];
  const gap = +el.dataset.gap || 300;
  let timers = [];
  const finish = () => { timers.forEach(clearTimeout); beats.forEach((b) => b.classList.add('on')); el.classList.add('done'); };
  el.classList.add('live'); // the section's inline script already hid the lines (pending)
  if (still.matches) { finish(); continue; }
  el.classList.add('pending');
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    timers = beats.map((b, k) => setTimeout(() => {
      b.classList.add('on');
      if (k === beats.length - 1) el.classList.add('done');
    }, 300 + k * gap));
  }, { threshold: 0.5 });
  io.observe(el);
  still.addEventListener('change', () => { if (still.matches) finish(); });
}

// the reader: the highlighted verse steps down every 2.6 s, only while it is on screen
const verses = [...document.querySelectorAll('.tui-vv li')];
if (verses.length) {
  let k = 0, on = false;
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(verses[0].closest('.tui'));
  setInterval(() => {
    if (!on || still.matches || !verses[0].closest('.tui').classList.contains('done')) return;
    verses[k].classList.remove('hl');
    k = (k + 1) % verses.length;
    verses[k].classList.add('hl');
  }, 2600);
}
