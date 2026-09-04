import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { timingSafeEqualStr } from "../_shared/crypto.ts";

// RevenueCat -> Supabase webhook. Propagates Premium to the couple (one pays ->
// both Premium). The mobile app logs into RevenueCat with the couple_id as the
// RC app_user_id, so event.app_user_id IS the couple_id.
//
// Deploy WITHOUT JWT verification (RC is not a Supabase user):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Auth is instead the shared secret configured in the RC dashboard "Authorization
// header", checked here against REVENUECAT_WEBHOOK_SECRET.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function planFromProduct(productId?: string): "monthly" | "annual" | null {
  if (!productId) return null;
  const p = productId.toLowerCase();
  if (p.includes("annual") || p.includes("year") || p.includes("anual")) return "annual";
  if (p.includes("month") || p.includes("mensal") || p.includes("mes")) return "monthly";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) Authenticate the webhook itself (shared secret from the RC dashboard).
    //    Constant-time compare — this header is the sole auth on a
    //    service_role entitlement writer.
    const expected = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    const got = req.headers.get("Authorization");
    if (!expected || !got || !timingSafeEqualStr(got, expected)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => null);
    const event = payload?.event;
    if (!event?.id || !event?.type) return json({ error: "Bad payload" }, 400);

    const coupleId: string | undefined = event.app_user_id;
    // Anonymous / non-couple app user ids (e.g. $RCAnonymousID:...) — nothing to
    // map; ack so RC doesn't retry forever.
    if (!coupleId || !UUID_RE.test(coupleId)) return json({ ok: true, ignored: "no_couple" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2) Map app_user_id -> couple. Ack-and-skip if the couple doesn't exist.
    const { data: couple } = await admin
      .from("couples")
      .select("id")
      .eq("id", coupleId)
      .maybeSingle();
    if (!couple) return json({ ok: true, ignored: "unknown_couple" });

    // 3) Idempotency: skip an event we've already applied. select("*") so the
    //    read works (and rc_last_event_at just comes back absent) while
    //    migration 00031 hasn't been applied yet.
    const { data: existing } = await admin
      .from("subscriptions")
      .select("*")
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (existing?.rc_last_event_id === event.id) {
      return json({ ok: true, idempotent: true });
    }

    // 3b) Ordering: RevenueCat does not guarantee delivery order, and a delayed
    //     retry of an OLDER event (e.g. an annual RENEWAL with a still-future
    //     expiry) must not overwrite a newer EXPIRATION. Compare the event's
    //     timestamp against rc_last_event_at — the event_timestamp_ms of the
    //     LAST APPLIED event (00031), i.e. event time vs event time — and skip
    //     events strictly older. (Comparing against updated_at, our processing
    //     time, wrongly dropped a refund emitted seconds after a renewal but
    //     delivered later.) While 00031 is unapplied the column is absent from
    //     the row, rc_last_event_at reads null and the guard is skipped —
    //     event-id idempotency above still protects against duplicates.
    const eventTsMs: number | null =
      typeof event.event_timestamp_ms === "number" ? event.event_timestamp_ms : null;
    const lastEventAtMs: number | null =
      existing?.rc_last_event_id && typeof existing?.rc_last_event_at === "string"
        ? Date.parse(existing.rc_last_event_at)
        : null;
    if (
      eventTsMs != null &&
      lastEventAtMs != null &&
      Number.isFinite(lastEventAtMs) &&
      eventTsMs < lastEventAtMs
    ) {
      return json({ ok: true, ignored: "stale_event" });
    }

    // 4) Derive entitlement from the event. Any event whose entitlement is still
    //    in the future means Premium; EXPIRATION or a past expiry means expired.
    //    period_type TRIAL/INTRO -> trialing. CANCELLATION still has a future
    //    expiry (auto-renew off, active until period end) so it stays Premium —
    //    EXCEPT when the cancellation is a refund (cancel_reason
    //    CUSTOMER_SUPPORT): the money went back, so entitlement ends now.
    const expMs: number | null = event.expiration_at_ms ?? null;
    const inFuture = expMs != null && expMs > Date.now();
    const isTrial = event.period_type === "TRIAL" || event.period_type === "INTRO";
    const isRefund =
      event.type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT";

    let status: "free" | "trialing" | "active" | "expired";
    if (event.type === "EXPIRATION" || isRefund) status = "expired";
    else if (inFuture) status = isTrial ? "trialing" : "active";
    else status = "expired";

    const periodEndIso = expMs != null ? new Date(expMs).toISOString() : null;

    const row: Record<string, unknown> = {
      couple_id: coupleId,
      status,
      plan: planFromProduct(event.product_id),
      current_period_end: periodEndIso,
      trial_end: isTrial ? periodEndIso : null,
      rc_app_user_id: coupleId,
      rc_entitlement: Array.isArray(event.entitlement_ids)
        ? event.entitlement_ids[0] ?? null
        : event.entitlement_id ?? null,
      rc_last_event_id: event.id,
      updated_at: new Date().toISOString(),
    };
    // Record the applied event's own timestamp for the ordering guard (3b).
    // Omitted (previous value kept) when RC didn't send one.
    if (eventTsMs != null) row.rc_last_event_at = new Date(eventTsMs).toISOString();

    let { error } = await admin
      .from("subscriptions")
      .upsert(row, { onConflict: "couple_id" });

    // Degrade gracefully while migration 00031 is unapplied: the column is
    // unknown (Postgres 42703, or PostgREST PGRST204 from a stale schema
    // cache) — retry without it rather than failing the entitlement write.
    if (
      error &&
      "rc_last_event_at" in row &&
      (error.code === "42703" || error.code === "PGRST204")
    ) {
      delete row.rc_last_event_at;
      ({ error } = await admin
        .from("subscriptions")
        .upsert(row, { onConflict: "couple_id" }));
    }

    if (error) {
      console.error("revenuecat-webhook upsert failed", error);
      return json({ error: "DB error" }, 500);
    }

    return json({ ok: true, couple_id: coupleId, status });
  } catch (err) {
    console.error("revenuecat-webhook error", err);
    return json({ error: "Server error" }, 500);
  }
});
