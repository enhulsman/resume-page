// The ANNA section: a small orthographic renderer for lines and planes on a 2D canvas.
// World units are metres. Every projection is parallel (no perspective, by constraint),
// so a plane's content can be drawn with one affine canvas transform.
import { paintOrder } from './depth.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smooth = t => t * t * (3 - 2 * t);

// ---------- geometry helpers ----------

const v3 = (x, y, z) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);

function box(x0, y0, z0, x1, y1, z1, o = {}) {
  // six faces, each with its outward normal; o.front/top/... override per-face style
  const P = (x, y, z) => v3(x, y, z);
  const faces = [
    { k: 'front', n: v3(0, 0, 1), pts: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
      o: P(x0, y1, z1), u: v3(1, 0, 0), v: v3(0, -1, 0) },
    { k: 'back', n: v3(0, 0, -1), pts: [P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0)] },
    { k: 'top', n: v3(0, 1, 0), pts: [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)],
      o: P(x0, y1, z0), u: v3(1, 0, 0), v: v3(0, 0, 1) },
    { k: 'bottom', n: v3(0, -1, 0), pts: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x0, y0, z0)] },
    { k: 'left', n: v3(-1, 0, 0), pts: [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)] },
    { k: 'right', n: v3(1, 0, 0), pts: [P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1)],
      o: P(x1, y1, z1), u: v3(0, 0, -1), v: v3(0, -1, 0) },
  ];
  // the six faces share one solid, which the painting order works on (depth.js)
  const solid = { min: v3(x0, y0, z0), max: v3(x1, y1, z1) };
  return faces.map(f => ({ ...f, ...o, ...(o[f.k] || {}), kind: 'face', solid, size: [x1 - x0, y1 - y0, z1 - z0] }));
}

// A flat cut-out (an architect's model figure, or a pane): a plane with a Path2D outline
// in local units. u runs right, v runs down, both in metres.
// ext is the outline's extent in those units, [u0, v0, u1, v1], for the painting order.
function cutout(origin, u, v, path, ext, o = {}) {
  const at = (a, b) => add(origin, add(mul(u, a), mul(v, b)));
  const p0 = at(ext[0], ext[1]), p1 = at(ext[2], ext[3]);
  const solid = { min: v3(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.min(p0.z, p1.z)), max: v3(Math.max(p0.x, p1.x), Math.max(p0.y, p1.y), Math.max(p0.z, p1.z)) };
  return { kind: 'cutout', o: origin, u, v, path, n: null, solid, ...o };
}

// ---------- the figures, in centimetres, top of head at y = 0 ----------

// Ezra, for scale: 2,00 m, standing in profile, facing the desk. Curls on top.
const EZRA = new Path2D(
  'M -3 3 C -1 -1 4 -1 6 1 C 9 0 12 2 12 6 C 15 8 14 12 12 13 L 13 16 L 15 19 L 12.5 20 ' +
  'L 12 24 L 7 25 L 6 28 C 11 31 14 36 14 46 L 13.5 70 C 13 86 12 96 10 104 L 7 140 ' +
  'L 5.5 172 L 6 193 L 18 196 L 18 200 L -5 200 L -6.5 193 L -7 168 L -9 140 L -12.5 104 ' +
  'C -14 92 -14 80 -13 66 L -12 44 C -11 35 -8 30 -6 27 L -7 22 C -12 20 -14 14 -12 9 ' +
  'C -13 5 -9 0 -6 2 C -5 1 -4 2 -3 3 Z'
);
const EZRA_ARM = new Path2D('M -2 34 C -1 52 -1 70 0 92 L 1 103 L 6.5 104 L 6 92 C 6 70 6 52 6 36 Z');

// The person asking ANNA, seated in profile, facing the laptop (to the left).
const SITTER = new Path2D(
  'M 2 2 C 6 -1 13 1 13 8 C 14 15 11 20 8 22 L 8 26 C 14 30 16 38 16 48 L 15 70 L 14 84 ' +
  'L -38 84 L -40 128 L -50 128 L -50 131 L -33 131 L -30 92 L -30 96 L 0 96 ' +
  'C -8 95 -12 92 -12 84 L -11 50 C -11 38 -8 30 -3 27 L -3 22 C -9 20 -11 14 -10 9 ' +
  'C -10 4 -5 0 2 2 Z'
);
const SITTER_ARM = new Path2D('M -4 32 C -6 46 -8 56 -12 62 L -36 58 L -37 63 L -10 69 C -3 63 1 50 3 34 Z');

// ---------- the scene ----------

// Levels below the room, top to bottom. Text here is drawn on the plates; the readable
// labels are HTML (see main.js), so the plate lettering can stay small and drawn.
export const LEVELS = [
  { id: 'identity', name: 'Identity', items: ['Entra ID', 'profile', 'history', 'memories'] },
  { id: 'claude', name: 'Claude', items: ['CLI backend', 'API backend'] },
  { id: 'connectors', name: 'MCP connectors', items: ['memory', 'reminders', 'documents', 'profiles', 'Loket', 'ClockWise'] },
  { id: 'ops', name: 'Operations', items: ['health checks', 'log analyser', 'token expiry', 'admin portal'] },
];

