import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Units } from '@/lib/units';

type State = { units: Units; setUnits: (units: Units) => void };

/** Display units only. Everything is stored in kg and cm regardless of this setting. */
export const useUnitsStore = create<State>()(
  persist((set) => ({ units: 'metric', setUnits: (units) => set({ units }) }), {
    name: 'fitforge-units',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export const useUnits = (): Units => useUnitsStore((s) => s.units);
