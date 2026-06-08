import { Platform } from "react-native";
import Constants from "expo-constants";
import { requireUser } from "@shared/supabase/auth";
import { getSupabase } from "@shared/supabase/get-client";

let handlerReady = false;

async function notificationsModule() {
  return import("expo-notifications");
}

async function deviceModule() {
  return import("expo-device");
}

async function isPushEnvironmentSupported() {
  try {
    const Device = await deviceModule();
    if (!Device.isDevice) return false;
    const hint = `${Device.brand ?? ""} ${Device.manufacturer ?? ""} ${Device.modelName ?? ""} ${Device.productName ?? ""}`.toLowerCase();
    if (
      hint.includes("sdk") ||
      hint.includes("emulator") ||
      hint.includes("ldplayer") ||
      hint.includes("vbox") ||
      hint.includes("generic")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureNotificationHandler() {
  if (handlerReady) return;
  try {
    const Notifications = await notificationsModule();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    handlerReady = true;
  } catch {
    // Native module unavailable — skip push on this build.
  }
}

function platformDb() {
  const supabase = getSupabase();
  return supabase as unknown as {
    schema: (name: string) => {
      from: (table: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
}

async function resolvePushToken(
  Notifications: Awaited<ReturnType<typeof notificationsModule>>,
) {
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

  try {
    const device = await Notifications.getDevicePushTokenAsync();
    if (device.data) return device.data;
  } catch {
    // Fallback to Expo push token.
  }

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId && projectId !== "REPLACE_WITH_EAS_PROJECT_ID" ? { projectId } : undefined,
  );
  return tokenData.data;
}

export async function registerNativePushToken(app: "family" | "guard" = "family") {
  if (!(await isPushEnvironmentSupported())) {
    return { enabled: false as const, reason: "simulator" as const };
  }

  await ensureNotificationHandler();

  const Device = await deviceModule();

  let Notifications: Awaited<ReturnType<typeof notificationsModule>>;
  try {
    Notifications = await notificationsModule();
  } catch {
    return { enabled: false as const, reason: "unavailable" as const };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    return { enabled: false as const, reason: "permission_denied" as const };
  }

  const token = await resolvePushToken(Notifications);

  const { userId } = await requireUser();
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  const { error } = await platformDb()
    .schema("platform")
    .from("device_token")
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        app,
        device_id: Device.modelName ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    );
  if (error) throw new Error(error.message);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: app === "guard" ? "STOS Guard" : "STOS Family",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return { enabled: true as const, token };
}
