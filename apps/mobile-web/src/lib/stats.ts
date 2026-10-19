import { estimate1RM } from './formulas';

export type LoggedSet = { exerciseId: string; setNo: number; weightKg: number; reps: number };
export type FinishedWorkout = {
  id: string;
  dayId: string;
  dayName: string;
  startedAt: number;
  endedAt: number;
  sets: LoggedSet[];
};

const DAY = 24 * 60 * 60 * 1000;

const byNewest = (a: FinishedWorkout, b: FinishedWorkout) => b.startedAt - a.startedAt;

/** Sets from the most recent workout that included this exercise. */
export function lastSetsFor(exerciseId: string, workouts: FinishedWorkout[]): LoggedSet[] {
  for (const w of [...workouts].sort(byNewest)) {
    const sets = w.sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.setNo - b.setNo);
    if (sets.length > 0) return sets;
  }
  return [];
}

/** Highest estimated 1RM ever logged for the exercise (0 when there is no history). */
export function best1RM(exerciseId: string, workouts: FinishedWorkout[]): number {
  let best = 0;
  for (const w of workouts) {
    for (const s of w.sets) {
      if (s.exerciseId === exerciseId) best = Math.max(best, estimate1RM(s.weightKg, s.reps));
    }
  }
  return best;
}

/** One point per workout: the best estimated 1RM for the exercise, oldest first. */
export function strengthSeries(exerciseId: string, workouts: FinishedWorkout[]): { t: number; value: number }[] {
  return [...workouts]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((w) => ({
      t: w.startedAt,
      value: Math.max(0, ...w.sets.filter((s) => s.exerciseId === exerciseId).map((s) => estimate1RM(s.weightKg, s.reps))),
    }))
    .filter((p) => p.value > 0);
}

export function exercisesWithHistory(workouts: FinishedWorkout[]): string[] {
  const seen = new Set<string>();
  for (const w of [...workouts].sort(byNewest)) for (const s of w.sets) seen.add(s.exerciseId);
  return [...seen];
}

/** Number of workouts since `since` in which an exercise beat its earlier best estimated 1RM. */
export function countPRs(workouts: FinishedWorkout[], since: number): number {
  const best = new Map<string, number>();
  let prs = 0;
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const perExercise = new Map<string, number>();
    for (const s of w.sets) {
      perExercise.set(s.exerciseId, Math.max(perExercise.get(s.exerciseId) ?? 0, estimate1RM(s.weightKg, s.reps)));
    }
    for (const [id, value] of perExercise) {
      const previous = best.get(id);
      if (previous !== undefined && value > previous && w.startedAt >= since) prs += 1;
      best.set(id, Math.max(previous ?? 0, value));
    }
  }
  return prs;
}

export function startOfWeek(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

/** Total kg lifted per week for the last `weeks` weeks, oldest first. */
export function weeklyVolume(workouts: FinishedWorkout[], now: number, weeks = 7): number[] {
  const thisWeek = startOfWeek(now);
  const totals = Array.from({ length: weeks }, () => 0);
  for (const w of workouts) {
    const ago = Math.round((thisWeek - startOfWeek(w.startedAt)) / (7 * DAY));
    if (ago < 0 || ago >= weeks) continue;
    totals[weeks - 1 - ago] += w.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  }
  return totals;
}
