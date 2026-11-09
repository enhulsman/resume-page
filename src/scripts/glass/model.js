// The [04] ribbed-glass model, carried over from ~/Coding/studies/04-ribbed-glass (src/model.js):
// the fitted light fields and the glass optics, as pure functions. The fragment shader in
// shader.js is the GLSL twin of pixelAt(); keep the two in step.
// Units are the study's card px: every card is drawn as a 296 x 360 card, scaled.
import spec from './params.json' with { type: 'json' };

export const REF = { w: 296, h: 360 };
/** Study px per CSS px for a card drawn `cssWidth` wide. */
export const toRef = (cssWidth) => REF.w / cssWidth;
export const GLASS = spec.glass;
export const PERIOD = 10; // seconds; every motion loops on it
export const LIGHTS = spec.cards.length;

// A param is a number or {c, s:[..], k:[..], cycles?}: c + cycles*2pi*t/T + sum_h s[h] sin(2pi(h+1)t/T) + k[h] cos(..)
export function evalParam(p, t) {
  if (typeof p === 'number') return p;
  let v = p.c;
  const w = (2 * Math.PI * t) / PERIOD;
  const n = Math.max(p.s?.length ?? 0, p.k?.length ?? 0);
  for (let h = 0; h < n; h++) v += (p.s?.[h] ?? 0) * Math.sin((h + 1) * w) + (p.k?.[h] ?? 0) * Math.cos((h + 1) * w);
  if (p.cycles) v += (p.cycles * 2 * Math.PI * t) / PERIOD; // a travelling phase: whole cycles per loop
  if (p.noise) v += noise(p.noise, t);
  return v;
}

// deterministic flicker: sum of incommensurate sines, still periodic over PERIOD
function noise(n, t) {
  let v = 0;
  for (const [a, f, ph] of n) v += a * Math.sin((2 * Math.PI * f * t) / PERIOD + ph);
  return v;
}

const evalVec = (v, t) => v.map((x) => evalParam(x, t));

/**
 * Light `i` at time `t`. `base` replaces the study's card colour (the glass only touches the
 * light). `tune[j]`, when set, reshapes layer j for a pale card, where the study's soft glows
 * wash out: `scale` multiplies its size, `dx`/`dy` move it, `set` replaces values outright
 * (colour, edge softness, opacity, gradient), `stretch` scales width and height apart,
 * `ground` turns a band into a fixed-height ground under the study's top edge,
 * `dist` scales the card's distance for this layer alone, `lean` adds to its shear.
 * `wash` lays one faint broad light under the rest, so the ribs show across the whole card.
 * A layer tuned to opacity 0 is dropped (the shader draws at most MAX_LAYERS).
 * The motion stays the study's.
 * `blur` is the distance dial: how far behind the glass the light sits. At 0 a retuned layer
 * keeps its own edge, at 1 every edge is as soft as the study's, above 1 softer still.
 */
export function cardState(i, t, base, tune, blur = 0, wash) {
  const c = spec.cards[i];
  const layers = c.layers.map((L, j) => {
      const out = { kind: L.kind };
      for (const [k, v] of Object.entries(L)) {
        if (k === 'kind') continue;
        out[k] = Array.isArray(v) ? evalVec(v, t) : evalParam(v, t);
      }
      const T = tune?.[j];
      const studySigma = out.sigma;
      const far = Math.max(1, blur);
      if (!T) { if (far > 1 && out.sigma != null) out.sigma *= far; return out; }
      if (T.scale) for (const k of ['sx', 'sy', 'half', 'hq']) if (out[k] != null) out[k] *= T.scale;
      let study = studySigma;
      if (T.stretch) {
        out.sx *= T.stretch[0]; out.sy *= T.stretch[1];
        if (study != null) study /= T.stretch[1]; // the study's edge, kept the same width in px
      }
      if (T.ground) { // a fixed-height ground whose top edge follows the study's
        if (study != null) study *= out.sy / T.ground;
        out.cy = out.cy - out.sy + T.ground; out.sy = T.ground;
      }
      if (T.lean) out.shear = (out.shear ?? 0) + T.lean;
      if (T.dx) for (const k of ['cx']) if (out[k] != null) out[k] += T.dx;
      if (T.dy) for (const k of ['cy', 'y0', 'g0', 'g1']) if (out[k] != null) out[k] += T.dy;
      if (T.set) {
        if (T.set.color && !T.set.color2) delete out.color2;
        Object.assign(out, T.set);
      }
      if (out.sigma != null && studySigma != null) {
        const d = blur * (T.dist ?? 1); // `dist` puts this layer nearer (or further) than its card
        const k = Math.min(1, Math.max(0, d));
        out.sigma = (out.sigma * (1 - k) + study * k) * Math.max(1, d);
      }
      return out;
    }).filter((L) => (L.opacity ?? 1) > 0);
  if (wash) layers.unshift({ kind: 'ellipse', cx: REF.w / 2, cy: REF.h / 2, sx: 1.45 * REF.w, sy: 1.45 * REF.h, sigma: 1, shear: 0, color: wash.color, opacity: wash.opacity });
  return { base: base ?? c.base, layers };
}

