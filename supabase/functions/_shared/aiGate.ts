import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, meterUnavailableResponse, rateLimitedResponse } from "./rateLimit.ts";
import { checkMonthlyQuota, isPremium, quotaExceededResponse } from "./quota.ts";

// Type-only imports: like quota.ts, this stays runtime-free so it is unit-testable.

export interface AiGateConfig {
  /** usage_stats `action` for this endpoint. */
  action: string;
  windowSeconds: number;
  max: number;
  /** Free-tier monthly pool (skipped for Premium). Omit for no monthly quota. */
  quota?: { actions: string[]; limit: number };
}

export type AiGateResult =
  | { response: Response }
  | {
    premium: boolean;
    /** Call when the AI was NOT reached (e.g. 400 validation): frees the reservation. */
    release: () => Promise<void>;
    /** Call after a successful AI call: attaches metadata to the reserved row. */
    finalize: (metadata: Record<string, unknown>) => Promise<void>;
  };

/**
 * Gate for every paid AI endpoint. Order matters:
 *  1. RESERVE: insert the usage row BEFORE counting, so concurrent requests see
 *     each other (a burst can no longer pass before the first success is logged).
 *  2. Count (rate, then monthly quota). Any count error fails CLOSED -> 503.
 *  3. Over a limit -> the reservation is deleted (service role) and 429/402.
 *
 * Once the AI is called the reservation stays counted even if the AI call fails
 * (cost-safe: Gemini may bill a failed request, and retry loops stay capped).
 * Callers release it only on early returns that never reach the AI.
 */
export async function reserveAiCall(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  profile: { id: string; couple_id: string | null },
  config: AiGateConfig,
  corsHeaders: Record<string, string>,
): Promise<AiGateResult> {
  const { data: row, error: insertError } = await supabase
    .from("usage_stats")
    .insert({
      profile_id: profile.id,
      couple_id: profile.couple_id,
      action: config.action,
      metadata: { reserved: true },
    })
    .select("id")
    .single();
  if (insertError || !row) {
    console.error("usage reservation failed; failing closed", config.action, insertError?.code);
    return { response: meterUnavailableResponse(corsHeaders) };
  }
  const id: string = row.id;
  const release = async () => {
    const { error } = await admin.from("usage_stats").delete().eq("id", id);
    if (error) console.error("usage release failed", error.code);
  };

  const rate = await checkRateLimit(supabase, profile.id, config, true);
  if (!rate.allowed) {
    await release();
    return {
      response: rate.failed ? meterUnavailableResponse(corsHeaders) : rateLimitedResponse(rate, corsHeaders),
    };
  }

  const premium = profile.couple_id ? await isPremium(admin, profile.couple_id) : false;
  if (!premium && config.quota) {
    // profile.id scopes the pool per profile when there is no couple.
    const quota = await checkMonthlyQuota(
      admin,
      profile.couple_id,
      config.quota.actions,
      config.quota.limit,
      profile.id,
      true,
    );
    if (!quota.allowed) {
      await release();
      return {
        response: quota.failed ? meterUnavailableResponse(corsHeaders) : quotaExceededResponse(quota, corsHeaders),
      };
    }
  }

  return {
    premium,
    release,
    finalize: async (metadata) => {
      const { error } = await admin.from("usage_stats").update({ metadata }).eq("id", id);
      if (error) console.error("usage finalize failed", error.code);
    },
  };
}
