import { describe, expect, it } from 'vitest';

import { estimate1RM, formatClock } from '../formulas';
import { best1RM, countPRs, exercisesWithHistory, FinishedWorkout, lastSetsFor, strengthSeries, weeklyVolume } from '../stats';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function workout(id: string, startedAt: number, sets: [string, number, number][]): FinishedWorkout {
  return {
    id,
    dayId: 'd',
    dayName: 'Day',
    startedAt,
    endedAt: startedAt + HOUR,
    sets: sets.map(([exerciseId, weightKg, reps], i) => ({ exerciseId, setNo: i + 1, weightKg, reps })),
  };
}

describe('formulas', () => {
  it('estimates 1RM with the Epley formula', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(60, 0)).toBe(0);
  });

  it('formats a clock', () => {
    expect(formatClock(75)).toBe('01:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('history helpers', () => {
  const w1 = workout('1', 1_000_000, [['bench', 60, 8], ['squat', 80, 5]]);
  const w2 = workout('2', 2_000_000, [['bench', 65, 8], ['bench', 65, 7]]);
  const w3 = workout('3', 3_000_000, [['bench', 60, 5]]);
  const all = [w3, w1, w2]; // deliberately unsorted

  it('finds the sets from the most recent workout with that exercise', () => {
    expect(lastSetsFor('bench', all).map((s) => s.reps)).toEqual([5]);
    expect(lastSetsFor('squat', all)).toHaveLength(1);
    expect(lastSetsFor('curl', all)).toEqual([]);
  });

  it('finds the best estimated 1RM', () => {
    expect(best1RM('bench', all)).toBeCloseTo(estimate1RM(65, 8), 5);
    expect(best1RM('curl', all)).toBe(0);
  });

  it('builds a strength series oldest first, one point per workout', () => {
    const series = strengthSeries('bench', all);
    expect(series.map((p) => p.t)).toEqual([1_000_000, 2_000_000, 3_000_000]);
    expect(series[1].value).toBeCloseTo(estimate1RM(65, 8), 5);
    expect(strengthSeries('squat', all)).toHaveLength(1);
  });

  it('lists exercises, newest workout first', () => {
    expect(exercisesWithHistory(all)).toEqual(['bench', 'squat']);
  });

  it('counts a PR only when an earlier best is beaten', () => {
    // w1 sets the baseline (no PR), w2 beats it (PR), w3 is lower (no PR)
    expect(countPRs(all, 0)).toBe(1);
    expect(countPRs(all, 2_500_000)).toBe(0);
  });
});

describe('weeklyVolume', () => {
  it('buckets volume into calendar weeks, oldest first', () => {
    const now = new Date(2026, 9, 21, 12).getTime(); // a Wednesday
    const thisWeek = workout('a', now - HOUR, [['bench', 100, 10]]); // 1000 kg
    const lastWeek = workout('b', now - 8 * DAY, [['bench', 50, 10], ['bench', 50, 10]]); // 1000 kg
    const old = workout('c', now - 100 * DAY, [['bench', 100, 10]]); // outside the 7 weeks
    const result = weeklyVolume([thisWeek, lastWeek, old], now, 7);
    expect(result).toHaveLength(7);
    expect(result[6]).toBe(1000);
    expect(result[5]).toBe(1000);
    expect(result.slice(0, 5).every((v) => v === 0)).toBe(true);
  });
});
