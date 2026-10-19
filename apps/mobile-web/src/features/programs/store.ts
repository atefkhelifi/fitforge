import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { findDayIn, Program, ProgramDay, templatePrograms } from '@/data/programs';

type State = {
  programs: Program[];
  /** Adds a program, or replaces the one with the same id. */
  save: (program: Program) => void;
  remove: (id: string) => void;
};

/** Programs the user created, kept on this device. */
export const useCustomPrograms = create<State>()(
  persist(
    (set) => ({
      programs: [],
      save: (program) =>
        set((s) => ({
          programs: s.programs.some((p) => p.id === program.id)
            ? s.programs.map((p) => (p.id === program.id ? program : p))
            : [...s.programs, program],
        })),
      remove: (id) => set((s) => ({ programs: s.programs.filter((p) => p.id !== id) })),
    }),
    { name: 'fitforge-programs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Built-in templates followed by the user's own programs. */
export const allPrograms = (custom: Program[]): Program[] => [...templatePrograms, ...custom];

/** For non-React code (the workout store). */
export const getAllPrograms = (): Program[] => allPrograms(useCustomPrograms.getState().programs);

export function findDay(dayId: string): ProgramDay | undefined {
  return findDayIn(getAllPrograms(), dayId);
}

export function useAllPrograms(): Program[] {
  const custom = useCustomPrograms((s) => s.programs);
  return useMemo(() => allPrograms(custom), [custom]);
}
