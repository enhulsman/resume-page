// ─── Tunable physics constants ────────────────────────────────────────────────
const SPRING_STIFFNESS = 0.018; // Overdamped — ~1.2s to trail across ultrawide
const SPRING_DAMPING   = 0.96;
const DOT_DAMPING      = 0.93;  // Higher friction — no overshoot/yoyo
const DOT_RETURN_SPEED = 0.045; // Gentler spring — slow smooth return

// Hero zone (attract inner + repel outer)
const HERO_ATTRACT_RADIUS   = 120;
const HERO_REPEL_RADIUS     = 250;
const HERO_ATTRACT_STRENGTH = 8;   // Smooth pull, not yank
const HERO_REPEL_STRENGTH   = 5;   // Soft repel ring

// Below-fold zone (gentle repel + flashlight glow)
const FOLD_REPEL_RADIUS   = 180;
const FOLD_REPEL_STRENGTH = 1.0;
const FOLD_GLOW_RADIUS    = 200;

// Blend zone at hero/fold boundary
const BLEND_RANGE = 200;

// Grid
const GRID_SPACING = 40;
const CULL_BUFFER  = 200; // px above/below viewport to keep active

// Visual
const BASE_RADIUS = 1.0;  // Match old CSS grid's 1px radius
const MAX_RADIUS  = 2.0;
const GLOW_RADIUS = 4.0;
const GLOW_DIST   = 150; // Hero zone glow radius
const BASE_ALPHA  = 0.18; // Slightly above CSS 0.15 for canvas AA compensation
const GLOW_ALPHA  = 0.08;

// Noise
const NOISE_AMPLITUDE = 4.0;
const NOISE_SPEED     = 0.00035;

// ─── 2D gradient noise (2-octave Perlin) ──────────────────────────────────────
const PERM = new Uint8Array(512);
const GRAD = new Float32Array(512 * 2);

(function buildPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
    const angle = (PERM[i] / 256) * Math.PI * 2;
    GRAD[i * 2]     = Math.cos(angle);
    GRAD[i * 2 + 1] = Math.sin(angle);
  }
})();

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number) { return a + t * (b - a); }

function gnoise(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const aa = PERM[xi     + PERM[yi    ]];
  const ab = PERM[xi     + PERM[yi + 1]];
  const ba = PERM[xi + 1 + PERM[yi    ]];
  const bb = PERM[xi + 1 + PERM[yi + 1]];
  const u = fade(xf), v = fade(yf);
  const dot = (idx: number, dx: number, dy: number) =>
    GRAD[idx * 2] * dx + GRAD[idx * 2 + 1] * dy;
  return lerp(
    lerp(dot(aa, xf,     yf    ), dot(ba, xf - 1, yf    ), u),
    lerp(dot(ab, xf,     yf - 1), dot(bb, xf - 1, yf - 1), u),
    v,
  );
}

