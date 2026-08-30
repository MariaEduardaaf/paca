-- Admin authorization via an allowlist table instead of a mutable email claim
-- (audit id 20).
--
-- What it fixes: four policies granted privileged access on
-- `auth.jwt() ->> 'email' in (owner emails)` — usage_stats admin SELECT
-- (00010), all-profiles SELECT (00011), partner_offers ALL incl. WRITE of
-- affiliate URLs, and all-clicks SELECT (00020). An email claim is only as
-- trustworthy as email-confirmation enforcement at the auth layer; keying
-- WRITE access to user-visible offer URLs on it is fragile. Admin is now a
-- row in admin_users (user_id-based, immutable by clients), checked through a
-- SECURITY DEFINER is_admin() helper.
--
-- admin_users has RLS enabled with NO policies: clients can never read or
-- write it; only service_role / SQL console manages membership. is_admin() is
-- SECURITY DEFINER so the policy check itself bypasses that lockout.
--
-- Seeding: the current owner accounts are inserted by email from auth.users.
-- VERIFY AFTER APPLYING (see runbook): `select count(*) from admin_users;`
-- must be >= 1 — if the owner emails differ in prod the seed inserts nothing
-- and the admin dashboard loses access until a row is inserted manually:
--   insert into admin_users (user_id)
--     select id from auth.users where email = '<owner email>';
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS /
-- ON CONFLICT DO NOTHING.
-- Rollback: recreate the four email-claim policies from 00010/00011/00020,
-- then drop function is_admin() and table admin_users.

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;
-- No policies on purpose: service_role only.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  )
$$ language sql security definer stable set search_path = public, pg_temp;

revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- Seed the current owner accounts (no-op if already present or not found).
insert into admin_users (user_id)
  select id from auth.users
  where lower(email) in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com')
  on conflict (user_id) do nothing;

-- Re-key the four admin policies on is_admin().

drop policy if exists "usage_stats_select_admin" on usage_stats;
create policy "usage_stats_select_admin" on usage_stats
  for select
  using (public.is_admin());

drop policy if exists "profiles_select_admin" on profiles;
create policy "profiles_select_admin" on profiles
  for select
  using (public.is_admin());

drop policy if exists "Admin can manage offers" on partner_offers;
create policy "Admin can manage offers"
  on partner_offers for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin can read all clicks" on partner_offer_clicks;
create policy "Admin can read all clicks"
  on partner_offer_clicks for select
  using (public.is_admin());
