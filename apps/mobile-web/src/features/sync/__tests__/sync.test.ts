/* eslint-disable import/first -- vi.mock calls must run before the imports they replace */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase');
  const fake = createFakeSupabase();
  return { supabase: fake.client, __fake: fake };
});

import { useBody } from '@/features/body/store';
import { useHistory } from '@/features/history/store';
import { useMeals } from '@/features/nutrition/store';
import { useProfile } from '@/features/profile/store';
import { useUnitsStore } from '@/features/units/store';
import type { createFakeSupabase } from '@/test/fake-supabase';

import { syncAll, useSyncStatus } from '../sync';

const fake = ((await import('@/lib/supabase')) as unknown as { __fake: ReturnType<typeof createFakeSupabase> }).__fake;

const T1 = Date.UTC(2026, 9, 1, 17, 0, 0);
const T2 = Date.UTC(2026, 9, 3, 17, 0, 0);
const iso = (t: number) => new Date(t).toISOString();

function seedRemote() {
  fake.tables.workout_sessions = [
    { id: 's1', user_id: 'u1', day_id: 'ppl-push', day_name: 'Push Day A', started_at: iso(T1), ended_at: iso(T1 + 3600_000) },
  ];
  fake.tables.set_logs = [
    { id: 'l1', session_id: 's1', exercise_id: 'bench', set_no: 1, weight_kg: 60, reps: 8 },
    { id: 'l2', session_id: 's1', exercise_id: 'bench', set_no: 2, weight_kg: 62.5, reps: 7 },
  ];
  fake.tables.meals = [{ id: 'm1', eaten_at: iso(T1), meal_type: 'lunch', source: 'photo', dish_name: 'Chicken rice bowl' }];
  fake.tables.meal_items = [
    { id: 'i1', meal_id: 'm1', name: 'Rice', grams: 200, kcal: 260, protein_g: 5, carbs_g: 56, fat_g: 0.5, fiber_g: 1, confidence: 0.7 },
  ];
  fake.tables.body_metrics = [{ id: 'b1', date: '2026-10-01', weight_kg: 82 }];
}

const localWorkout = {
  id: String(T2),
  dayId: 'ppl-pull',
  dayName: 'Pull Day A',
  startedAt: T2,
  endedAt: T2 + 3600_000,
  sets: [{ exerciseId: 'row', setNo: 1, weightKg: 50, reps: 8 }],
};
const localMeal = {
  id: String(T2),
  eatenAt: T2,
  mealType: 'dinner' as const,
  dishName: 'Pasta',
  source: 'text' as const,
  items: [{ name: 'Pasta', grams: 150, kcal: 210, protein_g: 7, carbs_g: 42, fat_g: 1, fiber_g: 2, confidence: 0.6 }],
};

beforeEach(() => {
  fake.reset();
  useHistory.setState({ workouts: [] });
  useMeals.setState({ meals: [] });
  useBody.setState({ entries: [] });
  useProfile.setState({ profile: null });
  useUnitsStore.setState({ units: 'metric' });
  useSyncStatus.setState({ status: 'idle', lastAt: null, error: null });
});

