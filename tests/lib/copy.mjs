// The copy check (stone-homepage, "Copy comes only from config"): a covering check. Every corpus
// value of three letters or more that a text holds as whole words is removed, longest first; a text
// is written in config only when no letters remain. A substring test would fail correct markup,
// because the browser merges neighbouring values into one text node (the footer line, the lead and
// its full stop, the sources joined with " · ").

const LETTER = /\p{L}/u;
const WORDISH = /[\p{L}\p{N}]/u;
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every string value in `values` (objects and arrays walked), whitespace normalised. */
export function strings(...values) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(norm(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  values.forEach(walk);
  return out;
}

/**
 * A checker for one corpus: `check(text)` returns what is left of `text` once every corpus value it
 * holds as whole words is removed (longest first), or null when no letters remain.
 * A value's edge that is a letter or digit must meet a non-letter, non-digit (or the text's end),
 * so "Blog" never removes the start of "Blogs".
 */
export function coverer(corpus) {
  const values = [...new Set(corpus.map(norm))]
    // a number with its unit ("14 ms") counts as well, short as it is
    .filter((v) => (v.match(/\p{L}/gu) || []).length >= 3 || /^\p{N}[\p{N}.,]* \p{L}{1,2}$/u.test(v))
    .sort((a, b) => b.length - a.length)
    .map((v) => new RegExp(
      `${WORDISH.test(v[0]) ? '(?<![\\p{L}\\p{N}])' : ''}${escape(v)}${WORDISH.test(v.at(-1)) ? '(?![\\p{L}\\p{N}])' : ''}`,
      'gu',
    ));
  return (text) => {
    let rest = norm(text);
    for (const re of values) rest = rest.replace(re, ' ');
    rest = norm(rest);
    return LETTER.test(rest) ? rest : null;
  };
}

/** Run in the page: every text node and every alt, title and aria-label under `root`, outside `skip`. */
export function textsUnder(root, skip = null) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (skip && n.parentElement?.closest(skip)) continue;
    if (n.parentElement?.closest('script, style')) continue;
    if (n.textContent.trim()) out.push(n.textContent);
  }
  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (skip && el.closest(skip)) continue;
    for (const a of ['alt', 'title', 'aria-label']) if (el.getAttribute(a)) out.push(el.getAttribute(a));
  }
  return out;
}