const SHAFT = { x: 0.62, z: -0.3 };      // where the request drops through the floor
const RETURN = { x: 0.86, z: -0.3 };     // and where the answer comes back up
const PW = 1.95, PD = 1.55;              // plate half-sizes

function levelY(i, e) {
  // plate top heights: tight below the slab in section, spread when exploded
  const tight = -1.05 - i * 0.92;
  const loose = -1.75 - i * 1.6;
  return lerp(tight, loose, e);
}

function buildScene(T) {
  const S = []; // static items; each has group: 'room' | level index
  const push = (items, extra) => (Array.isArray(items) ? items : [items]).forEach(it => S.push({ ...it, ...extra }));

  // --- the room (group 'room') ---
  const R = { group: 'room' };
  // floor slab: cut face poché
  push(box(-2.42, -0.24, -1.9, 2.42, 0, 1.9, { t0: 0.0, dur: 0.7, lw: 'cut', front: { fill: 'poche' },
    top: { fill: 'sheet', draw: drawFloorPlan } }), R);
  // walls (cut)
  push(box(-2.42, 0, -1.9, -2.22, 2.8, 1.9, { t0: 0.25, dur: 0.6, lw: 'cut', front: { fill: 'poche' } }), R);
  push(box(2.22, 0, -1.9, 2.42, 2.8, 1.9, { t0: 0.3, dur: 0.6, lw: 'cut', front: { fill: 'poche' }, fade: 'axo' }), R);
  // back wall: its inner face is a drawn elevation (window with the Dom tower, a door)
  push(box(-2.22, 0, -1.9, 2.22, 2.8, -1.62, { t0: 0.5, dur: 0.9, lw: 'beyond',
    front: { fill: 'sheet', draw: drawBackWall } }), R);
  // ceiling slab, lifted off as the drawing turns
  push(box(-2.42, 2.8, -1.9, 2.42, 3.02, 1.9, { t0: 0.15, dur: 0.6, lw: 'cut', front: { fill: 'poche' }, fade: 'ceiling' }), R);

  // desk
  const dk = { t0: 0.9, dur: 0.5, lw: 'vis' };
  push(box(-0.15, 0.72, -0.62, 1.45, 0.76, 0.18, dk), R);
  for (const [x, z] of [[-0.1, -0.57], [1.36, -0.57], [-0.1, 0.09], [1.36, 0.09]])
    push(box(x, 0, z, x + 0.05, 0.72, z + 0.05, { ...dk, t0: 1.0 }), R);
  // laptop: base and screen, screen faces the sitter (+x)
  push(box(0.35, 0.76, -0.48, 0.78, 0.785, -0.12, { t0: 1.15, dur: 0.3, lw: 'vis' }), R);
  push(box(0.33, 0.785, -0.48, 0.355, 1.06, -0.12, { t0: 1.2, dur: 0.3, lw: 'vis', right: { fill: 'sheet', draw: drawScreen } }), R);
  // chair
  const ch = { t0: 1.05, dur: 0.4, lw: 'vis' };
  push(box(1.42, 0.43, -0.5, 1.86, 0.47, -0.06, ch), R);
  push(box(1.84, 0.47, -0.5, 1.88, 0.98, -0.06, ch), R);
  push(box(1.62, 0, -0.3, 1.66, 0.43, -0.26, ch), R);

  // figures, as cut-outs standing in the room
  const cm = 0.01;
  push(cutout(v3(1.62, 1.31, -0.27), v3(cm, 0, 0), v3(0, -cm, 0), [SITTER, SITTER_ARM], [-50, 0, 16, 131], { t0: 1.3, dur: 0.6, lw: 'vis', id: 'sitter' }), R);
  push(cutout(v3(-1.45, 2.0, 0.55), v3(cm, 0, 0), v3(0, -cm, 0), [EZRA, EZRA_ARM], [-14, 0, 18, 200], { t0: 1.45, dur: 0.7, lw: 'vis', id: 'ezra' }), R);

  // --- plates below the slab ---
  LEVELS.forEach((L, i) => {
    push(box(-PW, -0.07, -PD, PW, 0, PD, {
      t0: 1.1 + i * 0.18, dur: 0.6, lw: 'cut',
      front: { fill: 'poche' },
      top: { fill: 'sheet', draw: (ctx, st) => drawPlate(ctx, st, L, i) },
    }), { group: i });
  });

  return S;
}

// ---------- drawings on planes (local metres, u right, v down) ----------

function txt(ctx, s, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 500} ${size}px ${o.mono ? 'B612 Mono' : 'Archivo'}`;
  // canvas fonts need px; we are in a metre transform, so scale the text space
  ctx.translate(x, y);
  const k = 1 / 100;
  ctx.scale(k, k);
  ctx.font = `${o.weight || 500} ${size * 100}px ${o.mono ? '"B612 Mono"' : '"Archivo"'}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.stretch) ctx.fontStretch = o.stretch;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

function drawFloorPlan(ctx, st) {
  // the shaft opening where the request goes down, seen on the floor
  ctx.strokeStyle = st.ink;
  ctx.lineWidth = st.px(0.8);
  ctx.strokeRect(SHAFT.x + 2.42 - 0.07, SHAFT.z + 1.9 - 0.07, 0.38, 0.14);
}

