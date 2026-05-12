// Tunable physics constants
const SPRING_STIFFNESS = 0.12;
const SPRING_DAMPING   = 0.82;
const DOT_DAMPING      = 0.88;
const DOT_RETURN_SPEED = 0.10;

// Influence zone radii (CSS pixels)
const ATTRACT_RADIUS = 120;
const REPEL_RADIUS   = 250;

// Visual
const BASE_RADIUS  = 0.5;
const MAX_RADIUS   = 1.5;
const GLOW_RADIUS  = 3.0;
const GLOW_DIST    = 150;
const BASE_ALPHA   = 0.15;
const MAX_ALPHA    = 0.60;
const GLOW_ALPHA   = 0.08;

// Grid
const GRID_SPACING = 40;
const MAX_DOTS     = 1500;

// Noise amplitude for ambient flow (CSS pixels)
const NOISE_AMPLITUDE = 4.0;
const NOISE_SPEED     = 0.00035;

// --- 2D gradient noise (2 octaves) ----------------------------------------
// Smooth gradient noise avoids the grid-aligned artifacts of value noise.

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

  const u = fade(xf);
  const v = fade(yf);

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

// --- Types -----------------------------------------------------------------

interface Dot {
  // Home position (CSS pixels, origin top-left of container)
  hx: number;
  hy: number;
  // Current position
  x: number;
  y: number;
  // Velocity
  vx: number;
  vy: number;
  // Distance from spring cursor (updated each frame)
  dist: number;
}

// --- Main export -----------------------------------------------------------

