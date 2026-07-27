create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Ascendant',
  avatar_url text not null default '',
  xp integer not null default 0,
  gold integer not null default 0,
  total_rp integer not null default 0,
  sex text,
  age integer,
  weight_kg numeric,
  height_cm numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_quest_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  quest_id text not null,
  reward jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, date_key, quest_id)
);

create table if not exists public.workout_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Workout',
  type text,
  "templateId" text,
  exercises jsonb not null default '[]'::jsonb,
  "durationMinutes" integer not null default 0,
  notes text,
  reward jsonb not null default '{}'::jsonb,
  "workoutSource" text,
  summary jsonb,
  "dateKey" text,
  "completedAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  completed boolean not null default false,
  "completedAt" timestamptz,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.bad_habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  streak integer not null default 0,
  "bestStreak" integer not null default 0,
  "lastResistedDate" text not null default '',
  "milestonesClaimed" jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_inventory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  inventory jsonb not null default '[]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.brain_quest_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null default '',
  question_ids jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  score integer not null default 0,
  points_awarded integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);

create table if not exists public.achievement_unlocks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  title text not null default '',
  category text not null default '',
  xp_reward integer not null default 0,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table if not exists public.rp_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null default 0,
  source text not null default 'unknown',
  "previousTotal" integer not null default 0,
  "totalRP" integer not null default 0,
  "rankId" text,
  division text,
  "createdAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_focus (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  claimed_at timestamptz,
  reward jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);

create table if not exists public.ai_workout_generations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'workoutGenerator',
  input jsonb not null default '{}'::jsonb,
  output text not null default '',
  "createdAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_meal_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'mealPlanner',
  input jsonb not null default '{}'::jsonb,
  output text not null default '',
  "createdAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_meal_scans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'mealScanner',
  input jsonb not null default '{}'::jsonb,
  output text not null default '',
  "createdAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_workout_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_history_id text,
  plan jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  "createdAt" timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_workout_schedules (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text,
  schedule jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.today_scheduled_workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  workout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);

create table if not exists public.calculator_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_usage (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  date_key text not null,
  used integer not null default 0,
  limit_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, feature, date_key)
);

