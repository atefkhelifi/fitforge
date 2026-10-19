import { localDateKey, WeightEntry } from './body';
import type { LoggedMeal } from './meal';
import type { FinishedWorkout } from './stats';
import { computeTargets, Profile } from './targets';

export type DataExport = {
  app: 'FitForge';
  formatVersion: 1;
  exportedAt: string;
  profile: Profile | null;
  dailyTargets: ReturnType<typeof computeTargets> | null;
  workouts: (Omit<FinishedWorkout, 'startedAt' | 'endedAt'> & { startedAt: string; endedAt: string })[];
  meals: (Omit<LoggedMeal, 'eatenAt'> & { eatenAt: string })[];
  weights: WeightEntry[];
  notes: string[];
};

/** Everything the app holds about the user, in a plain, readable structure (dates as ISO strings, oldest first). */
export function buildExport(data: {
  profile: Profile | null;
  workouts: FinishedWorkout[];
  meals: LoggedMeal[];
  weights: WeightEntry[];
  now: number;
}): DataExport {
  const iso = (t: number) => new Date(t).toISOString();
  return {
    app: 'FitForge',
    formatVersion: 1,
    exportedAt: iso(data.now),
    profile: data.profile,
    dailyTargets: data.profile ? computeTargets(data.profile) : null,
    workouts: [...data.workouts]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((w) => ({ ...w, startedAt: iso(w.startedAt), endedAt: iso(w.endedAt) })),
    meals: [...data.meals].sort((a, b) => a.eatenAt - b.eatenAt).map((m) => ({ ...m, eatenAt: iso(m.eatenAt) })),
    weights: [...data.weights].sort((a, b) => a.date.localeCompare(b.date)),
    notes: [
      'Progress photos are stored in your account, not on this device, and are not part of this file.',
      'All weights are in kilograms and heights in centimetres, whichever units the app displays.',
    ],
  };
}

export function exportFilename(now: number): string {
  return `fitforge-export-${localDateKey(now)}.json`;
}
