// A glare across the name (/hero-lab?name=glare): light running over black lacquer, once when the
// page arrives and again when the pointer comes onto the name. ?glare=<0..1> holds one moment
// (0 before the sweep, 1 after it). Reduced motion: no glare (the CSS hides it).
const h1 = document.querySelector('#name-h3');
const glare = h1?.dataset.glare != null ? h1 : null; // the glare is the h1's ::after; it reads --glare-x
const still = matchMedia('(prefers-reduced-motion: reduce)');
const on = () => document.documentElement.dataset.name === 'glare' && !still.matches;
const SWEEP = 1.7; // seconds

/** Place the glare at `k` (0 off to the left, 1 off to the right); its background position runs 100% to 0%. */
const place = (k) => glare.style.setProperty('--glare-x', `${(100 * (1 - k)).toFixed(2)}%`);

if (glare) {
  const held = new URLSearchParams(location.search).get('glare');
  let running = false, sweeps = 0;
  const sweep = () => {
    if (!on() || running) return;
    running = true; sweeps++;
    const t0 = performance.now();
    const step = (now) => {
      const x = Math.min(1, (now - t0) / 1000 / SWEEP);
      place(x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2); // ease in and out
      if (x < 1) requestAnimationFrame(step); else { running = false; place(0); }
    };
    requestAnimationFrame(step);
  };
  if (held != null) place(+held);
  else {
    place(0);
    document.fonts.ready.then(() => setTimeout(sweep, 450));
    h1.addEventListener('pointerenter', sweep);
    // the lab bar switches it on in place: sweep then
    new MutationObserver(sweep).observe(document.documentElement, { attributes: true, attributeFilter: ['data-name'] });
  }
  window.__glare = { running: () => running, sweeps: () => sweeps, at: () => glare.style.getPropertyValue('--glare-x') };
}
