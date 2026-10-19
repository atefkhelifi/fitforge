import { describe, expect, it } from 'vitest';

import { templatePrograms as programs } from '@/data/programs';

import { estimateMinutes, nextWorkoutDay, weekDays, workoutsThisWeek } from '../today';
import type { FinishedWorkout } from '../stats';

const HOUR = 3_600_000;
const wk = (dayId: string, startedAt: number): FinishedWorkout => ({ id: String(startedAt), dayId, dayName: dayId, startedAt, endedAt: startedAt + HOUR, sets: [] });

// Wednesday 21 October 2026, local time
const NOW = new Date(2026, 9, 21, 12).getTime();
const at = (month: number, day: number, hour = 18) => new Date(2026, month, day, hour).getTime();

describe('weekDays', () => {
  it('runs Monday to Sunday, marks done days and today', () => {
    const days = weekDays([wk('x', at(9, 19)), wk('x', at(9, 21, 9))], NOW); // Mon 19 and Wed 21
    expect(days.map((d) => d.label).join('')).toBe('MTWTFSS');
    expect(days.map((d) => d.done)).toEqual([true, false, true, false, false, false, false]);
    expect(days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false]);
  });

  it('ignores workouts from other weeks', () => {
    const days = weekDays([wk('x', at(9, 14)), wk('x', at(9, 26))], NOW); // previous Wed and next Mon
    expect(days.some((d) => d.done)).toBe(false);
  });
});

describe('workoutsThisWeek', () => {
  it('counts only this week up to now', () => {
    const list = [wk('x', at(9, 18)), wk('x', at(9, 19)), wk('x', at(9, 21, 8)), wk('x', at(9, 14))];
    expect(workoutsThisWeek(list, NOW)).toBe(2); // Sunday the 18th belongs to last week
    expect(workoutsThisWeek([], NOW)).toBe(0);
  });
});

describe('nextWorkoutDay', () => {
  it('starts at the first day of the first program with no history', () => {
    expect(nextWorkoutDay([], programs).id).toBe('ppl-push');
  });

  it('moves to the next day of the same program and wraps around', () => {
    expect(nextWorkoutDay([wk('ppl-push', at(9, 19))], programs).id).toBe('ppl-pull');
    expect(nextWorkoutDay([wk('ppl-push', at(9, 17)), wk('ppl-legs', at(9, 19))], programs).id).toBe('ppl-push');
    expect(nextWorkoutDay([wk('ul-upper', at(9, 19))], programs).id).toBe('ul-lower');
  });

  it('falls back to the first day when the last workout is from an unknown day', () => {
    expect(nextWorkoutDay([wk('deleted-day', at(9, 19))], programs).id).toBe('ppl-push');
  });
});

describe('estimateMinutes', () => {
  it('is about 3 minutes per set, in steps of 5', () => {
    const push = programs[0].days[0]; // 16 sets
    expect(estimateMinutes(push)).toBe(50);
    expect(estimateMinutes({ id: 't', name: 't', slots: [] })).toBe(5);
  });
});
