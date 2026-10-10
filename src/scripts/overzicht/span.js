// The experience table's programme chart (RevisionsSheet.astro): each role's span on one axis
// of years, from the first role's year to the current one. The dates are years only, so a bar
// runs from the middle of its first year to the middle of its last, and an open role to now.
// Laid out once when the site is built (the fallback without JS) and again in the browser, so
// an open role always runs to today.

// a date as a year with its fraction: 1 July 2026 is about 2026.5
export const yearOf = d => d.getFullYear() + (d.getMonth() + (d.getDate() - 1) / 31) / 12;

// spans: [{ start, end }] in years, end null while the role is open
export function chart(spans, now) {
  const from = Math.min(...spans.map(s => s.start));
  const n = Math.max(1, Math.ceil(now) - from);
  const pct = y => `${(((y - from) / n) * 100).toFixed(2)}%`;
  return {
    n,
    now: pct(now),
    years: Array.from({ length: n }, (_, i) => ({ year: from + i, x: pct(from + i) })),
    bars: spans.map(s => {
      const a = s.start + 0.5, b = s.end == null ? now : s.end + 0.5;
      return { l: pct(a), w: `${(((b - a) / n) * 100).toFixed(2)}%` };
    }),
  };
}