alter table public.profiles enable row level security;
alter table public.daily_quest_history enable row level security;
alter table public.workout_history enable row level security;
alter table public.checklist_tasks enable row level security;
alter table public.bad_habits enable row level security;
alter table public.player_inventory enable row level security;
alter table public.brain_quest_history enable row level security;
alter table public.achievement_unlocks enable row level security;
alter table public.rp_history enable row level security;
alter table public.dashboard_focus enable row level security;
alter table public.ai_workout_generations enable row level security;
alter table public.ai_meal_plans enable row level security;
alter table public.ai_meal_scans enable row level security;
alter table public.saved_workout_plans enable row level security;
alter table public.weekly_workout_schedules enable row level security;
alter table public.today_scheduled_workouts enable row level security;
alter table public.calculator_data enable row level security;
alter table public.feature_usage enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "daily_quest_history_select_own" on public.daily_quest_history;
drop policy if exists "daily_quest_history_insert_own" on public.daily_quest_history;
drop policy if exists "daily_quest_history_update_own" on public.daily_quest_history;
drop policy if exists "daily_quest_history_delete_own" on public.daily_quest_history;
create policy "daily_quest_history_select_own" on public.daily_quest_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "daily_quest_history_insert_own" on public.daily_quest_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daily_quest_history_update_own" on public.daily_quest_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daily_quest_history_delete_own" on public.daily_quest_history for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "workout_history_select_own" on public.workout_history;
drop policy if exists "workout_history_insert_own" on public.workout_history;
drop policy if exists "workout_history_update_own" on public.workout_history;
drop policy if exists "workout_history_delete_own" on public.workout_history;
create policy "workout_history_select_own" on public.workout_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_history_insert_own" on public.workout_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_history_update_own" on public.workout_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_history_delete_own" on public.workout_history for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "checklist_tasks_select_own" on public.checklist_tasks;
drop policy if exists "checklist_tasks_insert_own" on public.checklist_tasks;
drop policy if exists "checklist_tasks_update_own" on public.checklist_tasks;
drop policy if exists "checklist_tasks_delete_own" on public.checklist_tasks;
create policy "checklist_tasks_select_own" on public.checklist_tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy "checklist_tasks_insert_own" on public.checklist_tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "checklist_tasks_update_own" on public.checklist_tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "checklist_tasks_delete_own" on public.checklist_tasks for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "bad_habits_select_own" on public.bad_habits;
drop policy if exists "bad_habits_insert_own" on public.bad_habits;
drop policy if exists "bad_habits_update_own" on public.bad_habits;
drop policy if exists "bad_habits_delete_own" on public.bad_habits;
create policy "bad_habits_select_own" on public.bad_habits for select to authenticated using ((select auth.uid()) = user_id);
create policy "bad_habits_insert_own" on public.bad_habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "bad_habits_update_own" on public.bad_habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bad_habits_delete_own" on public.bad_habits for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "player_inventory_select_own" on public.player_inventory;
drop policy if exists "player_inventory_insert_own" on public.player_inventory;
drop policy if exists "player_inventory_update_own" on public.player_inventory;
drop policy if exists "player_inventory_delete_own" on public.player_inventory;
create policy "player_inventory_select_own" on public.player_inventory for select to authenticated using ((select auth.uid()) = user_id);
create policy "player_inventory_insert_own" on public.player_inventory for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "player_inventory_update_own" on public.player_inventory for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "player_inventory_delete_own" on public.player_inventory for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "brain_quest_history_select_own" on public.brain_quest_history;
drop policy if exists "brain_quest_history_insert_own" on public.brain_quest_history;
drop policy if exists "brain_quest_history_update_own" on public.brain_quest_history;
drop policy if exists "brain_quest_history_delete_own" on public.brain_quest_history;
create policy "brain_quest_history_select_own" on public.brain_quest_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "brain_quest_history_insert_own" on public.brain_quest_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "brain_quest_history_update_own" on public.brain_quest_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "brain_quest_history_delete_own" on public.brain_quest_history for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "achievement_unlocks_select_own" on public.achievement_unlocks;
drop policy if exists "achievement_unlocks_insert_own" on public.achievement_unlocks;
drop policy if exists "achievement_unlocks_update_own" on public.achievement_unlocks;
drop policy if exists "achievement_unlocks_delete_own" on public.achievement_unlocks;
create policy "achievement_unlocks_select_own" on public.achievement_unlocks for select to authenticated using ((select auth.uid()) = user_id);
create policy "achievement_unlocks_insert_own" on public.achievement_unlocks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "achievement_unlocks_update_own" on public.achievement_unlocks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "achievement_unlocks_delete_own" on public.achievement_unlocks for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "rp_history_select_own" on public.rp_history;
drop policy if exists "rp_history_insert_own" on public.rp_history;
drop policy if exists "rp_history_update_own" on public.rp_history;
drop policy if exists "rp_history_delete_own" on public.rp_history;
create policy "rp_history_select_own" on public.rp_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "rp_history_insert_own" on public.rp_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "rp_history_update_own" on public.rp_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "rp_history_delete_own" on public.rp_history for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "dashboard_focus_select_own" on public.dashboard_focus;
drop policy if exists "dashboard_focus_insert_own" on public.dashboard_focus;
drop policy if exists "dashboard_focus_update_own" on public.dashboard_focus;
drop policy if exists "dashboard_focus_delete_own" on public.dashboard_focus;
create policy "dashboard_focus_select_own" on public.dashboard_focus for select to authenticated using ((select auth.uid()) = user_id);
create policy "dashboard_focus_insert_own" on public.dashboard_focus for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dashboard_focus_update_own" on public.dashboard_focus for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dashboard_focus_delete_own" on public.dashboard_focus for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "ai_workout_generations_select_own" on public.ai_workout_generations;
drop policy if exists "ai_workout_generations_insert_own" on public.ai_workout_generations;
drop policy if exists "ai_workout_generations_update_own" on public.ai_workout_generations;
drop policy if exists "ai_workout_generations_delete_own" on public.ai_workout_generations;
create policy "ai_workout_generations_select_own" on public.ai_workout_generations for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_workout_generations_insert_own" on public.ai_workout_generations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ai_workout_generations_update_own" on public.ai_workout_generations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_workout_generations_delete_own" on public.ai_workout_generations for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "ai_meal_plans_select_own" on public.ai_meal_plans;
drop policy if exists "ai_meal_plans_insert_own" on public.ai_meal_plans;
drop policy if exists "ai_meal_plans_update_own" on public.ai_meal_plans;
drop policy if exists "ai_meal_plans_delete_own" on public.ai_meal_plans;
create policy "ai_meal_plans_select_own" on public.ai_meal_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_meal_plans_insert_own" on public.ai_meal_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ai_meal_plans_update_own" on public.ai_meal_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_meal_plans_delete_own" on public.ai_meal_plans for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "ai_meal_scans_select_own" on public.ai_meal_scans;
drop policy if exists "ai_meal_scans_insert_own" on public.ai_meal_scans;
drop policy if exists "ai_meal_scans_update_own" on public.ai_meal_scans;
drop policy if exists "ai_meal_scans_delete_own" on public.ai_meal_scans;
create policy "ai_meal_scans_select_own" on public.ai_meal_scans for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_meal_scans_insert_own" on public.ai_meal_scans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ai_meal_scans_update_own" on public.ai_meal_scans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_meal_scans_delete_own" on public.ai_meal_scans for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "saved_workout_plans_select_own" on public.saved_workout_plans;
drop policy if exists "saved_workout_plans_insert_own" on public.saved_workout_plans;
drop policy if exists "saved_workout_plans_update_own" on public.saved_workout_plans;
drop policy if exists "saved_workout_plans_delete_own" on public.saved_workout_plans;
create policy "saved_workout_plans_select_own" on public.saved_workout_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_workout_plans_insert_own" on public.saved_workout_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saved_workout_plans_update_own" on public.saved_workout_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "saved_workout_plans_delete_own" on public.saved_workout_plans for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "weekly_workout_schedules_select_own" on public.weekly_workout_schedules;
drop policy if exists "weekly_workout_schedules_insert_own" on public.weekly_workout_schedules;
drop policy if exists "weekly_workout_schedules_update_own" on public.weekly_workout_schedules;
drop policy if exists "weekly_workout_schedules_delete_own" on public.weekly_workout_schedules;
create policy "weekly_workout_schedules_select_own" on public.weekly_workout_schedules for select to authenticated using ((select auth.uid()) = user_id);
create policy "weekly_workout_schedules_insert_own" on public.weekly_workout_schedules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "weekly_workout_schedules_update_own" on public.weekly_workout_schedules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weekly_workout_schedules_delete_own" on public.weekly_workout_schedules for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "today_scheduled_workouts_select_own" on public.today_scheduled_workouts;
drop policy if exists "today_scheduled_workouts_insert_own" on public.today_scheduled_workouts;
drop policy if exists "today_scheduled_workouts_update_own" on public.today_scheduled_workouts;
drop policy if exists "today_scheduled_workouts_delete_own" on public.today_scheduled_workouts;
create policy "today_scheduled_workouts_select_own" on public.today_scheduled_workouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "today_scheduled_workouts_insert_own" on public.today_scheduled_workouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "today_scheduled_workouts_update_own" on public.today_scheduled_workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "today_scheduled_workouts_delete_own" on public.today_scheduled_workouts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "calculator_data_select_own" on public.calculator_data;
drop policy if exists "calculator_data_insert_own" on public.calculator_data;
drop policy if exists "calculator_data_update_own" on public.calculator_data;
drop policy if exists "calculator_data_delete_own" on public.calculator_data;
create policy "calculator_data_select_own" on public.calculator_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "calculator_data_insert_own" on public.calculator_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "calculator_data_update_own" on public.calculator_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "calculator_data_delete_own" on public.calculator_data for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "feature_usage_select_own" on public.feature_usage;
drop policy if exists "feature_usage_insert_own" on public.feature_usage;
drop policy if exists "feature_usage_update_own" on public.feature_usage;
drop policy if exists "feature_usage_delete_own" on public.feature_usage;
create policy "feature_usage_select_own" on public.feature_usage for select to authenticated using ((select auth.uid()) = user_id);
create policy "feature_usage_insert_own" on public.feature_usage for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "feature_usage_update_own" on public.feature_usage for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "feature_usage_delete_own" on public.feature_usage for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.daily_quest_history,
  public.workout_history,
  public.checklist_tasks,
  public.bad_habits,
  public.player_inventory,
  public.brain_quest_history,
  public.achievement_unlocks,
  public.rp_history,
  public.dashboard_focus,
  public.ai_workout_generations,
  public.ai_meal_plans,
  public.ai_meal_scans,
  public.saved_workout_plans,
  public.weekly_workout_schedules,
  public.today_scheduled_workouts,
  public.calculator_data,
  public.feature_usage
to authenticated;
