// The chrome on every page: the phone menu of the stone bar. On the inner pages, which are still
// drawing sheets, also the detail drawings plotting in, the dimension line under a pointed-at
// link, the crosshair and the pencil; the stone homepage has none of those (openspec
// stone-glass-homepage: the drawing-sheet look leaves the homepage). No theme: one light stone.

// (the 'js' class is set in the layout's head, before first paint)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// an inner page names itself in the layout (main.page); the homepage does not
const sheet = !!document.querySelector('main.page');

// ---------- the phone menu: the bar's page links, folded away below 860px ----------
const bar = document.querySelector('.bar');
const menuBtn = bar.querySelector('.menu-btn');
function setMenu(open, { focus = false } = {}) {
  bar.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  if (!open && focus) menuBtn.focus();
}
menuBtn.addEventListener('click', () => setMenu(!bar.classList.contains('open')));
bar.querySelector('nav').addEventListener('click', e => e.target.closest('a') && setMenu(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && bar.classList.contains('open')) setMenu(false, { focus: true }); });
document.addEventListener('pointerdown', e => { if (bar.classList.contains('open') && !bar.contains(e.target)) setMenu(false); });
matchMedia('(max-width: 860px)').addEventListener('change', e => { if (!e.matches) setMenu(false); });

// Whether most of an element is on screen; the scroll backstop below uses it.
export const shown = (el, part) => {
  const r = el.getBoundingClientRect();
  const seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  return r.height > 0 && seen >= Math.min(r.height, innerHeight) * part;
};

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

// The observer does the work; this is the backstop, run on scroll, so the drawings never
// stay hidden where an IntersectionObserver does not fire.
let queued = false;
addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; for (const d of dwgs) if (!d.classList.contains('drawn') && shown(d, 0.35)) plotIn(d); });
}, { passive: true });

// The drawing sheet answers the pointer: inner pages only (src/scripts/overzicht/pointer.js).
if (sheet) import('./pointer.js');
