create table if not exists public.progress_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('xp', 'gold')),
  event_type text not null check (event_type in ('earned', 'spent')),
  amount integer not null check (amount > 0),
  reason text not null default 'progressUpdate',
  total_after integer check (total_after is null or total_after >= 0),
  created_at timestamptz not null default now()
);

create index if not exists progress_events_user_created_at_idx
  on public.progress_events (user_id, created_at);

alter table public.progress_events enable row level security;

drop policy if exists "progress_events_select_own" on public.progress_events;
drop policy if exists "progress_events_insert_own" on public.progress_events;

create policy "progress_events_select_own"
  on public.progress_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "progress_events_insert_own"
  on public.progress_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.progress_events from anon;
grant select, insert on table public.progress_events to authenticated;
