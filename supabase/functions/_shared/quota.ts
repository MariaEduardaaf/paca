import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Service-role client for couple-wide aggregate reads. The free-tier AI quota is
 * PER COUPLE (shared pool), but usage_stats RLS is per-profile (each partner only
 * sees their own rows). Counting with the user's JWT client would miss the
 * partner's usage, so the monthly quota counts via service_role (bypasses RLS).
 * Never returns rows to the client — only an internal count for the gate.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Grace period after `current_period_end` during which a stored
 * trialing/active status is still honored. Absorbs RevenueCat webhook
 * latency around a renewal without leaving entitlement open forever
 * when an EXPIRATION event is lost.
 */
const PREMIUM_EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * True if the couple is currently Premium. The stored status alone is not
 * enough: it only changes via the RevenueCat webhook, so a missed EXPIRATION
 * event would leave 'active'/'trialing' granted forever. We therefore also
 * require `current_period_end` (when set) to still be in the future (+ grace).
 * A null period end means non-expiring — trust the status. Fails to false.
 */
export async function isPremium(admin: SupabaseClient, coupleId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) {
    console.error("isPremium read failed; treating as free", error);
    return false;
  }
  if (!data || (data.status !== "active" && data.status !== "trialing")) return false;
  if (data.current_period_end == null) return true;
  const endMs = Date.parse(data.current_period_end);
  if (!Number.isFinite(endMs)) return true; // unparseable — trust the status
  return endMs + PREMIUM_EXPIRY_GRACE_MS > Date.now();
}

export interface MonthlyQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string; // ISO start of next calendar month (UTC)
}

/**
 * Counts the couple's `actions` usage in the current calendar month (UTC) and
 * decides if another call is allowed. Fails OPEN on a counting error — quota is
 * best-effort and must never block a paying-or-free user on a DB hiccup (this
 * also covers a usage_action enum value that isn't deployed yet: the count
 * errors and the gate opens instead of blocking the feature).
 *
 * Pass `coupleId: null` with a `profileId` to meter per profile instead —
 * used for actions available to users who haven't joined a couple yet.
 */
export async function checkMonthlyQuota(
  admin: SupabaseClient,
  coupleId: string | null,
  actions: string[],
  limit: number,
  profileId?: string,
): Promise<MonthlyQuotaResult> {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const resetAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();

  if (coupleId == null && !profileId) {
    console.error("monthly-quota called with no couple or profile scope; failing open", actions);
    return { allowed: true, used: 0, limit, resetAt };
  }

  let query = admin
    .from("usage_stats")
    .select("id", { count: "exact", head: true })
    .in("action", actions)
    .gte("created_at", startOfMonth);
  query = coupleId != null
    ? query.eq("couple_id", coupleId)
    : query.eq("profile_id", profileId!);
  const { count, error } = await query;

  if (error) {
    console.error("monthly-quota count failed; failing open", actions, error);
    return { allowed: true, used: 0, limit, resetAt };
  }

  const used = count ?? 0;
  return { allowed: used < limit, used, limit, resetAt };
}

/** HTTP 402 with the quota context, so the client can show the paywall. */
export function quotaExceededResponse(
  result: MonthlyQuotaResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Monthly free limit reached. Upgrade to Premium for unlimited AI.",
      code: "quota_exceeded",
      used: result.used,
      limit: result.limit,
      resetAt: result.resetAt,
    }),
    { status: 402, headers: corsHeaders },
  );
}
