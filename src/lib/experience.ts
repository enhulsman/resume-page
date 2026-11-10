// The homepage's Experience rows, newest first (Ezra, 2026-11-10): the jobs that run to now lead,
// then the rest by end year, then by start year, each descending; a full tie keeps the résumé's
// order. /resume keeps the résumé's own order, because it groups the consulting jobs under Anamata.

import type { Experience } from '../config/resume.ts';

/** A copy of `entries`, newest first; the input is left as it is. */
export function byRecency<T extends Pick<Experience, 'startDate' | 'endDate'>>(entries: readonly T[]): T[] {
  const end = (e: T) => (e.endDate == null ? Infinity : Number(e.endDate));
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => end(b.e) - end(a.e) || Number(b.e.startDate) - Number(a.e.startDate) || a.i - b.i)
    .map(({ e }) => e);
}
