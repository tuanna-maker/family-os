import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@shared/supabase/get-client";
import { useAuth } from "@mobile/hooks/useAuth";
import {
  listPlatformNotifications,
  markPlatformRead,
  markAllPlatformRead,
  deleteReadPlatformNotifications,
  deletePlatformNotifications,
  type PlatformNotification,
} from "@guard/api/notifications";
import {
  dismissInboxSecurityRequests,
  listDismissedInboxRequestIds,
  listOpenResidentRequests,
  type SecurityRequest,
} from "@guard/api/security";
import { RESIDENT_NOTIFICATION_TOPICS } from "@mobile/constants/notifications";
import { REQUEST_TYPE_LABEL } from "@mobile/utils/guardFormat";

export type GuardResidentInboxItem = {
  kind: "platform" | "request";
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read: boolean;
  isAlert: boolean;
  requestId?: string;
  notificationId: string;
};

function platformToResidentItem(n: PlatformNotification): GuardResidentInboxItem {
  const requestId =
    typeof n.data?.request_id === "string" ? n.data.request_id : undefined;
  return {
    kind: "platform",
    id: n.id,
    notificationId: n.id,
    title: n.title,
    body: n.body,
    created_at: n.created_at,
    read: !!n.read_at,
    isAlert: (n.topic ?? "").startsWith("sos."),
    requestId,
  };
}

function requestToResidentItem(
  r: SecurityRequest,
  ackedIds: Set<string>,
): GuardResidentInboxItem {
  const typeLabel = REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type;
  const unit = [r.apartment, r.building].filter(Boolean).join(" · ");
  return {
    kind: "request",
    id: `req-${r.id}`,
    notificationId: `req-${r.id}`,
    title: `Yêu cầu: ${typeLabel}`,
    body: unit || "Chờ xử lý",
    created_at: r.created_at,
    read: ackedIds.has(r.id),
    isAlert: r.request_type === "sos" || r.request_type === "fire",
    requestId: r.id,
  };
}

function isResidentTopic(topic: string | null | undefined) {
  if (!topic) return false;
  return RESIDENT_NOTIFICATION_TOPICS.includes(
    topic as (typeof RESIDENT_NOTIFICATION_TOPICS)[number],
  );
}

