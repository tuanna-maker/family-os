import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { QueryProvider } from "@mobile/providers/QueryProvider";
import { AuthProvider } from "@mobile/hooks/useAuth";
import { GuardPrefsProvider } from "@mobile/hooks/useGuardPrefs";
import { AppAlertProvider } from "@mobile/components/AppAlert";
import { ErrorBoundary } from "@mobile/components/ErrorBoundary";
import { ThemeProvider } from "@mobile/theme/themeStore";
import { ThemeController } from "@mobile/theme/ThemeController";
import { ensureSupabase, getSupabaseInitError } from "@mobile/lib/supabase";
import { usePushNotifications } from "@mobile/hooks/usePushNotifications";
import "../global.css";

function PushBootstrap() {
  usePushNotifications();
  return null;
}

ensureSupabase();

function BootError() {
  const msg = getSupabaseInitError();
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Không khởi động được</Text>
      <Text style={{ color: "#666" }}>{msg ?? "Lỗi cấu hình Supabase"}</Text>
    </View>
  );
}

export default function RootLayout() {
  if (getSupabaseInitError()) {
    return <BootError />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemeController>
            <ErrorBoundary>
              <QueryProvider>
                <AuthProvider>
                  <GuardPrefsProvider>
                  <AppAlertProvider>
                  <PushBootstrap />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="check-in" />
                    <Stack.Screen name="check-out" />
                    <Stack.Screen name="patrol" />
                    <Stack.Screen name="incident" />
                    <Stack.Screen name="qr-scanner" />
                    <Stack.Screen name="requests" />
                    <Stack.Screen name="account-profile" />
                  </Stack>
                  </AppAlertProvider>
                  </GuardPrefsProvider>
                </AuthProvider>
              </QueryProvider>
            </ErrorBoundary>
          </ThemeController>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
