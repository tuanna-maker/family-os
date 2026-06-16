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
} from "@mobile/lib/chat-notification-pull";
import { presentFamilyNotificationRow } from "@mobile/lib/present-family-notification";
import { patchFamilyNotificationRow } from "@mobile/hooks/useFamilyNotificationInbox";
import {
  registerFamilyBackgroundNotificationTask,
  unregisterFamilyBackgroundNotificationTask,
} from "@mobile/tasks/background-notification-task";
import {
  stopNativeBackgroundMonitor,
} from "@mobile/lib/stos-monitor-native";
import {
  getPushPermissionStatus,
  isPushEnvironmentSupported,
  bootstrapOsNotifications,
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
  stopNativeBackgroundMonitor();

  if (!enabled || !accessToken || !userId) {
    await unregisterFamilyBackgroundNotificationTask();
    await clearFamilyBackgroundCredentials();
    return;
  }
  if ((await getPushPermissionStatus()) !== "granted") {
    return;
  }
  await persistFamilyBackgroundCredentials(accessToken, userId);
  await registerFamilyBackgroundNotificationTask();
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
    data: input.type ? { type: input.type } : undefined,
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
    stopNativeBackgroundMonitor();
    void bootstrapOsNotifications("family");
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

    const tick = async () => {
      if (AppState.currentState === "active") {
        void syncLocalReminderSchedule(true);
      }
      const showedNotif = await pullAndPresentFamilyNotifications();
      const showedChat = await pullAndPresentFamilyChatNotifications();
      if (showedNotif || showedChat) invalidateInbox(qc);
    };

    void tick();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" || state === "background") void tick();
    });
    const timer = setInterval(tick, FOREGROUND_POLL_MS);
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
        const last = await Notifications.getLastNotificationResponseAsync();
        const lastData = last?.notification.request.content.data as { chatMessageId?: string };
        if (lastData?.chatMessageId) await markFamilyChatMessageNotified(lastData.chatMessageId);

        const sub1 = Notifications.addNotificationReceivedListener((notification) => {
          invalidateInbox(qc);
          const data = notification.request.content.data as { chatMessageId?: string };
          if (data.chatMessageId) void markFamilyChatMessageNotified(data.chatMessageId);
        });
        const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
          invalidateInbox(qc);
          const data = response.notification.request.content.data as {
            route?: string;
            chatMessageId?: string;
          };
          if (data.chatMessageId) void markFamilyChatMessageNotified(data.chatMessageId);
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
          void qc.invalidateQueries({ queryKey: ["home-unread-notifications"] });

          const row = payload.new as {
            id?: string;
            type?: string;
            title?: string;
            body?: string | null;
            ref_id?: string | null;
          };
          if (row.type === "security.chat") {
            const refId = row.ref_id ?? undefined;
            if (refId) void markFamilyChatMessageNotified(refId);
            return;
          }
          void (async () => {
            if (!pushEnabledRef.current) return;
            await presentFamilyNotificationRow({
              id: row.id ?? `rt-${Date.now()}`,
              type: row.type,
              ref_id: row.ref_id,
              title: row.title,
              body: row.body,
              created_at: (row as { created_at?: string }).created_at,
            });
          })();
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
        (payload) => {
          const row = payload.new as {
            id?: string;
            read_at?: string | null;
            dismissed_at?: string | null;
            title?: string | null;
            body?: string | null;
            type?: string;
          };
          if (row.id) {
            patchFamilyNotificationRow(qc, {
              id: row.id,
              read_at: row.read_at,
              dismissed_at: row.dismissed_at ?? undefined,
              title: row.title ?? undefined,
              body: row.body,
              type: row.type,
            });
            if (row.read_at) {
              void qc.invalidateQueries({ queryKey: ["home-unread-notifications"] });
            }
          }
        },
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
          const row = payload.new as { id?: string; status?: string; request_type?: string; apartment?: string | null; building?: string | null; payload?: Record<string, unknown> };
          if (payload.eventType === "UPDATE" && row?.status) {
            void qc.invalidateQueries({ queryKey: ["security-requests"] });
            void qc.invalidateQueries({ queryKey: ["security-requests", "preview"] });
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
