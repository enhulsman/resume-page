// "View larger" for the diagrams in the prose and the drawings in frosted panes (openspec
// stone-inner-pages, stone-article-layout; Ezra, 2026-11-10: wherever a diagram is shrunk). For each
// it compares the rendered svg width with its viewBox width and, only while it is drawn more than
// 1 px under its natural size, puts the button under it (under the pane, outside the glass) and lets
// a click on it open it too (the button stays the keyboard path; the drawing is no tab stop). It
// re-measures whenever the drawing's size changes (a resized viewport, a column that moves).
//
// Opening clones the diagram into the dialog's frosted panel, renames every id in the copy (and each
// reference to one) so the page never repeats an id, names the dialog by the copy (its own
// aria-labelledby, else the copy's aria-label), and calls showModal(). Escape, "Close" and a click on
// the backdrop close it; focus goes back to the button. If a resize took the button away while the
// dialog was open (widened past the natural width), focus goes to the diagram it showed instead, as a
// one-time target: its tabindex goes again when focus leaves, so it stays no tab stop.
const dialog = document.querySelector('dialog.dv');
const template = document.querySelector('template.dv-open-tpl');
// each: the element the button follows, and its drawing
const figures = [
  ...[...document.querySelectorAll('.art .prose .henk-flow, .art .prose .sbx')].map((fig) => ({ fig, svg: fig.querySelector('svg') })),
  ...[...document.querySelectorAll('.art-window .dp-stage')].map((fig) => ({ fig, svg: fig.querySelector('svg.dwg') })),
];

if (dialog && template) {
  const body = dialog.querySelector('.dv-body');
  let opener = null, shown = null;

  /** Focus `fig` without making it a tab stop: tabindex -1 only until focus leaves it. */
  function focusFigure(fig) {
    fig.setAttribute('tabindex', '-1');
    fig.addEventListener('blur', () => fig.removeAttribute('tabindex'), { once: true });
    fig.focus({ preventScroll: true });
  }

  /** A copy of `svg` whose ids, and the references to them, carry a dv- prefix. */
  function copyOf(svg) {
    const copy = svg.cloneNode(true);
    const ids = new Map();
    for (const el of [copy, ...copy.querySelectorAll('[id]')]) {
      if (!el.id) continue;
      ids.set(el.id, `dv-${el.id}`);
      el.id = `dv-${el.id}`;
    }
    for (const el of [copy, ...copy.querySelectorAll('*')]) {
      for (const { name, value } of [...el.attributes]) {
        let next = value;
        if (name === 'aria-labelledby' || name === 'aria-describedby') next = value.split(/\s+/).map((id) => ids.get(id) ?? id).join(' ');
        else if (name === 'href' || name === 'xlink:href') next = value.replace(/^#(.+)$/, (m, id) => (ids.has(id) ? `#${ids.get(id)}` : m));
        else if (name !== 'id') next = value.replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m));
        if (next !== value) el.setAttribute(name, next);
      }
    }
    if (!copy.id) copy.id = 'dv-figure';
    // a pane's drawing plots itself in (chrome.js): its copy is drawn whole at once
    if (copy.classList.contains('dwg')) {
      copy.classList.add('drawn');
      for (const p of copy.querySelectorAll('path')) {
        for (const k of ['strokeDasharray', 'strokeDashoffset', 'transition', 'transitionDelay']) p.style[k] = '';
        p.removeAttribute('data-len');
      }
    }
    const vb = svg.viewBox.baseVal;
    copy.style.setProperty('--dv-w', `${vb.width}px`);
    copy.style.setProperty('--dv-h', `${vb.height}px`);
    return copy;
  }

  function open(fig, svg, button) {
    const copy = copyOf(svg);
    body.replaceChildren(copy);
    dialog.setAttribute('aria-labelledby', copy.getAttribute('aria-labelledby') || copy.id);
    opener = button;
    shown = fig;
    dialog.showModal();
  }

  dialog.querySelector('.dv-close').addEventListener('click', () => dialog.close());
  // a click on the backdrop lands on the dialog itself; one in the panel lands on the panel
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    body.replaceChildren();
    if (opener?.isConnected) opener.focus();
    else if (shown?.isConnected) focusFigure(shown);
    opener = shown = null;
  });

  for (const { fig, svg } of figures) {
    if (!svg || !svg.viewBox.baseVal || !svg.viewBox.baseVal.width) continue;
    const button = template.content.firstElementChild.cloneNode(true);
    button.addEventListener('click', () => open(fig, svg, button));
    svg.addEventListener('click', () => { if (fig.classList.contains('dv-larger')) open(fig, svg, button); });
    const measure = () => {
      const shrunk = svg.getBoundingClientRect().width < svg.viewBox.baseVal.width - 1;
      fig.classList.toggle('dv-larger', shrunk);
      if (shrunk && !button.isConnected) fig.after(button);
      else if (!shrunk && button.isConnected) button.remove();
    };
    new ResizeObserver(measure).observe(svg);
  }
}
