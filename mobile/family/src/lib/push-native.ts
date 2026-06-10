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
  | { enabled: true; remote: boolean; token?: string }
  | { enabled: false; reason: "simulator" | "unavailable" | "permission_denied" };

/** Chỉ dùng cho Expo Push token — không chặn xin quyền thông báo local. */
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
      message:
        "STOS Family cần quyền thông báo để nhắc uống thuốc, việc con và cảnh báo bảo an.",
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

function platformDb() {
  const supabase = getSupabase();
  return supabase as unknown as {
    schema: (name: string) => {
      from: (table: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
        delete: () => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };
  };
}

function easProjectId() {
  const id =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  return id && id !== "REPLACE_WITH_EAS_PROJECT_ID" ? id : undefined;
}

async function setupAndroidChannels(
  Notifications: Awaited<ReturnType<typeof notificationsModule>>,
  app: "family" | "guard",
) {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: app === "guard" ? "STOS Guard" : "STOS Family",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: "#2563EB",
  });

  await Notifications.setNotificationChannelAsync("security", {
    name: app === "guard" ? "SOS & Yêu cầu" : "Bảo an & SOS",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300, 200, 300],
    lightColor: "#EF4444",
    bypassDnd: true,
  });
}

/** Expo push token (iOS + Android) — không dùng FCM native / Firebase SDK. */
async function tryExpoPushToken(
  Notifications: Awaited<ReturnType<typeof notificationsModule>>,
): Promise<string | null> {
  const projectId = easProjectId();
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData?.data ?? null;
  } catch {
    return null;
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

/**
 * Lần đầu vào app (sau đăng nhập): đợi Activity sẵn sàng rồi hỏi quyền hệ thống.
 * Android thường trả "denied" trước khi hỏi — vẫn gọi requestPermissionsAsync.
 */
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

/** Hộp thoại quyền native iOS / Android (POST_NOTIFICATIONS). */
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
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      android: {},
    });
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "undetermined";
  } catch {
    return "unsupported";
  }
}

/**
 * Đăng ký push: quyền native bắt buộc; token remote là tùy chọn (Expo Push).
 * Không có token vẫn bật được — dùng thông báo local + realtime trong app.
 */
export async function registerNativePushToken(
  app: "family" | "guard" = "family",
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

  await setupAndroidChannels(Notifications, app);

  const token = await tryExpoPushToken(Notifications);

  if (token) {
    try {
      const { userId } = await requireUser();
      const platform =
        Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
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
      return { enabled: true, remote: true, token };
    } catch {
      // Token lấy được nhưng lưu server lỗi — vẫn coi như đã bật local.
      return { enabled: true, remote: false };
    }
  }

  return { enabled: true, remote: false };
}

export async function unregisterNativePushToken(app: "family" | "guard" = "family") {
  try {
    const { userId } = await requireUser();
    const { error } = await platformDb()
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

/** Hiển thị thông báo native khi có tin mới (không cần Firebase). */
export async function presentLocalNotification(input: {
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  channelId?: "default" | "security";
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
