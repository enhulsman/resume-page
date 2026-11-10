// The drawing sheet answers the pointer, in the drawing's own terms: the dimension line under a
// pointed-at link, the crosshair, the pencil, and a project's redline replotting. Inner pages only:
// chrome.js loads this where the layout names the page (main.page); the stone homepage has none.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- a dimension line under whatever link or button you point at ----------
// Cards get registration marks instead (CSS); the revision cloud stays inside the drawings.
// The stone bar is not part of the sheet, so its links get none.
const dim = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
dim.setAttribute('class', 'dim-hl');
dim.setAttribute('aria-hidden', 'true');
dim.innerHTML = '<path class="dim-line"/><path class="dim-tick"/><path class="dim-tick"/>';
document.body.append(dim);
const [dimLine, ...dimTicks] = dim.children;
let dimTarget = null;
function showDim(el) {
  if (reduced || !el || dimTarget === el) return;
  dimTarget = el;
  const r = el.getBoundingClientRect(), w = r.width;
  dim.style.transform = `translate(${r.left + scrollX}px, ${r.bottom + scrollY + 4}px)`;
  dim.classList.remove('on');
  dimLine.setAttribute('d', `M0 0H${w.toFixed(1)}`);
  // architectural ticks: short obliques through each end
  dimTicks.forEach((t, i) => { const x = i * w; t.setAttribute('d', `M${(x - 3).toFixed(1)} 3L${(x + 3).toFixed(1)} -3`); });
  void dim.getBoundingClientRect();
  dim.classList.add('on');
}
function hideDim(el) {
  if (dimTarget !== el) return;
  dimTarget = null;
  dim.classList.remove('on');
}
const dimmed = 'main a.act, main .links a, main .side a, main .diary a, main .more, main .replay';
document.addEventListener('pointerover', e => { const el = e.target.closest(dimmed); if (el) showDim(el); });
document.addEventListener('pointerout', e => { const el = e.target.closest(dimmed); if (el && !el.contains(e.relatedTarget)) hideDim(el); });
document.addEventListener('focusin', e => { const el = e.target.closest(dimmed); if (el && el.matches(':focus-visible')) showDim(el); });
document.addEventListener('focusout', e => { const el = e.target.closest(dimmed); if (el) hideDim(el); });

// ---------- the page answers the pointer, in the drawing's own terms ----------
const fine = matchMedia('(hover: hover) and (pointer: fine)');

// A drafting crosshair follows a mouse, with the sheet coordinates it points at.
// Touch screens have no pointer to follow, so they never get it.
const xhair = document.createElement('div');
xhair.className = 'xhair';
xhair.setAttribute('aria-hidden', 'true');
xhair.innerHTML = '<i class="xhair-v"></i><i class="xhair-h"></i><span class="xhair-read"></span>';
document.body.append(xhair);
const [xv, xh, xread] = xhair.children;
// the last mouse position on screen; a scroll moves the sheet under it, so it re-reads too
let xat = null, xq = false;
const xdraw = () => {
  if (xq || !xat) return;
  xq = true;
  requestAnimationFrame(() => {
    xq = false;
    // sent home (or off the page) since this frame was asked for
    if (!xat) return;
    const [cx, cy] = xat;
    xv.style.transform = `translateX(${cx}px)`;
    xh.style.transform = `translateY(${cy}px)`;
    xread.style.transform = `translate(${cx + 10}px, ${cy + 10}px)`;
    xread.textContent = `x ${Math.round(cx + scrollX)}  y ${Math.round(cy + scrollY)}`;
    xhair.classList.add('on');
  });
};
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !fine.matches) return;
  xat = [e.clientX, e.clientY];
  xdraw();
}, { passive: true });
addEventListener('scroll', xdraw, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { xat = null; xhair.classList.remove('on'); });

