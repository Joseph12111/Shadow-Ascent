create or replace function public.consume_ai_usage(
  p_user_id uuid,
  p_feature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id text := 'awakened';
  v_limit integer := 0;
  v_used integer := 0;
  v_level integer := 1;
  v_period_key text := to_char(timezone('UTC', now()), 'YYYY-MM');
  v_period text := 'monthly';
  v_usage_id text;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  if p_feature not in ('workoutGenerator', 'mealPlanner', 'mealScanner') then
    return jsonb_build_object('allowed', false, 'used', 0, 'limit', 0);
  end if;

  select subscriptions.plan_id
    into v_plan_id
    from public.subscriptions
   where subscriptions.user_id = p_user_id
     and subscriptions.status in ('active', 'trialing')
     and (
       subscriptions.current_period_end is null
       or subscriptions.current_period_end > now()
     )
   limit 1;

  v_plan_id := coalesce(v_plan_id, 'awakened');

  if p_feature = 'mealScanner' and v_plan_id = 'awakened' then
    select greatest(1, floor(greatest(0, coalesce(profiles.xp, 0)) / 100.0)::integer + 1)
      into v_level
      from public.profiles
     where profiles.id = p_user_id;

    v_level := coalesce(v_level, 1);
    v_limit := floor(v_level / 10.0)::integer;
    v_period_key := 'level-entitlement';
    v_period := 'level';
  elsif p_feature = 'mealScanner' then
    v_limit := case
      when v_plan_id = 'hunter' then 1
      when v_plan_id = 'shadow-elite' then 3
      when v_plan_id = 'monarch' then 7
      else 0
    end;
    v_period_key := to_char(timezone('UTC', now()), 'YYYY-MM-DD');
    v_period := 'daily';
  else
    v_limit := case
      when v_plan_id in ('shadow-elite', 'monarch') then 4
      when v_plan_id = 'hunter' then 2
      else 1
    end;
  end if;

  v_usage_id := concat(p_user_id::text, '-', v_period_key, '-', p_feature);

  insert into public.feature_usage (
    id,
    user_id,
    feature,
    date_key,
    used,
    limit_count,
    updated_at
  )
  values (
    v_usage_id,
    p_user_id,
    p_feature,
    v_period_key,
    0,
    v_limit,
    now()
  )
  on conflict (id) do update
    set limit_count = excluded.limit_count,
        updated_at = excluded.updated_at;

  select feature_usage.used
    into v_used
    from public.feature_usage
   where feature_usage.id = v_usage_id
   for update;

  if v_used >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'used', v_used,
      'limit', v_limit,
      'remaining', 0,
      'planId', v_plan_id,
      'period', v_period,
      'periodKey', v_period_key,
      'level', v_level
    );
  end if;

  update public.feature_usage
     set used = used + 1,
         limit_count = v_limit,
         updated_at = now()
   where id = v_usage_id
   returning used into v_used;

  return jsonb_build_object(
    'allowed', true,
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used),
    'planId', v_plan_id,
    'period', v_period,
    'periodKey', v_period_key,
    'level', v_level
  );
end;
$$;
