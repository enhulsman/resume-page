// WCAG contrast and CSS colour parsing, shared by the glass tests (unit and e2e).

/** A CSS colour as [r, g, b, a] (0..255, alpha 0..1), or null when it is not a plain colour. */
export function parseColor(s) {
  const v = String(s).trim().toLowerCase();
  if (v === 'transparent') return [0, 0, 0, 0];
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const num = (p, max) => (p.endsWith('%') ? (parseFloat(p) / 100) * max : parseFloat(p));
    const [r, g, b] = parts.slice(0, 3).map((p) => num(p, 255));
    const a = parts[3] == null ? 1 : num(parts[3], 1);
    return [r, g, b, a];
  }
  return null;
}

const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** WCAG contrast ratio of two opaque colours ([r, g, b] or CSS strings). */
export function contrast(a, b) {
  const A = typeof a === 'string' ? parseColor(a) : a, B = typeof b === 'string' ? parseColor(b) : b;
  const la = luminance(A), lb = luminance(B);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
