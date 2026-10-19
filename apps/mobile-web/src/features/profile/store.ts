import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { dailyTargets } from '@/lib/meal';
import { computeTargets, Profile, Targets } from '@/lib/targets';

type State = {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
};

export const useProfile = create<State>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
    }),
    { name: 'fitforge-profile', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** True once the persisted profile has been read from storage. */
export function useProfileHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useProfile.persist.onFinishHydration(onChange),
    () => useProfile.persist.hasHydrated(),
    () => false,
  );
}

/** Calculated targets for the saved profile, or generic defaults before onboarding. */
export function useTargets(): Targets {
  const profile = useProfile((s) => s.profile);
  return profile ? computeTargets(profile) : dailyTargets;
}
