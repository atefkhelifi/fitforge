export type WeightEntry = { date: string; weightKg: number };

const DAY = 24 * 60 * 60 * 1000;

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(t: number): string {
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY);

export function sortedEntries(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

/** Average of the entries logged in the 7 days up to and including the latest one. */
export function recentAverage(entries: WeightEntry[]): number | null {
  const sorted = sortedEntries(entries);
  const last = sorted[sorted.length - 1];
  if (!last) return null;
  const recent = sorted.filter((e) => dayNumber(last.date) - dayNumber(e.date) < 7);
  return recent.reduce((s, e) => s + e.weightKg, 0) / recent.length;
}

/** Change since the entry closest to 7 days before the latest one (needs at least 4 days of history). */
export function weeklyChange(entries: WeightEntry[]): number | null {
  const sorted = sortedEntries(entries);
  const last = sorted[sorted.length - 1];
  if (!last || sorted.length < 2) return null;
  const target = dayNumber(last.date) - 7;
  let best: WeightEntry | null = null;
  for (const e of sorted.slice(0, -1)) {
    const gap = Math.abs(dayNumber(e.date) - target);
    if (!best || gap < Math.abs(dayNumber(best.date) - target)) best = e;
  }
  if (!best || dayNumber(last.date) - dayNumber(best.date) < 4) return null;
  return last.weightKg - best.weightKg;
}
