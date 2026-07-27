alter table public.checklist_tasks
  add column if not exists reminder jsonb not null default '{}'::jsonb;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;

create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notification_preferences_delete_own"
  on public.notification_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.notification_preferences to authenticated;