function drawBackWall(ctx, st) {
  // local origin: top-left of the inner face at (-2.22, 2.8); u = +x, v = down
  const W = 4.44, H = 2.8;
  ctx.strokeStyle = st.ink;
  ctx.lineWidth = st.px(0.9);
  // window, with the Dom tower beyond it (Utrecht), drawn faint
  const wx = 0.75, wy = 0.55, ww = 1.35, wh = 1.45;
  ctx.save();
  ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  ctx.strokeStyle = st.faint;
  ctx.lineWidth = st.px(0.7);
  drawDom(ctx, wx + ww * 0.58, wy + wh + 0.05, 0.0105);
  ctx.restore();
  ctx.strokeStyle = st.ink;
  ctx.lineWidth = st.px(1);
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.strokeRect(wx + 0.05, wy + 0.05, ww - 0.1, wh - 0.1);
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy + 0.05); ctx.lineTo(wx + ww / 2, wy + wh - 0.05); ctx.stroke();
  // sill
  ctx.strokeRect(wx - 0.06, wy + wh, ww + 0.12, 0.04);
  // door, with its swing drawn as a dashed arc on the elevation convention (hinge side)
  const dx = 3.35, dw = 0.82, dh = 2.1;
  ctx.strokeRect(dx, H - dh, dw, dh);
  ctx.strokeRect(dx + 0.05, H - dh + 0.05, dw - 0.1, dh - 0.05);
  ctx.beginPath(); ctx.arc(dx + dw - 0.12, H - 1.02, 0.025, 0, TAU); ctx.stroke();
  ctx.setLineDash([st.px(4), st.px(3)]);
  ctx.strokeStyle = st.faint;
  ctx.beginPath(); ctx.moveTo(dx + 0.05, H - dh + 0.05); ctx.lineTo(dx + dw - 0.05, H - dh / 2); ctx.lineTo(dx + 0.05, H); ctx.stroke();
  ctx.setLineDash([]);
  // a skirting line
  ctx.strokeStyle = st.faint;
  ctx.beginPath(); ctx.moveTo(0, H - 0.08); ctx.lineTo(dx, H - 0.08); ctx.moveTo(dx + dw, H - 0.08); ctx.lineTo(W, H - 0.08); ctx.stroke();
}

// The Domtoren, Utrecht, in elevation. Units: k metres per drawing unit, base at (bx, by).
function drawDom(ctx, bx, by, k) {
  const L = (pts) => { ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(bx + x * k, by - y * k) : ctx.moveTo(bx + x * k, by - y * k))); ctx.stroke(); };
  // two square stages, then the octagonal lantern, then the crown
  L([[-21, 0], [-21, 60], [21, 60], [21, 0]]);
  L([[-19, 60], [-19, 98], [19, 98], [19, 60]]);
  for (const x of [-12, 0, 12]) { L([[x - 3, 66], [x - 3, 90], [x, 94], [x + 3, 90], [x + 3, 66]]); }
  L([[-21, 98], [21, 98]]);
  L([[-14, 98], [-14, 132], [14, 132], [14, 98]]);
  for (const x of [-8, 0, 8]) { L([[x - 2, 104], [x - 2, 126], [x, 129], [x + 2, 126], [x + 2, 104]]); }
  L([[-15, 132], [15, 132]]);
  L([[-9, 132], [-6, 146], [6, 146], [9, 132]]);
  L([[-2, 146], [0, 156], [2, 146]]);
  L([[0, 156], [0, 162]]);
  // pinnacles at the corners of each stage
  for (const [x, y, h] of [[-21, 60, 8], [21, 60, 8], [-19, 98, 7], [19, 98, 7], [-14, 132, 6], [14, 132, 6]])
    L([[x - 1.5, y], [x, y + h], [x + 1.5, y]]);
  // rooftops of the city
  L([[-130, 0], [-130, 22], [-112, 34], [-94, 22], [-94, 0]]);
  L([[-90, 0], [-90, 28], [-74, 40], [-58, 28], [-58, 0]]);
  L([[40, 0], [40, 26], [58, 38], [76, 26], [76, 0]]);
  L([[80, 0], [80, 18], [120, 18], [120, 0]]);
  L([[-140, 0], [140, 0]]);
}

function drawScreen(ctx, st) {
  // the laptop screen, seen from the sitter's side: a Teams chat, drawn as two bubbles
  const W = 0.36, H = 0.275;
  ctx.strokeStyle = st.ink; ctx.lineWidth = st.px(0.7);
  ctx.strokeRect(0.02, 0.02, W - 0.04, H - 0.04);
  ctx.strokeStyle = st.red;
  ctx.strokeRect(0.12, 0.06, 0.2, 0.05);
  if (st.answer > 0) { ctx.strokeStyle = st.ink; ctx.strokeRect(0.05, 0.14, 0.24 * st.answer, 0.07); }
}