export function initDotSwarm(container: HTMLElement): { canvas: HTMLCanvasElement; destroy: () => void } | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) { canvas.remove(); return null; }

  // Theme colors
  const darkBg   = 'rgb(20, 16, 24)';
  const lightBg  = 'rgb(252, 250, 245)';
  const darkDot  = 'rgb(212, 160, 48)';
  const lightDot = 'rgb(184, 136, 42)';

  let isLight = document.documentElement.getAttribute('data-theme') === 'light';
  let bgColor  = isLight ? lightBg  : darkBg;
  let dotColor = isLight ? lightDot : darkDot;

  function onThemeChange() {
    isLight  = document.documentElement.getAttribute('data-theme') === 'light';
    bgColor  = isLight ? lightBg  : darkBg;
    dotColor = isLight ? lightDot : darkDot;
  }
  window.addEventListener('theme-changed', onThemeChange);

  // Spring cursor (CSS pixels relative to container)
  let targetCX = 0, targetCY = 0;
  let currCX   = 0, currCY   = 0;
  let springVX = 0, springVY = 0;
  let mouseHasEntered = false;

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    targetCX = e.clientX - rect.left;
    targetCY = e.clientY - rect.top;
    if (!mouseHasEntered) {
      // Snap spring cursor to initial position on first entry to avoid swooping from (0,0)
      currCX = targetCX;
      currCY = targetCY;
      mouseHasEntered = true;
    }
  }
  document.addEventListener('mousemove', onMouseMove, { passive: true });

  // Dots array
  let dots: Dot[] = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;

  function buildDots(cssW: number, cssH: number) {
    let cols = Math.round(cssW / GRID_SPACING) + 1;
    let rows = Math.round(cssH / GRID_SPACING) + 1;

    // Cap total dots
    if (cols * rows > MAX_DOTS) {
      const ratio = cssW / cssH;
      rows = Math.floor(Math.sqrt(MAX_DOTS / ratio));
      cols = Math.floor(rows * ratio);
    }

    const dotSpacingX = cssW / (cols - 1 || 1);
    const dotSpacingY = cssH / (rows - 1 || 1);

    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = c * dotSpacingX;
        const hy = r * dotSpacingY;
        dots.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, dist: Infinity });
      }
    }
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    w = Math.round(cssW * dpr);
    h = Math.round(cssH * dpr);
    canvas.width  = w;
    canvas.height = h;
    ctx.scale(dpr, dpr);
    buildDots(cssW, cssH);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const startTime = performance.now();
  let rafId = 0;

  function draw() {
    rafId = requestAnimationFrame(draw);
    const t = (performance.now() - startTime) * NOISE_SPEED;
    const cssW = w / dpr;
    const cssH = h / dpr;

    // --- Spring cursor physics ---
    if (mouseHasEntered) {
      const ax = (targetCX - currCX) * SPRING_STIFFNESS;
      const ay = (targetCY - currCY) * SPRING_STIFFNESS;
      springVX = (springVX + ax) * SPRING_DAMPING;
      springVY = (springVY + ay) * SPRING_DAMPING;
      currCX += springVX;
      currCY += springVY;
    }

    // --- Opaque background ---
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cssW, cssH);

    // --- Update dots ---
    const basePath = new Path2D();
    const glowPath = new Path2D();

    for (const dot of dots) {
      // Ambient noise displacement
      const nx = fbm2(dot.hx * 0.012 + t, dot.hy * 0.012) * NOISE_AMPLITUDE;
      const ny = fbm2(dot.hx * 0.012, dot.hy * 0.012 + t + 5.3) * NOISE_AMPLITUDE;

      // Cursor influence
      let fx = 0, fy = 0;
      if (mouseHasEntered) {
        const dx = dot.hx - currCX;
        const dy = dot.hy - currCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        dot.dist = dist;

        if (dist < REPEL_RADIUS && dist > 0) {
          const norm = 1 / dist;
          if (dist < ATTRACT_RADIUS) {
            // Attract toward cursor — squared falloff
            const t2 = 1 - dist / ATTRACT_RADIUS;
            const strength = t2 * t2 * 18;
            fx = -dx * norm * strength;
            fy = -dy * norm * strength;
          } else {
            // Repel outward — squared falloff from outer edge
            const t2 = 1 - (dist - ATTRACT_RADIUS) / (REPEL_RADIUS - ATTRACT_RADIUS);
            const strength = t2 * t2 * 10;
            fx = dx * norm * strength;
            fy = dy * norm * strength;
          }
        } else {
          dot.dist = Infinity;
        }
      } else {
        dot.dist = Infinity;
      }

      // Spring return toward home + noise
      const targetX = dot.hx + nx;
      const targetY = dot.hy + ny;
      const returnX = (targetX - dot.x) * DOT_RETURN_SPEED;
      const returnY = (targetY - dot.y) * DOT_RETURN_SPEED;

      dot.vx = (dot.vx + returnX + fx) * DOT_DAMPING;
      dot.vy = (dot.vy + returnY + fy) * DOT_DAMPING;
      dot.x += dot.vx;
      dot.y += dot.vy;

      // Dot radius + alpha scale with proximity to spring cursor
      const proximity = dot.dist < GLOW_DIST
        ? 1 - dot.dist / GLOW_DIST
        : 0;
      dot['_prox'] = proximity;

      const r = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * proximity;

      basePath.moveTo(dot.x + r, dot.y);
      basePath.arc(dot.x, dot.y, r, 0, Math.PI * 2);

      if (proximity > 0) {
        glowPath.moveTo(dot.x + GLOW_RADIUS, dot.y);
        glowPath.arc(dot.x, dot.y, GLOW_RADIUS, 0, Math.PI * 2);
      }
    }

    // --- Two draw calls for all dots ---
    ctx.fillStyle = dotColor;
    ctx.globalAlpha = BASE_ALPHA;
    ctx.fill(basePath);

    ctx.globalAlpha = GLOW_ALPHA;
    ctx.fill(glowPath);

    ctx.globalAlpha = 1;
  }

  draw();

  function destroy() {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    document.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('theme-changed', onThemeChange);
    canvas.remove();
  }

  return { canvas, destroy };
}
