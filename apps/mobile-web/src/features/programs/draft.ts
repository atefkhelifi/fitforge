import { create } from 'zustand';

import type { Program } from '@/data/programs';

type State = {
  /** The program being created or edited. It is only saved when the user taps Save. */
  draft: Program | null;
  /** True when the draft was started from an existing custom program (so it can be deleted). */
  isExisting: boolean;
  /** The day the exercise picker is adding to. */
  pickDay: number;
  start: (program: Program, isExisting: boolean) => void;
  update: (fn: (p: Program) => Program) => void;
  setPickDay: (day: number) => void;
  clear: () => void;
};

/** Shared between the program editor and the exercise picker. Kept in memory only. */
export const useProgramDraft = create<State>()((set) => ({
  draft: null,
  isExisting: false,
  pickDay: 0,
  start: (program, isExisting) => set({ draft: program, isExisting, pickDay: 0 }),
  update: (fn) => set((s) => (s.draft ? { draft: fn(s.draft) } : s)),
  setPickDay: (pickDay) => set({ pickDay }),
  clear: () => set({ draft: null, isExisting: false, pickDay: 0 }),
}));
