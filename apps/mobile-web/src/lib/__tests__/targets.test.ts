import { describe, expect, it } from 'vitest';

import { computeTargets, isValidProfile, Profile } from '../targets';

const base: Profile = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'muscle' };

describe('computeTargets', () => {
  it('matches a hand calculation for a 30 y/o 80 kg man building muscle', () => {
    // BMR 1780, x1.55 = 2759, x1.1 = 3034.9 -> rounded to 3030
    const t = computeTargets(base);
    expect(t.kcal).toBe(3030);
    expect(t.protein_g).toBe(160);
    expect(t.fat_g).toBe(84);
    expect(t.carbs_g).toBe(409);
  });

  it('eats at maintenance for strength and below it for fat loss', () => {
    const maintain = computeTargets({ ...base, goal: 'strength' }).kcal;
    expect(computeTargets({ ...base, goal: 'fat_loss' }).kcal).toBeLessThan(maintain);
    expect(computeTargets({ ...base, goal: 'muscle' }).kcal).toBeGreaterThan(maintain);
  });

  it('never goes below the calorie floor', () => {
    const small: Profile = { sex: 'female', age: 16, heightCm: 150, weightKg: 40, activity: 'sedentary', goal: 'fat_loss' };
    expect(computeTargets(small).kcal).toBe(1200);
    expect(computeTargets({ ...small, sex: 'male' }).kcal).toBe(1500);
  });

  it('keeps macros consistent with the calorie target', () => {
    const t = computeTargets(base);
    const fromMacros = t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9;
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThan(40);
  });
});

describe('isValidProfile', () => {
  it('accepts normal values and rejects out-of-range or missing ones', () => {
    expect(isValidProfile(base)).toBe(true);
    expect(isValidProfile({ ...base, age: 12 })).toBe(false);
    expect(isValidProfile({ ...base, heightCm: 300 })).toBe(false);
    expect(isValidProfile({ ...base, weightKg: NaN })).toBe(false);
  });
});
