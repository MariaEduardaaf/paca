import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { CoupleWithPartner } from "@paca/shared";

export function useCouple() {
  return useQuery({
    queryKey: ["couple"],
    queryFn: async (): Promise<CoupleWithPartner | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("user_id", user.id)
        .single();

      // Throw instead of silently caching "no couple" on a transient failure.
      if (profileError) throw profileError;
      if (!profile?.couple_id) return null;

      const { data: couple, error } = await supabase
        .from("couples")
        .select("*")
        .eq("id", profile.couple_id)
        .single();

      if (error) throw error;

      const { data: partner } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("couple_id", profile.couple_id)
        .neq("user_id", user.id)
        .maybeSingle();

      return { ...couple, partner: partner ?? null };
    },
  });
}

export function useCreateCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ couple_id: string; invite_code: string }> => {
      // SECURITY DEFINER RPC (migration 00024): validates the caller, generates
      // a cryptographically-strong invite code and links the profile atomically
      // server-side. Raises PROFILE_NOT_FOUND / ALREADY_IN_COUPLE on failure
      // (surfaced via error.message; callers map to i18n).
      const { data, error } = await supabase.rpc("create_couple");

      if (error) throw error;

      const result = data as { couple_id?: string; invite_code?: string } | null;
      if (!result?.couple_id || !result?.invite_code) {
        throw new Error("Resposta inesperada do servidor. Tente novamente.");
      }

      return { couple_id: result.couple_id, invite_code: result.invite_code };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Couple changed: entitlement and category lists are couple-scoped.
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useJoinCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      // SECURITY DEFINER RPC (migration 00024): resolves the invite code and
      // sets profiles.couple_id server-side — the members-only couples SELECT
      // policy makes a client-side code lookup impossible, and the profiles
      // WITH CHECK (migration 00025) blocks direct couple_id writes. Raises
      // PROFILE_NOT_FOUND / ALREADY_IN_COUPLE / INVALID_CODE / COUPLE_FULL
      // (surfaced via error.message; callers map to i18n). The RPC normalizes
      // the code (upper + trim) itself.
      const { data, error } = await supabase.rpc("join_couple_with_code", {
        p_code: inviteCode,
      });

      if (error) throw error;

      if (typeof data !== "string" || !data) {
        throw new Error("Resposta inesperada do servidor. Tente novamente.");
      }

      // Same shape the direct-write flow returned ({ id: couple_id }).
      return { id: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Joining a couple changes its entitlement + categories for this user.
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { primary_currency?: string; auto_convert_currency?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.couple_id) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("couples")
        .update(updates)
        .eq("id", profile.couple_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
    },
  });
}
