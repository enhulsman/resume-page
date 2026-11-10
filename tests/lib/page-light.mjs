// A page's head light (openspec stone-inner-pages, "One light per page"), measured in a real browser:
// shared by tests/inner-blog.e2e.mjs (/blog) and tests/inner-resume.e2e.mjs (/resume).

/** Every rgb(a) colour named in a CSS value, as "r,g,b". */
export const colours = (css) => [...new Set([...css.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => m[1].split(/[\s,/]+/).slice(0, 3).map(Number).join(',')))];

/** The head light's attributes, its place in the head, and its background's colours. */
export function lightOf(page) {
  return page.evaluate(() => {
    const lights = [...document.querySelectorAll('[data-page-light]')];
    const l = lights[0];
    if (!l) return { count: 0 };
    const cs = getComputedStyle(l);
    const head = l.parentElement;
    const h1 = head.querySelector('h1');
    return {
      count: lights.length,
      inMain: !!l.closest('main'),
      ariaHidden: l.getAttribute('aria-hidden'),
      pointer: cs.pointerEvents,
      zIndex: cs.zIndex,
      position: cs.position,
      headIsolated: getComputedStyle(head).isolation,
      h1InHead: !!h1,
      h1After: !!h1 && !!(l.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING),
      h1Z: h1 ? getComputedStyle(h1).zIndex : null,
      background: cs.backgroundImage,
      filter: cs.filter,
      animations: l.getAnimations().length,
      transition: cs.transitionDuration,
    };
  });
}

/**
 * "Soft, behind, silent": everything else in the head hidden, one horizontal line of pixels through
 * the light's centre (clipped to the page: the body, not the scrollbar gutter overzicht.css reserves); the largest step between
 * neighbours, in levels.
 */
export async function lightStep(page) {
  const { y, x0, x1 } = await page.evaluate(() => {
    const l = document.querySelector('[data-page-light]');
    l.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = l.getBoundingClientRect();
    return { y: Math.round(Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))), x0: Math.max(0, Math.floor(r.left)), x1: Math.min(Math.floor(document.body.getBoundingClientRect().right), Math.ceil(r.right)) };
  });
  const tag = await page.addStyleTag({ content: '[data-page-light] ~ *, [data-page-light] ~ * * { visibility: hidden !important; } header.bar, header.bar * { visibility: hidden !important; }' });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png = (await page.screenshot({ clip: { x: x0, y, width: x1 - x0, height: 1 } })).toString('base64');
  await tag.evaluate((t) => t.remove());
  return page.evaluate(async (png) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, 1).data;
    let step = 0, lo = 255, hi = 0;
    for (let i = 4; i < d.length; i += 4) {
      for (let k = 0; k < 3; k++) step = Math.max(step, Math.abs(d[i + k] - d[i - 4 + k]));
      const v = d[i] + d[i + 1] + d[i + 2];
      lo = Math.min(lo, v / 3); hi = Math.max(hi, v / 3);
    }
    return { step, spread: hi - lo };
  }, png);
}

/**
 * "Text over the light": the texts in `sels` with their own colour, then all made transparent at
 * once, one screenshot, each element's lowest contrast against the pixels behind its box.
 */
export async function textOverLight(page, sels) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const items = await page.evaluate((sels) => sels.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => {
    const r = el.getBoundingClientRect();
    return { sel, color: getComputedStyle(el).color, box: { x: r.x, y: Math.max(0, r.y), w: r.width, h: Math.min(innerHeight, r.bottom) - Math.max(0, r.y) } };
  }).filter((i) => i.box.w > 0 && i.box.h > 0)), sels);
  const hide = sels.map((s) => `${s}, ${s} *`).join(', ');
  const tag = await page.addStyleTag({ content: `${hide} { color: transparent !important; text-decoration-color: transparent !important; text-shadow: none !important; }` });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png = (await page.screenshot()).toString('base64');
  await tag.evaluate((t) => t.remove());
  return page.evaluate(async ([png, items]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map(({ sel, color, box }) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      const d = x.getImageData(Math.round(box.x), Math.round(box.y), Math.max(1, Math.round(box.w)), Math.max(1, Math.round(box.h))).data;
      let min = 99;
      for (let i = 0; i < d.length; i += 16) {
        const bg = [d[i], d[i + 1], d[i + 2]];
        const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
        const [hi, lo] = [L(bg), L(fg)].sort((p, q) => q - p);
        min = Math.min(min, (hi + 0.05) / (lo + 0.05));
      }
      return { sel, ratio: +min.toFixed(2) };
    });
  }, [png, items]);
}
