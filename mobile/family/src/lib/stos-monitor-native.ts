import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

type StosMonitorNative = {
  startMonitor: (
    supabaseUrl: string,
    anonKey: string,
    accessToken: string,
    userId: string,
    app: "guard" | "family",
  ) => void;
  stopMonitor: () => void;
};

const Native = NativeModules.StosMonitor as StosMonitorNative | undefined;

function config() {
  const extra = Constants.expoConfig?.extra as
    | { supabaseUrl?: string; supabaseAnonKey?: string }
    | undefined;
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra?.supabaseUrl ?? "",
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra?.supabaseAnonKey ?? "",
  };
}

/** Android: foreground service giống SmartHome — poll Supabase ~10s, báo local khi app tắt. */
export function startNativeBackgroundMonitor(
  accessToken: string,
  userId: string,
  app: "guard" | "family" = "family",
) {
  if (Platform.OS !== "android" || !Native?.startMonitor) return;
  const { url, anonKey } = config();
  if (!url || !anonKey || !accessToken || !userId) return;
  Native.startMonitor(url, anonKey, accessToken, userId, app);
}

export function stopNativeBackgroundMonitor() {
  if (Platform.OS !== "android" || !Native?.stopMonitor) return;
  Native.stopMonitor();
}
