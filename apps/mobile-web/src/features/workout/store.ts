import { create } from 'zustand';

import { findDay } from '@/data/programs';
import { useHistory } from '@/features/history/store';
import { useUnitsStore } from '@/features/units/store';
import { lastSetsFor } from '@/lib/stats';
import { fromDisplayWeight, loadStep, round1, suggestedDisplayWeight, toDisplayWeight, Units } from '@/lib/units';

import { saveWorkout, SyncStatus } from './api';

export type SetLog = { weight: string; reps: string; done: boolean };
export type ExerciseLog = {
  exerciseId: string;
  repMin: number;
  repMax: number;
  restS: number;
  sets: SetLog[];
};
export type Session = {
  /** Weights typed in this session are in these units; they are converted to kg when the workout is finished. */
  units: Units;
  dayId: string;
  dayName: string;
  startedAt: number;
  exercises: ExerciseLog[];
  index: number;
  restEndsAt: number | null;
};
export type Summary = {
  dayName: string;
  minutes: number;
  sets: number;
  volumeKg: number;
  sync: SyncStatus | 'pending';
};

type State = {
  session: Session | null;
  lastSummary: Summary | null;
  start: (dayId: string) => void;
  updateSet: (ei: number, si: number, patch: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void;
  toggleSet: (ei: number, si: number) => void;
  addSet: (ei: number) => void;
  goTo: (index: number) => void;
  addRest: (seconds: number) => void;
  skipRest: () => void;
  finish: () => void;
  discard: () => void;
};

// The in-progress session lives in memory only; finished workouts are saved to Supabase when signed in.
export const useWorkout = create<State>()((set, get) => ({
  session: null,
  lastSummary: null,

  start: (dayId) => {
    const day = findDay(dayId);
    if (!day) return;
    const history = useHistory.getState().workouts;
    const units = useUnitsStore.getState().units;
    set({
      session: {
        units,
        dayId,
        dayName: day.name,
        startedAt: Date.now(),
        index: 0,
        restEndsAt: null,
        exercises: day.slots.map((s) => {
          const prev = lastSetsFor(s.exerciseId, history);
          // Progressive overload: every set hit the top of the rep range last time, so add weight.
          const bump = prev.length > 0 && prev.every((p) => p.reps >= s.repMax);
          return {
            exerciseId: s.exerciseId,
            repMin: s.repMin,
            repMax: s.repMax,
            restS: s.restS,
            sets: Array.from({ length: s.sets }, (_, i) => {
              const p = prev[i] ?? prev[prev.length - 1];
              if (!p) return { weight: String(suggestedDisplayWeight(s.startWeight, units)), reps: String(s.repMin), done: false };
              const shown = round1(toDisplayWeight(p.weightKg, units));
              if (bump) return { weight: String(round1(shown + loadStep(units))), reps: String(s.repMin), done: false };
              return { weight: String(shown), reps: String(p.reps), done: false };
            }),
          };
        }),
      },
    });
  },

  updateSet: (ei, si, patch) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = state.session.exercises.map((ex, i) =>
        i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) },
      );
      return { session: { ...state.session, exercises } };
    }),

  toggleSet: (ei, si) =>
    set((state) => {
      if (!state.session) return state;
      const ex = state.session.exercises[ei];
      const nowDone = !ex.sets[si].done;
      const exercises = state.session.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, done: nowDone } : s)) },
      );
      return {
        session: {
          ...state.session,
          exercises,
          restEndsAt: nowDone ? Date.now() + ex.restS * 1000 : null,
        },
      };
    }),

  addSet: (ei) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = state.session.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { weight: last?.weight ?? '0', reps: last?.reps ?? String(ex.repMin), done: false }] };
      });
      return { session: { ...state.session, exercises } };
    }),

  goTo: (index) =>
    set((state) => {
      if (!state.session) return state;
      const clamped = Math.max(0, Math.min(state.session.exercises.length - 1, index));
      return { session: { ...state.session, index: clamped } };
    }),

  addRest: (seconds) =>
    set((state) => {
      if (!state.session?.restEndsAt) return state;
      return { session: { ...state.session, restEndsAt: state.session.restEndsAt + seconds * 1000 } };
    }),

  skipRest: () =>
    set((state) => (state.session ? { session: { ...state.session, restEndsAt: null } } : state)),

  finish: () => {
    const { session } = get();
    if (!session) return;
    const endedAt = Date.now();
    const done: { exerciseId: string; setNo: number; weightKg: number; reps: number }[] = [];
    let volumeKg = 0;
    for (const ex of session.exercises) {
      ex.sets.forEach((s, i) => {
        if (!s.done) return;
        // Stored in kg (to 1 g) whatever unit was typed, so history and charts stay consistent.
        const weightKg = Math.round(fromDisplayWeight(parseFloat(s.weight) || 0, session.units) * 1000) / 1000;
        const reps = parseInt(s.reps, 10) || 0;
        done.push({ exerciseId: ex.exerciseId, setNo: i + 1, weightKg, reps });
        volumeKg += weightKg * reps;
      });
    }
    if (done.length > 0) {
      useHistory.getState().addWorkout({
        id: `${session.startedAt}`,
        dayId: session.dayId,
        dayName: session.dayName,
        startedAt: session.startedAt,
        endedAt,
        sets: done,
      });
    }
    set({
      session: null,
      lastSummary: {
        dayName: session.dayName,
        minutes: Math.max(1, Math.round((endedAt - session.startedAt) / 60000)),
        sets: done.length,
        volumeKg: Math.round(volumeKg),
        sync: 'pending',
      },
    });
    saveWorkout({ dayId: session.dayId, dayName: session.dayName, startedAt: session.startedAt, endedAt, sets: done })
      .catch((): SyncStatus => 'error')
      .then((sync) => set((state) => (state.lastSummary ? { lastSummary: { ...state.lastSummary, sync } } : state)));
  },

  discard: () => set({ session: null }),
}));
