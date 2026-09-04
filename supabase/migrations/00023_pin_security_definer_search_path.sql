-- Hardening: pin search_path on the existing SECURITY DEFINER functions.
--
-- What it fixes (audit ids 16, 17): get_my_couple_id() — the function every
-- tenant-isolation RLS policy depends on — and the
-- create_free_subscription_for_couple() trigger both run as their definer with
-- an UNPINNED search_path and unqualified table names. If name resolution were
-- ever redirected (an object shadowing `profiles`/`subscriptions` earlier on a
-- caller-controlled path), tenant isolation / the entitlement table could be
-- compromised. Migration 00005 already pinned handle_new_user for exactly this
-- reason; this applies the same hardening to the remaining definer functions.
--
-- Additive/idempotent: CREATE OR REPLACE only; bodies are behavior-identical,
-- just schema-qualified. Safe on the live DB.
--
-- Rollback: re-run the original definitions from 00001 (get_my_couple_id) and
-- 00018 (create_free_subscription_for_couple) — i.e. CREATE OR REPLACE without
-- the SET search_path clause. Not recommended.

create or replace function get_my_couple_id()
returns uuid as $$
  select couple_id from public.profiles where user_id = auth.uid()
$$ language sql security definer stable set search_path = public, pg_temp;

create or replace function create_free_subscription_for_couple()
returns trigger as $$
begin
  insert into public.subscriptions (couple_id) values (new.id)
    on conflict (couple_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
