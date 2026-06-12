import { AppState, PermissionsAndroid, Platform } from "react-native";
import {
  markOsPushPermissionRequested,
  wasOsPushPermissionRequested,
} from "@mobile/lib/push-permission-state";
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

export type PushPermissionStatus = "granted" | "denied" | "undetermined" | "unsupported";

export type PushRegisterResult =
  | { enabled: true; remote: true; token: string }
  | {
      enabled: true;
      remote: false;
      reason: "no_expo_token" | "db_error";
      detail?: string;
    }
  | { enabled: false; reason: "simulator" | "unavailable" | "permission_denied" };

export function describePushRegisterFailure(reg: PushRegisterResult): string | null {
  if (reg.enabled && reg.remote) return null;
  if (!reg.enabled) {
    if (reg.reason === "simulator") {
      return "Máy ảo không đăng ký push từ xa. Dùng điện thoại thật.";
    }
    if (reg.reason === "permission_denied") return "Chưa cấp quyền thông báo hệ thống.";
    if (reg.reason === "unavailable") return "Module thông báo không khả dụng trên thiết bị này.";
    return null;
  }
  if (reg.reason === "db_error") {
    return `Không lưu token push: ${reg.detail ?? "lỗi cơ sở dữ liệu"}`;
  }
  if (reg.reason === "no_expo_token") {
    const detail = reg.detail ?? "";
    if (/firebase|fcm|google-services/i.test(detail)) {
      return "Android cần cấu hình Firebase (google-services.json) để nhận push khi thoát app.";
    }
    return detail || "Không lấy được token Expo Push.";
  }
  return null;
}

export async function isPushEnvironmentSupported() {
  try {
    const Device = await deviceModule();
    if (!Device.isDevice) return false;
    const hint = `${Device.brand ?? ""} ${Device.manufacturer ?? ""} ${Device.modelName ?? ""}`.toLowerCase();
    if (hint.includes("sdk_gphone") || hint.includes("emulator") || hint.includes("ldplayer")) {
      return false;
    }
    return true;
  } catch {
    return Platform.OS !== "web";
  }
}

async function requestAndroidPostNotifications(): Promise<PushPermissionStatus | null> {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return null;
  try {
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(perm)) return "granted";
    const result = await PermissionsAndroid.request(perm, {
      title: "Cho phép thông báo",
      message: "STOS Guard cần quyền thông báo để nhận yêu cầu SOS và cảnh báo.",
      buttonPositive: "Cho phép",
      buttonNegative: "Không",
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
    return "denied";
  } catch {
    return null;
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
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerReady = true;
  } catch {
    // Native module unavailable.
  }
}

type DeviceTokenRow = {
  user_id: string;
  token: string;
  platform: string;
  app: string;
  device_id: string | null;
  last_seen_at: string;
};

function platformDeviceTokenDb() {
  return getSupabase() as unknown as {
    schema: (name: "platform") => {
      from: (table: "device_token") => {
        upsert: (
          row: DeviceTokenRow,
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
        delete: () => {
          eq: (col: "user_id", val: string) => {
            eq: (col2: "app", val2: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };
  };
}

async function upsertDeviceToken(row: DeviceTokenRow) {
  return platformDeviceTokenDb()
    .schema("platform")
    .from("device_token")
    .upsert(row, { onConflict: "user_id,token" });
}

function easProjectId() {
  const id =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  return id && id !== "REPLACE_WITH_EAS_PROJECT_ID" ? id : undefined;
}

async function setupAndroidChannels(
  Notifications: Awaited<ReturnType<typeof notificationsModule>>,
) {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "STOS Guard",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: "#2563EB",
  });

  await Notifications.setNotificationChannelAsync("security", {
    name: "SOS & Yêu cầu",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300, 200, 300],
    lightColor: "#EF4444",
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync("chat", {
    name: "Tin nhắn cư dân",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: "#2563EB",
  });
}

async function tryExpoPushToken(
  Notifications: Awaited<ReturnType<typeof notificationsModule>>,
): Promise<{ token: string | null; error?: string }> {
  const projectId = easProjectId();
  if (!projectId) {
    return { token: null, error: "Thiếu EAS projectId (extra.eas.projectId trong app.json)" };
  }
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data ?? null;
    if (!token) return { token: null, error: "getExpoPushTokenAsync trả về rỗng" };
    return { token };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[push] getExpoPushTokenAsync:", message);
    return { token: null, error: message };
  }
}

async function waitUntilAppIsActive() {
  if (AppState.currentState === "active") return;
  await new Promise<void>((resolve) => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        sub.remove();
        resolve();
      }
    });
  });
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  try {
    const Notifications = await notificationsModule();
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "undetermined";
  } catch {
    return "unsupported";
  }
}

