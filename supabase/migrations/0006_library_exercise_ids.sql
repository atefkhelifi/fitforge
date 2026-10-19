-- Exercises now come from the app's built-in library (876 entries with ids like 'Pullups' or 'Dumbbell_Flyes').
-- That library ships inside the app, so it is not copied into the database. A set can therefore be logged for an
-- exercise id that has no row in public.exercises, and the old foreign key would reject it.
-- The exercises table stays (it still lists the original 15 programme exercises); only the constraint goes.
alter table public.set_logs drop constraint if exists set_logs_exercise_id_fkey;
