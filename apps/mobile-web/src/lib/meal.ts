import { z } from 'zod';

export const mealItemSchema = z.object({
  name: z.string(),
  grams: z.number(),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  confidence: z.number(),
});

export const analysisSchema = z.object({
  is_food: z.boolean(),
  dish_name: z.string(),
  items: z.array(mealItemSchema),
  overall_confidence: z.number(),
  assumptions: z.array(z.string()),
});

export type MealItem = z.infer<typeof mealItemSchema>;
export type MealAnalysis = z.infer<typeof analysisSchema>;
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Totals = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export type LoggedMeal = {
  id: string;
  eatenAt: number;
  mealType: MealType;
  dishName: string;
  source: 'photo' | 'text';
  items: MealItem[];
};

export const dailyTargets = { kcal: 2300, protein_g: 160, carbs_g: 240, fat_g: 70 } as const;

/** Rescales an item's nutrition to a new portion, keeping the model's per-gram values. */
export function scaleItem(item: MealItem, grams: number): MealItem {
  if (item.grams <= 0) return { ...item, grams };
  const f = grams / item.grams;
  return {
    ...item,
    grams,
    kcal: item.kcal * f,
    protein_g: item.protein_g * f,
    carbs_g: item.carbs_g * f,
    fat_g: item.fat_g * f,
    fiber_g: item.fiber_g * f,
  };
}

export function totalsOf(items: MealItem[]): Totals {
  return items.reduce<Totals>(
    (t, i) => ({
      kcal: t.kcal + i.kcal,
      protein_g: t.protein_g + i.protein_g,
      carbs_g: t.carbs_g + i.carbs_g,
      fat_g: t.fat_g + i.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function mealsOnDay(meals: LoggedMeal[], day: number): LoggedMeal[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const from = start.getTime();
  return meals.filter((m) => m.eatenAt >= from && m.eatenAt < from + 24 * 60 * 60 * 1000);
}

/** A single meal this large usually means several plates or a table of ingredients was scanned. */
export const LARGE_MEAL_KCAL = 2500;
export const looksTooBig = (totals: Totals) => totals.kcal > LARGE_MEAL_KCAL;

export function defaultMealType(hour: number): MealType {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}