// ---- CPU mirror of the fragment shader (used by tests and the numeric checks) ----
const Phi = (x0) => { const x = Math.min(6, Math.max(-6, x0)); return 0.5 * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x))); };
const soft = (sd, s) => Phi(-sd / Math.max(s, 1e-4));

/** Where the sample lands in the light's own frame: slid by `ox`, turned by `rot` (radians, clockwise on screen) about (px, py), its centre by default. */
export function layerFrame(L, X0, Y0) {
  let X = X0 - (L.ox ?? 0), Y = Y0;
  if (L.rot) {
    const px = L.px ?? L.cx ?? 0, py = L.py ?? L.cy ?? L.y0 ?? 0;
    const c = Math.cos(L.rot), s = Math.sin(L.rot), dx = X - px, dy = Y - py;
    X = px + c * dx + s * dy; Y = py - s * dx + c * dy;
  }
  return [X, Y];
}

export function shapeCoverage(L, X0, Y0) {
  const [X, Y] = layerFrame(L, X0, Y0);
  const x = L.shear ? X - L.shear * (Y - (L.cy ?? 0)) : X;
  if (L.kind === 'ellipse') {
    const sx = Math.max(Math.abs(L.sx), 4), sy = Math.max(Math.abs(L.sy), 4); // sizes never cross zero
    const dx = (x - L.cx) / sx, dy = (Y - L.cy) / sy, pn = L.pn ?? 2;
    const d = pn === 2 ? Math.hypot(dx, dy) : (Math.abs(dx) ** pn + Math.abs(dy) ** pn) ** (1 / pn);
    return soft(d - 1, L.sigma);
  }
  if (L.kind === 'band') {
    let yc = L.y0 + L.amp * Math.sin((2 * Math.PI * x) / L.lam + L.phase);
    if (L.amp2) yc += L.amp2 * Math.sin((2 * Math.PI * x) / L.lam2 + L.phase2);
    const half = L.hq != null ? 10 + Math.abs(L.hq) : L.half; // hq: half-height above a 10 px floor
    const sig = L.soft != null ? Math.abs(L.soft) / Math.max(Math.abs(half), 1e-3) : L.sigma; // soft: edge softness in px
    return soft((Math.abs(Y - yc) - half) / half, sig);
  }
  if (L.kind === 'drop') {
    const px = Math.abs((x - L.cx) / L.sx), py = -(Y - L.cy) / L.sy, h = L.h;
    const b = 1 / h, a = Math.sqrt(Math.max(1 - b * b, 1e-6));
    const k = -px * b + py * a;
    let sd;
    if (k < 0) sd = Math.hypot(px, py) - 1;
    else if (k > a * h) sd = Math.hypot(px, py - h);
    else sd = px * a + py * b - 1;
    return soft(sd, L.sigma);
  }
  throw new Error(`unknown layer kind ${L.kind}`);
}

