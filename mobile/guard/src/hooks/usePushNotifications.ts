import { useEffect, useRef } from "react";
import { AppState, InteractionManager, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getSupabase } from "@shared/supabase/get-client";
import { useAuth } from "@mobile/hooks/useAuth";
import { useGuardPrefs } from "@mobile/hooks/useGuardPrefs";
import { usePushPermissionResync } from "@mobile/hooks/usePushPermissionResync";
import {
  clearGuardBackgroundCredentials,
  markGuardChatMessageNotified,
  markGuardPlatformNotifSeen,
  markGuardSecurityRequestSeen,
  persistGuardBackgroundCredentials,
  pullAndPresentGuardNotifications,
} from "@mobile/lib/guard-notification-pull";
import {
  registerGuardBackgroundNotificationTask,
  unregisterGuardBackgroundNotificationTask,
} from "@mobile/tasks/background-notification-task";
import {
  startNativeBackgroundMonitor,
  stopNativeBackgroundMonitor,
} from "@mobile/lib/stos-monitor-native";
import {
  getPushPermissionStatus,
  bootstrapOsNotifications,
  presentLocalNotification,
  promptPushPermissionOnFirstLaunch,
  registerNativePushToken,
  syncPushBadge,
} from "@mobile/lib/push-native";

/** Poll nền — gồm tin chat cư dân (~5s giống Messenger khi app mở nền). */
const FOREGROUND_POLL_MS = 5_000;

async function syncGuardBackgroundDelivery(
  enabled: boolean,
  accessToken: string | undefined,
  userId: string | undefined,
) {
  if (!enabled || !accessToken || !userId) {
    stopNativeBackgroundMonitor();
    await unregisterGuardBackgroundNotificationTask();
    await clearGuardBackgroundCredentials();
    return;
  }
  if ((await getPushPermissionStatus()) !== "granted") {
    stopNativeBackgroundMonitor();
    return;
  }
  await persistGuardBackgroundCredentials(accessToken, userId);
  startNativeBackgroundMonitor(accessToken, userId, "guard");
  await registerGuardBackgroundNotificationTask();
}