function drawPlate(ctx, st, L, i) {
  // local origin: back-left corner of the plate top; u = +x, v = toward the viewer (+z)
  const W = PW * 2, D = PD * 2;
  const ink = st.ink, faint = st.faint;
  ctx.lineWidth = st.px(0.8);
  ctx.strokeStyle = faint;
  ctx.strokeRect(0.12, 0.12, W - 0.24, D - 0.24);
  // the hole the request passes through
  const sx = SHAFT.x + PW, sz = SHAFT.z + PD, rx = RETURN.x + PW;
  ctx.strokeStyle = ink;
  ctx.beginPath(); ctx.arc(sx, sz, 0.06, 0, TAU); ctx.stroke();
  if (i < 3) { ctx.beginPath(); ctx.arc(rx, sz, 0.06, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = ink;
  txt(ctx, `−${i + 1}`, 0.24, D - 0.3, 0.3, { weight: 700, mono: true });
  txt(ctx, L.name.toUpperCase(), 0.24, D - 0.66, 0.2, { weight: 650 });

  ctx.lineWidth = st.px(0.8);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  if (L.id === 'identity') {
    // a person's record, in four fields: identity, profile, history, memories
    L.items.forEach((s, j) => {
      const x = 0.3 + j * 0.86, y = 0.35;
      ctx.strokeRect(x, y, 0.74, 0.5);
      txt(ctx, s, x + 0.07, y + 0.32, 0.125, { mono: true, weight: 400 });
      for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(x + 0.07, y + 0.62 + r * 0.12); ctx.lineTo(x + 0.6, y + 0.62 + r * 0.12); ctx.strokeStyle = faint; ctx.stroke(); }
      ctx.strokeStyle = ink;
    });
    txt(ctx, 'everything is per user', 0.3, 1.55, 0.12, { mono: true, weight: 400 });
  } else if (L.id === 'claude') {
    L.items.forEach((s, j) => {
      const x = 0.3 + j * 1.75, y = 0.35;
      ctx.strokeRect(x, y, 1.55, 0.9);
      txt(ctx, s, x + 0.1, y + 0.25, 0.14, { mono: true, weight: 400 });
      // streaming output, drawn as short strokes of a text being written
      ctx.strokeStyle = faint;
      for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(x + 0.1, y + 0.45 + r * 0.11); ctx.lineTo(x + 0.1 + (1.1 - r * 0.2), y + 0.45 + r * 0.11); ctx.stroke(); }
      ctx.strokeStyle = ink;
    });
    txt(ctx, 'personas: default · developer · support', 0.3, 1.55, 0.11, { mono: true, weight: 400 });
  } else if (L.id === 'connectors') {
    // MCP servers as modules; Loket sits under the shaft
    const mods = [
      ['memory', 0.3, 0.3], ['reminders', 1.0, 0.3], ['documents', 1.7, 0.3], ['profiles', 2.4, 0.3],
      ['ClockWise', 3.1, 0.3], ['Loket', sx - 0.31, sz + 0.12],
    ];
    for (const [s, x, y] of mods) {
      const hot = s === 'Loket';
      ctx.strokeStyle = hot ? st.red : ink;
      ctx.lineWidth = st.px(hot ? 1.3 : 0.8);
      ctx.strokeRect(x, y, 0.62, 0.42);
      ctx.fillStyle = hot ? st.red : ink;
      txt(ctx, s, x + 0.06, y + 0.27, 0.115, { mono: true, weight: 400 });
    }
    ctx.fillStyle = ink;
    txt(ctx, 'one registry · secrets encrypted', 0.3, 1.65, 0.11, { mono: true, weight: 400 });
  } else if (L.id === 'ops') {
    L.items.forEach((s, j) => {
      const x = 0.3 + j * 0.86, y = 0.35;
      ctx.beginPath(); ctx.arc(x + 0.3, y + 0.3, 0.24, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 0.3, y + 0.3); ctx.lineTo(x + 0.3 + 0.17 * Math.cos(-1 + j), y + 0.3 + 0.17 * Math.sin(-1 + j)); ctx.stroke();
      txt(ctx, s, x, y + 0.75, 0.115, { mono: true, weight: 400 });
    });
  }
  if (st.cloud === L.id) drawCloud(ctx, 0.08, 0.08, W - 0.16, D - 0.16, 0.16, st, st.cloudP);
}

// A revision cloud: the scalloped red outline a reviewer draws around a change.
export function cloudPoints(x, y, w, h, r) {
  const segs = [];
  const side = (ax, ay, bx, by) => {
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / (r * 1.6)));
    for (let k = 0; k < n; k++) segs.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n, ax + (bx - ax) * (k + 1) / n, ay + (by - ay) * (k + 1) / n]);
  };
  side(x, y, x + w, y); side(x + w, y, x + w, y + h); side(x + w, y + h, x, y + h); side(x, y + h, x, y);
  return segs;
}
function drawCloud(ctx, x, y, w, h, r, st, p = 1) {
  const segs = cloudPoints(x, y, w, h, r);
  const n = Math.floor(segs.length * p);
  ctx.strokeStyle = st.red; ctx.lineWidth = st.px(1.4);
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const [ax, ay, bx, by] = segs[k];
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
    // bulge outward: perpendicular to the side, pointing away from the box centre
    const nx = dy * 0.9, ny = -dx * 0.9;
    const cx = x + w / 2, cy = y + h / 2;
    const s = ((mx - cx) * nx + (my - cy) * ny) > 0 ? 0.55 : -0.55;
    if (k === 0) ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx + nx * s, my + ny * s, bx, by);
  }
  ctx.stroke();
}

// ---------- renderer ----------

