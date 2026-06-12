import { useEffect, useRef } from "react";
import { AppState, InteractionManager, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getSupabase } from "@shared/supabase/get-client";
import { useAuth } from "@mobile/hooks/useAuth";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { usePushPermissionResync } from "@mobile/hooks/usePushPermissionResync";
import { syncLocalReminderSchedule } from "@mobile/lib/local-reminder-scheduler";
import {
  notificationChannelForType,
  shouldPresentOsNotification,
} from "@mobile/lib/notification-os";
import {
  clearFamilyBackgroundCredentials,
  persistFamilyBackgroundCredentials,
  pullAndPresentFamilyNotifications,
} from "@mobile/lib/notification-pull";
import {
  markFamilyChatMessageNotified,
  pullAndPresentFamilyChatNotifications,
  shouldNotifyFamilyChatMessage,
} from "@mobile/lib/chat-notification-pull";
import {
  registerFamilyBackgroundNotificationTask,
  unregisterFamilyBackgroundNotificationTask,
} from "@mobile/tasks/background-notification-task";
import {
  startNativeBackgroundMonitor,
  stopNativeBackgroundMonitor,
} from "@mobile/lib/stos-monitor-native";
import {
  getPushPermissionStatus,
  isPushEnvironmentSupported,
  presentLocalNotification,
  promptPushPermissionOnFirstLaunch,
  registerNativePushToken,
  syncPushBadge,
} from "@mobile/lib/push-native";

const FOREGROUND_POLL_MS = 2_000;

function invalidateInbox(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["notifications-all"] });
  void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
}

function bumpUnread(qc: ReturnType<typeof useQueryClient>) {
  qc.setQueryData(["notifications-unread"], (old: { count?: number } | undefined) => ({
    count: (old?.count ?? 0) + 1,
  }));
}

async function syncFamilyBackgroundDelivery(
  enabled: boolean,
  accessToken: string | undefined,
  userId: string | undefined,
) {
  if (!enabled || !accessToken || !userId) {
    stopNativeBackgroundMonitor();
    await unregisterFamilyBackgroundNotificationTask();
    await clearFamilyBackgroundCredentials();
    return;
  }
  if ((await getPushPermissionStatus()) !== "granted") {
    stopNativeBackgroundMonitor();
    return;
  }
  await persistFamilyBackgroundCredentials(accessToken, userId);
  startNativeBackgroundMonitor(accessToken, userId, "family");
  if (Platform.OS === "ios") {
    await registerFamilyBackgroundNotificationTask();
  }
}

async function maybePresentOs(
  pushEnabled: boolean,
  input: { title: string; body?: string | null; type?: string },
) {
  if (!pushEnabled) return;
  const status = await getPushPermissionStatus();
  if (status !== "granted") return;
  if (input.type && !shouldPresentOsNotification(input.type)) return;
  await presentLocalNotification({
    title: input.title,
    body: input.body,
    channelId: notificationChannelForType(input.type),
  });
}

