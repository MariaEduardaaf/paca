import { useEffect, useState } from "react";
import { View, ActivityIndicator, useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { supabase, I18nProvider, useProfile } from "@paca/api";
import type { Session } from "@supabase/supabase-js";
import { AppErrorBoundary } from "../components/ErrorBoundary";
import { EnvBadge } from "../components/EnvBadge";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Loaded only to detect the "signed in but no couple yet" state — a user
  // who killed the app mid-onboarding must be routed back to /onboarding
  // instead of landing in empty tabs with no way out.
  const { data: profile } = useProfile();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        // A failed session read (corrupted storage, adapter failure) must
        // fall through to the login redirect, not hang on the spinner.
        setSession(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (
      session &&
      profile &&
      !profile.couple_id &&
      segments[0] !== "onboarding"
    ) {
      // Signed in but never finished pairing: the tabs are unusable without a
      // couple, so send the user back to onboarding to create/join one.
      router.replace("/onboarding");
    }
  }, [session, segments, loading, profile]);

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#FF8FB1" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {/* Without this the navigation chrome stays on the light DefaultTheme
            while NativeWind screens follow the system dark scheme. */}
        <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <AppErrorBoundary>
          <StatusBar style="auto" />
          <EnvBadge />
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen
                name="add-transaction"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="scan"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
            </Stack>
          </AuthGate>
        </AppErrorBoundary>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
