-- Close the couple-membership hijack: profiles.couple_id is no longer
-- client-writable (audit id 13).
--
-- What it fixes: the profiles UPDATE policy from 00001 had USING
-- (user_id = auth.uid()) and NO WITH CHECK, so Postgres reused USING as the
-- check — which pins only user_id. couple_id was therefore a raw, unvalidated
-- client write: any authenticated user could PATCH their own profile with
-- couple_id = <any existing couple uuid> and gain full read/write over that
-- couple's transactions, budgets, bills and subscription (couple uuids are not
-- secret — e.g. the RevenueCat app_user_id). The invite code was only ever
-- checked in JS.
--
-- After this migration, couple_id must remain unchanged on every client
-- UPDATE: `couple_id is not distinct from public.get_my_couple_id()`.
-- get_my_couple_id() is STABLE, so inside the UPDATE statement it evaluates
-- against the pre-statement snapshot — i.e. the OLD couple_id — making the
-- column immutable to clients. IS NOT DISTINCT FROM keeps the couple-less case
-- working (NULL stays NULL), so profile edits (display_name, language, etc.)
-- are unaffected for paired and unpaired users alike.
--
-- Joining/creating a couple now happens ONLY via the SECURITY DEFINER RPCs
-- from 00024 (create_couple / join_couple_with_code), which bypass RLS after
-- validating the invite code server-side. The delete-account edge function
-- uses the service_role key (bypasses RLS) — unaffected. No other legitimate
-- client-side writer of couple_id exists (verified: useCouple.ts and
-- onboarding.tsx legacy flows are the ones being replaced; generate-invite
-- must also switch to the RPC — see the deploy runbook).
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE.
-- Rollback: recreate the policy without the WITH CHECK clause (reopens the
-- hijack — do not do this except to unblock an emergency).

drop policy if exists "Users can update own profile" on profiles;

create policy "Users can update own profile"
  on profiles for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and couple_id is not distinct from public.get_my_couple_id()
  );
