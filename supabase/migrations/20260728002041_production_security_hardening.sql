revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

create index if not exists ai_meal_plans_user_id_idx
  on public.ai_meal_plans (user_id);

create index if not exists ai_meal_scans_user_id_idx
  on public.ai_meal_scans (user_id);

create index if not exists ai_workout_generations_user_id_idx
  on public.ai_workout_generations (user_id);

create index if not exists bad_habits_user_id_idx
  on public.bad_habits (user_id);

create index if not exists checklist_tasks_user_id_idx
  on public.checklist_tasks (user_id);

create index if not exists rp_history_user_id_idx
  on public.rp_history (user_id);

create index if not exists saved_workout_plans_user_id_idx
  on public.saved_workout_plans (user_id);

create index if not exists weekly_workout_schedules_user_id_idx
  on public.weekly_workout_schedules (user_id);

create index if not exists workout_history_user_id_idx
  on public.workout_history (user_id);
