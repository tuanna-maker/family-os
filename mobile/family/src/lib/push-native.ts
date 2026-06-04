import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { requireUser } from "@shared/supabase/auth";
import { getSupabase } from "@shared/supabase/get-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

export async function registerNativePushToken(app: "family" = "family") {
  if (!Device.isDevice) {
    return { enabled: false as const, reason: "simulator" as const };
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

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenData.data;

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
      name: "STOS Family",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return { enabled: true as const, token };
}
