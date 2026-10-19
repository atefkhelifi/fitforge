export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'fat_loss' | 'muscle' | 'strength';

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
};

export type Targets = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export const activityOptions: { value: Activity; label: string; hint: string; factor: number }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', factor: 1.2 },
  { value: 'light', label: 'Light', hint: '1–3 workouts a week', factor: 1.375 },
  { value: 'moderate', label: 'Moderate', hint: '3–5 workouts a week', factor: 1.55 },
  { value: 'active', label: 'Active', hint: '6–7 workouts a week', factor: 1.725 },
  { value: 'very_active', label: 'Very active', hint: 'Physical job plus training', factor: 1.9 },
];

export const goalOptions: { value: Goal; label: string; hint: string }[] = [
  { value: 'fat_loss', label: 'Lose fat', hint: 'About 20% below maintenance' },
  { value: 'muscle', label: 'Build muscle', hint: 'About 10% above maintenance' },
  { value: 'strength', label: 'Get stronger', hint: 'At maintenance' },
];

export const limits = {
  age: { min: 16, max: 90 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
} as const;

export function isValidProfile(p: Profile): boolean {
  return (
    p.age >= limits.age.min &&
    p.age <= limits.age.max &&
    p.heightCm >= limits.heightCm.min &&
    p.heightCm <= limits.heightCm.max &&
    p.weightKg >= limits.weightKg.min &&
    p.weightKg <= limits.weightKg.max
  );
}

/**
 * Daily targets from the Mifflin-St Jeor equation, an activity multiplier and a goal adjustment.
 * Protein is set per kg of body weight, fat at 25% of calories (at least 0.8 g/kg), carbs fill the rest.
 */
export function computeTargets(p: Profile): Targets {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const factor = activityOptions.find((a) => a.value === p.activity)?.factor ?? 1.2;
  const adjust = p.goal === 'fat_loss' ? 0.8 : p.goal === 'muscle' ? 1.1 : 1;
  // Never suggest below commonly used minimums for unsupervised dieting.
  const floor = p.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(floor, bmr * factor * adjust);

  const protein = p.weightKg * (p.goal === 'fat_loss' ? 2.2 : p.goal === 'muscle' ? 2 : 1.8);
  const fat = Math.max(p.weightKg * 0.8, (kcal * 0.25) / 9);
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);

  return {
    kcal: Math.round(kcal / 10) * 10,
    protein_g: Math.round(protein),
    carbs_g: Math.round(carbs),
    fat_g: Math.round(fat),
  };
}
