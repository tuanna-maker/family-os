import { Capacitor } from "@capacitor/core";
import { supabase } from "./client";
import { requireUser } from "./auth";

export type PushApp = "family" | "guard";

export async function registerPushToken(data: {
  token: string;
  app: PushApp;
  device_id?: string;
}) {
  const { userId } = await requireUser();
  const platform =
    Capacitor.getPlatform() === "ios"
      ? "ios"
      : Capacitor.getPlatform() === "android"
        ? "android"
        : "web";

  const { error } = await supabase.schema("platform").from("device_token").upsert(
    {
      user_id: userId,
      token: data.token,
      platform,
      app: data.app,
      device_id: data.device_id ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" },
  );
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function unregisterPushToken(token: string) {
  const { userId } = await requireUser();
  const { error } = await supabase
    .schema("platform")
    .from("device_token")
    .delete()
    .eq("user_id", userId)
    .eq("token", token);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Gọi worker FCM (best-effort sau SOS / cập nhật trạng thái). */
export async function triggerPushDispatch() {
  const { error } = await supabase.functions.invoke("dispatch-push", { body: {} });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Fire-and-forget — không chặn luồng SOS. */
export function firePushDispatch() {
  void triggerPushDispatch().catch(() => {});
}

export async function initNativePush(app: PushApp) {
  if (!Capacitor.isNativePlatform()) return { enabled: false as const };

  // Android cần google-services.json + FCM — tránh crash native khi chưa cấu hình.
  const pushEnabled =
    typeof process !== "undefined" &&
    (process.env.VITE_ENABLE_NATIVE_PUSH === "true" ||
      process.env.EXPO_PUBLIC_ENABLE_NATIVE_PUSH === "true");
  if (Capacitor.getPlatform() === "android" && !pushEnabled) {
    return { enabled: false as const, reason: "push_disabled" as const };
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      return { enabled: false as const, reason: "permission_denied" as const };
    }

    await PushNotifications.removeAllListeners();

    PushNotifications.addListener("registration", async (ev) => {
      try {
        await registerPushToken({ token: ev.value, app });
      } catch {
        /* ignore registration errors */
      }
    });

    PushNotifications.addListener("registrationError", () => {});

    PushNotifications.addListener("pushNotificationReceived", () => {
      /* foreground — toast handled by OS */
    });

    await PushNotifications.register();
    return { enabled: true as const };
  } catch {
    return { enabled: false as const, reason: "init_failed" as const };
  }
}