describe('syncAll', () => {
  it('does nothing when signed out', async () => {
    seedRemote();
    fake.state.signedIn = false;
    await syncAll();
    expect(useHistory.getState().workouts).toHaveLength(0);
    expect(useSyncStatus.getState().status).toBe('idle');
  });

  it('pulls account data that is missing on this device', async () => {
    seedRemote();
    await syncAll();

    expect(useHistory.getState().workouts).toHaveLength(1);
    const [w] = useHistory.getState().workouts;
    expect(w.dayName).toBe('Push Day A');
    expect(w.startedAt).toBe(T1);
    expect(w.sets.map((s) => [s.setNo, s.weightKg, s.reps])).toEqual([
      [1, 60, 8],
      [2, 62.5, 7],
    ]);

    const [m] = useMeals.getState().meals;
    expect(m.dishName).toBe('Chicken rice bowl');
    expect(m.mealType).toBe('lunch');
    expect(m.items[0]).toMatchObject({ name: 'Rice', kcal: 260 });

    expect(useBody.getState().entries).toEqual([{ date: '2026-10-01', weightKg: 82 }]);
    expect(useSyncStatus.getState().status).toBe('done');
  });

  it('uploads data that only exists on this device', async () => {
    useHistory.setState({ workouts: [localWorkout] });
    useMeals.setState({ meals: [localMeal] });
    useBody.setState({ entries: [{ date: '2026-10-03', weightKg: 81.5 }] });
    await syncAll();

    expect(fake.tables.workout_sessions).toHaveLength(1);
    expect(fake.tables.workout_sessions[0]).toMatchObject({ day_name: 'Pull Day A', started_at: iso(T2) });
    expect(fake.tables.set_logs).toHaveLength(1);
    expect(fake.tables.set_logs[0]).toMatchObject({ exercise_id: 'row', weight_kg: 50, reps: 8 });
    expect(fake.tables.meals[0]).toMatchObject({ dish_name: 'Pasta', meal_type: 'dinner', eaten_at: iso(T2) });
    expect(fake.tables.meal_items).toHaveLength(1);
    expect(fake.tables.body_metrics).toEqual([expect.objectContaining({ date: '2026-10-03', weight_kg: 81.5 })]);
    expect(useSyncStatus.getState().status).toBe('done');
  });

  it('merges both directions without duplicating anything, and is idempotent', async () => {
    seedRemote();
    useHistory.setState({ workouts: [localWorkout] });
    useMeals.setState({ meals: [localMeal] });
    useBody.setState({ entries: [{ date: '2026-10-03', weightKg: 81.5 }] });

    const snapshot = () => ({
      localWorkouts: useHistory.getState().workouts.length,
      localMeals: useMeals.getState().meals.length,
      localWeights: useBody.getState().entries.length,
      remoteWorkouts: fake.tables.workout_sessions.length,
      remoteSets: fake.tables.set_logs.length,
      remoteMeals: fake.tables.meals.length,
      remoteItems: fake.tables.meal_items.length,
      remoteWeights: fake.tables.body_metrics.length,
    });

    await syncAll();
    const first = snapshot();
    expect(first).toEqual({
      localWorkouts: 2,
      localMeals: 2,
      localWeights: 2,
      remoteWorkouts: 2,
      remoteSets: 3,
      remoteMeals: 2,
      remoteItems: 2,
      remoteWeights: 2,
    });

    await syncAll();
    expect(snapshot()).toEqual(first);
  });

  it('restores the profile on a fresh device', async () => {
    seedRemote();
    fake.tables.profiles = [
      { id: 'u1', sex: 'male', birth_date: '1996-01-01', height_cm: 180, goal: 'muscle', activity_level: 'moderate', units: 'imperial' },
    ];
    await syncAll();
    const profile = useProfile.getState().profile;
    expect(profile).toMatchObject({ sex: 'male', heightCm: 180, weightKg: 82, goal: 'muscle', activity: 'moderate' });
    expect(profile?.age).toBe(new Date().getFullYear() - 1996);
    expect(useUnitsStore.getState().units).toBe('imperial');
  });

  it('uploads the local profile when the account has none', async () => {
    useProfile.setState({ profile: { sex: 'female', age: 28, heightCm: 168, weightKg: 62, activity: 'light', goal: 'fat_loss' } });
    await syncAll();
    expect(fake.tables.profiles).toHaveLength(1);
    expect(fake.tables.profiles[0]).toMatchObject({ id: 'u1', sex: 'female', height_cm: 168, goal: 'fat_loss' });
    expect(fake.tables.profiles[0].kcal_target).toBeGreaterThan(1200);
    expect(fake.tables.profiles[0].units).toBe('metric');
  });

  it('reports an error and keeps local data when the account cannot be read', async () => {
    useMeals.setState({ meals: [localMeal] });
    fake.state.failSelectOn = 'meals';
    await syncAll();
    expect(useSyncStatus.getState().status).toBe('error');
    expect(useSyncStatus.getState().error).toContain('boom meals');
    expect(useMeals.getState().meals).toHaveLength(1);
  });
});
