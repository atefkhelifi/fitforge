import { describe, expect, it } from 'vitest';

import { localDateKey, recentAverage, sortedEntries, weeklyChange } from '../body';
import { defaultMealType, LARGE_MEAL_KCAL, LoggedMeal, looksTooBig, MealItem, mealsOnDay, scaleItem, totalsOf } from '../meal';

describe('body weight trend', () => {
  const entries = [
    { date: '2026-10-08', weightKg: 81 },
    { date: '2026-10-01', weightKg: 82 },
    { date: '2026-10-05', weightKg: 81.5 },
  ];

  it('sorts entries by date', () => {
    expect(sortedEntries(entries).map((e) => e.date)).toEqual(['2026-10-01', '2026-10-05', '2026-10-08']);
  });

  it('computes the change over about a week', () => {
    expect(weeklyChange(entries)).toBeCloseTo(-1, 5);
  });

  it('returns no change with too little history', () => {
    expect(weeklyChange([{ date: '2026-10-08', weightKg: 81 }])).toBeNull();
    expect(weeklyChange([{ date: '2026-10-07', weightKg: 81.5 }, { date: '2026-10-08', weightKg: 81 }])).toBeNull();
  });

  it('averages the 7 days up to the latest entry', () => {
    // 10-01 is exactly 7 days before 10-08, so it is excluded
    expect(recentAverage(entries)).toBeCloseTo(81.25, 5);
    expect(recentAverage([])).toBeNull();
  });

  it('formats a local date key', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});

describe('meal maths', () => {
  const rice: MealItem = { name: 'Rice', grams: 200, kcal: 260, protein_g: 5, carbs_g: 56, fat_g: 0.5, fiber_g: 1, confidence: 0.7 };
  const chicken: MealItem = { name: 'Chicken', grams: 150, kcal: 248, protein_g: 46, carbs_g: 0, fat_g: 5, fiber_g: 0, confidence: 0.8 };

  it('rescales an item to a new portion', () => {
    const half = scaleItem(rice, 100);
    expect(half.grams).toBe(100);
    expect(half.kcal).toBe(130);
    expect(half.carbs_g).toBe(28);
  });

  it('does not divide by zero for an item with no grams', () => {
    const odd = scaleItem({ ...rice, grams: 0 }, 50);
    expect(odd.grams).toBe(50);
    expect(odd.kcal).toBe(260);
  });

  it('sums totals', () => {
    expect(totalsOf([rice, chicken])).toEqual({ kcal: 508, protein_g: 51, carbs_g: 56, fat_g: 5.5 });
    expect(totalsOf([])).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('picks a default meal type by hour', () => {
    expect(defaultMealType(8)).toBe('breakfast');
    expect(defaultMealType(12)).toBe('lunch');
    expect(defaultMealType(16)).toBe('snack');
    expect(defaultMealType(20)).toBe('dinner');
  });

  it('selects the meals of one calendar day', () => {
    const at = (h: number, day = 21): LoggedMeal => ({
      id: `${day}-${h}`,
      eatenAt: new Date(2026, 9, day, h).getTime(),
      mealType: 'lunch',
      dishName: 'x',
      source: 'text',
      items: [rice],
    });
    const meals = [at(8), at(23), at(9, 20), at(9, 22)];
    const today = mealsOnDay(meals, new Date(2026, 9, 21, 15).getTime());
    expect(today.map((m) => m.id)).toEqual(['21-8', '21-23']);
  });

  it('flags an implausibly large single meal', () => {
    const totals = (kcal: number) => ({ kcal, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(looksTooBig(totals(LARGE_MEAL_KCAL))).toBe(false);
    expect(looksTooBig(totals(LARGE_MEAL_KCAL + 1))).toBe(true);
    expect(looksTooBig(totals(700))).toBe(false);
  });
});
