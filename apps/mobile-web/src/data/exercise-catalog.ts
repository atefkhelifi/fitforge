import catalogJson from './exercise-catalog.json';

/**
 * The exercise library: 876 exercises from the open-source Free Exercise DB (Unlicense).
 * Text lives in exercise-catalog.json (built by scripts/build-catalog.mjs); photos are loaded from a CDN.
 */
export type CatalogExercise = {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
  equipment: string | null;
  category: string;
  force: string | null;
  mechanic: string | null;
  primary: string[];
  secondary: string[];
  steps: string[];
  /** Number of photos available (0, 1 or 2). */
  images: number;
};

/** Keep in step with COMMIT in scripts/build-catalog.mjs. Pinning means photo links can never change under us. */
export const DATASET_COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
export const IMAGE_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${DATASET_COMMIT}/exercises`;

const catalog = catalogJson as unknown as CatalogExercise[];
const byId = new Map(catalog.map((e) => [e.id, e]));

export const getCatalog = (): CatalogExercise[] => catalog;

/**
 * Exercises that were used by the first built-in programs keep their short ids ("bench", "squat") so that
 * workout history logged before the library existed still matches. Each maps to a library exercise.
 */
export const LEGACY_EXERCISES: Record<string, { catalogId: string; name: string }> = {
  bench: { catalogId: 'Barbell_Bench_Press_-_Medium_Grip', name: 'Barbell Bench Press' },
  incline: { catalogId: 'Incline_Dumbbell_Press', name: 'Incline Dumbbell Press' },
  ohp: { catalogId: 'Barbell_Shoulder_Press', name: 'Overhead Press' },
  lateral: { catalogId: 'Side_Lateral_Raise', name: 'Lateral Raise' },
  pushdown: { catalogId: 'Triceps_Pushdown', name: 'Triceps Pushdown' },
  pullup: { catalogId: 'Pullups', name: 'Pull-Up' },
  row: { catalogId: 'Bent_Over_Barbell_Row', name: 'Barbell Row' },
  latpull: { catalogId: 'Wide-Grip_Lat_Pulldown', name: 'Lat Pulldown' },
  facepull: { catalogId: 'Face_Pull', name: 'Face Pull' },
  curl: { catalogId: 'Dumbbell_Bicep_Curl', name: 'Dumbbell Curl' },
  squat: { catalogId: 'Barbell_Squat', name: 'Back Squat' },
  rdl: { catalogId: 'Romanian_Deadlift', name: 'Romanian Deadlift' },
  legpress: { catalogId: 'Leg_Press', name: 'Leg Press' },
  legcurl: { catalogId: 'Lying_Leg_Curls', name: 'Leg Curl' },
  calf: { catalogId: 'Standing_Calf_Raises', name: 'Standing Calf Raise' },
};

const slugByCatalogId = new Map(Object.entries(LEGACY_EXERCISES).map(([slug, v]) => [v.catalogId, slug]));

/**
 * The one id an exercise is stored under. A library exercise that has a legacy short id always uses it,
 * so the same lift never ends up as two different series in history and progress charts.
 */
export function canonicalId(id: string): string {
  return slugByCatalogId.get(id) ?? id;
}

/** The library entry for an id, whether it is a short legacy id or a library id. */
export function catalogEntry(id: string): CatalogExercise | undefined {
  return byId.get(LEGACY_EXERCISES[id]?.catalogId ?? id);
}

export type ExerciseInfo = {
  /** The id stored in programs and history. */
  id: string;
  name: string;
  /** Main muscle, capitalised for display ("Middle back"). */
  muscle: string;
  primary: string[];
  secondary: string[];
  equipment: string;
  level: CatalogExercise['level'];
  category: string;
  steps: string[];
  images: number;
  /** The id used for photo URLs (the library id), or null when the exercise is unknown. */
  imageId: string | null;
};

export const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const humanise = (id: string) => id.replace(/[_-]+/g, ' ').trim();

/** Everything the UI needs about an exercise. Never throws: an unknown id still gets a readable name. */
export function exerciseInfo(id: string): ExerciseInfo {
  const entry = catalogEntry(id);
  if (!entry) {
    return { id, name: humanise(id), muscle: '', primary: [], secondary: [], equipment: 'unspecified', level: 'beginner', category: 'strength', steps: [], images: 0, imageId: null };
  }
  return {
    id,
    name: LEGACY_EXERCISES[id]?.name ?? entry.name,
    muscle: capitalise(entry.primary[0] ?? ''),
    primary: entry.primary,
    secondary: entry.secondary,
    equipment: entry.equipment ?? 'unspecified',
    level: entry.level,
    category: entry.category,
    steps: entry.steps,
    images: entry.images,
    imageId: entry.id,
  };
}

/** URL of photo `index` (0 = start position, 1 = end position) for a library exercise id. */
export const exerciseImageUrl = (libraryId: string, index: number) => `${IMAGE_BASE}/${encodeURIComponent(libraryId)}/${index}.jpg`;

export function exerciseImages(id: string): string[] {
  const info = exerciseInfo(id);
  if (!info.imageId) return [];
  return Array.from({ length: info.images }, (_, i) => exerciseImageUrl(info.imageId!, i));
}

/** A sensible first weight (kg) for a new exercise: the user edits it in the workout. */
export function defaultStartWeight(id: string): number {
  const equipment = catalogEntry(id)?.equipment;
  switch (equipment) {
    case 'barbell':
    case 'e-z curl bar':
      return 20;
    case 'machine':
    case 'cable':
      return 20;
    case 'dumbbell':
    case 'kettlebells':
      return 10;
    default:
      return 0; // body weight, bands, balls and so on
  }
}

export const MUSCLES = [...new Set(catalog.flatMap((e) => e.primary))].sort();
export const EQUIPMENT = [...new Set(catalog.map((e) => e.equipment ?? 'unspecified'))].sort();
export const LEVELS: CatalogExercise['level'][] = ['beginner', 'intermediate', 'expert'];