export async function promptPushPermissionOnFirstLaunch(): Promise<
  PushPermissionStatus | "skipped"
> {
  const alreadyAsked = await wasOsPushPermissionRequested();
  const current = await getPushPermissionStatus();
  if (alreadyAsked && (current === "granted" || current === "denied")) {
    return "skipped";
  }

  await waitUntilAppIsActive();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const before = await getPushPermissionStatus();
  if (before === "granted") {
    await markOsPushPermissionRequested();
    return "granted";
  }

  const result = await requestPushPermission();
  if (result !== "unsupported") await markOsPushPermissionRequested();
  return result;
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  await ensureNotificationHandler();

  const androidNative = await requestAndroidPostNotifications();
  if (androidNative === "granted") return "granted";
  if (androidNative === "denied") return "denied";

  try {
    const Notifications = await notificationsModule();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return "granted";
    if (existing === "denied" && Platform.OS === "ios") return "denied";

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
      android: {},
    });
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "undetermined";
  } catch {
    return "unsupported";
  }
}

export async function registerNativePushToken(
  app: "family" | "guard" = "guard",
  opts?: { requestPermission?: boolean },
): Promise<PushRegisterResult> {
  if (!(await isPushEnvironmentSupported())) {
    return { enabled: false, reason: "simulator" };
  }

  await ensureNotificationHandler();

  const Device = await deviceModule();

  let Notifications: Awaited<ReturnType<typeof notificationsModule>>;
  try {
    Notifications = await notificationsModule();
  } catch {
    return { enabled: false, reason: "unavailable" };
  }

  const shouldRequest = opts?.requestPermission !== false;
  let status = await getPushPermissionStatus();
  if (status === "undetermined" && shouldRequest) {
    status = await requestPushPermission();
  }
  if (status !== "granted") {
    return { enabled: false, reason: "permission_denied" };
  }

  await setupAndroidChannels(Notifications);

  const { token, error: tokenError } = await tryExpoPushToken(Notifications);

  if (token) {
    try {
      const { userId } = await requireUser();
      const platform =
        Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
      const { error } = await upsertDeviceToken({
        user_id: userId,
        token,
        platform,
        app,
        device_id: Device.modelName ?? null,
        last_seen_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return { enabled: true, remote: true, token };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn("[push] Lưu device_token thất bại:", detail);
      return { enabled: true, remote: false, reason: "db_error", detail };
    }
  }

  return { enabled: true, remote: false, reason: "no_expo_token", detail: tokenError };
}

export async function unregisterNativePushToken(app: "family" | "guard" = "guard") {
  try {
    const { userId } = await requireUser();
    const { error } = await platformDeviceTokenDb()
      .schema("platform")
      .from("device_token")
      .delete()
      .eq("user_id", userId)
      .eq("app", app);
    if (error) throw new Error(error.message);

    const Notifications = await notificationsModule();
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Best-effort.
  }
}

export async function syncPushBadge(count: number) {
  try {
    const Notifications = await notificationsModule();
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Badge not supported.
  }
}

export async function presentLocalNotification(input: {
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  channelId?: "default" | "security" | "chat";
}) {
  try {
    await ensureNotificationHandler();
    const Notifications = await notificationsModule();
    const granted = (await Notifications.getPermissionsAsync()).status === "granted";
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body ?? undefined,
        data: input.data ?? {},
        sound: true,
        ...(Platform.OS === "android"
          ? { channelId: input.channelId ?? "default" }
          : {}),
      },
      trigger: null,
    });
  } catch {
    // Best-effort.
  }
}
