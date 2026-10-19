-- Hardening: rows may only point at parent rows that belong to the same user.
-- Before this, RLS only checked user_id, so a user could (with a guessed uuid) attach their own set_logs /
-- meal_items to someone else's session or meal. The other user never saw them, but it should not be possible.

drop policy "own set_logs" on public.set_logs;
create policy "own set_logs" on public.set_logs
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

drop policy "own meal_items" on public.meal_items;
create policy "own meal_items" on public.meal_items
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

-- A photo row must point inside the user's own storage folder.
drop policy "own progress_photos" on public.progress_photos;
create policy "own progress_photos" on public.progress_photos
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (storage.foldername(storage_path))[1] = auth.uid()::text
  );
