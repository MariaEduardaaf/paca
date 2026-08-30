import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rateLimit.ts";
import { createAdminClient, isPremium, checkMonthlyQuota, quotaExceededResponse } from "../_shared/quota.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// Fetch FX rates for a base currency using exchangerate-api.com free tier.
// Returns a map { target: rate } where amount_in_target = amount_in_base * rate.
async function fetchRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) return {};
    return data.rates as Record<string, number>;
  } catch (err) {
    console.error("FX fetch failed for base", base, err);
    return {};
  }
}

// Convert an amount (in cents of `from`) to cents of `to`.
// Returns { converted, rate, ok }. On FX failure ok=false — the caller must
// keep the original currency/amount, never relabel unconverted money.
async function convert(
  amount: number,
  from: string,
  to: string,
  ratesCache: Map<string, Record<string, number>>
): Promise<{ converted: number; rate: number; ok: boolean }> {
  if (from === to) return { converted: amount, rate: 1, ok: true };
  let rates = ratesCache.get(from);
  if (!rates) {
    rates = await fetchRates(from);
    ratesCache.set(from, rates);
  }
  const rate = rates[to];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    return { converted: amount, rate: 1, ok: false };
  }
  return { converted: Math.round(amount * rate), rate, ok: true };
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
    // Tighter cap than receipts: statements allow up to 16k output tokens.
    const rateLimit = await checkRateLimit(supabase, profile.id, {
      action: "scan_statement",
      windowSeconds: 3600,
      max: 12,
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

    // Fetch couple's primary currency (target for conversion)
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

    const body = await req.json();
    const { image } = body;
    const requestedMode = body?.mode === "personal" ? "personal" : "couple";
    if (!image) return jsonResponse({ error: "Image required" }, 400);
    // Bound the base64 payload (~10MB decoded) before buffering/forwarding it.
    if (typeof image !== "string" || image.length > 14_000_000) {
      return jsonResponse({ error: "Image too large" }, 413);
    }

    // Personal mode must exclude the partner's personal categories — sending
    // those names to Gemini would leak private data through the prompt.
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
                  text: `Analyze this bank statement image.
Today's date is ${new Date().toISOString().split("T")[0]}.
Identify ALL visible transactions and return ONLY a valid JSON:
{
  "transactions": [
    {
      "amount": number in cents, ALWAYS POSITIVE (e.g. 1500 for 15.00 - never negative, use "type" to distinguish). The convention is the printed value multiplied by 100 for ALL currencies, INCLUDING zero-decimal currencies like JPY and KRW (e.g. a ¥1500 line -> 150000),
      "currency": "ISO 4217 code of the currency for this line (e.g. BRL, USD, EUR, GBP, UAH, RUB, ARS, MXN, JPY). Detect it from symbols (R$ = BRL, $ = USD unless another country context is clear, € = EUR, £ = GBP, ₴ = UAH, ₽ = RUB, ¥ = JPY or CNY depending on context) or from account labels like 'Conta virtual USD'. If the statement header or account name shows a currency, use that for all lines unless a specific line shows a different one. Default to BRL if truly unknown.",
      "description": "transaction description",
      "category": "one of: ${categoryList}. Pick the closest match in any language; the client will normalize the name.",
      "date": "YYYY-MM-DD - if the year is not visible in the statement, use the current year (${new Date().getFullYear()}). Never assume a past year.",
      "type": "expense" or "income",
      "confidence": number from 0 to 1
    }
  ]
}

CRITICAL rules for classifying "type":
- REFUNDS, REIMBURSEMENTS, CHARGEBACKS and REVERSALS are INCOME, not expenses.
  Detect these keywords in the description (case-insensitive, any language):
  "reembolso", "estorno", "devolução", "devolucao", "cashback", "refund",
  "reversal", "chargeback", "возврат", "повернення", "restituição", "crédito de estorno".
  These represent money RETURNING to the account, so type = "income".
- Money going OUT (purchases, bills, Pix sent, withdrawals) = "expense"
- Money coming IN (salary, Pix received, deposits, interest) = "income"
- On credit card statements, a line with a NEGATIVE sign next to an otherwise
  expense-looking merchant usually means a refund of that purchase → "income"
- Use the sign/direction shown in the statement (+ / - / credit / debit / IN / OUT)
  as the primary signal, and keywords as a secondary signal. If both agree it's
  a refund, set type = "income" and keep the original merchant name in description
  prefixed with "Reembolso: " (or leave the original if that already makes it clear).

CRITICAL: SKIP CANCELLED AND DENIED TRANSACTIONS ENTIRELY.
- DO NOT include transactions that were cancelled, denied, refused, failed or
  not authorized. They did not move money and must be OMITTED from the output.
- Keywords indicating a transaction should be SKIPPED (any language,
  case-insensitive):
  "cancelado", "cancelada", "cancelled", "canceled",
  "negado", "negada", "denied", "recusado", "recusada", "declined",
  "não autorizado", "nao autorizado", "not authorized", "unauthorized",
  "falhou", "falha", "failed", "failure",
  "pendente" (if explicitly shown as never completed), "pending",
  "rejeitado", "rejeitada", "rejected",
  "отменено", "отклонено", "скасовано", "відхилено".
- Also skip any line visually struck through, greyed out, or marked with an
  "X" / warning icon indicating it did not go through.
- If you're unsure whether a transaction completed, DO NOT include it —
  better to miss one than to add a phantom entry.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 16384,
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

    let parsed: { transactions?: Array<Record<string, unknown>> } | null = null;
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

    const rawTransactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    const ratesCache = new Map<string, Record<string, number>>();

    // Whitelist + validate each row before returning it — the image content is
    // attacker-controlled (prompt injection via OCR text), so no field is
    // forwarded unvalidated and unknown keys are dropped.
    const sanitized = rawTransactions.map((tx) => ({
      rawAmount: Math.round(Math.abs(Number(tx.amount) || 0)),
      rawCurrency: String(tx.currency ?? primaryCurrency).toUpperCase().slice(0, 3) || primaryCurrency,
      description: typeof tx.description === "string" ? tx.description.trim().slice(0, 300) : null,
      category: typeof tx.category === "string" ? tx.category.trim().slice(0, 120) : null,
      date: typeof tx.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : null,
      type: tx.type === "income" ? "income" : "expense",
      confidence: Math.min(1, Math.max(0, Number(tx.confidence) || 0)),
    }));

    // Log usage AWAITED, right after the billable Gemini call and before the
    // FX work/response: a fire-and-forget insert can be dropped when the
    // isolate is torn down, undercounting the quota/rate meters. On insert
    // failure we still return the result (metering must never break the feature).
    const { error: usageError } = await supabase
      .from("usage_stats")
      .insert({
        profile_id: profile.id,
        couple_id: profile.couple_id,
        action: "scan_statement",
        metadata: {
          transactions_count: sanitized.length,
          primary_currency: primaryCurrency,
          currencies_detected: Array.from(
            new Set(sanitized.map((t) => t.rawCurrency))
          ),
        },
      });
    if (usageError) console.error("usage log failed:", usageError);

    // Convert each transaction to the couple's primary currency. On FX failure
    // keep the ORIGINAL currency and amount and flag the row — relabeling
    // unconverted money as the primary currency would corrupt the ledger.
    const converted = await Promise.all(
      sanitized.map(async (tx) => {
        let amount = tx.rawAmount;
        let currency = tx.rawCurrency;
        let exchangeRate: number | null = 1;
        let conversionFailed = false;
        if (autoConvert) {
          const fx = await convert(tx.rawAmount, tx.rawCurrency, primaryCurrency, ratesCache);
          if (fx.ok) {
            amount = fx.converted;
            currency = primaryCurrency;
            exchangeRate = fx.rate;
          } else {
            exchangeRate = null;
            conversionFailed = true;
          }
        }

        return {
          amount,
          currency,
          original_amount: tx.rawAmount,
          original_currency: tx.rawCurrency,
          exchange_rate: exchangeRate,
          conversion_failed: conversionFailed,
          description: tx.description,
          category: tx.category,
          date: tx.date,
          type: tx.type,
          confidence: tx.confidence,
        };
      })
    );

    return jsonResponse({ transactions: converted, primary_currency: primaryCurrency });
  } catch (error) {
    console.error("scan-statement error:", error);
    return jsonResponse({ error: "Error processing statement", details: String(error) }, 500);
  }
});
