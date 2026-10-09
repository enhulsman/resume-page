// Painting order for the ANNA drawing's solids. Sorting faces by their mean depth lets them
// pass through each other as the model turns: a wall's foot and the floor it stands on, two
// walls where they meet. So whole solids are ordered instead. When two solids touch or stand
// apart along an axis, that plane separates them, and the one on its far side from the camera
// is painted first; for disjoint convex solids any separating plane gives the right answer.
// Only solids whose screen boxes overlap are ordered; the rest, solids that interpenetrate
// (the sitter in the chair) and any cycle fall back to mean depth, farthest first.

const AXES = ['x', 'y', 'z'];
const EPS = 1e-6;

/**
 * @param {{min: {x,y,z}, max: {x,y,z}, rect: {x0,y0,x1,y1}, d: number}[]} solids world bounds,
 *   screen box and mean depth (larger is nearer the camera)
 * @param {{x: number, y: number, z: number}} toward how far each world axis points at the camera
 * @returns {number[]} indices into solids, back to front
 */
export function paintOrder(solids, toward) {
  const n = solids.length;
  const next = solids.map(() => []), waits = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = solids[i], b = solids[j], ra = a.rect, rb = b.rect;
    if (ra.x1 <= rb.x0 || rb.x1 <= ra.x0 || ra.y1 <= rb.y0 || rb.y1 <= ra.y0) continue;
    // of the separating axes, use the one most nearly facing the camera
    let best = 0, first = -1;
    for (const k of AXES) {
      const t = toward[k];
      if (Math.abs(t) <= best) continue;
      if (a.max[k] <= b.min[k] + EPS) { best = Math.abs(t); first = t > 0 ? i : j; }
      else if (b.max[k] <= a.min[k] + EPS) { best = Math.abs(t); first = t > 0 ? j : i; }
    }
    if (first < 0) continue;
    next[first].push(first === i ? j : i);
    waits[first === i ? j : i]++;
  }
  const out = [], done = new Array(n).fill(false);
  const farthest = free => {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (!free || waits[i] === 0) && (pick < 0 || solids[i].d < solids[pick].d)) pick = i;
    return pick;
  };
  while (out.length < n) {
    let pick = farthest(true);
    if (pick < 0) pick = farthest(false); // a cycle: break it at the farthest solid
    done[pick] = true;
    out.push(pick);
    for (const m of next[pick]) waits[m]--;
  }
  return out;
}