export function fieldAt(state, X, Y, clip = true) {
  let P = [0, 0, 0], A = 0;
  for (const L of state.layers) {
    const cov = shapeCoverage(L, X, Y) * (L.opacity ?? 1);
    let col = L.color;
    if (L.color2) {
      const g = Math.min(1, Math.max(0, (Y - L.g0) / (L.g1 - L.g0)));
      col = col.map((c, j) => c * (1 - g) + L.color2[j] * g);
    }
    P = P.map((p, j) => p * (1 - cov) + col[j] * cov);
    A = A * (1 - cov) + cov;
  }
  // ink: a drawing behind the glass, over the lights. `sample(X, Y)` is its coverage 0..1 (the
  // shader reads a texture's alpha instead, blurred by mip level for distance)
  const ink = state.ink;
  if (ink) {
    const a = Math.min(1, Math.max(0, ink.sample(X, Y))) * (ink.strength ?? 1);
    if (a > 0) {
      P = P.map((p, j) => p * (1 - a) + ink.color[j] * a);
      A = A * (1 - a) + a;
    }
  }
  const F = state.base.map((b, j) => b * (1 - A) + P[j]);
  return clip ? F.map((x) => Math.min(255, Math.max(0, x))) : F;
}

export function glassAt(u) {
  const { pitch, m, seamDepth, seamWidth, lineDepth = 0, lineWidth = 0.5 } = GLASS;
  if (GLASS.seamWidthR != null) {
    // asymmetric seam: the boundary sits `offset` px from the 8 px grid, the fade is
    // narrower on one side, and the groove darkens the light by a fraction (none on black)
    const uu = u - GLASS.offset, k = Math.floor(uu / pitch), c = k * pitch + pitch / 2 + GLASS.offset;
    const s = uu - k * pitch, e = Math.min(s, pitch - s);
    return {
      xs: c + m * (u - c),
      alpha: 1 - seamDepth * (Math.exp(-((s / seamWidth) ** 2)) + Math.exp(-(((pitch - s) / GLASS.seamWidthR) ** 2))),
      line: 0,
      mul: GLASS.groove * Math.exp(-((e / lineWidth) ** 2)),
    };
  }
  const k = Math.floor(u / pitch), c = k * pitch + pitch / 2;
  const e = Math.min(u - k * pitch, (k + 1) * pitch - u);
  if (GLASS.D) { // measured rib profile: 9 knots across the rib, linear between
    const s = u - k * pitch, i = Math.min(7, Math.floor(s)), f = s - i;
    return {
      xs: c + GLASS.D[i] * (1 - f) + GLASS.D[i + 1] * f,
      alpha: GLASS.A ? GLASS.A[i] * (1 - f) + GLASS.A[i + 1] * f : 1 - seamDepth * Math.exp(-((e / seamWidth) ** 2)),
      line: lineDepth * Math.exp(-((e / lineWidth) ** 2)),
    };
  }
  return {
    xs: c + m * (u - c),
    alpha: 1 - seamDepth * Math.exp(-((e / seamWidth) ** 2)),
    line: lineDepth * Math.exp(-((e / lineWidth) ** 2)), // the groove between ribs, in 0..255 levels
  };
}

// one output pixel at card-local pixel centre (u, v), 4 horizontal subsamples
// what the seams fade toward: a broad average of the light (blurR > 0), else the card colour
export function seamTarget(state, u, v) {
  const R = GLASS.blurR ?? 0;
  if (!R) return state.base;
  const acc = [0, 0, 0];
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    const F = fieldAt(state, u + k * R, v);
    for (let j = 0; j < 3; j++) acc[j] += F[j] / 4;
  }
  return acc;
}

export function pixelAt(state, u, v, ss = 4) {
  const out = [0, 0, 0];
  const T = seamTarget(state, u, v);
  for (let s = 0; s < ss; s++) {
    const us = u - 0.5 + (s + 0.5) / ss;
    const { xs, alpha, line, mul = 0 } = glassAt(us);
    const F = fieldAt(state, xs, v, false); // the seams mix the light before it is clipped
    for (let j = 0; j < 3; j++) {
      const v = T[j] + alpha * (F[j] - T[j]);
      out[j] += Math.min(255, Math.max(0, v + mul * (state.base[j] - v) - line)); // the groove pulls the light toward the card, never shades the card
    }
  }
  const px = out.map((x) => x / ss);
  // the readout band: the light fades toward the card behind the text, keeping `keep` of itself
  const q = state.quiet;
  if (!q) return px;
  let f = Math.min(1, Math.max(0, (v - q.y0) / (q.y1 - q.y0)));
  f = f * f * (3 - 2 * f);
  const k = 1 - (1 - q.keep) * f;
  return px.map((x, j) => state.base[j] + (x - state.base[j]) * k);
}
