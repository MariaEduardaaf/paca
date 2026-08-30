-- Constrain couple_id on client INSERTs into usage_stats and
-- partner_offer_clicks (audit ids 15, 19).
--
-- What it fixes:
-- 1) usage_stats (00010): the INSERT policy validated only profile_id, leaving
--    couple_id and action attacker-chosen. The monthly free-tier quota counts
--    usage_stats BY couple_id (quota.ts), so any user could insert forged rows
--    with a victim couple's id and action='scan_receipt'/'advise' and exhaust
--    that couple's shared monthly AI allowance (cross-tenant DoS; no DELETE
--    policy exists for the victim to clean up).
-- 2) partner_offer_clicks (00020): same pattern — click rows could be
--    attributed to any couple_id, polluting the analytics/compliance trail.
--
-- Fix: the WITH CHECK now also requires couple_id to be NULL or the caller's
-- own couple (both columns are nullable in the schema, and couple-less users
-- legitimately log with couple_id NULL). Edge functions write via service_role
-- and bypass RLS — unaffected.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE.
-- Rollback: recreate each policy with only the profile_id predicate (as in
-- 00010 / 00020).

drop policy if exists "usage_stats_insert_own" on usage_stats;

create policy "usage_stats_insert_own" on usage_stats
  for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and (couple_id is null or couple_id = public.get_my_couple_id())
  );

drop policy if exists "Users can log their own clicks" on partner_offer_clicks;

create policy "Users can log their own clicks"
  on partner_offer_clicks for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and (couple_id is null or couple_id = public.get_my_couple_id())
  );
