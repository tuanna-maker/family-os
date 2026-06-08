import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@mobile/hooks/useAuth";
import { AppPrefsProvider } from "@mobile/hooks/useAppPrefs";
import { usePushNotifications } from "@mobile/hooks/usePushNotifications";
import { ensureSupabase } from "@mobile/lib/supabase";
import { ThemeBridge, useTheme } from "@mobile/theme/themeStore";
import { AppAlertProvider } from "@mobile/components/AppAlert";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors, theme } = useTheme();

  usePushNotifications();

  useEffect(() => {
    if (loading) return;
    const publicAuth = ["login", "forgot-password", "reset-password"];
    const root = segments[0];
    const inPublic = publicAuth.includes(root ?? "");

    // Scheme root (:///), cold start, or stale path — normalize before Stack renders.
    if (!root) {
      router.replace(session ? "/(tabs)/home" : "/login");
      return;
    }
    if (!session && !inPublic) {
      router.replace("/login");
    } else if (session && inPublic) {
      router.replace("/(tabs)/home");
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    ensureSupabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppPrefsProvider>
              <ThemeBridge>
                <AppAlertProvider>
                  <AuthGate />
                </AppAlertProvider>
              </ThemeBridge>
            </AppPrefsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
