export type Exercise = { id: string; name: string; muscle: string };

export const exercises: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Barbell Bench Press', muscle: 'Chest' },
  incline: { id: 'incline', name: 'Incline Dumbbell Press', muscle: 'Chest' },
  ohp: { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders' },
  lateral: { id: 'lateral', name: 'Lateral Raise', muscle: 'Shoulders' },
  pushdown: { id: 'pushdown', name: 'Triceps Pushdown', muscle: 'Triceps' },
  pullup: { id: 'pullup', name: 'Pull-Up', muscle: 'Back' },
  row: { id: 'row', name: 'Barbell Row', muscle: 'Back' },
  latpull: { id: 'latpull', name: 'Lat Pulldown', muscle: 'Back' },
  facepull: { id: 'facepull', name: 'Face Pull', muscle: 'Rear delts' },
  curl: { id: 'curl', name: 'Dumbbell Curl', muscle: 'Biceps' },
  squat: { id: 'squat', name: 'Back Squat', muscle: 'Quads' },
  rdl: { id: 'rdl', name: 'Romanian Deadlift', muscle: 'Hamstrings' },
  legpress: { id: 'legpress', name: 'Leg Press', muscle: 'Quads' },
  legcurl: { id: 'legcurl', name: 'Leg Curl', muscle: 'Hamstrings' },
  calf: { id: 'calf', name: 'Standing Calf Raise', muscle: 'Calves' },
};

export type Slot = {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restS: number;
  startWeight: number; // kg suggestion until real history exists
};

export type ProgramDay = { id: string; name: string; slots: Slot[] };
export type Program = { id: string; name: string; goal: string; daysPerWeek: number; days: ProgramDay[] };

const slot = (exerciseId: string, sets: number, repMin: number, repMax: number, restS: number, startWeight: number): Slot => ({
  exerciseId,
  sets,
  repMin,
  repMax,
  restS,
  startWeight,
});

export const programs: Program[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    goal: 'Muscle',
    daysPerWeek: 3,
    days: [
      {
        id: 'ppl-push',
        name: 'Push Day A',
        slots: [
          slot('bench', 4, 6, 8, 120, 60),
          slot('incline', 3, 8, 10, 90, 22),
          slot('ohp', 3, 8, 10, 90, 35),
          slot('lateral', 3, 12, 15, 60, 8),
          slot('pushdown', 3, 10, 12, 60, 25),
        ],
      },
      {
        id: 'ppl-pull',
        name: 'Pull Day A',
        slots: [
          slot('pullup', 4, 6, 10, 120, 0),
          slot('row', 4, 6, 8, 120, 50),
          slot('latpull', 3, 10, 12, 90, 45),
          slot('facepull', 3, 12, 15, 60, 20),
          slot('curl', 3, 10, 12, 60, 12),
        ],
      },
      {
        id: 'ppl-legs',
        name: 'Legs Day A',
        slots: [
          slot('squat', 4, 5, 8, 150, 70),
          slot('rdl', 3, 8, 10, 120, 60),
          slot('legpress', 3, 10, 12, 90, 120),
          slot('legcurl', 3, 10, 12, 60, 35),
          slot('calf', 4, 12, 15, 60, 40),
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    goal: 'Strength',
    daysPerWeek: 4,
    days: [
      {
        id: 'ul-upper',
        name: 'Upper',
        slots: [slot('bench', 4, 5, 6, 150, 60), slot('row', 4, 5, 6, 150, 50), slot('ohp', 3, 8, 10, 90, 35), slot('curl', 3, 10, 12, 60, 12)],
      },
      {
        id: 'ul-lower',
        name: 'Lower',
        slots: [slot('squat', 4, 5, 6, 150, 70), slot('rdl', 3, 8, 10, 120, 60), slot('legpress', 3, 10, 12, 90, 120), slot('calf', 4, 12, 15, 60, 40)],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body 3x',
    goal: 'Beginner',
    daysPerWeek: 3,
    days: [
      {
        id: 'fb-a',
        name: 'Full Body',
        slots: [slot('squat', 3, 8, 10, 120, 50), slot('bench', 3, 8, 10, 120, 40), slot('latpull', 3, 10, 12, 90, 40), slot('ohp', 2, 10, 12, 90, 25)],
      },
    ],
  },
];

export function findDay(dayId: string): ProgramDay | undefined {
  return programs.flatMap((p) => p.days).find((d) => d.id === dayId);
}