export function usePushNotifications() {
  const { session, loading: authLoading } = useAuth();
  const { pushEnabled, setPushEnabled, ready: prefsReady } = useAppPrefs();
  const qc = useQueryClient();
  const router = useRouter();
  const bootstrapDone = useRef(false);
  const pushEnabledRef = useRef(pushEnabled);
  pushEnabledRef.current = pushEnabled;

  usePushPermissionResync(pushEnabled, setPushEnabled);

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
          if (status === "granted" && pushEnabled) {
            await registerNativePushToken("family", { requestPermission: false });
          } else if (status === "denied" && pushEnabled) {
            setPushEnabled(false);
          }
          return;
        }

        const granted = result === "granted";
        setPushEnabled(granted);
        if (granted) {
          await registerNativePushToken("family", { requestPermission: false });
          await syncLocalReminderSchedule(true);
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [prefsReady, authLoading, session, pushEnabled, setPushEnabled]);

  useEffect(() => {
    if (!session || !prefsReady || !pushEnabled) return;
    void (async () => {
      if ((await getPushPermissionStatus()) !== "granted") return;
      await registerNativePushToken("family", { requestPermission: false });
    })();
  }, [session?.user?.id, pushEnabled, prefsReady]);

  useEffect(() => {
    if (!session || !prefsReady) return;

    void (async () => {
      if (!(await isPushEnvironmentSupported())) return;
      const status = await getPushPermissionStatus();

      if (status === "granted" && pushEnabled) {
        await syncLocalReminderSchedule(true);
        await syncFamilyBackgroundDelivery(true, session.access_token, session.user?.id);
        return;
      }

      if (!pushEnabled || status !== "granted") {
        await syncLocalReminderSchedule(false);
        await syncPushBadge(0);
        await syncFamilyBackgroundDelivery(false, undefined, undefined);
      }
    })();
  }, [session, pushEnabled, prefsReady]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !pushEnabled || !session) return;
      void (async () => {
        if ((await getPushPermissionStatus()) !== "granted") return;
        await registerNativePushToken("family", { requestPermission: false });
        await syncFamilyBackgroundDelivery(true, session.access_token, session.user?.id);
      })();
    });
    return () => sub.remove();
  }, [pushEnabled, session?.access_token, session?.user?.id, session]);

  useEffect(() => {
    if (!session || !pushEnabled) return;

    const onActive = () => {
      void syncLocalReminderSchedule(true);
      void Promise.all([
        pullAndPresentFamilyNotifications(),
        pullAndPresentFamilyChatNotifications(),
      ]).then(([showed]) => {
        if (showed) invalidateInbox(qc);
      });
    };

    onActive();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") onActive();
    });
    const timer = setInterval(onActive, FOREGROUND_POLL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [session, pushEnabled, qc]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let removeListeners: (() => void) | undefined;

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const sub1 = Notifications.addNotificationReceivedListener(() => {
          invalidateInbox(qc);
        });
        const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
          invalidateInbox(qc);
          const data = response.notification.request.content.data as {
            route?: string;
          };
          if (data?.route === "/bao-an/chat") {
            router.push("/bao-an/chat");
            return;
          }
          router.push("/thong-bao");
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
      .channel(`family-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          bumpUnread(qc);
          void qc.invalidateQueries({ queryKey: ["notifications-all"] });

          const row = payload.new as {
            type?: string;
            title?: string;
            body?: string | null;
          };
          if (row.type === "security.chat") {
            if (!pushEnabledRef.current) return;
            void (async () => {
              const refId = (row as { ref_id?: string }).ref_id;
              if (refId && !(await shouldNotifyFamilyChatMessage(refId))) return;
              if (refId) await markFamilyChatMessageNotified(refId);
              await presentLocalNotification({
                title: row.title ?? "Đội bảo an",
                body: row.body,
                channelId: "chat",
                data: { route: "/bao-an/chat", notificationId: row.id, type: row.type },
              });
            })();
            return;
          }
          void maybePresentOs(pushEnabledRef.current, {
            type: row.type,
            title: row.title ?? "Thông báo mới",
            body: row.body,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => invalidateInbox(qc),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "security_requests",
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string; request_type?: string } | undefined;
          if (payload.eventType === "UPDATE" && row?.status) {
            void maybePresentOs(pushEnabledRef.current, {
              type: "security.status_changed",
              title: "Cập nhật yêu cầu bảo an",
              body:
                row.status === "in_progress"
                  ? "Bảo an đang xử lý yêu cầu của bạn"
                  : row.status === "resolved"
                    ? "Yêu cầu đã được giải quyết"
                    : "Trạng thái yêu cầu đã thay đổi",
            });
          }
        },
      )
      .subscribe();

    return () => {
      removeListeners?.();
      void supabase.removeChannel(ch);
    };
  }, [session?.user?.id, qc, router]);

  useEffect(() => {
    if (!session || !pushEnabled) return;
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] !== "notifications-unread") return;
      const count = (event.query.state.data as { count?: number } | undefined)?.count ?? 0;
      void syncPushBadge(count);
    });
    return unsub;
  }, [session, qc, pushEnabled]);
}
