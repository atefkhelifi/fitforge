import type { CatalogExercise } from '@/data/exercise-catalog';

export type ExerciseFilters = {
  query: string;
  muscle: string | null;
  equipment: string | null;
  level: string | null;
};

export const noFilters: ExerciseFilters = { query: '', muscle: null, equipment: null, level: null };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Filters and ranks exercises. Every word of the query must appear in the name, muscles or equipment.
 * Names that start with the query come first, then names with a word that starts with it, then the rest.
 */
export function filterExercises(list: CatalogExercise[], f: ExerciseFilters): CatalogExercise[] {
  const words = norm(f.query).split(/\s+/).filter(Boolean);

  const matches = list.filter((e) => {
    if (f.muscle && !e.primary.includes(f.muscle)) return false;
    if (f.equipment && (e.equipment ?? 'unspecified') !== f.equipment) return false;
    if (f.level && e.level !== f.level) return false;
    if (words.length === 0) return true;
    const haystack = norm([e.name, ...e.primary, ...e.secondary, e.equipment ?? '', e.category].join(' '));
    return words.every((w) => haystack.includes(w));
  });

  if (words.length === 0) return matches;

  const first = words[0];
  const rank = (e: CatalogExercise) => {
    const name = norm(e.name);
    if (name.startsWith(first)) return 0;
    if (name.split(/[\s\-]+/).some((w) => w.startsWith(first))) return 1;
    if (name.includes(first)) return 2;
    return 3;
  };
  return [...matches].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
