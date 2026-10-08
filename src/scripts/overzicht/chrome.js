// The sheet's chrome, on every page: the theme button, the phone menu, the detail drawings
// plotting in, and the revision cloud. The homepage's ANNA section adds main.js on top.
import { getCurrentTheme, setTheme } from '../../lib/theme';

document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- theme: whiteprint by day, light table at night ----------
// One stored choice for the whole site (lib/theme); the terminal's `theme` command uses it too.
const themeBtn = document.querySelector('.theme');
const isDark = () => getCurrentTheme() === 'dark';
function paintThemeButton() {
  themeBtn.querySelector('.theme-label').textContent = isDark() ? 'Whiteprint' : 'Light table';
  themeBtn.setAttribute('aria-pressed', String(isDark()));
  themeBtn.setAttribute('aria-label', isDark() ? 'Switch to the light theme' : 'Switch to the dark theme');
  // the browser bar follows the chosen theme, not just the system's
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = isDark() ? '#16141D' : '#EFEDF3';
}
themeBtn.addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
paintThemeButton();

// ---------- the phone menu: the bar's section links, folded away below 860px ----------
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

addEventListener('theme-changed', paintThemeButton);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintThemeButton);

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

// The observer does the work; this is the backstop, run on scroll, so the drawings never
// stay hidden where an IntersectionObserver does not fire.
let queued = false;
addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; for (const d of dwgs) if (!d.classList.contains('drawn') && shown(d, 0.35)) plotIn(d); });
}, { passive: true });
