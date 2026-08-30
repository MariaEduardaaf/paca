import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rateLimit.ts";
import { createAdminClient, isPremium, checkMonthlyQuota, quotaExceededResponse } from "../_shared/quota.ts";
import { convert } from "../_shared/fx.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Not authenticated" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.couple_id) return jsonResponse({ error: "No couple found" }, 403);

    // Throttle the paid Gemini scan per user to prevent runaway billing abuse.
    const rateLimit = await checkRateLimit(supabase, profile.id, {
      action: "scan_receipt",
      windowSeconds: 3600,
      max: 30,
    });
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit, corsHeaders);

    // Free tier: 10 AI scans/month per couple (receipt + statement share the pool).
    // Premium couples bypass. Counted server-side across both partners (service_role).
    const admin = createAdminClient();
    const premium = await isPremium(admin, profile.couple_id);
    if (!premium) {
      const quota = await checkMonthlyQuota(
        admin,
        profile.couple_id,
        ["scan_receipt", "scan_statement"],
        10,
      );
      if (!quota.allowed) return quotaExceededResponse(quota, corsHeaders);
    }

    const { data: couple } = await supabase
      .from("couples")
      .select("primary_currency, auto_convert_currency")
      .eq("id", profile.couple_id)
      .single();
    const primaryCurrency: string = (couple?.primary_currency ?? "BRL").toUpperCase();
    // The original-currency ledger (auto-convert OFF) is a Premium feature.
    // Enforce it HERE, not in the UI: free couples always convert to the
    // primary currency no matter what the couples flag says.
    const autoConvert: boolean = premium ? (couple?.auto_convert_currency ?? true) : true;

    // Parse body early so we can read the requested mode for category scoping.
    const body = await req.json();
    const { image } = body;
    const requestedMode = body?.mode === "personal" ? "personal" : "couple";
    if (!image) return jsonResponse({ error: "Image required" }, 400);
    // Bound the base64 payload (~10MB decoded) before buffering/forwarding it.
    if (typeof image !== "string" || image.length > 14_000_000) {
      return jsonResponse({ error: "Image too large" }, 413);
    }

    // Fetch the categories the AI is allowed to pick from. Personal mode must
    // exclude the partner's personal categories — sending those names to Gemini
    // would leak private data through the prompt context.
    let categoryQuery = supabase
      .from("categories")
      .select("name, name_translations, is_default");
    if (requestedMode === "personal") {
      categoryQuery = categoryQuery.or(
        `is_default.eq.true,and(scope.eq.personal,owner_id.eq.${profile.id})`
      );
    } else {
      categoryQuery = categoryQuery.or(
        `is_default.eq.true,and(scope.eq.couple,couple_id.eq.${profile.couple_id})`
      );
    }
    const { data: categoryRows } = await categoryQuery;
    const categoryNames = Array.from(
      new Set(
        (categoryRows ?? []).flatMap((c: { name: string; name_translations: Record<string, string> | null }) => [
          c.name,
          ...Object.values(c.name_translations ?? {}),
        ])
      )
    ).filter(Boolean);
    const categoryList = categoryNames.length > 0
      ? categoryNames.join(", ")
      : "Alimentacao, Transporte, Moradia, Lazer, Saude, Educacao, Compras, Entretenimento, Outros";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "image/png", data: image } },
                {
                  text: `Analyze this receipt/payment proof/payment notification image.
Today's date is ${new Date().toISOString().split("T")[0]}.
Extract the following information and return ONLY a valid JSON:
{
  "amount": number in cents, ALWAYS POSITIVE (e.g. 1500 for 15.00 - never negative, use "type" to distinguish). The convention is the printed value multiplied by 100 for ALL currencies, INCLUDING zero-decimal currencies like JPY and KRW (e.g. a ¥1500 receipt -> 150000),
  "currency": "ISO 4217 code of the currency (e.g. BRL, USD, EUR, GBP, UAH, RUB, ARS, MXN, JPY). Detect it from symbols (R$ = BRL, $ = USD unless another country context is clear, € = EUR, £ = GBP, ₴ = UAH, ₽ = RUB, ¥ = JPY or CNY depending on context) or from text. Default to BRL if truly unknown.",
  "description": "store name or description",
  "category": "one of: ${categoryList}. Pick the closest match in any language; the client will normalize the name.",
  "date": "YYYY-MM-DD - if the year is not visible, use the current year (${new Date().getFullYear()}). Never assume a past year.",
  "type": "expense" or "income",
  "confidence": number from 0 to 1 indicating extraction confidence
}

CRITICAL rules for classifying "type":
- REFUNDS, REIMBURSEMENTS, CHARGEBACKS and REVERSALS are INCOME, not expenses.
  Detect these keywords anywhere in the image (case-insensitive, any language):
  "reembolso", "estorno", "devolução", "devolucao", "cashback", "refund",
  "reversal", "chargeback", "возврат", "повернення", "restituição", "crédito de estorno".
  These represent money RETURNING to the user, so type = "income".
- A receipt/proof for a PURCHASE = "expense"
- A receipt/proof for a REFUND or money RECEIVED (Pix received, deposit, salary) = "income"
- If the image clearly shows a refund of a previous purchase, set type = "income"
  and keep the original merchant name in description, optionally prefixed with
  "Reembolso: ".

CRITICAL: CANCELLED OR DENIED TRANSACTIONS MUST NOT BE EXTRACTED.
- If the image clearly shows the transaction was CANCELLED, DENIED, REFUSED,
  FAILED, NOT AUTHORIZED, REJECTED, or otherwise did not complete — return
  an error response with all fields set to null and confidence 0. The money
  did not move, so there is nothing to record.
- Keywords indicating the transaction FAILED (any language, case-insensitive):
  "cancelado", "cancelada", "cancelled", "canceled",
  "negado", "negada", "denied", "recusado", "recusada", "declined",
  "não autorizado", "nao autorizado", "not authorized", "unauthorized",
  "falhou", "falha", "failed", "failure",
  "rejeitado", "rejeitada", "rejected",
  "отменено", "отклонено", "скасовано", "відхилено".
- Also skip if the image is a screenshot of a pending payment that was
  never confirmed, or an authorization hold that was released.
- When in doubt, set confidence low rather than fabricating a completed
  transaction.

If you cannot identify a field, use null.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return jsonResponse({ error: "AI service error", details: data.error?.message }, 502);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Unexpected AI response:", JSON.stringify(data));
      return jsonResponse({ error: "Unexpected AI response", details: data }, 502);
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not extract JSON from:", text);
        return jsonResponse({ error: "Could not extract data", raw: text }, 422);
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("JSON parse failed:", e, "raw:", text);
        return jsonResponse({ error: "Invalid JSON from AI", raw: text }, 422);
      }
    }

    // Whitelist + validate the model output before returning it — the image
    // content is attacker-controlled (prompt injection via OCR text), so no
    // field is forwarded unvalidated and unknown keys are dropped.
    const confidence = Math.min(1, Math.max(0, Number(parsed?.confidence) || 0));
    const description = typeof parsed?.description === "string"
      ? parsed.description.trim().slice(0, 300)
      : null;
    const category = typeof parsed?.category === "string"
      ? parsed.category.trim().slice(0, 120)
      : null;
    const date = typeof parsed?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : null;
    const txType = parsed?.type === "income" ? "income" : "expense";

    if (!parsed || parsed.amount == null) {
      // Nothing to convert — return the sanitized shell (filtered client-side)
      return jsonResponse({ amount: null, description, category, date, type: txType, confidence });
    }

    const rawAmount = Math.round(Math.abs(Number(parsed.amount) || 0));
    const rawCurrency = String(parsed.currency ?? primaryCurrency)
      .toUpperCase()
      .slice(0, 3) || primaryCurrency;

    // Log usage AWAITED, right after the billable Gemini call and before
    // returning: a fire-and-forget insert can be dropped when the isolate is
    // torn down, undercounting the quota/rate meters. On insert failure we
    // still return the result (metering must never break the feature).
    // The insert and the FX lookup are independent, so run them concurrently.
    const usagePromise = supabase
      .from("usage_stats")
      .insert({
        profile_id: profile.id,
        couple_id: profile.couple_id,
        action: "scan_receipt",
        metadata: {
          currency: rawCurrency,
          primary_currency: primaryCurrency,
          confidence,
          converted: rawCurrency !== primaryCurrency,
        },
      });
    const [{ error: usageError }, fx] = await Promise.all([
      usagePromise,
      autoConvert ? convert(rawAmount, rawCurrency, primaryCurrency) : Promise.resolve(null),
    ]);
    if (usageError) console.error("usage log failed:", usageError);

    let amount = rawAmount;
    let currency = rawCurrency;
    let exchangeRate: number | null = 1;
    let conversionFailed = false;
    if (fx) {
      if (fx.ok) {
        amount = fx.converted;
        currency = primaryCurrency;
        exchangeRate = fx.rate;
      } else {
        // FX lookup failed: keep the ORIGINAL currency and amount and flag it.
        // Relabeling an unconverted amount as the primary currency would
        // silently corrupt the ledger.
        exchangeRate = null;
        conversionFailed = true;
      }
    }

    return jsonResponse({
      amount,
      currency,
      original_amount: rawAmount,
      original_currency: rawCurrency,
      exchange_rate: exchangeRate,
      conversion_failed: conversionFailed,
      description,
      category,
      date,
      type: txType,
      confidence,
    });
  } catch (error) {
    console.error("scan-receipt error:", error);
    return jsonResponse({ error: "Error processing image", details: String(error) }, 500);
  }
});