/** Platform notifications + open requests chưa có thông báo platform tương ứng. */
export function buildResidentInbox(
  notifications: PlatformNotification[],
  openRequests: SecurityRequest[],
  ackedRequestIds: Set<string>,
  dismissedRequestIds: Set<string> = new Set(),
): GuardResidentInboxItem[] {
  const platformItems = notifications
    .filter((n) => isResidentTopic(n.topic))
    .map(platformToResidentItem);

  const coveredRequestIds = new Set(
    platformItems.map((n) => n.requestId).filter((id): id is string => !!id),
  );

  const requestItems = openRequests
    .filter((r) => !coveredRequestIds.has(r.id))
    .filter((r) => !dismissedRequestIds.has(r.id))
    .map((r) => requestToResidentItem(r, ackedRequestIds));

  return [...platformItems, ...requestItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function patchNotificationRead(items: PlatformNotification[] | undefined, id: string) {
  if (!items) return items;
  const now = new Date().toISOString();
  return items.map((n) =>
    n.id === id ? { ...n, read_at: now, status: "read" } : n,
  );
}

function countInboxUnread(
  platformItems: PlatformNotification[],
  residentItems: GuardResidentInboxItem[],
) {
  const company = platformItems.filter((n) => !isResidentTopic(n.topic));
  return (
    residentItems.filter((n) => !n.read).length +
    company.filter((n) => !n.read_at).length
  );
}

function useGuardNotificationsState() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const listQ = useQuery({
    queryKey: ["guard-notifications"],
    queryFn: () => listPlatformNotifications(),
    staleTime: 30_000,
  });

  const openQ = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    staleTime: 30_000,
  });

  const ackedQ = useQuery({
    queryKey: ["guard-inbox-acked-request-ids"],
    queryFn: async () => [] as string[],
    staleTime: Infinity,
    initialData: [] as string[],
  });
  const ackedIds = useMemo(() => new Set(ackedQ.data ?? []), [ackedQ.data]);

  const dismissedQ = useQuery({
    queryKey: ["guard-inbox-dismissed-request-ids"],
    queryFn: listDismissedInboxRequestIds,
    staleTime: 60_000,
  });
  const dismissedIds = useMemo(() => new Set(dismissedQ.data ?? []), [dismissedQ.data]);

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    const channelName = `guard-inbox-${userId}`;
    for (const existing of supabase.getChannels()) {
      if (existing.topic === `realtime:${channelName}`) {
        void supabase.removeChannel(existing);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "platform",
          table: "notification",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as PlatformNotification | undefined;
          if (!row?.id) return;
          qc.setQueryData<PlatformNotification[]>(["guard-notifications"], (old) => {
            const prev = old ?? [];
            const without = prev.filter((n) => n.id !== row.id);
            if (payload.eventType === "DELETE") return without;
            if (row.dismissed_at) return without;
            return [row, ...without];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_requests" },
        (payload) => {
          const row = (payload.new ?? payload.old) as SecurityRequest | undefined;
          if (!row?.id) return;
          qc.setQueryData<SecurityRequest[]>(["guard-open-requests"], (old) => {
            const prev = old ?? [];
            const without = prev.filter((r) => r.id !== row.id);
            if (payload.eventType === "DELETE") return without;
            const open = row.status === "open" || row.status === "in_progress";
            if (!open) return without;
            return [row, ...without];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const platformItems = listQ.data ?? [];
  const openRequests = openQ.data ?? [];

  const residentItems = useMemo(
    () => buildResidentInbox(platformItems, openRequests, ackedIds, dismissedIds),
    [platformItems, openRequests, ackedIds, dismissedIds],
  );

  const companyItems = useMemo(
    () => platformItems.filter((n) => !isResidentTopic(n.topic)),
    [platformItems],
  );

  const residentUnread = residentItems.filter((n) => !n.read).length;
  const companyUnread = companyItems.filter((n) => !n.read_at).length;
  const residentReadCount = residentItems.filter((n) => n.read).length;
  const companyReadCount = companyItems.filter((n) => n.read_at).length;
  const badgeCount = residentUnread + companyUnread;
  const openRequestCount = openRequests.length;

  useEffect(() => {
    qc.setQueryData(["guard-notifications-unread"], { count: badgeCount });
  }, [badgeCount, qc]);

  const syncBadgeQuery = useCallback(
    (items: PlatformNotification[], resident: GuardResidentInboxItem[]) => {
      qc.setQueryData(["guard-notifications-unread"], {
        count: countInboxUnread(items, resident),
      });
    },
    [qc],
  );

  const ackRequest = useCallback(
    (requestId: string) => {
      qc.setQueryData<string[]>(["guard-inbox-acked-request-ids"], (old) => {
        const prev = old ?? [];
        if (prev.includes(requestId)) return prev;
        return [...prev, requestId];
      });
    },
    [qc],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (id.startsWith("req-")) {
        const requestId = id.slice(4);
        ackRequest(requestId);
        const nextResident = buildResidentInbox(
          platformItems,
          openRequests,
          new Set([...ackedIds, requestId]),
          dismissedIds,
        );
        syncBadgeQuery(platformItems, nextResident);
        return;
      }

      qc.setQueryData<PlatformNotification[]>(["guard-notifications"], (old) => {
        const next = patchNotificationRead(old, id);
        if (next) {
          const resident = buildResidentInbox(next, openRequests, ackedIds, dismissedIds);
          syncBadgeQuery(next, resident);
        }
        return next;
      });

      try {
        await markPlatformRead({ id });
      } catch {
        void qc.invalidateQueries({ queryKey: ["guard-notifications"] });
      }
    },
    [ackRequest, ackedIds, dismissedIds, openRequests, platformItems, qc, syncBadgeQuery],
  );

  const markAllRead = useCallback(
    async (tab: "resident" | "company" | "all") => {
      const now = new Date().toISOString();

      if (tab === "resident" || tab === "all") {
        const toAck = openRequests
          .filter((r) => !ackedIds.has(r.id))
          .map((r) => r.id);
        if (toAck.length > 0) {
          qc.setQueryData<string[]>(["guard-inbox-acked-request-ids"], (old) => [
            ...new Set([...(old ?? []), ...toAck]),
          ]);
        }
      }

      qc.setQueryData<PlatformNotification[]>(["guard-notifications"], (old) => {
        if (!old) return old;
        const next = old.map((n) => {
          const isRes = isResidentTopic(n.topic);
          const shouldMark =
            tab === "all" ||
            (tab === "resident" && isRes) ||
            (tab === "company" && !isRes);
          return shouldMark && !n.read_at ? { ...n, read_at: now, status: "read" } : n;
        });
        const resident = buildResidentInbox(
          next,
          openRequests,
          tab === "resident" || tab === "all"
            ? new Set([...ackedIds, ...openRequests.map((r) => r.id)])
            : ackedIds,
          dismissedIds,
        );
        syncBadgeQuery(next, resident);
        return next;
      });

      try {
        if (tab === "all") {
          await markAllPlatformRead();
        } else if (tab === "company") {
          const toMark = platformItems.filter((n) => !n.read_at && !isResidentTopic(n.topic));
          await Promise.all(toMark.map((n) => markPlatformRead({ id: n.id })));
        } else {
          const toMark = platformItems.filter((n) => !n.read_at && isResidentTopic(n.topic));
          await Promise.all(toMark.map((n) => markPlatformRead({ id: n.id })));
        }
      } catch {
        void qc.invalidateQueries({ queryKey: ["guard-notifications"] });
      }
    },
    [ackedIds, dismissedIds, openRequests, platformItems, qc, syncBadgeQuery],
  );

  const deleteRead = useCallback(
    async (tab: "resident" | "company" | "all") => {
      const residentSnapshot = buildResidentInbox(
        platformItems,
        openRequests,
        ackedIds,
        dismissedIds,
      );

      const requestIdsToDismiss =
        tab === "resident" || tab === "all"
          ? residentSnapshot
              .filter((n) => n.kind === "request" && n.read && n.requestId)
              .map((n) => n.requestId!)
          : [];

      const idsToDelete = platformItems
        .filter((n) => {
          if (!n.read_at) return false;
          const isRes = isResidentTopic(n.topic);
          return (
            tab === "all" ||
            (tab === "resident" && isRes) ||
            (tab === "company" && !isRes)
          );
        })
        .map((n) => n.id);

      const nextDismissed = new Set([
        ...dismissedIds,
        ...requestIdsToDismiss,
      ]);

      qc.setQueryData<string[]>(["guard-inbox-dismissed-request-ids"], [
        ...nextDismissed,
      ]);

      qc.setQueryData<PlatformNotification[]>(["guard-notifications"], (old) => {
        if (!old) return old;
        const removeIds = new Set(idsToDelete);
        const next = old.filter((n) => !removeIds.has(n.id));
        const resident = buildResidentInbox(next, openRequests, ackedIds, nextDismissed);
        syncBadgeQuery(next, resident);
        return next;
      });

      try {
        if (requestIdsToDismiss.length > 0) {
          await dismissInboxSecurityRequests(requestIdsToDismiss);
        }
        if (tab === "all") {
          await deleteReadPlatformNotifications();
        } else if (idsToDelete.length > 0) {
          await deletePlatformNotifications(idsToDelete);
        }
      } catch {
        void qc.invalidateQueries({ queryKey: ["guard-notifications"] });
        void qc.invalidateQueries({ queryKey: ["guard-inbox-dismissed-request-ids"] });
      }
    },
    [ackedIds, dismissedIds, openRequests, platformItems, qc, syncBadgeQuery],
  );

  return {
    badgeCount,
    residentUnread,
    companyUnread,
    residentReadCount,
    companyReadCount,
    openRequestCount,
    items: platformItems,
    residentItems,
    companyItems,
    isLoading:
      (listQ.isLoading && listQ.data === undefined) ||
      (openQ.isLoading && openQ.data === undefined),
    isFetching: listQ.isFetching || openQ.isFetching,
    refetch: async () => {
      await Promise.all([listQ.refetch(), openQ.refetch()]);
    },
    markRead,
    markAllRead,
    deleteRead,
  };
}

type GuardNotificationsValue = ReturnType<typeof useGuardNotificationsState>;

const GuardNotificationsContext = createContext<GuardNotificationsValue | null>(null);

export function GuardNotificationsProvider({ children }: { children: ReactNode }) {
  const value = useGuardNotificationsState();
  return createElement(GuardNotificationsContext.Provider, { value }, children);
}

export function useGuardNotifications() {
  const ctx = useContext(GuardNotificationsContext);
  if (!ctx) {
    throw new Error("useGuardNotifications must be used within GuardNotificationsProvider");
  }
  return ctx;
}
