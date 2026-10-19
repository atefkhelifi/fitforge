import { describe, expect, it } from 'vitest';

import { buildExport, exportFilename } from '../export';
import type { LoggedMeal } from '../meal';
import type { FinishedWorkout } from '../stats';
import type { Profile } from '../targets';

const profile: Profile = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'muscle' };
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

const workout = (id: string, startedAt: number): FinishedWorkout => ({
  id,
  dayId: 'd',
  dayName: 'Push',
  startedAt,
  endedAt: startedAt + 3_600_000,
  sets: [{ exerciseId: 'bench', setNo: 1, weightKg: 60, reps: 8 }],
});
const meal = (id: string, eatenAt: number): LoggedMeal => ({
  id,
  eatenAt,
  mealType: 'lunch',
  dishName: 'Rice',
  source: 'text',
  items: [{ name: 'Rice', grams: 200, kcal: 260, protein_g: 5, carbs_g: 56, fat_g: 0.5, fiber_g: 1, confidence: 0.7 }],
});

describe('buildExport', () => {
  it('includes everything, with readable ISO dates, oldest first', () => {
    const out = buildExport({
      profile,
      workouts: [workout('b', 2_000_000_000_000), workout('a', 1_000_000_000_000)],
      meals: [meal('2', 2_000_000_000_000), meal('1', 1_000_000_000_000)],
      weights: [
        { date: '2026-10-08', weightKg: 81 },
        { date: '2026-10-01', weightKg: 82 },
      ],
      now: NOW,
    });
    expect(out.app).toBe('FitForge');
    expect(out.exportedAt).toBe('2026-10-19T12:00:00.000Z');
    expect(out.workouts.map((w) => w.id)).toEqual(['a', 'b']);
    expect(out.workouts[0].startedAt).toBe(new Date(1_000_000_000_000).toISOString());
    expect(out.meals.map((m) => m.id)).toEqual(['1', '2']);
    expect(out.weights.map((w) => w.date)).toEqual(['2026-10-01', '2026-10-08']);
    expect(out.dailyTargets?.kcal).toBe(3030);
    expect(out.notes[0]).toContain('photos');
    expect(out.notes[1]).toContain('kilograms');
  });

  it('is valid JSON that round-trips', () => {
    const out = buildExport({ profile: null, workouts: [], meals: [], weights: [], now: NOW });
    expect(out.profile).toBeNull();
    expect(out.dailyTargets).toBeNull();
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it('does not change the data it is given', () => {
    const workouts = [workout('b', 2), workout('a', 1)];
    buildExport({ profile, workouts, meals: [], weights: [], now: NOW });
    expect(workouts.map((w) => w.id)).toEqual(['b', 'a']);
  });
});

describe('exportFilename', () => {
  it('uses the local date', () => {
    expect(exportFilename(new Date(2026, 0, 5, 23, 59).getTime())).toBe('fitforge-export-2026-01-05.json');
  });
});
