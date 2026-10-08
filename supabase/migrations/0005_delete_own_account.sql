-- In-app account deletion without a server (used by the Flutter Android app).
-- A SECURITY DEFINER function the signed-in user calls via RPC
-- (`supabase.rpc('delete_own_account')`). It can only ever delete the caller
-- (auth.uid()); their rows in entries/goals/hydration/profiles cascade-delete
-- via the on-delete-cascade FKs. The web app's DELETE /api/account keeps working.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
