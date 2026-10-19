-- Progress photos: a metadata table plus a PRIVATE storage bucket.
-- Files live under "<user id>/<file>" and storage policies only allow a user to touch their own folder.
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  angle text not null check (angle in ('front', 'side', 'back')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index progress_photos_user_date_idx on public.progress_photos (user_id, date desc);

alter table public.progress_photos enable row level security;

create policy "own progress_photos" on public.progress_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "read own progress photo files" on storage.objects
  for select using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "upload own progress photo files" on storage.objects
  for insert with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own progress photo files" on storage.objects
  for delete using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