function fbm2(x: number, y: number): number {
  return gnoise(x, y) * 0.667 + gnoise(x * 2.1 + 1.7, y * 2.1 + 9.2) * 0.333;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dot {
  hx: number; hy: number; // Home position (page coords)
  x:  number; y:  number; // Current position
  vx: number; vy: number; // Velocity
}

// ─── Module ───────────────────────────────────────────────────────────────────
export function initPageDots(): { canvas: HTMLCanvasElement; destroy: () => void } | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const mount = document.getElementById('page-dots-mount');
  if (!mount) return null;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
  mount.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return null; }

  // Theme — dots only, bg comes from body
  const darkDot  = 'rgb(212, 160, 48)';
  const lightDot = 'rgb(184, 136, 42)';
  let dotColor = document.documentElement.getAttribute('data-theme') === 'light' ? lightDot : darkDot;

  function onThemeChange() {
    dotColor = document.documentElement.getAttribute('data-theme') === 'light' ? lightDot : darkDot;
  }
  window.addEventListener('theme-changed', onThemeChange);

  // Spring cursor — operates in page-space coords
  let lastClientX = 0, lastClientY = 0;
  let targetCX = 0, targetCY = 0;
  let currCX   = 0, currCY   = 0;
  let springVX = 0, springVY = 0;
  let mouseHasEntered = false;

  function onMouseMove(e: MouseEvent) {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    if (!mouseHasEntered) {
      // Snap to avoid swooping from 0,0 on first entry
      const scrollY: number = (window as any).__lenis?.scroll ?? window.scrollY;
      currCX = e.clientX;
      currCY = e.clientY + scrollY;
      mouseHasEntered = true;
    }
  }
  function onMouseLeave() {
    mouseHasEntered = false;
  }
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);

  // Dots array + grid dimensions
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cols = 0, totalRows = 0;
  let dots: Dot[] = [];
  let heroHeight = 0;

  function buildAllDots(c: number, r: number) {
    cols = c;
    totalRows = r;
    dots = [];
    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < cols; col++) {
        const hx = col * GRID_SPACING;
        const hy = row * GRID_SPACING;
        dots.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0 });
      }
    }
  }

  function appendRows(newTotalRows: number) {
    for (let row = totalRows; row < newTotalRows; row++) {
      for (let col = 0; col < cols; col++) {
        const hx = col * GRID_SPACING;
        const hy = row * GRID_SPACING;
        dots.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0 });
      }
    }
    totalRows = newTotalRows;
  }

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pageH = document.documentElement.scrollHeight;

    canvas.width  = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Idempotent — avoids scale accumulation

    heroHeight = document.getElementById('hero')?.offsetHeight ?? 0;

    const newCols = Math.ceil(vw / GRID_SPACING) + 1;
    const newRows = Math.ceil(pageH / GRID_SPACING) + 1;

    if (newCols !== cols) {
      // Width changed — full rebuild (all home positions shift)
      buildAllDots(newCols, newRows);
    } else if (newRows > totalRows) {
      appendRows(newRows);
    } else if (newRows < totalRows) {
      dots.length = newRows * cols;
      totalRows = newRows;
    }
  }

  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });
  ro.observe(document.documentElement);
  resize(); // Initial — synchronous

  const startTime = performance.now();
  let rafId = 0;

  function draw() {
    rafId = requestAnimationFrame(draw);

    const scrollY: number = (window as any).__lenis?.scroll ?? window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const t  = (performance.now() - startTime) * NOISE_SPEED;

    // Recompute page-space spring target every frame — handles scroll-without-mousemove
    if (mouseHasEntered) {
      targetCX = lastClientX;
      targetCY = lastClientY + scrollY;
      const ax = (targetCX - currCX) * SPRING_STIFFNESS;
      const ay = (targetCY - currCY) * SPRING_STIFFNESS;
      springVX = (springVX + ax) * SPRING_DAMPING;
      springVY = (springVY + ay) * SPRING_DAMPING;
      currCX += springVX;
      currCY += springVY;
    }

    // Clear (transparent canvas — body bg shows through)
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(0, -scrollY); // Map page coords → viewport

    // Cull to visible rows
    const firstRow = Math.max(0, Math.floor((scrollY - CULL_BUFFER) / GRID_SPACING));
    const lastRow  = Math.min(totalRows - 1, Math.ceil((scrollY + vh + CULL_BUFFER) / GRID_SPACING));
    const startIdx = firstRow * cols;
    const endIdx   = Math.min((lastRow + 1) * cols, dots.length);

    const basePath = new Path2D();
    const glowPath = new Path2D();

    for (let i = startIdx; i < endIdx; i++) {
      const dot = dots[i];

      // Ambient noise displacement
      const nx = fbm2(dot.hx * 0.012 + t, dot.hy * 0.012) * NOISE_AMPLITUDE;
      const ny = fbm2(dot.hx * 0.012, dot.hy * 0.012 + t + 5.3) * NOISE_AMPLITUDE;

      // Zone blend factor (1 = full hero, 0 = full fold)
      const blendStart = heroHeight - BLEND_RANGE;
      const heroBlend  = heroHeight <= 0 ? 0
                       : dot.hy <= blendStart ? 1
                       : dot.hy >= heroHeight ? 0
                       : 1 - (dot.hy - blendStart) / BLEND_RANGE;

      // Cursor forces (page-space distance from spring cursor to dot home)
      let fx = 0, fy = 0;
      let dist = Infinity;

      if (mouseHasEntered) {
        const dx = dot.hx - currCX;
        const dy = dot.hy - currCY;
        dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const norm = 1 / dist;

          // Hero forces — scaled by heroBlend
          if (heroBlend > 0 && dist < HERO_REPEL_RADIUS) {
            let hfx = 0, hfy = 0;
            if (dist < HERO_ATTRACT_RADIUS) {
              const t2 = 1 - dist / HERO_ATTRACT_RADIUS;
              const str = t2 * t2 * HERO_ATTRACT_STRENGTH;
              hfx = -dx * norm * str;
              hfy = -dy * norm * str;
            } else {
              const t2 = 1 - (dist - HERO_ATTRACT_RADIUS) / (HERO_REPEL_RADIUS - HERO_ATTRACT_RADIUS);
              const str = t2 * t2 * HERO_REPEL_STRENGTH;
              hfx = dx * norm * str;
              hfy = dy * norm * str;
            }
            fx += hfx * heroBlend;
            fy += hfy * heroBlend;
          }

          // Fold forces — scaled by (1 - heroBlend)
          if (heroBlend < 1 && dist < FOLD_REPEL_RADIUS) {
            const t2  = 1 - dist / FOLD_REPEL_RADIUS;
            const str = t2 * t2 * FOLD_REPEL_STRENGTH;
            fx += dx * norm * str * (1 - heroBlend);
            fy += dy * norm * str * (1 - heroBlend);
          }
        }
      }

      // Per-dot spring return toward noise-displaced home
      const targetX = dot.hx + nx;
      const targetY = dot.hy + ny;
      dot.vx = (dot.vx + (targetX - dot.x) * DOT_RETURN_SPEED + fx) * DOT_DAMPING;
      dot.vy = (dot.vy + (targetY - dot.y) * DOT_RETURN_SPEED + fy) * DOT_DAMPING;
      dot.x += dot.vx;
      dot.y += dot.vy;

      // Proximity glow — blended between hero and fold glow radii
      const effectiveGlowRadius = heroBlend * GLOW_DIST + (1 - heroBlend) * FOLD_GLOW_RADIUS;
      const proximity = (mouseHasEntered && dist < effectiveGlowRadius)
        ? (1 - dist / effectiveGlowRadius)
        : 0;

      // Hero zone gets full radius boost; fold zone gets 60% (subtler)
      const maxR  = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * (heroBlend * proximity + (1 - heroBlend) * proximity * 0.6);
      const r     = Math.max(BASE_RADIUS, maxR);

      basePath.moveTo(dot.x + r, dot.y);
      basePath.arc(dot.x, dot.y, r, 0, Math.PI * 2);

      if (proximity > 0) {
        glowPath.moveTo(dot.x + GLOW_RADIUS, dot.y);
        glowPath.arc(dot.x, dot.y, GLOW_RADIUS, 0, Math.PI * 2);
      }
    }

    ctx.fillStyle = dotColor;
    ctx.globalAlpha = BASE_ALPHA;
    ctx.fill(basePath);
    ctx.globalAlpha = GLOW_ALPHA;
    ctx.fill(glowPath);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  draw();

  function destroy() {
    cancelAnimationFrame(rafId);
    clearTimeout(resizeTimer);
    ro.disconnect();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('theme-changed', onThemeChange);
    canvas.remove();
  }

  return { canvas, destroy };
}