export function createScene(canvas, { reduced = false, onFrame } = {}) {
  const ctx = canvas.getContext('2d');
  const items = buildScene();
  const state = {
    q: 0,            // 0 = section A-A, 1 = exploded axonometric
    plotStart: null, // performance.now() when plotting began
    req: -1,         // request animation start, -1 = not yet
    answer: 0,
    cloud: null, cloudSince: 0,
    focus: null,     // the level being read: it slides out of the stack, the others step back
    pull: Object.fromEntries(LEVELS.map(L => [L.id, 0])), // how far each level is out, 0..1
    pullAt: 0,
    hover: null,
    w: 0, h: 0, dpr: 1, spin: 0,
    frame: { x: 0, y: 0, w: 1, h: 1 }, // where on the canvas the drawing must fit
  };
  let colors = {};
  let raf = 0, dirty = true;
  const anchors = {}; // projected points the HTML labels follow
  const plates = new Map(); // each level plate's top, in CSS pixels, as last drawn

  function readColors() {
    const cs = getComputedStyle(canvas);
    const g = n => cs.getPropertyValue(n).trim();
    colors = { ink: g('--ink'), faint: g('--faint'), red: g('--red'), sheet: g('--sheet') };
  }
  // read now as well: with reduced motion the drawing renders before start()
  readColors();

  // the layout size, not the box on screen: the homepage's arrival tilts the page, and a tilted
  // canvas measured in perspective reads larger than it is
  function resize() {
    const r = { width: canvas.offsetWidth, height: canvas.offsetHeight };
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    state.w = r.width; state.h = r.height;
    canvas.width = Math.round(r.width * state.dpr);
    canvas.height = Math.round(r.height * state.dpr);
    fits = null;
    dirty = true; kick();
  }

  // camera for a given q
  function camera(q) {
    const t = smooth(clamp(q));
    const spin = state.spin * smooth(clamp((q - 0.6) / 0.4));
    return {
      th: lerp(0, -0.72, t) + spin, // turn about the vertical axis
      ph: lerp(0, 0.56, t),         // tilt to look down
      e: smooth(clamp(q * 1.2 - 0.1)),
    };
  }

  function projector(cam) {
    const ct = Math.cos(cam.th), st_ = Math.sin(cam.th), cp = Math.cos(cam.ph), sp = Math.sin(cam.ph);
    return (p) => {
      const x1 = p.x * ct + p.z * st_;
      const z1 = -p.x * st_ + p.z * ct;
      const y2 = p.y * cp - z1 * sp;
      const z2 = p.y * sp + z1 * cp;
      return { x: x1, y: -y2, d: z2 };
    };
  }
  const rotN = (cam, n) => {
    const ct = Math.cos(cam.th), st_ = Math.sin(cam.th), cp = Math.cos(cam.ph), sp = Math.sin(cam.ph);
    const z1 = -n.x * st_ + n.z * ct;
    return n.y * sp + z1 * cp;
  };

  function offsetFor(group, e) {
    if (group === 'room') return lerp(0, 0.6, e);
    return levelY(group, e);
  }

  // pulled: the level being read slides out along +x, like a drawer (exploded view only;
  // left out of the fit, so the zoom holds still while it moves)
  const SLIDE = 0.6;
  const pullOf = (group, q) => (typeof group === 'number' ? state.pull[LEVELS[group].id] * smooth(clamp((q - 0.6) / 0.4)) : 0);
  function placed(it, e, q = null) {
    const dy = offsetFor(it.group, e), dx = q == null ? 0 : SLIDE * pullOf(it.group, q);
    const sh = p => v3(p.x + dx, p.y + dy, p.z);
    return sh;
  }

  // Fit: bounding boxes at the two ends, interpolated, so the zoom never jitters.
  let fits = null;
  function bboxAt(q) {
    const cam = camera(q), pr = projector(cam);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const it of items) {
      const sh = placed(it, cam.e);
      const pts = it.kind === 'face' ? it.pts : [it.o];
      for (const p of pts) { const s = pr(sh(p)); x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
    }
    return { x0, y0, x1, y1 };
  }
  function fitFor(q) {
    if (!fits) fits = [0, 0.5, 1].map(k => bboxAt(k));
    const f = state.frame;
    const lerpB = (a, b, t) => ({ x0: lerp(a.x0, b.x0, t), y0: lerp(a.y0, b.y0, t), x1: lerp(a.x1, b.x1, t), y1: lerp(a.y1, b.y1, t) });
    let b = q < 0.5 ? lerpB(fits[0], fits[1], q * 2) : lerpB(fits[1], fits[2], (q - 0.5) * 2);
    // while someone turns the model, fit what is actually there
    if (state.spin && q > 0.6) { const c = bboxAt(q); b = { x0: Math.min(b.x0, c.x0), y0: Math.min(b.y0, c.y0), x1: Math.max(b.x1, c.x1), y1: Math.max(b.y1, c.y1) }; }
    const s = Math.min(f.w / (b.x1 - b.x0), f.h / (b.y1 - b.y0));
    return { s, ox: f.x + f.w / 2 - s * (b.x0 + b.x1) / 2, oy: f.y + f.h / 2 - s * (b.y0 + b.y1) / 2 };
  }

  function lenOf(pts, closed) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (closed) L += Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y);
    return L;
  }
  function strokePartial(pts, closed, frac) {
    if (frac >= 1) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (closed) ctx.closePath(); ctx.stroke(); return; }
    const all = closed ? [...pts, pts[0]] : pts;
    let left = lenOf(pts, closed) * frac;
    ctx.beginPath(); ctx.moveTo(all[0].x, all[0].y);
    for (let i = 1; i < all.length && left > 0; i++) {
      const a = all[i - 1], b = all[i], d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= left) { ctx.lineTo(b.x, b.y); left -= d; } else { const t = left / d; ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); left = 0; }
    }
    ctx.stroke();
  }

  function render(now) {
    const dpr = state.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.w || (state.plotStart == null && !reduced)) return false; // nothing until start()
    const T = reduced ? 99 : state.plotStart == null ? 0 : (now - state.plotStart) / 1000;
    const cam = camera(state.q);
    const pr = projector(cam);
    const fit = fitFor(state.q);
    const S = (p) => { const s = pr(p); return { x: (s.x * fit.s + fit.ox) * dpr, y: (s.y * fit.s + fit.oy) * dpr, d: s.d }; };
    const px = n => n * dpr;
    const LW = { cut: 1.9, vis: 1.1, beyond: 0.75 };
    const ceilingA = 1 - smooth(clamp(state.q * 4));
    const axoA = 1 - smooth(clamp(state.q * 4.5));
    let animating = false;

    // request timeline (seconds since it began)
    const RT = state.req < 0 ? -1 : (now - state.req) / 1000;
    state.answer = RT < 0 ? (reduced ? 1 : 0) : clamp((RT - 3.1) / 0.6);
    if (reduced && state.req >= 0) state.answer = 1;
    const cloudP = clamp((now - state.cloudSince) / 700);
    if (cloudP < 1) animating = true;
    // ease each level toward in or out, about a third of a second
    const dt = Math.min(0.1, (now - (state.pullAt || now)) / 1000);
    state.pullAt = now;
    let anyPull = 0;
    for (const L of LEVELS) {
      const want = state.focus === L.id ? 1 : 0, f = state.pull[L.id];
      state.pull[L.id] = reduced ? want : Math.abs(want - f) < 0.002 ? want : f + (want - f) * (1 - Math.exp(-dt / 0.12));
      if (state.pull[L.id] !== want) animating = true;
      anyPull = Math.max(anyPull, state.pull[L.id]);
    }
    const back = anyPull * smooth(clamp((state.q - 0.6) / 0.4)); // how far the other levels step back
    const st = { ink: colors.ink, faint: colors.faint, red: colors.red, px: n => n * dpr / Math.max(0.0001, fit.s * dpr) * 1, answer: state.answer, cloud: state.cloud, cloudP: reduced ? 1 : cloudP };
    // px() inside plane drawings: convert screen pixels to metres at the current scale
    st.px = n => (n * dpr) / (fit.s * dpr);

    // collect visible faces and cut-outs, by the solid they belong to
    const solids = new Map();
    const into = (it, sh, entry, pts) => {
      let g = solids.get(it.solid);
      if (!g) {
        const lo = sh(it.solid.min), hi = sh(it.solid.max);
        g = { min: lo, max: hi, rect: { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, d: 0, n: 0, parts: [] };
        solids.set(it.solid, g);
      }
      for (const q of pts) { g.rect.x0 = Math.min(g.rect.x0, q.x); g.rect.y0 = Math.min(g.rect.y0, q.y); g.rect.x1 = Math.max(g.rect.x1, q.x); g.rect.y1 = Math.max(g.rect.y1, q.y); }
      g.d += entry.d; g.n++;
      g.parts.push(entry);
    };
    plates.clear();
    for (const it of items) {
      const sh = placed(it, cam.e, state.q);
      let a = 1;
      if (it.fade === 'ceiling') a = ceilingA;
      if (it.fade === 'axo') a = axoA;
      if (typeof it.group === 'number') a *= 1 - 0.6 * back * (1 - state.pull[LEVELS[it.group].id]);
      if (a <= 0.01) continue;
      const p = reduced ? 1 : clamp((T - it.t0) / it.dur);
      if (p <= 0) { animating = true; continue; }
      if (p < 1) animating = true;
      if (it.kind === 'face') {
        if (rotN(cam, it.n) <= 1e-4) continue;
        const pts = it.pts.map(q => S(sh(q)));
        const d = pts.reduce((s, q) => s + q.d, 0) / pts.length;
        into(it, sh, { it, pts, d, a, p, sh }, pts);
        // a plate's top, in CSS pixels, for pointing at it
        if (it.k === 'top' && typeof it.group === 'number') plates.set(LEVELS[it.group].id, pts.map(q => ({ x: q.x / dpr, y: q.y / dpr })));
      } else {
        const o = S(sh(it.o));
        const { min, max } = it.solid;
        const corners = [min, max, v3(min.x, max.y, min.z), v3(max.x, min.y, max.z)].map(q => S(sh(q)));
        into(it, sh, { it, o, d: o.d + 0.6, a, p, sh }, corners);
      }
    }
    // whole solids, far side first (depth.js); a solid's own visible faces never overlap
    const groups = [...solids.values()];
    for (const g of groups) g.d /= g.n;
    const toward = { x: rotN(cam, v3(1, 0, 0)), y: rotN(cam, v3(0, 1, 0)), z: rotN(cam, v3(0, 0, 1)) };
    const list = paintOrder(groups, toward).flatMap(i => groups[i].parts);

    for (const L of list) {
      const { it, a, p } = L;
      ctx.globalAlpha = a;
      if (it.kind === 'face') {
        const fillA = smooth(clamp((p - 0.75) / 0.25));
        if (it.fill && fillA > 0) {
          ctx.globalAlpha = a * fillA;
          ctx.fillStyle = it.fill === 'poche' ? colors.ink : colors.sheet;
          ctx.beginPath(); L.pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = a;
        }
        if (it.draw && fillA > 0) {
          const O = S(L.sh(it.o)), U = S(L.sh(add(it.o, it.u))), V = S(L.sh(add(it.o, it.v)));
          const det = (U.x - O.x) * (V.y - O.y) - (U.y - O.y) * (V.x - O.x);
          if (Math.abs(det) > 2) {
            ctx.save();
            ctx.globalAlpha = a * fillA;
            ctx.setTransform(U.x - O.x, U.y - O.y, V.x - O.x, V.y - O.y, O.x, O.y);
            it.draw(ctx, st);
            ctx.restore();
          }
        }
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = px(LW[it.lw] || 1);
        ctx.lineJoin = 'round';
        strokePartial(L.pts, true, ease(p));
      } else {
        // cut-out figure: fill with the sheet colour, outline in ink
        const O = L.o, U = S(L.sh(add(it.o, it.u))), V = S(L.sh(add(it.o, it.v)));
        const det = (U.x - O.x) * (V.y - O.y) - (U.y - O.y) * (V.x - O.x);
        if (Math.abs(det) < 1e-6) continue;
        ctx.save();
        ctx.setTransform(U.x - O.x, U.y - O.y, V.x - O.x, V.y - O.y, O.x, O.y);
        const k = Math.sqrt(Math.abs(det));
        ctx.lineWidth = px(LW.vis) / k;
        ctx.globalAlpha = a * smooth(p);
        ctx.fillStyle = colors.sheet;
        ctx.strokeStyle = state.hover === it.id ? colors.red : colors.ink;
        for (const path of it.path) { ctx.fill(path); ctx.stroke(path); }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // ---- marks drawn over the drawing: dimensions and the redline ----
    const roomDy = offsetFor('room', cam.e);
    const fade = smooth(clamp((T - 2.0) / 0.6));
    if (fade < 1) animating = true;

    // Ezra's height: a dimension line, 2,00 (the one dimension in the room)
    ctx.globalAlpha = fade;
    dimension(S(v3(-1.88, roomDy, 0.55)), S(v3(-1.88, 2.0 + roomDy, 0.55)), '2,00', px, -1);
    anchors.ezra = S(v3(-1.45, -0.24 + roomDy, 0.55));

    // the stack: 37 000 lines of Python, as one dimension along the levels (exploded only)
    const stackA = smooth(clamp((state.q - 0.55) / 0.3));
    if (stackA > 0) {
      ctx.globalAlpha = stackA;
      const xS = -PW - 0.35, zS = PD + 0.35;
      dimension(S(v3(xS, levelY(3, cam.e) - 0.07, zS)), S(v3(xS, levelY(0, cam.e), zS)), 'about 37 000 lines of Python', px, 1);
    }
    // where the section was cut: the A-A line along the front of the room, once it has turned
    const secA = smooth(clamp((state.q - 0.35) / 0.3));
    if (secA > 0) {
      ctx.globalAlpha = secA;
      const zc = 1.9 + 0.35, y = roomDy;
      const a = S(v3(-2.42 - 0.5, y, zc)), b = S(v3(2.42 + 0.5, y, zc));
      ctx.strokeStyle = colors.ink; ctx.lineWidth = px(0.9);
      ctx.setLineDash([px(16), px(4), px(3), px(4)]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
      for (const P of [a, b]) {
        ctx.beginPath(); ctx.arc(P.x, P.y, px(9), 0, TAU); ctx.fillStyle = colors.sheet; ctx.fill(); ctx.stroke();
        ctx.fillStyle = colors.ink; ctx.font = `700 ${px(10)}px "Archivo"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('A', P.x, P.y + px(0.5));
      }
    }
    ctx.globalAlpha = 1;

    // anchors for HTML labels: the front-right corner of each plate and the laptop
    LEVELS.forEach((L, i) => { anchors[L.id] = S(v3(PW + SLIDE * pullOf(i, state.q), levelY(i, cam.e) - 0.035, -PD)); });
    anchors.laptop = S(v3(0.34, 0.95 + roomDy, -0.3));
    anchors.room = S(v3(2.42, 3.02 + roomDy, 1.9));
    anchors.fit = fit;

    // the redline: the request goes down, the answer comes back up
    if (RT >= 0 || reduced) {
      const rt = reduced ? 99 : RT;
      const yTop = 0.78 + roomDy;
      const yLoket = levelY(2, cam.e) + 0.02;
      const down = [v3(SHAFT.x, yTop, SHAFT.z), v3(SHAFT.x, yLoket, SHAFT.z)].map(S);
      const up = [v3(RETURN.x, yLoket, RETURN.z), v3(RETURN.x, yTop, RETURN.z)].map(S);
      const pd = ease(clamp(rt / 2.0)), pu = ease(clamp((rt - 2.2) / 0.9));
      if (pd < 1 || pu < 1 || state.answer < 1) animating = true;
      ctx.strokeStyle = colors.red;
      ctx.lineWidth = px(1.6);
      ctx.lineCap = 'round';
      strokePartial(down, false, pd);
      // nodes at each level the request passes
      [0, 1, 2].forEach(i => {
        const yy = levelY(i, cam.e) + 0.01;
        const reach = (yTop - yy) / (yTop - yLoket);
        if (pd >= reach - 0.001) {
          const c = S(v3(SHAFT.x, yy, SHAFT.z));
          const since = clamp((pd - reach) * 6);
          ctx.beginPath(); ctx.arc(c.x, c.y, px(3 + 6 * (1 - since)), 0, TAU); ctx.stroke();
        }
      });
      if (pu > 0) {
        ctx.setLineDash([px(5), px(4)]);
        strokePartial(up, false, pu);
        ctx.setLineDash([]);
        if (pu > 0.98) arrowHead(up[0], up[1], px);
      }
      if (pd > 0.98) arrowHead(down[0], down[1], px);
      // which levels the request is passing through right now
      state.lit = [0, 1, 2].filter(i => pd >= (yTop - levelY(i, cam.e)) / (yTop - yLoket) - 0.01 && pu < 1).map(i => LEVELS[i].id);
    } else state.lit = [];
    ctx.globalAlpha = 1;
    onFrame && onFrame(anchors, state, cam);
    return animating;
  }

  function arrowHead(a, b, px) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), L = px(9);
    ctx.beginPath();
    ctx.moveTo(b.x - L * Math.cos(ang - 0.35), b.y - L * Math.sin(ang - 0.35));
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x - L * Math.cos(ang + 0.35), b.y - L * Math.sin(ang + 0.35));
    ctx.stroke();
  }

  // A dimension line between two screen points, with ticks and a centred label.
  function dimension(a, b, label, px, side) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (L < 4) return;
    const ux = dx / L, uy = dy / L, nx = -uy * side, ny = ux * side;
    const off = px(14);
    const A = { x: a.x + nx * off, y: a.y + ny * off }, B = { x: b.x + nx * off, y: b.y + ny * off };
    ctx.strokeStyle = colors.ink; ctx.lineWidth = px(0.8);
    ctx.beginPath();
    ctx.moveTo(a.x + nx * px(3), a.y + ny * px(3)); ctx.lineTo(a.x + nx * (off + px(5)), a.y + ny * (off + px(5)));
    ctx.moveTo(b.x + nx * px(3), b.y + ny * px(3)); ctx.lineTo(b.x + nx * (off + px(5)), b.y + ny * (off + px(5)));
    ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
    // architectural ticks: short 45° strokes
    for (const P of [A, B]) { ctx.moveTo(P.x - (ux + nx) * px(4), P.y - (uy + ny) * px(4)); ctx.lineTo(P.x + (ux + nx) * px(4), P.y + (uy + ny) * px(4)); }
    ctx.stroke();
    ctx.font = `400 ${px(11.5)}px "B612 Mono"`;
    // a label longer than its dimension would run into the drawing (a small phone stage): leave it off
    if (ctx.measureText(label).width > L - px(8)) return;
    ctx.save();
    ctx.translate((A.x + B.x) / 2 + nx * px(4), (A.y + B.y) / 2 + ny * px(4));
    let ang = Math.atan2(uy, ux);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.rotate(ang);
    ctx.fillStyle = colors.ink;
    ctx.textAlign = 'center'; ctx.textBaseline = side > 0 ? 'top' : 'bottom';
    // keep the label off the line, on the outer side
    ctx.fillText(label, 0, side > 0 ? px(3) : -px(3));
    ctx.restore();
  }

  function loop(now) {
    raf = 0;
    const more = render(now);
    if (more || dirty) { dirty = false; if (more) kick(); }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  const api = {
    start() { if (state.plotStart != null) return; readColors(); resize(); state.plotStart = performance.now(); kick(); },
    started() { return state.plotStart != null; },
    setQ(q) { if (q !== state.q) { state.q = q; kick(); } },
    setFrame(f) { state.frame = f; fits = null; kick(); },
    request() { state.req = performance.now(); state.answer = 0; kick(); },
    requestAge() { return state.req < 0 ? Infinity : (performance.now() - state.req) / 1000; },
    setCloud(id) { if (state.cloud !== id) { state.cloud = id; state.cloudSince = performance.now(); kick(); } },
    setHover(id) { if (state.hover !== id) { state.hover = id; kick(); } },
    setFocus(id) { if (state.focus !== id) { state.focus = id; kick(); } },
    // which level's plate is under a point (CSS pixels on the canvas), the top one first
    levelAt(x, y) {
      for (const L of LEVELS) {
        const poly = plates.get(L.id);
        if (!poly) continue;
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const a = poly[i], b = poly[j];
          if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        if (inside) return L.id;
      }
      return null;
    },
    plateCenter(id) {
      const poly = plates.get(id);
      return poly && { x: poly.reduce((s, q) => s + q.x, 0) / poly.length, y: poly.reduce((s, q) => s + q.y, 0) / poly.length };
    },
    setSpin(v) { state.spin = Math.max(-0.7, Math.min(0.6, v)); kick(); },
    theme() { readColors(); kick(); },
    resize,
    anchors,
    state,
  };
  return api;
}
