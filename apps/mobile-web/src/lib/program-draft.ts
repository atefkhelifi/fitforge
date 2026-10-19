import { canonicalId } from '@/data/exercise-catalog';
import { Program, ProgramDay, Slot, slot } from '@/data/programs';

// Pure helpers for building and editing a program. Every function returns a new program and never mutates its input.

export const LIMITS = {
  nameLength: 40,
  days: 7,
  slotsPerDay: 15,
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 50 },
  restS: { min: 0, max: 600 },
} as const;

export const GOALS = ['Muscle', 'Strength', 'Beginner', 'Fat loss', 'Custom'] as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

/** A short unique id. `now` and `rand` are parameters so tests can make it deterministic. */
export function newId(prefix: string, now: number = Date.now(), rand: () => number = Math.random): string {
  return `${prefix}-${now.toString(36)}${rand().toString(36).slice(2, 6)}`;
}

export function emptyDay(name: string, now?: number, rand?: () => number): ProgramDay {
  return { id: newId('day', now, rand), name, slots: [] };
}

export function emptyProgram(now?: number, rand?: () => number): Program {
  return { id: newId('custom', now, rand), name: '', goal: 'Custom', daysPerWeek: 1, days: [emptyDay('Day 1', now, rand)], custom: true };
}

const withDays = (p: Program, days: ProgramDay[]): Program => ({ ...p, days, daysPerWeek: days.length });
const mapDay = (p: Program, di: number, fn: (d: ProgramDay) => ProgramDay): Program =>
  withDays(p, p.days.map((d, i) => (i === di ? fn(d) : d)));

export const renameProgram = (p: Program, name: string): Program => ({ ...p, name });
export const setGoal = (p: Program, goal: string): Program => ({ ...p, goal });
export const renameDay = (p: Program, di: number, name: string): Program => mapDay(p, di, (d) => ({ ...d, name }));

export function addDay(p: Program, now?: number, rand?: () => number): Program {
  if (p.days.length >= LIMITS.days) return p;
  return withDays(p, [...p.days, emptyDay(`Day ${p.days.length + 1}`, now, rand)]);
}

/** A program always keeps at least one day. */
export function removeDay(p: Program, di: number): Program {
  if (p.days.length <= 1 || di < 0 || di >= p.days.length) return p;
  return withDays(p, p.days.filter((_, i) => i !== di));
}

/** Adds an exercise with sensible defaults. The same exercise cannot appear twice in one day. */
export function addExercise(p: Program, di: number, exerciseId: string): Program {
  const id = canonicalId(exerciseId);
  const day = p.days[di];
  if (!day || day.slots.length >= LIMITS.slotsPerDay || day.slots.some((s) => s.exerciseId === id)) return p;
  return mapDay(p, di, (d) => ({ ...d, slots: [...d.slots, slot(id, 3, 8, 12, 90)] }));
}

/** Applies a change to one slot, keeping every value inside sensible limits and rep ranges consistent. */
export function updateSlot(p: Program, di: number, si: number, patch: Partial<Slot>): Program {
  return mapDay(p, di, (d) => ({
    ...d,
    slots: d.slots.map((s, i) => {
      if (i !== si) return s;
      const next = { ...s, ...patch };
      const repMin = clamp(Math.round(next.repMin), LIMITS.reps.min, LIMITS.reps.max);
      const repMax = clamp(Math.round(next.repMax), repMin, LIMITS.reps.max);
      return {
        ...next,
        sets: clamp(Math.round(next.sets), LIMITS.sets.min, LIMITS.sets.max),
        repMin,
        repMax,
        restS: clamp(Math.round(next.restS), LIMITS.restS.min, LIMITS.restS.max),
        startWeight: Math.max(0, Number.isFinite(next.startWeight) ? next.startWeight : 0),
      };
    }),
  }));
}

export const removeSlot = (p: Program, di: number, si: number): Program => mapDay(p, di, (d) => ({ ...d, slots: d.slots.filter((_, i) => i !== si) }));

/** Moves a slot up (-1) or down (+1) within its day. */
export function moveSlot(p: Program, di: number, si: number, direction: -1 | 1): Program {
  return mapDay(p, di, (d) => {
    const to = si + direction;
    if (si < 0 || si >= d.slots.length || to < 0 || to >= d.slots.length) return d;
    const slots = [...d.slots];
    [slots[si], slots[to]] = [slots[to], slots[si]];
    return { ...d, slots };
  });
}

/** Problems that stop a program being saved. Empty when it is fine. */
export function validateProgram(p: Program): string[] {
  const errors: string[] = [];
  if (!p.name.trim()) errors.push('Give the program a name.');
  if (p.name.trim().length > LIMITS.nameLength) errors.push(`The name must be at most ${LIMITS.nameLength} characters.`);
  if (p.days.length === 0) errors.push('Add at least one day.');
  p.days.forEach((d, i) => {
    if (!d.name.trim()) errors.push(`Name day ${i + 1}.`);
    if (d.slots.length === 0) errors.push(`${d.name.trim() || `Day ${i + 1}`} needs at least one exercise.`);
  });
  return errors;
}

/** Trims names and recomputes derived fields, ready to store. */
export function finalizeProgram(p: Program): Program {
  const days = p.days.map((d) => ({ ...d, name: d.name.trim() }));
  return { ...p, name: p.name.trim(), goal: p.goal.trim() || 'Custom', days, daysPerWeek: days.length, custom: true };
}

/** An editable copy of any program (for example a built-in template), with fresh ids so history stays separate. */
export function duplicateProgram(src: Program, now?: number, rand?: () => number): Program {
  const name = `${src.name} (copy)`;
  return {
    ...src,
    id: newId('custom', now, rand),
    name: name.length > LIMITS.nameLength ? `${src.name.slice(0, LIMITS.nameLength - 7)} (copy)` : name,
    custom: true,
    days: src.days.map((d, i) => ({ ...d, id: newId(`day${i}`, now, rand), slots: d.slots.map((s) => ({ ...s })) })),
  };
}
