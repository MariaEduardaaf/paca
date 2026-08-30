import { useEffect, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { useAppStore } from "../store";
import { getInitialLocale } from "./useI18n";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const queryClient = useQueryClient();
  const reset = useAppStore((s) => s.reset);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
        // Clear cached financial data on ANY sign-out (direct
        // supabase.auth.signOut() calls, other-tab sign-outs, revoked
        // sessions), not only the signOut() helper below — otherwise the
        // previous user's queries are served to the next account.
        if (event === "SIGNED_OUT") {
          reset();
          queryClient.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient, reset]);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // language: consumed by the handle_new_user trigger so the profile
          // is born with the device/app language instead of hardcoded 'en'.
          data: { display_name: displayName, language: getInitialLocale() },
        },
      });
      if (error) throw error;
      return data;
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  // Web OAuth: Supabase redirects the page to the provider and back to
  // redirectTo, where the client auto-detects the session. window is guarded so
  // this stays import-safe on native (mobile uses a browser-session flow).
  const signInWithProvider = useCallback(
    async (provider: "google" | "apple") => {
      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    },
    []
  );
  const signInWithGoogle = useCallback(
    () => signInWithProvider("google"),
    [signInWithProvider]
  );
  const signInWithApple = useCallback(
    () => signInWithProvider("apple"),
    [signInWithProvider]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    reset();
    queryClient.clear();
  }, [reset, queryClient]);

  return {
    ...authState,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const reset = useAppStore((s) => s.reset);
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      // Sign out locally; the auth user is already gone server-side.
      await supabase.auth.signOut();
      reset();
      queryClient.clear();
    },
  });
}
