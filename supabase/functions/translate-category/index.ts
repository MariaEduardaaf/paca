import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/adminClient.ts";
import { reserveAiCall } from "../_shared/aiGate.ts";

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

    // Reserve the usage row BEFORE the paid Gemini call, then rate-limit + monthly
    // ceiling (100/month per couple, per profile without a couple; Premium
    // bypasses). Meter errors fail CLOSED (503), including a missing 'translate'
    // enum value (migration 00022 must be applied). See _shared/aiGate.ts.
    const gate = await reserveAiCall(supabase, createAdminClient(), profile, {
      action: "translate",
      windowSeconds: 3600,
      max: 30,
      quota: { actions: ["translate"], limit: 100 },
    }, corsHeaders);
    if ("response" in gate) return gate.response;

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

    // Attach metadata to the reservation (already counted before the Gemini call).
    await gate.finalize({ source });

    return jsonResponse({ translations });
  } catch (error) {
    console.error("translate-category error:", error);
    return jsonResponse({ error: "Error translating", details: String(error) }, 500);
  }
});
