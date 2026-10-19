/* eslint-disable import/first -- vi.mock calls must run before the imports they replace */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { allPrograms, findDay, getAllPrograms, useCustomPrograms } from '@/features/programs/store';
import { useWorkout } from '@/features/workout/store';
import { addExercise, emptyProgram, finalizeProgram, renameDay, renameProgram } from '@/lib/program-draft';

import { catalogEntry, canonicalId, exerciseInfo } from '../exercise-catalog';
import { templatePrograms } from '../programs';

describe('built-in programs', () => {
  const slots = templatePrograms.flatMap((p) => p.days.flatMap((d) => d.slots));

  it('only use exercises that exist in the library, and show a photo for each', () => {
    for (const s of slots) {
      const entry = catalogEntry(s.exerciseId);
      expect(entry, `exercise "${s.exerciseId}" is not in the library`).toBeDefined();
      expect(entry!.images, `"${s.exerciseId}" has no photo`).toBeGreaterThan(0);
      expect(entry!.steps.length, `"${s.exerciseId}" has no instructions`).toBeGreaterThan(0);
    }
  });

  it('store each exercise under its canonical id', () => {
    for (const s of slots) expect(canonicalId(s.exerciseId), s.exerciseId).toBe(s.exerciseId);
  });

  it('have unique program ids and unique day ids (workout history refers to day ids)', () => {
    const programIds = templatePrograms.map((p) => p.id);
    const dayIds = templatePrograms.flatMap((p) => p.days.map((d) => d.id));
    expect(new Set(programIds).size).toBe(programIds.length);
    expect(new Set(dayIds).size).toBe(dayIds.length);
  });

  it('keep the original three programs and their day ids', () => {
    expect(templatePrograms.slice(0, 3).map((p) => p.id)).toEqual(['ppl', 'upper-lower', 'full-body']);
    for (const id of ['ppl-push', 'ppl-pull', 'ppl-legs', 'ul-upper', 'ul-lower', 'fb-a']) {
      expect(templatePrograms.flatMap((p) => p.days).some((d) => d.id === id), id).toBe(true);
    }
  });

  it('are sensible: every day has exercises, and sets and reps are in range', () => {
    expect(templatePrograms.length).toBeGreaterThanOrEqual(7);
    for (const p of templatePrograms) {
      expect(p.days.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      for (const d of p.days) {
        expect(d.slots.length, `${d.id} is empty`).toBeGreaterThan(0);
        for (const s of d.slots) {
          expect(s.sets).toBeGreaterThanOrEqual(1);
          expect(s.repMin).toBeGreaterThanOrEqual(1);
          expect(s.repMax).toBeGreaterThanOrEqual(s.repMin);
          expect(s.restS).toBeGreaterThanOrEqual(0);
          expect(s.startWeight).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('keep the display names the first programs used', () => {
    expect(exerciseInfo('bench').name).toBe('Barbell Bench Press');
    expect(exerciseInfo('pullup').name).toBe('Pull-Up');
  });
});

describe('custom programs', () => {
  const make = (name: string, exerciseId: string) =>
    finalizeProgram(addExercise(renameDay(renameProgram(emptyProgram(1_700_000_000_000, () => 0.5), name), 0, 'Day A'), 0, exerciseId));

  beforeEach(() => {
    useCustomPrograms.setState({ programs: [] });
    useWorkout.setState({ session: null, lastSummary: null });
  });

  it('are saved after the templates and can be found by day id', () => {
    const mine = make('Mine', 'Dumbbell_Flyes');
    useCustomPrograms.getState().save(mine);
    const all = getAllPrograms();
    expect(all).toHaveLength(templatePrograms.length + 1);
    expect(all[all.length - 1].id).toBe(mine.id);
    expect(findDay(mine.days[0].id)?.name).toBe('Day A');
    expect(findDay('ppl-push')?.name).toBe('Push Day A'); // templates still found
    expect(findDay('does-not-exist')).toBeUndefined();
  });

  it('are replaced when saved again with the same id, and can be removed', () => {
    const mine = make('Mine', 'Pullups');
    const { save, remove } = useCustomPrograms.getState();
    save(mine);
    save({ ...mine, name: 'Renamed' });
    expect(useCustomPrograms.getState().programs).toHaveLength(1);
    expect(useCustomPrograms.getState().programs[0].name).toBe('Renamed');
    remove(mine.id);
    expect(useCustomPrograms.getState().programs).toEqual([]);
    expect(findDay(mine.days[0].id)).toBeUndefined();
  });

  it('allPrograms keeps templates first and does not mutate the custom list', () => {
    const custom = [make('A', 'Pullups')];
    const all = allPrograms(custom);
    expect(all.slice(0, templatePrograms.length)).toEqual(templatePrograms);
    expect(custom).toHaveLength(1);
  });

  it('can start a workout, with the weights suggested for each exercise', () => {
    const mine = make('Mine', 'Dumbbell_Flyes');
    useCustomPrograms.getState().save(mine);
    useWorkout.getState().start(mine.days[0].id);
    const session = useWorkout.getState().session;
    expect(session?.dayName).toBe('Day A');
    expect(session?.exercises).toHaveLength(1);
    expect(session?.exercises[0].exerciseId).toBe('Dumbbell_Flyes');
    expect(session?.exercises[0].sets).toHaveLength(3);
    expect(session?.exercises[0].sets[0].weight).toBe('10'); // dumbbell default, metric
  });

  it('start nothing for a day that no longer exists', () => {
    useWorkout.getState().start('deleted-program-day');
    expect(useWorkout.getState().session).toBeNull();
  });
});
