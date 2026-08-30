# Runbook — hardening deploy (migrations 00023–00032 + edge functions)

Written 2026-08-31 during the full audit/fix pass on `feat/hardening-and-blog`.

New files (all in `supabase/migrations/`, additive + idempotent, never touch 00001–00022):

| File | Fixes |
|---|---|
| 00023_pin_security_definer_search_path.sql | pins `search_path = public, pg_temp` on `get_my_couple_id()` and `create_free_subscription_for_couple()` (audit 16, 17) |
| 00024_couple_rpcs.sql | `create_couple(p_name text default null) returns jsonb {couple_id, invite_code}` and `join_couple_with_code(p_code text) returns uuid` — SECURITY DEFINER, pinned path, row-locked/race-safe, strong `PACA-` + 10-char codes (audit 14) |
| 00025_profiles_couple_id_lockdown.sql | profiles UPDATE WITH CHECK: `couple_id is not distinct from public.get_my_couple_id()` — couple_id no longer client-writable (audit 13) |
| 00026_insert_policies_couple_check.sql | usage_stats + partner_offer_clicks INSERT WITH CHECK also requires `couple_id is null or couple_id = get_my_couple_id()` (audit 15, 19) |
| 00027_couples_update_immutable_columns.sql | BEFORE UPDATE trigger makes couples.id/invite_code immutable, created_by only clearable to NULL (keeps 00017 account-deletion FK working); explicit WITH CHECK on the UPDATE policy (audit 18) |
| 00028_admins_table.sql | `admin_users` table + SECURITY DEFINER `is_admin()`; the 4 admin policies (00010/00011/00020) re-keyed off the email claim (audit 20) |
| 00029_fix_created_by_fk_set_null.sql | **extra bug found while verifying**: 00017's DO block never replaced the NO ACTION FK from 00001, so `couples_created_by_fkey` is still NO ACTION in prod — deleting a couple creator's account FAILS today (delete-account edge fn → `auth.admin.deleteUser` hits the FK). Recreates it with ON DELETE SET NULL as 00017 intended |
| 00030_signup_language_from_metadata.sql | handle_new_user reads `raw_user_meta_data->>'language'` (device locale sent by signUp) instead of hardcoding 'en'; whitelisted to en/pt/ru/uk |
| 00031_subscriptions_rc_last_event_at.sql | adds `subscriptions.rc_last_event_at` (the last applied RC event's `event_timestamp_ms`) so the revenuecat-webhook stale-event guard compares event time vs event time instead of vs `updated_at` (processing time) — a refund delivered after a renewal is no longer dropped as stale. The webhook degrades gracefully (skips the ordering guard) until this is applied |
| 00032_replica_identity_full_for_deletes.sql | `replica identity full` on transactions + notifications so realtime DELETE payloads carry the old row's couple_id/target_user_id — clients then skip other tenants' deletes instead of refetching on every delete across the whole user base. Clients degrade gracefully until applied |

Also required after deploying functions: set `CRON_SECRET` in edge-function secrets and send `Authorization: Bearer <CRON_SECRET>` from the check-budgets scheduler (the function fails closed with 503/401 until then), and seed `admin_users` (see item 4 below).

## BREAKING for existing code — what must change
> STATUS 2026-08-31: items 1–3 and 5 are ALREADY DONE in this branch (generate-invite rewritten to the RPC, useCouple/onboarding on both apps wired to the RPCs, invite validation accepts 4–10 chars). Kept below for context; nothing remains to code — only the deploy order matters.

1. **`supabase/functions/generate-invite/index.ts`** (mobile create-couple path): it inserts into `couples` and then updates `profiles.couple_id` **under the user's JWT** — after 00025 that update is REJECTED by RLS. Replace the whole insert+update body with:
   ```ts
   const { data, error } = await supabase.rpc("create_couple");
   // data = { couple_id, invite_code }
   ```
   (or retire the function and call the RPC from the client directly). Its client-side invite-code uniqueness pre-check was already RLS-blind and is now unnecessary — the RPC retries on collision.
2. **`packages/api/src/hooks/useCouple.ts`** (client wave):
   - `useCreateCouple` → `supabase.rpc("create_couple")` (returns `{couple_id, invite_code}` — same shape it already returns). Drop `generateInviteCode()` usage + client-side couple insert + profile update.
   - `useJoinCouple` → `supabase.rpc("join_couple_with_code", { p_code: inviteCode })` (returns the couple uuid). Drop the couples select + profile update. Note: the old join was ALREADY broken under RLS (finding 14) — the RPC is the fix, not a regression risk.
   - Error mapping: RPCs raise with message tokens `PROFILE_NOT_FOUND`, `ALREADY_IN_COUPLE`, `INVALID_CODE`, `COUPLE_FULL` (in `error.message`) — map to i18n.
3. **`apps/mobile/app/onboarding.tsx`**: join flow (lines ~54–72) → same `join_couple_with_code` RPC; create flow keeps calling `generate-invite` (updated per item 1) or switches to the RPC.
4. **Old shipped app versions**: after 00025, their create/join couple flows fail (join already failed). This is the intended closure of the membership hijack. Everything else (transactions, bills, budgets, profile edits) keeps working.
5. `packages/shared/src/utils/invite.ts` `generateInviteCode()` becomes dead once clients use the RPC — candidate for deletion in the client wave. New codes are `PACA-` + 10 chars (old 9-char codes still join fine); if any UI validates code length/format, relax it.

## Deploy runbook (order matters)

All 29 migrations were validated on a scratch Postgres (Supabase-stubbed): full 00001→00029 apply, re-apply of 00023–00029 (idempotent), and behavior tests (RPC create/join incl. COUPLE_FULL/INVALID_CODE/ALREADY_IN_COUPLE, hijack blocked, benign profile edits OK paired+unpaired, forged usage_stats/click inserts blocked, admin visibility, creator account deletion now succeeds).

1. **Apply migrations** (`supabase db push` or CI): 00023→00032 in order. All are safe on the live DB; 00025 is the only behavior-breaking one (see above).
2. **Immediately deploy updated edge functions**: `generate-invite` (now RPC-based). No other function writes `profiles.couple_id` or the touched policies via user JWT; `delete-account` uses service_role — unaffected.
3. **Ship clients** (web deploy, mobile release) with the RPC-based useCouple/onboarding.
4. **Verify admin seed** (00028): `select count(*) from admin_users;` must be ≥ 1. If 0 (owner email differs in prod), run:
   `insert into admin_users (user_id) select id from auth.users where email = '<owner email>';`
   Until then the admin dashboard shows no data (no security impact).

## Smoke tests after deploy

- Fresh user A: `select create_couple();` → jsonb with couple_id + `PACA-XXXXXXXXXX` code; `subscriptions` row auto-created (status free).
- Fresh user B: `select join_couple_with_code('<code>');` → returns couple uuid; B sees A's couple data.
- Fresh user C with same code → error `COUPLE_FULL`. Garbage code → `INVALID_CODE`. B joining again → `ALREADY_IN_COUPLE`.
- REST attack replay: as any user, `PATCH /rest/v1/profiles?user_id=eq.<own>` body `{"couple_id":"<other couple uuid>"}` → 0 rows updated / RLS violation. Same with `couple_id: null` while paired → rejected (no leave-couple flow exists client-side).
- `insert into usage_stats (profile_id, couple_id, action)` with a foreign couple_id via REST → RLS violation; with own couple_id → ok.
- Couple settings still editable: update `primary_currency` / `auto_convert_currency` / `hidden_category_ids` → ok; update `invite_code` → `IMMUTABLE_COLUMN` error.
- Account deletion of a couple creator still succeeds (created_by → NULL allowed by the trigger).
- Admin account still sees the usage dashboard; a non-admin gets only own rows.

## Notes / residual risk

- **Monitor RevenueCat webhook delivery health.** Entitlement expiry is now enforced server-side (`current_period_end` + 24h grace in `isPremium`), so a webhook outage longer than the grace window downgrades paying couples until the missed events are re-delivered. Watch the RC dashboard's webhook delivery status and alert on sustained failures to the `revenuecat-webhook` endpoint.
- `couples` INSERT policy (00002) still lets a client insert a couple row directly, but after 00025 they can never link themselves to it (orphan row at worst). Consider dropping the INSERT policy once all clients are RPC-based.
- `p_name` on `create_couple` is accepted but ignored — `couples` has no name column today (frozen signature, forward-compat).
- 00025 also blocks setting couple_id back to NULL ("leave couple"). No such client flow exists today; if one is added later it needs its own SECURITY DEFINER RPC.
