create or replace function public.delete_own_account(confirm_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  password_hash text;
begin
  if caller_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if confirm_password is null or length(confirm_password) < 1 then
    raise exception 'password_required' using errcode = '28000';
  end if;

  select encrypted_password
    into password_hash
  from auth.users
  where id = caller_id;

  if password_hash is null or crypt(confirm_password, password_hash) <> password_hash then
    raise exception 'invalid_password' using errcode = '28000';
  end if;

  delete from auth.users
  where id = caller_id;
end;
$$;

revoke execute on function public.delete_own_account(text) from public;
revoke execute on function public.delete_own_account(text) from anon;
grant execute on function public.delete_own_account(text) to authenticated;
