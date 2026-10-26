import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface RateLimitConfig {
  /** usage_stats `action` enum value to count (e.g. "scan_receipt"). */
  action: string;
  /** Look-back window in seconds. */
  windowSeconds: number;
  /** Max allowed calls within the window. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  retryAfterSeconds: number;
  /** True when the meter could not be read; `allowed` is then false (fail CLOSED). */
  failed?: boolean;
}

/**
 * Per-user rate limit for the paid Gemini endpoints. Counts the caller's prior
 * `action` rows in usage_stats within the window using the USER-SCOPED client
 * (RLS policy `usage_stats_select_own` lets a user read only their own rows),
 * so no service_role is needed.
 *
 * Fails CLOSED on a counting error: this guards paid AI calls, so an unreadable
 * meter must block the call (503 via meterUnavailableResponse), never allow it.
 *
 * `reserved`: the caller already inserted this request's own usage row BEFORE
 * counting (see aiGate.ts). The count then includes it, so it is subtracted to
 * get prior usage; concurrent requests see each other's rows.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  profileId: string,
  config: RateLimitConfig,
  reserved = false,
): Promise<RateLimitResult> {
  const sinceIso = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from("usage_stats")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("action", config.action)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("rate-limit count failed; failing closed", config.action, error.code);
    return { allowed: false, used: 0, limit: config.max, retryAfterSeconds: 5, failed: true };
  }

  const used = Math.max(0, (count ?? 0) - (reserved ? 1 : 0));
  const allowed = used < config.max;
  return {
    allowed,
    used,
    limit: config.max,
    retryAfterSeconds: allowed ? 0 : config.windowSeconds,
  };
}

/** Standard 429 response with CORS headers + Retry-After. */
export function rateLimitedResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Please wait a bit before trying again.",
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: { ...corsHeaders, "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}

/** 503 returned when a usage meter cannot be read: block the paid call, ask to retry. */
export function meterUnavailableResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Service temporarily unavailable. Please try again shortly." }),
    { status: 503, headers: { ...corsHeaders, "Retry-After": "5" } },
  );
}
