# 08 — Exercise library, programs and the program builder

## What it is
- **Exercise library:** 876 exercises with photos (873 have two photos: start and finish position), step-by-step instructions, main and secondary muscles, equipment, difficulty and category. Browse and search it from **Train → Exercise library**.
- **Photos in workouts:** the workout screen shows the exercise photo. Tap it to flip between the start and finish position; "How to" opens the full instructions.
- **Programs:** 7 ready-made programs (Push/Pull/Legs, Upper/Lower, Full Body, 5×5 Strength, Bodyweight at home, Dumbbells only, Beginner gym with machines) plus the programs you build yourself.
- **Program builder:** **Train → + New program** (or **Copy and edit** on any ready-made program). Name it, add days, pick exercises from the library, set sets, reps and rest, reorder or remove, and save. Programs you create are kept on the device.

## Where the data comes from
The text comes from the open-source [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / public domain). See [THIRD_PARTY.md](../THIRD_PARTY.md), including the note about the photographs' origin.

- Text: bundled in the app as `apps/mobile-web/src/data/exercise-catalog.json` (about 780 KB), so searching and instructions work offline.
- Photos: loaded from the jsDelivr CDN, pinned to one dataset commit, and cached on the device after the first view. Without a connection (and before a photo has been viewed once) a neutral placeholder is shown.
- Rebuild the catalog: `node scripts/build-catalog.mjs` in `apps/mobile-web`. To move to a newer dataset, change the commit in **both** `scripts/build-catalog.mjs` and `src/data/exercise-catalog.ts`.

## The exercise data model
```ts
type CatalogExercise = {
  id: string;            // e.g. "Barbell_Bench_Press_-_Medium_Grip"; also the name of its photo folder
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
  equipment: string | null;      // barbell, dumbbell, machine, cable, body only, ...
  category: string;              // strength, stretching, plyometrics, ...
  force: string | null;          // push | pull | static
  mechanic: string | null;       // compound | isolation
  primary: string[];             // main muscles
  secondary: string[];
  steps: string[];               // instructions
  images: number;                // 0, 1 or 2 photos
};

type Slot = { exerciseId: string; sets: number; repMin: number; repMax: number; restS: number; startWeight: number };
type ProgramDay = { id: string; name: string; slots: Slot[] };
type Program = { id: string; name: string; goal: string; daysPerWeek: number; days: ProgramDay[]; custom?: boolean };
```

## Exercise ids and your history
The first three programs used short ids (`bench`, `squat`, ...). Those exercises keep their short id for ever, so workout history logged before the library existed still lines up, and the same lift is always one series in the progress charts. `canonicalId()` in `src/data/exercise-catalog.ts` does the mapping. Everything else is stored under its library id.

Workout sets are stored with the exercise id as plain text. The database no longer requires that id to exist in the `exercises` table (migration 0006), because the library lives in the app, not in the database.

## Not built yet
- Custom programs are stored on the device only; they do not sync to your account.
- Exercises you invent yourself (not in the library) cannot be added.
- Time-based exercises (plank, holds) are logged as reps like everything else.
