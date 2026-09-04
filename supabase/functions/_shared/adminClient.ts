import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Service-role client for couple-wide aggregate reads. The free-tier AI quota is
 * PER COUPLE (shared pool), but usage_stats RLS is per-profile (each partner only
 * sees their own rows). Counting with the user's JWT client would miss the
 * partner's usage, so the monthly quota counts via service_role (bypasses RLS).
 * Never returns rows to the client — only an internal count for the gate.
 *
 * Lives apart from quota.ts on purpose: this is the only piece that needs the
 * Deno runtime (Deno.env) and a value-level JSR import. Keeping it out of
 * quota.ts lets the quota decision logic be imported (and tested) outside Deno.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
