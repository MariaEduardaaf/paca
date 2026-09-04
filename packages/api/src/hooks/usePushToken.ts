import { useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";

/**
 * Upserts the current user's Expo push token. Call after the mobile app obtains
 * a token (Notifications.getExpoPushTokenAsync) once expo-notifications is
 * installed. The token is stored own-access-only (push_tokens table).
 */
export function useUpdatePushToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (profileError) throw profileError;
      if (!profile) throw new Error("Perfil não encontrado");
      const { error } = await supabase
        .from("push_tokens")
        .upsert(
          { profile_id: profile.id, expo_push_token: token, push_enabled: true },
          { onConflict: "profile_id" },
        );
      if (error) throw error;
    },
  });
}
