// ─── Tunable physics constants ────────────────────────────────────────────────
const CURSOR_EASE = 0.07;  // Cursor lerp rate at 60fps — ~1.0s trail across ultrawide
const EASE_FACTOR = 0.08;  // Dot lerp rate at 60fps — frame-rate corrected

// Hero zone (repel only)
const HERO_REPEL_RADIUS   = 200;
const HERO_REPEL_STRENGTH = 58;

// Below-fold zone (gentle repel + flashlight glow)
const FOLD_REPEL_RADIUS   = 150;
const FOLD_REPEL_STRENGTH = 15;
const FOLD_GLOW_RADIUS    = 150;

// Blend zone at hero/fold boundary
const BLEND_RANGE = 200;

// Grid
const GRID_SPACING = 40;
const CULL_BUFFER  = 200;

// Visual
const BASE_RADIUS = 1.0;
const MAX_RADIUS  = 2.0;
const GLOW_RADIUS = 4.0;
const GLOW_DIST   = 200; // Hero zone glow radius
const BASE_ALPHA  = 0.18;
const GLOW_ALPHA  = 0.12; // Per-dot max alpha, modulated by proximity²

// Noise
const NOISE_AMPLITUDE = 4.0;
const NOISE_SPEED     = 0.00035;

// Ambient cursor pulse
const PULSE_ONSET  = 500;  // ms still before pulse begins
const PULSE_RAMP   = 500;  // ms fade-in after onset
const PULSE_SPEED  = 0.002;
const PULSE_AMOUNT = 0.25; // ±25% strength variation

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
  hx: number; hy: number;
  x:  number; y:  number;
}
interface GlowDot { x: number; y: number; proximity: number; }

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

  const darkDot  = 'rgb(212, 160, 48)';
  const lightDot = 'rgb(184, 136, 42)';
  let dotColor = document.documentElement.getAttribute('data-theme') === 'light' ? lightDot : darkDot;

  function onThemeChange() {
    dotColor = document.documentElement.getAttribute('data-theme') === 'light' ? lightDot : darkDot;
  }
  window.addEventListener('theme-changed', onThemeChange);

  // Cursor lerp — page-space coords
  let lastClientX = 0, lastClientY = 0;
  let prevClientX = 0, prevClientY = 0;
  let currCX = 0, currCY = 0;
  let mouseHasEntered = false;
  let cursorStillTime = 0;

  function onMouseMove(e: MouseEvent) {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    if (!mouseHasEntered) {
      const scrollY: number = (window as any).__lenis?.scroll ?? window.scrollY;
      currCX = e.clientX;
      currCY = e.clientY + scrollY;
      prevClientX = e.clientX;
      prevClientY = e.clientY;
      mouseHasEntered = true;
    }
  }
  function onMouseLeave() {
    mouseHasEntered = false;
    cursorStillTime = 0;
  }
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cols = 0, totalRows = 0;
  let dots: Dot[] = [];
  let heroHeight = 0;

  function buildAllDots(c: number, r: number) {
    cols = c; totalRows = r; dots = [];
    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < cols; col++) {
        const hx = col * GRID_SPACING;
        const hy = row * GRID_SPACING;
        dots.push({ hx, hy, x: hx, y: hy });
      }
    }
  }

  function appendRows(newTotalRows: number) {
    for (let row = totalRows; row < newTotalRows; row++) {
      for (let col = 0; col < cols; col++) {
        const hx = col * GRID_SPACING;
        const hy = row * GRID_SPACING;
        dots.push({ hx, hy, x: hx, y: hy });
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    heroHeight = document.getElementById('hero')?.offsetHeight ?? 0;

    const newCols = Math.ceil(vw / GRID_SPACING) + 1;
    const newRows = Math.ceil(pageH / GRID_SPACING) + 1;

    if (newCols !== cols) {
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
  resize();

  const startTime = performance.now();
  let lastFrameTime = performance.now();
  let rafId = 0;

  function draw() {
    rafId = requestAnimationFrame(draw);

    const now = performance.now();
    const rawDelta = now - lastFrameTime;
    const dt = Math.min(rawDelta / 16.667, 3);
    lastFrameTime = now;

    const scrollY: number = (window as any).__lenis?.scroll ?? window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const t  = (now - startTime) * NOISE_SPEED;

    // Cursor lerp + stillness tracking
    if (mouseHasEntered) {
      const cursorEase = 1 - Math.pow(1 - CURSOR_EASE, dt);
      currCX += (lastClientX           - currCX) * cursorEase;
      currCY += (lastClientY + scrollY - currCY) * cursorEase;

      const moved = Math.abs(lastClientX - prevClientX) > 0.5 || Math.abs(lastClientY - prevClientY) > 0.5;
      cursorStillTime = moved ? 0 : cursorStillTime + rawDelta;
      prevClientX = lastClientX;
      prevClientY = lastClientY;
    }

    // Ambient pulse — ramps in after cursor is still for PULSE_ONSET ms
    const pulseRamp = cursorStillTime > PULSE_ONSET
      ? Math.min((cursorStillTime - PULSE_ONSET) / PULSE_RAMP, 1)
      : 0;
    const pulseMod = pulseRamp > 0
      ? 1 + Math.sin((now - startTime) * PULSE_SPEED) * PULSE_AMOUNT * pulseRamp
      : 1;

    const ease = 1 - Math.pow(1 - EASE_FACTOR, dt);

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(0, -scrollY);

    const firstRow = Math.max(0, Math.floor((scrollY - CULL_BUFFER) / GRID_SPACING));
    const lastRow  = Math.min(totalRows - 1, Math.ceil((scrollY + vh + CULL_BUFFER) / GRID_SPACING));
    const startIdx = firstRow * cols;
    const endIdx   = Math.min((lastRow + 1) * cols, dots.length);

    const basePath = new Path2D();
    const glowDots: GlowDot[] = [];

    for (let i = startIdx; i < endIdx; i++) {
      const dot = dots[i];

      const nx = fbm2(dot.hx * 0.012 + t, dot.hy * 0.012) * NOISE_AMPLITUDE;
      const ny = fbm2(dot.hx * 0.012, dot.hy * 0.012 + t + 5.3) * NOISE_AMPLITUDE;

      // Zone blend (1 = full hero, 0 = full fold)
      const blendStart = heroHeight - BLEND_RANGE;
      const heroBlend  = heroHeight <= 0 ? 0
                       : dot.hy <= blendStart ? 1
                       : dot.hy >= heroHeight ? 0
                       : 1 - (dot.hy - blendStart) / BLEND_RANGE;

      const effectiveRadius   = heroBlend * HERO_REPEL_RADIUS   + (1 - heroBlend) * FOLD_REPEL_RADIUS;
      const effectiveStrength = (heroBlend * HERO_REPEL_STRENGTH + (1 - heroBlend) * FOLD_REPEL_STRENGTH) * pulseMod;

      let dispX = 0, dispY = 0;
      let dist  = Infinity;

      if (mouseHasEntered) {
        const dx = dot.hx - currCX;
        const dy = dot.hy - currCY;
        dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < effectiveRadius) {
          const t2   = 1 - dist / effectiveRadius;
          const str  = t2 * t2 * effectiveStrength;
          const norm = 1 / dist;
          dispX = dx * norm * str;
          dispY = dy * norm * str;
        }
      }

      const targetX = dot.hx + nx + dispX;
      const targetY = dot.hy + ny + dispY;
      dot.x += (targetX - dot.x) * ease;
      dot.y += (targetY - dot.y) * ease;

      // Proximity glow — smooth 0..1 falloff
      const effectiveGlowRadius = heroBlend * GLOW_DIST + (1 - heroBlend) * FOLD_GLOW_RADIUS;
      const proximity = (mouseHasEntered && dist < effectiveGlowRadius)
        ? (1 - dist / effectiveGlowRadius)
        : 0;

      // Dot radius boost
      const maxR = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * (heroBlend * proximity + (1 - heroBlend) * proximity * 0.6);
      const r    = Math.max(BASE_RADIUS, maxR);

      basePath.moveTo(dot.x + r, dot.y);
      basePath.arc(dot.x, dot.y, r, 0, Math.PI * 2);

      if (proximity > 0) glowDots.push({ x: dot.x, y: dot.y, proximity });
    }

    // Base dots — single batched fill
    ctx.fillStyle = dotColor;
    ctx.globalAlpha = BASE_ALPHA;
    ctx.fill(basePath);

    // Glow dots — per-dot alpha scaled by proximity² for smooth spotlight falloff
    for (const g of glowDots) {
      ctx.globalAlpha = GLOW_ALPHA * g.proximity * g.proximity;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GLOW_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

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
