import { describe, expect, it } from 'vitest';

import { getCatalog } from '@/data/exercise-catalog';

import { filterExercises, noFilters } from '../exercise-search';

const all = getCatalog();
const search = (over: Partial<typeof noFilters>) => filterExercises(all, { ...noFilters, ...over });

describe('filterExercises', () => {
  it('returns everything, in the original order, when nothing is selected', () => {
    expect(search({})).toHaveLength(all.length);
    expect(search({}).map((e) => e.id)).toEqual(all.map((e) => e.id));
  });

  it('finds exercises by name, ignoring case and extra spaces', () => {
    const r = search({ query: '  BENCH   press ' });
    expect(r.length).toBeGreaterThan(3);
    expect(r.every((e) => /bench/i.test(e.name) && /press/i.test(e.name))).toBe(true);
    expect(r.map((e) => e.id)).toContain('Barbell_Bench_Press_-_Medium_Grip');
  });

  it('ranks names that start with the query before names that only contain it', () => {
    const r = search({ query: 'squat' });
    const startsWith = r.map((e) => e.name.toLowerCase().startsWith('squat'));
    expect(startsWith[0]).toBe(true);
    // once a non-matching-start name appears, no start-match may follow
    const firstNon = startsWith.indexOf(false);
    expect(startsWith.slice(firstNon).includes(true)).toBe(false);
  });

  it('also matches muscles and equipment words', () => {
    const r = search({ query: 'kettlebells triceps' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.equipment === 'kettlebells' && [...e.primary, ...e.secondary].includes('triceps'))).toBe(true);
  });

  it('filters by muscle, equipment and level, and combines them', () => {
    const chest = search({ muscle: 'chest' });
    expect(chest.length).toBeGreaterThan(30);
    expect(chest.every((e) => e.primary.includes('chest'))).toBe(true);

    const barbell = search({ equipment: 'barbell' });
    expect(barbell.every((e) => e.equipment === 'barbell')).toBe(true);

    const combo = search({ muscle: 'chest', equipment: 'dumbbell', level: 'beginner', query: 'press' });
    expect(combo.length).toBeGreaterThan(0);
    expect(combo.every((e) => e.primary.includes('chest') && e.equipment === 'dumbbell' && e.level === 'beginner' && /press/i.test(e.name))).toBe(true);
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(search({ query: 'zzzqqq' })).toEqual([]);
    expect(search({ muscle: 'chest', equipment: 'foam roll', level: 'expert' })).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const copy = [...all];
    search({ query: 'curl' });
    expect(all).toEqual(copy);
  });
});
