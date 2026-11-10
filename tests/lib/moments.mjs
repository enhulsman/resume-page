// One glass moment per screen (glass-material): a moment's glass box is [top, bottom] in page
// coordinates, the union of its [data-glass] elements. A moment is on screen when at least a third
// of its box's height is inside the viewport.

/**
 * Can two glass boxes ever both be on screen at once? The visible share is piecewise linear in the
 * scroll position, so for A above B this is closed form: exactly when
 * (b0 + hB/3) - (a1 - hA/3) <= the viewport height.
 */
export function momentsOverlap(a, b, vh) {
  const [A, B] = a[0] <= b[0] ? [a, b] : [b, a];
  const hA = A[1] - A[0], hB = B[1] - B[0];
  return (B[0] + hB / 3) - (A[1] - hA / 3) <= vh;
}

/** The share of a box's height inside the viewport when the page is scrolled to `scrollTop`. */
export function visibleShare([top, bottom], scrollTop, vh) {
  const h = bottom - top;
  if (h <= 0) return 0;
  const seen = Math.min(bottom, scrollTop + vh) - Math.max(top, scrollTop);
  return Math.max(0, seen) / h;
}
