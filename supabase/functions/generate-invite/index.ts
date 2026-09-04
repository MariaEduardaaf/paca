// Creates the caller's couple via the create_couple RPC (migration 00024) and
// returns the server-generated invite code. Kept for backward compatibility
// with clients that call this function — new clients call the RPC directly
// through @paca/api useCreateCouple. The old direct insert+update body was
// removed: after migration 00025 profiles.couple_id is not client-writable,
// so the RPC (SECURITY DEFINER) is the only valid path.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("create_couple");

    if (error) {
      const message = error.message ?? "";
      if (message.includes("ALREADY_IN_COUPLE")) {
        return new Response(JSON.stringify({ error: "Você já está em um casal" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (message.includes("PROFILE_NOT_FOUND")) {
        return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    const result = data as { couple_id: string; invite_code: string };

    return new Response(
      JSON.stringify({
        couple_id: result.couple_id,
        invite_code: result.invite_code,
        invite_link: `https://pacafinance.app/invite/${result.invite_code}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Erro ao criar casal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
