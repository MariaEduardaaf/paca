import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rateLimit.ts";
import { createAdminClient } from "../_shared/adminClient.ts";
import { isPremium, checkMonthlyQuota, quotaExceededResponse } from "../_shared/quota.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const SUPPORTED_LOCALES = ["en", "pt", "ru", "uk"] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

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
    if (!profile) return jsonResponse({ error: "Profile not found" }, 403);

    // Parse + validate the body BEFORE any metering round-trips, so a
    // malformed request costs zero extra queries.
    const { name, sourceLocale } = await req.json();
    if (!name || typeof name !== "string") {
      return jsonResponse({ error: "name required" }, 400);
    }
    const source = SUPPORTED_LOCALES.includes(sourceLocale as Locale)
      ? (sourceLocale as Locale)
      : "en";

    // Throttle the paid Gemini translation per user to prevent runaway billing abuse.
    const rateLimit = await checkRateLimit(supabase, profile.id, {
      action: "translate",
      windowSeconds: 3600,
      max: 30,
    });
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit, corsHeaders);

    // Monthly ceiling so this is not the one unmetered Gemini path: 100
    // translations/month per couple (per profile for users without a couple).
    // Premium couples bypass. checkMonthlyQuota fails OPEN on a count error —
    // including when the 'translate' usage_action enum value (migration 00022)
    // isn't applied yet — so a missing enum can never block the feature.
    // The two checks are independent reads, so run them concurrently; the
    // quota count is simply ignored for premium couples.
    const admin = createAdminClient();
    const [premium, quota] = await Promise.all([
      profile.couple_id ? isPremium(admin, profile.couple_id) : Promise.resolve(false),
      checkMonthlyQuota(admin, profile.couple_id, ["translate"], 100, profile.id),
    ]);
    if (!premium && !quota.allowed) return quotaExceededResponse(quota, corsHeaders);

    const prompt = `Translate the personal finance category name "${name}" (written in ${source}) into each of these languages. Return ONLY a JSON object with exactly these keys and a short localized label for each:

{
  "en": "...",
  "pt": "...",
  "ru": "...",
  "uk": "..."
}

Keep the translation concise (1-3 words). Preserve the original for the source language.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return jsonResponse({ error: "AI service error" }, 502);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return jsonResponse({ error: "Empty AI response" }, 502);

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return jsonResponse({ error: "Invalid AI JSON", raw: text }, 422);
      parsed = JSON.parse(match[0]);
    }

    // Sanitize: only keep known locales, fall back to the original name where missing.
    const translations: Record<string, string> = {};
    for (const loc of SUPPORTED_LOCALES) {
      const v = typeof parsed[loc] === "string" ? parsed[loc].trim() : "";
      translations[loc] = v || name;
    }

    // Log usage AWAITED, right after the billable Gemini call and before
    // returning: a fire-and-forget insert can be dropped when the isolate is
    // torn down, undercounting the meters. On insert failure (e.g. the
    // 'translate' enum value not applied yet) we still return the result.
    const { error: usageError } = await supabase
      .from("usage_stats")
      .insert({
        profile_id: profile.id,
        couple_id: profile.couple_id,
        action: "translate",
        metadata: { source },
      });
    if (usageError) console.error("usage log failed:", usageError);

    return jsonResponse({ translations });
  } catch (error) {
    console.error("translate-category error:", error);
    return jsonResponse({ error: "Error translating", details: String(error) }, 500);
  }
});
