import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LoggedMeal } from '@/lib/meal';
import { supabase } from '@/lib/supabase';

type State = {
  meals: LoggedMeal[];
  addMeal: (meal: LoggedMeal) => void;
  removeMeal: (id: string) => void;
};

/** Logged meals, kept on the device so the daily log works offline. */
export const useMeals = create<State>()(
  persist(
    (set) => ({
      meals: [],
      addMeal: (meal) => set((s) => ({ meals: [...s.meals, meal] })),
      removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),
    }),
    { name: 'fitforge-meals', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Uploads a logged meal for the signed-in user. Returns false when it was not saved remotely. */
export async function syncMeal(meal: LoggedMeal): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return false;

  const { data: row, error } = await supabase
    .from('meals')
    .insert({ eaten_at: new Date(meal.eatenAt).toISOString(), meal_type: meal.mealType, source: meal.source, dish_name: meal.dishName })
    .select('id')
    .single();
  if (error || !row) return false;

  const { error: itemsError } = await supabase.from('meal_items').insert(
    meal.items.map((i) => ({
      meal_id: row.id,
      name: i.name,
      grams: i.grams,
      kcal: i.kcal,
      protein_g: i.protein_g,
      carbs_g: i.carbs_g,
      fat_g: i.fat_g,
      fiber_g: i.fiber_g,
      confidence: i.confidence,
    })),
  );
  if (itemsError) {
    await supabase.from('meals').delete().eq('id', row.id);
    return false;
  }
  return true;
}

/** Removes a meal from this device and, when signed in, from the account (best effort). */
export function deleteMeal(id: string): void {
  const meal = useMeals.getState().meals.find((m) => m.id === id);
  useMeals.getState().removeMeal(id);
  if (!meal || !supabase) return;
  const client = supabase;
  client.auth
    .getSession()
    .then(({ data }) => {
      if (data.session) return client.from('meals').delete().eq('eaten_at', new Date(meal.eatenAt).toISOString());
    })
    .catch(() => undefined);
}
