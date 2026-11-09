// Words behind the glass (/hero-lab?lab=1). The numbers live in words-model.js.
//  - ?name=glass: the name arrives far behind ribbed glass, comes into focus, then the glass lifts off
//    (?reveal=<seconds> holds one moment of it)
import { paneFor, redrawPane, looping } from './hero.js';
import { revealAt, REVEAL } from './words-model.js';

const still = matchMedia('(prefers-reduced-motion: reduce)');
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

/** Draw the text of `root` (minus `skip`) into `ctx`, placed where the page lays it out, relative to `origin`. */
function drawText(ctx, root, origin, { skip, style = () => ({}), k = dpr() } = {}) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || (skip && skip(n))) continue;
    const el = n.parentElement, cs = getComputedStyle(el);
    const extra = style(n);
    if (extra.skip) continue;
    ctx.save();
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily}`;
    if ('letterSpacing' in ctx && cs.letterSpacing !== 'normal') ctx.letterSpacing = `${parseFloat(cs.letterSpacing) * k}px`;
    if ('fontStretch' in ctx && parseFloat(cs.fontStretch) < 95) ctx.fontStretch = 'semi-condensed';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = extra.alpha ?? 1;
    const ascent = ctx.measureText('Hg').fontBoundingBoxAscent;
    const text = n.nodeValue;
    range.selectNodeContents(n);
    const rects = range.getClientRects();
    if (rects.length === 1) {
      const r = rects[0];
      ctx.fillText(text.replace(/\s+$/, ''), (r.left - origin.left) * k, (r.top - origin.top) * k + ascent);
    } else { // wrapped: one character at a time
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ' || text[i] === '\n') continue;
        range.setStart(n, i); range.setEnd(n, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width) ctx.fillText(text[i], (r.left - origin.left) * k, (r.top - origin.top) * k + ascent);
      }
    }
    ctx.restore();
  }
}

function inkCanvas(pane) {
  const c = document.createElement('canvas');
  const fit = () => { c.width = Math.max(1, Math.round(pane.clientWidth * dpr())); c.height = Math.max(1, Math.round(pane.clientHeight * dpr())); };
  fit();
  return { c, ctx: c.getContext('2d'), fit };
}

// ---- the name ----
const nameOn = document.documentElement.dataset.name === 'glass';
const h1 = document.querySelector('#name-h3');
const namePane = h1?.querySelector('.name-pane');
if (nameOn && namePane && !still.matches) {
  const ink = inkCanvas(namePane);
  h1.classList.add('behind');
  const draw = () => {
    ink.fit();
    ink.ctx.clearRect(0, 0, ink.c.width, ink.c.height);
    ink.ctx.fillStyle = '#000';
    drawText(ink.ctx, h1, namePane.getBoundingClientRect(), { skip: (n) => namePane.contains(n) });
  };
  document.fonts.ready.then(() => {
    draw();
    const g = paneFor(namePane);
    const t0 = performance.now();
    const held = new URLSearchParams(location.search).get('reveal'); // ?reveal=<s>: hold that moment (screenshots)
    const step = (now) => {
      const t = held != null ? +held : (now - t0) / 1000, s = revealAt(t);
      if (g) g.ink = { source: ink.c, version: 1, color: [17, 17, 16], strength: 1, lod: s.lod };
      namePane.style.opacity = String(s.glass);
      h1.style.setProperty('--name-show', String(1 - s.glass));
      if (!looping()) redrawPane(g);
      if (held != null) return;
      if (t < REVEAL.total) requestAnimationFrame(step);
      else { h1.classList.remove('behind'); namePane.hidden = true; }
    };
    requestAnimationFrame(step);
  });
}
