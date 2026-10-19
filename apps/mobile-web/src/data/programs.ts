import { defaultStartWeight } from './exercise-catalog';

export type Slot = {
  /** An exercise id: a short legacy id ("bench") or a library id ("Dumbbell_Flyes"). See exercise-catalog.ts. */
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restS: number;
  startWeight: number; // kg suggestion until real history exists
};

export type ProgramDay = { id: string; name: string; slots: Slot[] };
export type Program = {
  id: string;
  name: string;
  goal: string;
  daysPerWeek: number;
  days: ProgramDay[];
  /** True for programs the user created; built-in templates are read-only. */
  custom?: boolean;
};

export const slot = (
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  restS: number,
  startWeight: number = defaultStartWeight(exerciseId),
): Slot => ({ exerciseId, sets, repMin, repMax, restS, startWeight });

/** Built-in programs. Ids ("ppl-push") are stored in workout history, so never rename them. */
export const templatePrograms: Program[] = [
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
  {
    id: 'five-by-five',
    name: '5×5 Strength',
    goal: 'Strength',
    daysPerWeek: 3,
    days: [
      {
        id: 'five-a',
        name: 'Workout A',
        slots: [slot('squat', 5, 5, 5, 180), slot('bench', 5, 5, 5, 180), slot('row', 5, 5, 5, 180)],
      },
      {
        id: 'five-b',
        name: 'Workout B',
        slots: [slot('squat', 5, 5, 5, 180), slot('ohp', 5, 5, 5, 180), slot('Barbell_Deadlift', 1, 5, 5, 180)],
      },
    ],
  },
  {
    id: 'home-bodyweight',
    name: 'Bodyweight at home',
    goal: 'Beginner',
    daysPerWeek: 3,
    days: [
      {
        id: 'home-a',
        name: 'Home A',
        slots: [
          slot('Pushups', 3, 8, 15, 60),
          slot('Bodyweight_Squat', 3, 12, 20, 60),
          slot('Bodyweight_Walking_Lunge', 3, 10, 12, 60),
          slot('Superman', 3, 12, 15, 45),
          slot('Crunches', 3, 15, 20, 45),
        ],
      },
      {
        id: 'home-b',
        name: 'Home B',
        slots: [
          slot('Push-Ups_With_Feet_Elevated', 3, 8, 12, 60),
          slot('Inverted_Row', 3, 8, 12, 60),
          slot('Split_Squats', 3, 10, 12, 60),
          slot('Butt_Lift_Bridge', 3, 15, 20, 45),
          slot('Dips_-_Triceps_Version', 3, 8, 12, 60),
        ],
      },
    ],
  },
  {
    id: 'dumbbell-only',
    name: 'Dumbbells only',
    goal: 'Muscle',
    daysPerWeek: 3,
    days: [
      {
        id: 'db-a',
        name: 'Dumbbell A',
        slots: [
          slot('Dumbbell_Bench_Press', 3, 8, 12, 90),
          slot('One-Arm_Dumbbell_Row', 3, 8, 12, 90),
          slot('Split_Squat_with_Dumbbells', 3, 10, 12, 90),
          slot('Dumbbell_Shoulder_Press', 3, 8, 12, 90),
          slot('curl', 2, 10, 12, 60),
        ],
      },
      {
        id: 'db-b',
        name: 'Dumbbell B',
        slots: [
          slot('Stiff-Legged_Dumbbell_Deadlift', 3, 10, 12, 90),
          slot('incline', 3, 8, 12, 90),
          slot('Dumbbell_Flyes', 3, 12, 15, 60),
          slot('Hammer_Curls', 3, 10, 12, 60),
          slot('Calf_Raise_On_A_Dumbbell', 3, 15, 20, 45),
        ],
      },
    ],
  },
  {
    id: 'beginner-machines',
    name: 'Beginner gym (machines)',
    goal: 'Beginner',
    daysPerWeek: 3,
    days: [
      {
        id: 'mach-a',
        name: 'Machines A',
        slots: [
          slot('Leverage_Chest_Press', 3, 10, 12, 90),
          slot('Seated_Cable_Rows', 3, 10, 12, 90),
          slot('legpress', 3, 10, 12, 90),
          slot('Leg_Extensions', 3, 12, 15, 60),
          slot('Cable_Crunch', 3, 12, 15, 45),
        ],
      },
      {
        id: 'mach-b',
        name: 'Machines B',
        slots: [
          slot('latpull', 3, 10, 12, 90),
          slot('Cable_Seated_Lateral_Raise', 3, 12, 15, 60),
          slot('legcurl', 3, 10, 12, 60),
          slot('pushdown', 3, 10, 12, 60),
          slot('calf', 3, 12, 15, 45),
        ],
      },
    ],
  },
];

/** Finds a day by id in a list of programs. */
export function findDayIn(programs: Program[], dayId: string): ProgramDay | undefined {
  return programs.flatMap((p) => p.days).find((d) => d.id === dayId);
}
