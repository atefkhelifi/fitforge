import { useUnitsStore } from '@/features/units/store';
import { supabase } from '@/lib/supabase';
import { computeTargets, Profile } from '@/lib/targets';

/** Saves the profile and calculated targets for the signed-in user (weight is logged separately). Returns false if not saved remotely. */
export async function saveProfileRemote(profile: Profile): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return false;

  const targets = computeTargets(profile);
  const now = new Date();
  const { error } = await supabase.from('profiles').upsert({
    id: auth.session.user.id,
    sex: profile.sex,
    // Only the age is collected, so the birth date is approximate (1 January of the birth year).
    birth_date: `${now.getFullYear() - profile.age}-01-01`,
    height_cm: profile.heightCm,
    goal: profile.goal,
    activity_level: profile.activity,
    units: useUnitsStore.getState().units,
    kcal_target: targets.kcal,
    protein_target: targets.protein_g,
    carb_target: targets.carbs_g,
    fat_target: targets.fat_g,
  });
  return !error;
}