export function usePushNotifications() {
  const { session, loading: authLoading } = useAuth();
  const { notificationsEnabled, setNotificationsEnabled, ready: prefsReady } = useGuardPrefs();
  const qc = useQueryClient();
  const router = useRouter();
  const bootstrapDone = useRef(false);
  const pushEnabledRef = useRef(notificationsEnabled);
  pushEnabledRef.current = notificationsEnabled;

  usePushPermissionResync(notificationsEnabled, setNotificationsEnabled);

  useEffect(() => {
    void bootstrapOsNotifications();
  }, []);

  useEffect(() => {
    if (!prefsReady || authLoading || !session || bootstrapDone.current) return;
    bootstrapDone.current = true;

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        const result = await promptPushPermissionOnFirstLaunch();
        if (cancelled) return;

        if (result === "skipped") {
          const status = await getPushPermissionStatus();
          if (status === "granted" && notificationsEnabled) {
            await registerNativePushToken("guard", { requestPermission: false });
          } else if (status === "denied" && notificationsEnabled) {
            setNotificationsEnabled(false);
          }
          return;
        }

        const granted = result === "granted";
        setNotificationsEnabled(granted);
        if (granted) {
          await registerNativePushToken("guard", { requestPermission: false });
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [prefsReady, authLoading, session, notificationsEnabled, setNotificationsEnabled]);

  useEffect(() => {
    if (!session || !prefsReady || !notificationsEnabled) return;
    void (async () => {
      if ((await getPushPermissionStatus()) !== "granted") return;
      await registerNativePushToken("guard", { requestPermission: false });
    })();
  }, [session?.user?.id, notificationsEnabled, prefsReady]);

  useEffect(() => {
    if (!session || !prefsReady) return;
    void syncGuardBackgroundDelivery(
      notificationsEnabled,
      session.access_token,
      session.user?.id,
    );
  }, [session, notificationsEnabled, prefsReady]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !notificationsEnabled) return;
      void (async () => {
        if ((await getPushPermissionStatus()) !== "granted") return;
        await registerNativePushToken("guard", { requestPermission: false });
        await syncGuardBackgroundDelivery(
          true,
          session?.access_token,
          session?.user?.id,
        );
      })();
    });
    return () => sub.remove();
  }, [notificationsEnabled, session?.access_token, session?.user?.id]);

  useEffect(() => {
    if (!session || !notificationsEnabled) return;
    const onBackgroundTick = () => {
      if (AppState.currentState === "active") return;
      void pullAndPresentGuardNotifications();
    };
    onBackgroundTick();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") onBackgroundTick();
    });
    const timer = setInterval(onBackgroundTick, FOREGROUND_POLL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [session, notificationsEnabled, qc]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let removeListeners: (() => void) | undefined;

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const last = await Notifications.getLastNotificationResponseAsync();
        const lastData = last?.notification.request.content.data as { chatMessageId?: string };
        if (lastData?.chatMessageId) void markGuardChatMessageNotified(lastData.chatMessageId);

        const sub1 = Notifications.addNotificationReceivedListener((notification) => {
          const data = notification.request.content.data as {
            chatMessageId?: string;
            requestId?: string;
          };
          if (data.chatMessageId) void markGuardChatMessageNotified(data.chatMessageId);
          if (data.requestId) void markGuardSecurityRequestSeen(data.requestId);
        });
        const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as {
            route?: string;
            residentId?: string;
            chatMessageId?: string;
            requestId?: string;
          };
          if (data.chatMessageId) void markGuardChatMessageNotified(data.chatMessageId);
          if (data.requestId) void markGuardSecurityRequestSeen(data.requestId);
          if (data?.route === "/chat" && data.residentId) {
            router.push({
              pathname: "/chat/[residentId]",
              params: { residentId: data.residentId },
            });
            return;
          }
          router.push("/(tabs)/notifications");
        });
        removeListeners = () => {
          sub1.remove();
          sub2.remove();
        };
      } catch {
        // Push module unavailable.
      }
    })();

    const supabase = getSupabase();
    const ch = supabase
      .channel(`guard-push-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "platform",
          table: "notification",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id?: string;
            title?: string;
            body?: string | null;
            topic?: string;
            data?: Record<string, unknown>;
            status?: string;
            read_at?: string | null;
            created_at?: string;
          };
          if (row.id) {
            qc.setQueryData<import("@guard/api/notifications").PlatformNotification[]>(
              ["guard-notifications"],
              (old) => {
                const prev = old ?? [];
                if (prev.some((n) => n.id === row.id)) return prev;
                return [
                  {
                    id: row.id!,
                    topic: row.topic ?? "",
                    title: row.title ?? "Thông báo mới",
                    body: row.body ?? null,
                    data: row.data ?? {},
                    status: row.status ?? "sent",
                    read_at: row.read_at ?? null,
                    created_at: row.created_at ?? new Date().toISOString(),
                  },
                  ...prev,
                ];
              },
            );
          }
          if (row.id) void markGuardPlatformNotifSeen(row.id);
          if (!pushEnabledRef.current) return;
          if ((await getPushPermissionStatus()) !== "granted") return;
          const isSecurity = typeof row.topic === "string" && row.topic.startsWith("sos.");
          void presentLocalNotification({
            title: row.title ?? "Thông báo mới",
            body: row.body,
            channelId: isSecurity ? "security" : "default",
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_requests",
        },
        async (payload) => {
          qc.setQueryData<import("@guard/api/security").SecurityRequest[]>(
            ["guard-open-requests"],
            (old) => {
              const row = payload.new as import("@guard/api/security").SecurityRequest;
              if (!row?.id || row.status !== "open") return old;
              const prev = old ?? [];
              if (prev.some((r) => r.id === row.id)) return prev;
              return [row, ...prev];
            },
          );
          const row = payload.new as import("@guard/api/security").SecurityRequest;
          if (row?.id) void markGuardSecurityRequestSeen(row.id);
          // OS push do dispatch-security-request-push (webhook) — tránh banner trùng với local.
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "platform",
          table: "notification",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            id?: string;
            title?: string;
            body?: string | null;
            topic?: string;
            data?: Record<string, unknown>;
            status?: string;
            read_at?: string | null;
            dismissed_at?: string | null;
            created_at?: string;
          };
          if (!row?.id) return;
          qc.setQueryData<import("@guard/api/notifications").PlatformNotification[]>(
            ["guard-notifications"],
            (old) => {
              const prev = old ?? [];
              if (row.dismissed_at) return prev.filter((n) => n.id !== row.id);
              return prev.map((n) =>
                n.id === row.id
                  ? {
                      ...n,
                      title: row.title ?? n.title,
                      body: row.body ?? n.body,
                      topic: row.topic ?? n.topic,
                      data: row.data ?? n.data,
                      status: row.status ?? n.status,
                      read_at: row.read_at ?? n.read_at,
                      dismissed_at: row.dismissed_at ?? n.dismissed_at,
                    }
                  : n,
              );
            },
          );
        },
      )
      .subscribe();

    return () => {
      removeListeners?.();
      void supabase.removeChannel(ch);
    };
  }, [session?.user?.id, qc, router]);

  useEffect(() => {
    if (!session || !notificationsEnabled) return;
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] !== "guard-notifications-unread") return;
      const count = (event.query.state.data as { count?: number } | undefined)?.count ?? 0;
      void syncPushBadge(count);
    });
    return unsub;
  }, [session, qc, notificationsEnabled]);
}
