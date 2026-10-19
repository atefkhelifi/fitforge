import { describe, expect, it } from 'vitest';

import { templatePrograms } from '@/data/programs';

import {
  addDay,
  addExercise,
  duplicateProgram,
  emptyProgram,
  finalizeProgram,
  LIMITS,
  moveSlot,
  newId,
  removeDay,
  removeSlot,
  renameDay,
  renameProgram,
  updateSlot,
  validateProgram,
} from '../program-draft';

const rand = () => 0.123456;
const fresh = () => emptyProgram(1_700_000_000_000, rand);

describe('creating a program', () => {
  it('starts with one empty day and is marked as the user\'s own', () => {
    const p = fresh();
    expect(p.custom).toBe(true);
    expect(p.days).toHaveLength(1);
    expect(p.days[0].slots).toEqual([]);
    expect(p.id.startsWith('custom-')).toBe(true);
  });

  it('makes ids that do not collide', () => {
    const a = newId('x', 1, () => 0.111111);
    const b = newId('x', 2, () => 0.111111);
    const c = newId('x', 1, () => 0.222222);
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('days', () => {
  it('adds days up to the limit and keeps daysPerWeek in step', () => {
    let p = fresh();
    for (let i = 0; i < 12; i++) p = addDay(p, 1_700_000_000_000 + i, () => 0.3 + i / 100);
    expect(p.days).toHaveLength(LIMITS.days);
    expect(p.daysPerWeek).toBe(LIMITS.days);
    expect(new Set(p.days.map((d) => d.id)).size).toBe(LIMITS.days);
    expect(p.days[2].name).toBe('Day 3');
  });

  it('removes a day but never the last one', () => {
    let p = addDay(fresh(), 5, () => 0.5);
    p = removeDay(p, 0);
    expect(p.days).toHaveLength(1);
    expect(removeDay(p, 0)).toBe(p);
    expect(removeDay(p, 9)).toBe(p);
  });

  it('renames the program and a day', () => {
    const p = renameDay(renameProgram(fresh(), 'My split'), 0, 'Push');
    expect(p.name).toBe('My split');
    expect(p.days[0].name).toBe('Push');
  });
});

describe('exercises in a day', () => {
  it('adds an exercise with sensible defaults', () => {
    const p = addExercise(fresh(), 0, 'Dumbbell_Flyes');
    expect(p.days[0].slots).toEqual([{ exerciseId: 'Dumbbell_Flyes', sets: 3, repMin: 8, repMax: 12, restS: 90, startWeight: 10 }]);
  });

  it('stores a library exercise that has a short legacy id under that id', () => {
    const p = addExercise(fresh(), 0, 'Barbell_Bench_Press_-_Medium_Grip');
    expect(p.days[0].slots[0].exerciseId).toBe('bench');
    expect(p.days[0].slots[0].startWeight).toBe(20);
  });

  it('ignores a duplicate in the same day but allows it in another day', () => {
    let p = addExercise(fresh(), 0, 'Pullups');
    p = addExercise(p, 0, 'Pullups');
    expect(p.days[0].slots).toHaveLength(1);
    p = addDay(p, 1, () => 0.4);
    p = addExercise(p, 1, 'Pullups');
    expect(p.days[1].slots).toHaveLength(1);
  });

  it('stops at the per-day limit and ignores a bad day index', () => {
    let p = fresh();
    for (let i = 0; i < 30; i++) p = addExercise(p, 0, `Fake_Exercise_${i}`);
    expect(p.days[0].slots).toHaveLength(LIMITS.slotsPerDay);
    expect(addExercise(p, 5, 'Pullups')).toBe(p);
  });

  it('removes and reorders exercises', () => {
    let p = fresh();
    for (const id of ['a', 'b', 'c']) p = addExercise(p, 0, id);
    p = moveSlot(p, 0, 2, -1);
    expect(p.days[0].slots.map((s) => s.exerciseId)).toEqual(['a', 'c', 'b']);
    p = moveSlot(p, 0, 0, -1); // already first: no change
    expect(p.days[0].slots.map((s) => s.exerciseId)).toEqual(['a', 'c', 'b']);
    p = moveSlot(p, 0, 2, 1); // already last: no change
    expect(p.days[0].slots.map((s) => s.exerciseId)).toEqual(['a', 'c', 'b']);
    p = removeSlot(p, 0, 1);
    expect(p.days[0].slots.map((s) => s.exerciseId)).toEqual(['a', 'b']);
  });

  it('does not change the program it is given', () => {
    const p = addExercise(fresh(), 0, 'a');
    const before = JSON.stringify(p);
    addExercise(p, 0, 'b');
    moveSlot(p, 0, 0, 1);
    updateSlot(p, 0, 0, { sets: 5 });
    removeSlot(p, 0, 0);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe('updateSlot keeps values sensible', () => {
  const base = () => addExercise(fresh(), 0, 'Pullups');
  const slotOf = (p: ReturnType<typeof base>) => p.days[0].slots[0];

  it('clamps sets, reps and rest', () => {
    const p = updateSlot(base(), 0, 0, { sets: 99, repMin: 0, repMax: 999, restS: -20 });
    expect(slotOf(p)).toMatchObject({ sets: LIMITS.sets.max, repMin: LIMITS.reps.min, repMax: LIMITS.reps.max, restS: 0 });
  });

  it('never lets the top of the rep range fall below the bottom', () => {
    const p = updateSlot(base(), 0, 0, { repMin: 12, repMax: 6 });
    expect(slotOf(p).repMin).toBe(12);
    expect(slotOf(p).repMax).toBe(12);
  });

  it('rounds, and survives NaN and negative weight', () => {
    const p = updateSlot(base(), 0, 0, { sets: 3.6, startWeight: -5 });
    expect(slotOf(p).sets).toBe(4);
    expect(slotOf(p).startWeight).toBe(0);
    expect(slotOf(updateSlot(base(), 0, 0, { startWeight: NaN })).startWeight).toBe(0);
  });

  it('only changes the targeted slot', () => {
    let p = addExercise(addExercise(fresh(), 0, 'a'), 0, 'b');
    p = updateSlot(p, 0, 1, { sets: 5 });
    expect(p.days[0].slots[0].sets).toBe(3);
    expect(p.days[0].slots[1].sets).toBe(5);
  });
});

describe('validateProgram', () => {
  it('explains what is missing', () => {
    expect(validateProgram(fresh())).toEqual(['Give the program a name.', 'Day 1 needs at least one exercise.']);
  });

  it('accepts a complete program', () => {
    const p = addExercise(renameProgram(fresh(), 'Push'), 0, 'Pullups');
    expect(validateProgram(p)).toEqual([]);
  });

  it('rejects blank day names and over-long program names', () => {
    let p = addExercise(renameProgram(fresh(), 'x'.repeat(LIMITS.nameLength + 1)), 0, 'a');
    expect(validateProgram(p).join(' ')).toContain('at most 40');
    p = addExercise(renameDay(renameProgram(fresh(), 'ok'), 0, '   '), 0, 'a');
    expect(validateProgram(p)).toContain('Name day 1.');
  });
});

describe('finalizeProgram', () => {
  it('trims names and recomputes derived fields', () => {
    const p = finalizeProgram({ ...addExercise(renameDay(renameProgram(fresh(), '  Push  '), 0, ' A '), 0, 'a'), goal: '   ' });
    expect(p).toMatchObject({ name: 'Push', goal: 'Custom', daysPerWeek: 1, custom: true });
    expect(p.days[0].name).toBe('A');
  });
});

describe('duplicateProgram', () => {
  const src = templatePrograms[0];
  const copy = duplicateProgram(src, 1_700_000_000_001, rand);

  it('is an editable copy with fresh ids, so history stays separate', () => {
    expect(copy.custom).toBe(true);
    expect(copy.id).not.toBe(src.id);
    expect(copy.name).toBe('Push / Pull / Legs (copy)');
    expect(copy.days.map((d) => d.id).some((id) => src.days.map((x) => x.id).includes(id))).toBe(false);
    expect(new Set(copy.days.map((d) => d.id)).size).toBe(copy.days.length);
    expect(copy.days[0].slots).toEqual(src.days[0].slots);
  });

  it('does not share slot objects with the template', () => {
    const edited = updateSlot(copy, 0, 0, { sets: 9 });
    expect(edited.days[0].slots[0].sets).toBe(9);
    expect(src.days[0].slots[0].sets).toBe(4);
    expect(copy.days[0].slots[0]).not.toBe(src.days[0].slots[0]);
  });

  it('keeps a long name within the limit', () => {
    const long = { ...src, name: 'N'.repeat(LIMITS.nameLength) };
    expect(duplicateProgram(long, 1, rand).name.length).toBeLessThanOrEqual(LIMITS.nameLength);
  });
});