// The paper takes a red pencil: a click leaves a mark, a mouse drag on blank paper draws a
// line. Both last about 8 s, then fade (CSS); Escape clears them. Links, controls and the
// terminal are not paper, and a drag that starts on text selects it as usual. Reduced
// motion gets none: the marks are all motion.
const SVG = 'http://www.w3.org/2000/svg';
const LAST = 8000;
const notPaper = 'a, button, input, textarea, select, label, summary, [contenteditable], [role="application"], .stage, .plate-stage, .term, .bar, .dwg-scroll, .site-photo';
function pencil(cls, max) {
  const old = document.querySelectorAll(`.${cls}`);
  if (old.length >= max) old[0].remove();
  const m = document.createElementNS(SVG, 'svg');
  m.setAttribute('class', cls);
  m.setAttribute('aria-hidden', 'true');
  document.body.append(m);
  setTimeout(() => m.remove(), LAST + 200);
  return m;
}
// whether a point is on a line of text, not the paper round it
function onText(x, y) {
  const at = document.caretPositionFromPoint?.(x, y);
  const node = at ? at.offsetNode : document.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return false;
  const r = document.createRange();
  r.selectNodeContents(node);
  return [...r.getClientRects()].some(b => x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 2 && y <= b.bottom + 2);
}
let stroke = null, drew = false;
document.addEventListener('mousedown', e => {
  if (reduced || e.button !== 0 || !fine.matches || e.target.closest(notPaper) || onText(e.clientX, e.clientY)) return;
  // hold back the text selection a drag on paper would start; the page still loses focus as usual
  e.preventDefault();
  getSelection().removeAllRanges();
  if (document.activeElement !== document.body) document.activeElement?.blur?.();
  stroke = { pts: [[e.pageX, e.pageY]], line: null };
});
document.addEventListener('mousemove', e => {
  if (!stroke) return;
  const [px, py] = stroke.pts.at(-1);
  if (Math.hypot(e.pageX - px, e.pageY - py) < 2) return;
  stroke.pts.push([e.pageX, e.pageY]);
  if (!stroke.line) {
    const [sx, sy] = stroke.pts[0];
    if (Math.hypot(e.pageX - sx, e.pageY - sy) < 5) return;
    stroke.line = pencil('pencil-line', 12);
    stroke.line.innerHTML = '<path/>';
  }
  stroke.line.firstChild.setAttribute('d', 'M' + stroke.pts.map(([x, y]) => `${x} ${y}`).join('L'));
});
document.addEventListener('mouseup', () => {
  if (stroke) drew = !!stroke.line;
  stroke = null;
});
document.addEventListener('click', e => {
  if (drew) return void (drew = false);
  if (reduced || e.button !== 0 || e.target.closest(notPaper) || String(getSelection())) return;
  const m = pencil('pencil-mark', 6);
  m.setAttribute('viewBox', '-13 -13 26 26');
  m.innerHTML = '<circle r="7" pathLength="1"/><path d="M-11 0H11M0-11V11" pathLength="1"/>';
  m.style.transform = `translate(${e.pageX - 13}px, ${e.pageY - 13}px)`;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') for (const m of document.querySelectorAll('.pencil-mark, .pencil-line')) m.remove();
});

// Pointing at a project draws registration marks round it (CSS) and replots its redline.
function replot(svg) {
  if (reduced || !svg.classList.contains('drawn')) return;
  for (const p of svg.querySelectorAll('.red path')) {
    if (p.dataset.replot) continue;
    const L = +p.dataset.len;
    p.dataset.replot = '1';
    p.style.transition = 'none';
    p.style.strokeDasharray = `${L} ${L}`;
    p.style.strokeDashoffset = L;
    p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)';
    p.style.strokeDashoffset = 0;
    // then hand the line back to its own dash pattern, as after the first plot
    setTimeout(() => { p.style.transition = 'none'; p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; delete p.dataset.replot; }, 850);
  }
}
for (const card of document.querySelectorAll('.detail')) {
  card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { const d = card.querySelector('.dwg'); d && replot(d); } });
}
