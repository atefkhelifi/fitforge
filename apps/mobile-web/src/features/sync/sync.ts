import { create } from 'zustand';

import { useBody } from '@/features/body/store';
import { useHistory } from '@/features/history/store';
import { syncMeal, useMeals } from '@/features/nutrition/store';
import { saveProfileRemote } from '@/features/profile/api';
import { useProfile } from '@/features/profile/store';
import { useUnitsStore } from '@/features/units/store';
import { saveWorkout } from '@/features/workout/api';
import { LoggedMeal, MealItem, MealType } from '@/lib/meal';
import { FinishedWorkout, LoggedSet } from '@/lib/stats';
import { supabase } from '@/lib/supabase';
import { Activity, Goal, Profile, Sex } from '@/lib/targets';

type SyncState = {
  status: 'idle' | 'syncing' | 'done' | 'error';
  lastAt: number | null;
  error: string | null;
};

export const useSyncStatus = create<SyncState>()(() => ({ status: 'idle', lastAt: null, error: null }));

type Row = Record<string, any>;

async function fetchAll(query: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>): Promise<Row[]> {
  const size = 1000;
  const out: Row[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await query(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

const ms = (iso: string) => Date.parse(iso);

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
  return map;
}

let running = false;

/**
 * Two-way merge between this device and the signed-in account.
 * Records are matched by their natural key (workout start time, meal time, weight date); nothing is overwritten.
 * Items only on the account are added here, items only here are uploaded.
 */
export async function syncAll(): Promise<void> {
  const client = supabase;
  if (!client || running) return;
  const { data: auth } = await client.auth.getSession();
  if (!auth.session) return;

  running = true;
  useSyncStatus.setState({ status: 'syncing', error: null });
  try {
    // ---- Workouts ----
    const remoteSessions = await fetchAll((a, b) => client.from('workout_sessions').select('*').order('id').range(a, b));
    const remoteSets = await fetchAll((a, b) => client.from('set_logs').select('*').order('id').range(a, b));
    const setsBySession = groupBy(remoteSets, (r) => r.session_id);
    const localWorkouts = useHistory.getState().workouts;
    const localStarts = new Set(localWorkouts.map((w) => w.startedAt));
    const remoteStarts = new Set(remoteSessions.map((s) => ms(s.started_at)));

    const newWorkouts: FinishedWorkout[] = remoteSessions
      .filter((s) => !localStarts.has(ms(s.started_at)))
      .map((s) => ({
        id: String(ms(s.started_at)),
        dayId: s.day_id,
        dayName: s.day_name,
        startedAt: ms(s.started_at),
        endedAt: ms(s.ended_at),
        sets: (setsBySession.get(s.id) ?? []).map(
          (r): LoggedSet => ({ exerciseId: r.exercise_id, setNo: r.set_no, weightKg: Number(r.weight_kg), reps: r.reps }),
        ),
      }));
    if (newWorkouts.length > 0) useHistory.setState((s) => ({ workouts: [...s.workouts, ...newWorkouts] }));
    for (const w of localWorkouts.filter((w) => !remoteStarts.has(w.startedAt))) {
      const result = await saveWorkout({ dayId: w.dayId, dayName: w.dayName, startedAt: w.startedAt, endedAt: w.endedAt, sets: w.sets });
      if (result === 'error') throw new Error('Could not upload a workout.');
    }

    // ---- Meals ----
    const remoteMeals = await fetchAll((a, b) => client.from('meals').select('*').order('id').range(a, b));
    const remoteItems = await fetchAll((a, b) => client.from('meal_items').select('*').order('id').range(a, b));
    const itemsByMeal = groupBy(remoteItems, (r) => r.meal_id);
    const localMeals = useMeals.getState().meals;
    const localTimes = new Set(localMeals.map((m) => m.eatenAt));
    const remoteTimes = new Set(remoteMeals.map((m) => ms(m.eaten_at)));

    const newMeals: LoggedMeal[] = remoteMeals
      .filter((m) => !localTimes.has(ms(m.eaten_at)))
      .map((m) => {
        const items: MealItem[] = (itemsByMeal.get(m.id) ?? []).map((i) => ({
          name: i.name,
          grams: Number(i.grams ?? 0),
          kcal: Number(i.kcal),
          protein_g: Number(i.protein_g),
          carbs_g: Number(i.carbs_g),
          fat_g: Number(i.fat_g),
          fiber_g: Number(i.fiber_g ?? 0),
          confidence: Number(i.confidence ?? 0),
        }));
        return {
          id: m.id,
          eatenAt: ms(m.eaten_at),
          mealType: (m.meal_type ?? 'snack') as MealType,
          dishName: m.dish_name ?? items[0]?.name ?? 'Meal',
          source: m.source === 'text' ? 'text' : 'photo',
          items,
        };
      });
    if (newMeals.length > 0) useMeals.setState((s) => ({ meals: [...s.meals, ...newMeals] }));
    for (const m of localMeals.filter((m) => !remoteTimes.has(m.eatenAt))) {
      if (!(await syncMeal(m))) throw new Error('Could not upload a meal.');
    }

    // ---- Weight ----
    const remoteWeights = await fetchAll((a, b) => client.from('body_metrics').select('*').order('id').range(a, b));
    const localEntries = useBody.getState().entries;
    const localDates = new Set(localEntries.map((e) => e.date));
    const remoteDates = new Set(remoteWeights.filter((r) => r.weight_kg !== null).map((r) => r.date as string));
    const newEntries = remoteWeights
      .filter((r) => r.weight_kg !== null && !localDates.has(r.date))
      .map((r) => ({ date: r.date as string, weightKg: Number(r.weight_kg) }));
    if (newEntries.length > 0) useBody.setState((s) => ({ entries: [...s.entries, ...newEntries] }));
    const missing = localEntries.filter((e) => !remoteDates.has(e.date));
    if (missing.length > 0) {
      const { error } = await client
        .from('body_metrics')
        .upsert(missing.map((e) => ({ date: e.date, weight_kg: e.weightKg })), { onConflict: 'user_id,date' });
      if (error) throw new Error(error.message);
    }

    // ---- Profile ----
    const { data: remoteProfile } = await client.from('profiles').select('*').eq('id', auth.session.user.id).maybeSingle();
    const localProfile = useProfile.getState().profile;
    if (!localProfile && remoteProfile?.sex && remoteProfile.height_cm && remoteProfile.goal && remoteProfile.activity_level && remoteProfile.birth_date) {
      const latestWeight = [...useBody.getState().entries].sort((a, b) => a.date.localeCompare(b.date)).pop();
      if (latestWeight) {
        const restored: Profile = {
          sex: remoteProfile.sex as Sex,
          age: new Date().getFullYear() - Number(String(remoteProfile.birth_date).slice(0, 4)),
          heightCm: Number(remoteProfile.height_cm),
          weightKg: latestWeight.weightKg,
          activity: remoteProfile.activity_level as Activity,
          goal: remoteProfile.goal as Goal,
        };
        useProfile.getState().setProfile(restored);
        if (remoteProfile.units === 'imperial' || remoteProfile.units === 'metric') useUnitsStore.getState().setUnits(remoteProfile.units);
      }
    } else if (localProfile && !remoteProfile?.height_cm) {
      await saveProfileRemote(localProfile);
    }

    useSyncStatus.setState({ status: 'done', lastAt: Date.now(), error: null });
  } catch (e) {
    useSyncStatus.setState({ status: 'error', error: e instanceof Error ? e.message : 'Sync failed.' });
  } finally {
    running = false;
  }
}
