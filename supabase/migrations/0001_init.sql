-- FitForge initial schema. Every user-owned table has RLS: rows are visible only to their owner.
-- Program templates live in the app code for now (src/data/programs.ts); custom programs come later.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  sex text check (sex in ('male', 'female')),
  birth_date date,
  height_cm numeric,
  goal text check (goal in ('fat_loss', 'muscle', 'strength')),
  activity_level text,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  kcal_target int,
  protein_target int,
  carb_target int,
  fat_target int,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id text primary key,
  name text not null,
  muscle text not null
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day_id text not null,
  day_name text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  notes text
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.workout_sessions on delete cascade,
  exercise_id text not null references public.exercises,
  set_no int not null,
  weight_kg numeric not null check (weight_kg >= 0),
  reps int not null check (reps >= 0),
  rpe numeric check (rpe between 1 and 10)
);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  weight_kg numeric,
  body_fat_pct numeric,
  measurements jsonb not null default '{}'::jsonb,
  unique (user_id, date)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_path text,
  source text not null default 'manual' check (source in ('photo', 'text', 'manual'))
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  meal_id uuid not null references public.meals on delete cascade,
  name text not null,
  grams numeric,
  kcal numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric,
  confidence numeric check (confidence between 0 and 1)
);

create index set_logs_user_exercise_idx on public.set_logs (user_id, exercise_id);
create index set_logs_session_idx on public.set_logs (session_id);
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index meals_user_eaten_idx on public.meals (user_id, eaten_at desc);
create index meal_items_meal_idx on public.meal_items (meal_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.body_metrics enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "exercises are public" on public.exercises
  for select using (true);

create policy "own workout_sessions" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own set_logs" on public.set_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own body_metrics" on public.body_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meals" on public.meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meal_items" on public.meal_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create an empty profile row when a user signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Exercise library (ids match src/data/programs.ts)
insert into public.exercises (id, name, muscle) values
  ('bench', 'Barbell Bench Press', 'Chest'),
  ('incline', 'Incline Dumbbell Press', 'Chest'),
  ('ohp', 'Overhead Press', 'Shoulders'),
  ('lateral', 'Lateral Raise', 'Shoulders'),
  ('pushdown', 'Triceps Pushdown', 'Triceps'),
  ('pullup', 'Pull-Up', 'Back'),
  ('row', 'Barbell Row', 'Back'),
  ('latpull', 'Lat Pulldown', 'Back'),
  ('facepull', 'Face Pull', 'Rear delts'),
  ('curl', 'Dumbbell Curl', 'Biceps'),
  ('squat', 'Back Squat', 'Quads'),
  ('rdl', 'Romanian Deadlift', 'Hamstrings'),
  ('legpress', 'Leg Press', 'Quads'),
  ('legcurl', 'Leg Curl', 'Hamstrings'),
  ('calf', 'Standing Calf Raise', 'Calves');
