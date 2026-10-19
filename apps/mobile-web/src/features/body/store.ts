import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localDateKey, WeightEntry } from '@/lib/body';
import { supabase } from '@/lib/supabase';

type State = {
  entries: WeightEntry[];
  setWeight: (date: string, weightKg: number) => void;
  removeWeight: (date: string) => void;
};

/** Body weight log, kept on the device (one entry per day). */
export const useBody = create<State>()(
  persist(
    (set) => ({
      entries: [],
      setWeight: (date, weightKg) =>
        set((s) => ({ entries: [...s.entries.filter((e) => e.date !== date), { date, weightKg }] })),
      removeWeight: (date) => set((s) => ({ entries: s.entries.filter((e) => e.date !== date) })),
    }),
    { name: 'fitforge-body', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

async function syncWeight(date: string, weightKg: number): Promise<void> {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return;
  await supabase.from('body_metrics').upsert({ date, weight_kg: weightKg }, { onConflict: 'user_id,date' });
}

/** Logs today's weight locally and, when signed in, to the account (best effort). */
export function logWeight(weightKg: number, now = Date.now()): void {
  const date = localDateKey(now);
  useBody.getState().setWeight(date, weightKg);
  syncWeight(date, weightKg).catch(() => undefined);
}

/** Removes a weight entry from this device and, when signed in, from the account (best effort). */
export function deleteWeight(date: string): void {
  useBody.getState().removeWeight(date);
  if (!supabase) return;
  const client = supabase;
  client.auth
    .getSession()
    .then(({ data }) => {
      if (data.session) return client.from('body_metrics').delete().eq('date', date);
    })
    .catch(() => undefined);
}
