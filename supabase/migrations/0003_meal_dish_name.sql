-- Keep the dish name so meals restored on another device show the same title.
alter table public.meals add column dish_name text;
