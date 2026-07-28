alter table public.profiles
  add column if not exists onboarding_goal text,
  add column if not exists fitness_level text,
  add column if not exists main_objective text,
  add column if not exists weekly_training_days smallint,
  add column if not exists onboarding_completed boolean,
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed = true
where onboarding_completed is null;

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_weekly_training_days_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_weekly_training_days_check
      check (weekly_training_days is null or weekly_training_days between 1 and 7);
  end if;
end;
$$;

create table if not exists public.beta_feedback (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  message text not null,
  page_path text not null default '/',
  created_at timestamptz not null default now(),
  constraint beta_feedback_category_check check (category in ('bug', 'feedback', 'idea')),
  constraint beta_feedback_message_length_check check (char_length(message) between 3 and 2000)
);

create index if not exists beta_feedback_user_created_at_idx
  on public.beta_feedback (user_id, created_at desc);

alter table public.beta_feedback enable row level security;

drop policy if exists "beta_feedback_select_own" on public.beta_feedback;
drop policy if exists "beta_feedback_insert_own" on public.beta_feedback;

create policy "beta_feedback_select_own"
  on public.beta_feedback
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "beta_feedback_insert_own"
  on public.beta_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.beta_feedback from anon;
revoke update, delete on public.beta_feedback from authenticated;
grant select, insert on public.beta_feedback to authenticated;
