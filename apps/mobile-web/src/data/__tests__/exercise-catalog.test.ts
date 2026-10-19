import { describe, expect, it } from 'vitest';

import {
  canonicalId,
  catalogEntry,
  DATASET_COMMIT,
  defaultStartWeight,
  EQUIPMENT,
  exerciseImages,
  exerciseImageUrl,
  exerciseInfo,
  getCatalog,
  LEGACY_EXERCISES,
  MUSCLES,
} from '../exercise-catalog';

describe('catalog integrity', () => {
  const catalog = getCatalog();

  it('has the full library with unique ids and names', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(870);
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
    expect(catalog.every((e) => e.name.trim().length > 0)).toBe(true);
  });

  it('only uses safe characters in ids (they end up in photo URLs)', () => {
    expect(catalog.every((e) => /^[A-Za-z0-9_().-]+$/.test(e.id))).toBe(true);
  });

  it('has instructions and photos for almost every exercise', () => {
    expect(catalog.filter((e) => e.steps.length > 0).length / catalog.length).toBeGreaterThan(0.99);
    expect(catalog.filter((e) => e.images > 0).length / catalog.length).toBeGreaterThan(0.99);
    expect(catalog.every((e) => e.images >= 0 && e.images <= 2)).toBe(true);
  });

  it('uses known levels and has muscle data', () => {
    expect(catalog.every((e) => ['beginner', 'intermediate', 'expert'].includes(e.level))).toBe(true);
    expect(catalog.every((e) => e.primary.length > 0)).toBe(true);
  });

  it('lists the muscles and equipment that exist', () => {
    expect(MUSCLES).toContain('chest');
    expect(MUSCLES).toContain('quadriceps');
    expect(EQUIPMENT).toContain('barbell');
    expect(EQUIPMENT).toContain('body only');
  });
});

describe('legacy ids (workout history logged before the library existed)', () => {
  it('map to real library exercises', () => {
    for (const [slug, { catalogId }] of Object.entries(LEGACY_EXERCISES)) {
      expect(catalogEntry(catalogId), `${slug} -> ${catalogId}`).toBeDefined();
      expect(catalogEntry(slug)?.id).toBe(catalogId);
    }
  });

  it('are the canonical id for their exercise, so one lift is one series', () => {
    expect(canonicalId('Barbell_Bench_Press_-_Medium_Grip')).toBe('bench');
    expect(canonicalId('bench')).toBe('bench');
    expect(canonicalId('Pullups')).toBe('pullup');
    expect(canonicalId('Dumbbell_Flyes')).toBe('Dumbbell_Flyes'); // not aliased: unchanged
    expect(canonicalId('something-unknown')).toBe('something-unknown');
  });

  it('keep their original display names but borrow photos and steps from the library', () => {
    const bench = exerciseInfo('bench');
    expect(bench.name).toBe('Barbell Bench Press');
    expect(bench.muscle).toBe('Chest');
    expect(bench.imageId).toBe('Barbell_Bench_Press_-_Medium_Grip');
    expect(bench.steps.length).toBeGreaterThan(2);
    expect(exerciseInfo('Barbell_Bench_Press_-_Medium_Grip').name).toBe('Barbell Bench Press - Medium Grip');
  });
});

describe('exerciseInfo', () => {
  it('never throws for an unknown id and gives a readable name', () => {
    const info = exerciseInfo('Some_Deleted-Exercise');
    expect(info.name).toBe('Some Deleted Exercise');
    expect(info.images).toBe(0);
    expect(info.imageId).toBeNull();
    expect(exerciseImages('Some_Deleted-Exercise')).toEqual([]);
  });

  it('describes a library exercise', () => {
    const info = exerciseInfo('Pullups');
    expect(info).toMatchObject({ muscle: 'Lats', equipment: 'body only', level: 'beginner' });
    expect(info.secondary).toContain('biceps');
  });
});

describe('photo URLs', () => {
  it('are pinned to one dataset commit and point at numbered JPEGs', () => {
    expect(DATASET_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    const url = exerciseImageUrl('Pullups', 0);
    expect(url).toBe(`https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${DATASET_COMMIT}/exercises/Pullups/0.jpg`);
  });

  it('gives two photos for a normal exercise and none for one without', () => {
    expect(exerciseImages('bench')).toHaveLength(2);
    expect(exerciseImages('bench')[1]).toMatch(/Barbell_Bench_Press_-_Medium_Grip\/1\.jpg$/);
    expect(exerciseImages('Kettlebell_Halo')).toEqual([]);
  });

  it('encodes ids that contain special characters', () => {
    expect(exerciseImageUrl('A B/C', 0)).toContain('A%20B%2FC/0.jpg');
  });
});

describe('defaultStartWeight', () => {
  it('suggests a starting load by equipment, and 0 for body weight', () => {
    expect(defaultStartWeight('bench')).toBe(20); // barbell
    expect(defaultStartWeight('curl')).toBe(10); // dumbbell
    expect(defaultStartWeight('latpull')).toBe(20); // cable
    expect(defaultStartWeight('Pullups')).toBe(0); // body only
    expect(defaultStartWeight('nope')).toBe(0);
  });
});
