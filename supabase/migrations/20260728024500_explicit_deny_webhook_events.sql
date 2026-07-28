drop policy if exists stripe_webhook_events_deny_clients
  on public.stripe_webhook_events;

create policy stripe_webhook_events_deny_clients
  on public.stripe_webhook_events
  for all
  to anon, authenticated
  using (false)
  with check (false);
