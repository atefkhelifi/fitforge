import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FinishedWorkout } from '@/lib/stats';

type State = {
  workouts: FinishedWorkout[];
  addWorkout: (workout: FinishedWorkout) => void;
};

/** Finished workouts, kept on the device so history works without an account. */
export const useHistory = create<State>()(
  persist(
    (set) => ({
      workouts: [],
      addWorkout: (workout) => set((state) => ({ workouts: [...state.workouts, workout] })),
    }),
    { name: 'fitforge-history', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
