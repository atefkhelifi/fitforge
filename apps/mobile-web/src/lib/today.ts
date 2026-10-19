import { ProgramDay, Program } from '@/data/programs';

import { localDateKey } from './body';
import { FinishedWorkout, startOfWeek } from './stats';

export type WeekDay = { label: string; done: boolean; isToday: boolean };

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Monday to Sunday of the current week, marking days with a finished workout and today. */
export function weekDays(workouts: FinishedWorkout[], now: number): WeekDay[] {
  const doneDays = new Set(workouts.map((w) => localDateKey(w.startedAt)));
  const todayKey = localDateKey(now);
  const monday = new Date(startOfWeek(now));
  return LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d.getTime());
    return { label, done: doneDays.has(key), isToday: key === todayKey };
  });
}

/** Number of finished workouts since Monday. */
export function workoutsThisWeek(workouts: FinishedWorkout[], now: number): number {
  const monday = startOfWeek(now);
  return workouts.filter((w) => w.startedAt >= monday && w.startedAt <= now).length;
}

/**
 * The next day to train: the day after the most recent workout within the same program (wrapping around),
 * or the first day of the first program when there is no history yet.
 */
export function nextWorkoutDay(workouts: FinishedWorkout[], programs: Program[]): ProgramDay {
  const last = [...workouts].sort((a, b) => b.startedAt - a.startedAt)[0];
  if (last) {
    for (const p of programs) {
      const i = p.days.findIndex((d) => d.id === last.dayId);
      if (i >= 0) return p.days[(i + 1) % p.days.length];
    }
  }
  return programs[0].days[0];
}

/** A rough session length: about 3 minutes per set including rest, rounded to 5. */
export function estimateMinutes(day: ProgramDay): number {
  const sets = day.slots.reduce((sum, s) => sum + s.sets, 0);
  return Math.max(5, Math.round((sets * 3) / 5) * 5);
}
