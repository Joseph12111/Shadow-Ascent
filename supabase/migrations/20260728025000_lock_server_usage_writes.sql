drop policy if exists feature_usage_insert_own
  on public.feature_usage;
drop policy if exists feature_usage_update_own
  on public.feature_usage;
drop policy if exists feature_usage_delete_own
  on public.feature_usage;

revoke insert, update, delete
  on table public.feature_usage
  from authenticated;
