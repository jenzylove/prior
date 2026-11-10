// Month level date helpers. Visa history is usually known to the month, not the day.

/** Parse YYYY, YYYY-MM or YYYY-MM-DD into a month index (year*12 + month0). Returns null if unparseable. */
export function monthIndex(d?: string): number | null {
  if (!d) return null;
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(d.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) - 1 : 0;
  if (mo < 0 || mo > 11) return null;
  return y * 12 + mo;
}

export function dayValue(d?: string): number | null {
  if (!d) return null;
  const t = Date.parse(d.length === 7 ? `${d}-01` : d.length === 4 ? `${d}-01-01` : d);
  return Number.isNaN(t) ? null : t;
}

export function formatMonth(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Inclusive month ranges overlap. Open ended ranges run to `now`. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function nowMonth(now: Date = new Date()): number {
  return now.getUTCFullYear() * 12 + now.getUTCMonth();
}
