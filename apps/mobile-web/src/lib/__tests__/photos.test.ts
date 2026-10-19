import { describe, expect, it } from 'vitest';

import { Angle, base64ToBytes, comparePair, daysBetween, Photo, photoPath } from '../photos';

const photo = (id: string, date: string, angle: Angle): Photo => ({ id, date, angle, path: `u/${id}.jpg`, url: `https://x/${id}` });

describe('photos helpers', () => {
  it('builds a storage path whose first folder is the user id', () => {
    const path = photoPath('user-1', 'side', 1700000000000);
    expect(path).toBe('user-1/1700000000000-side.jpg');
    expect(path.split('/')[0]).toBe('user-1');
  });

  it('pairs the oldest and newest photo of one angle', () => {
    const photos = [
      photo('b', '2026-09-10', 'front'),
      photo('a', '2026-08-01', 'front'),
      photo('c', '2026-10-05', 'front'),
      photo('d', '2026-10-06', 'side'),
    ];
    const pair = comparePair(photos, 'front');
    expect(pair?.before.id).toBe('a');
    expect(pair?.after.id).toBe('c');
  });

  it('needs at least two photos of the angle', () => {
    expect(comparePair([photo('a', '2026-08-01', 'front')], 'front')).toBeNull();
    expect(comparePair([photo('a', '2026-08-01', 'front'), photo('b', '2026-08-02', 'side')], 'front')).toBeNull();
    expect(comparePair([], 'back')).toBeNull();
  });

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-08')).toBe(7);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('decodes base64 to bytes', () => {
    expect(Array.from(base64ToBytes('AQID'))).toEqual([1, 2, 3]);
    expect(base64ToBytes('').length).toBe(0);
  });
});
