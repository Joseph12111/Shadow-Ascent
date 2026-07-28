create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_id text not null default 'awakened'
    check (plan_id in ('awakened', 'hunter', 'shadow-elite', 'monarch')),
  billing_cycle text
    check (billing_cycle is null or billing_cycle in ('monthly', 'annual')),
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.subscriptions from anon;
revoke insert, update, delete on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon;
revoke all on table public.stripe_webhook_events from authenticated;

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
  v_date_key text := to_char(timezone('UTC', now()), 'YYYY-MM');
  v_usage_id text := concat(p_user_id::text, '-', v_date_key, '-', p_feature);
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
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

  v_limit := case
    when v_plan_id = 'hunter' and p_feature = 'mealScanner' then 15
    when v_plan_id = 'shadow-elite' and p_feature = 'mealScanner' then 30
    when v_plan_id = 'monarch' and p_feature = 'mealScanner' then 110
    when v_plan_id in ('shadow-elite', 'monarch') then 4
    when p_feature = 'mealScanner' then 1
    else 2
  end;

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
    v_date_key,
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
      'planId', v_plan_id
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
    'planId', v_plan_id
  );
end;
$$;

create or replace function public.refund_ai_usage(
  p_user_id uuid,
  p_feature text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date_key text := to_char(timezone('UTC', now()), 'YYYY-MM');
  v_usage_id text := concat(p_user_id::text, '-', v_date_key, '-', p_feature);
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  update public.feature_usage
     set used = greatest(0, used - 1),
         updated_at = now()
   where id = v_usage_id;
end;
$$;

revoke all on function public.consume_ai_usage(uuid, text) from public;
revoke all on function public.consume_ai_usage(uuid, text) from anon;
revoke all on function public.consume_ai_usage(uuid, text) from authenticated;
grant execute on function public.consume_ai_usage(uuid, text) to service_role;

revoke all on function public.refund_ai_usage(uuid, text) from public;
revoke all on function public.refund_ai_usage(uuid, text) from anon;
revoke all on function public.refund_ai_usage(uuid, text) from authenticated;
grant execute on function public.refund_ai_usage(uuid, text) to service_role;
