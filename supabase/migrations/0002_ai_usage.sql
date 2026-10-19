-- One row per AI meal analysis, used by the analyze-meal Edge Function for per-user rate limiting.
-- RLS is on with no policies: clients can never read or write it; only the service role (the function) can.
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  used_at timestamptz not null default now()
);

create index ai_usage_user_used_idx on public.ai_usage (user_id, used_at desc);

alter table public.ai_usage enable row level security;
