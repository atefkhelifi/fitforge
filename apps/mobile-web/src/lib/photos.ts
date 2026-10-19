export type Angle = 'front' | 'side' | 'back';

export const angles: { value: Angle; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
];

export type Photo = { id: string; date: string; angle: Angle; path: string; url: string };

/** Storage path inside the private bucket. The first folder must be the user id (storage policies check it). */
export function photoPath(userId: string, angle: Angle, now: number): string {
  return `${userId}/${now}-${angle}.jpg`;
}

const byDate = (a: Photo, b: Photo) => a.date.localeCompare(b.date) || a.path.localeCompare(b.path);

/** The oldest and newest photo of one angle, for a before/after view. Needs at least two. */
export function comparePair(photos: Photo[], angle: Angle): { before: Photo; after: Photo } | null {
  const same = photos.filter((p) => p.angle === angle).sort(byDate);
  if (same.length < 2) return null;
  return { before: same[0], after: same[same.length - 1] };
}

/** Whole days between two YYYY-MM-DD dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
