import { useQuery } from "@tanstack/react-query";
import {
  listPlatformNotifications,
  unreadPlatformCount,
} from "@guard/api/notifications";
import { useGuardPrefs } from "@mobile/hooks/useGuardPrefs";

export function useGuardNotifications() {
  const { ready, notificationsEnabled } = useGuardPrefs();
  const enabled = ready && notificationsEnabled;

  const unreadQ = useQuery({
    queryKey: ["guard-notifications-unread"],
    queryFn: () => unreadPlatformCount(),
    refetchInterval: enabled ? 60_000 : false,
    enabled,
  });

  const listQ = useQuery({
    queryKey: ["guard-notifications"],
    queryFn: () => listPlatformNotifications(),
    refetchInterval: enabled ? 60_000 : false,
    enabled,
  });

  return {
    notificationsEnabled: enabled,
    unread: enabled ? (unreadQ.data?.count ?? 0) : 0,
    items: enabled ? (listQ.data ?? []) : [],
    isLoading: enabled && listQ.isLoading,
    refetch: listQ.refetch,
    markRead: async (id: string) => {
      const { markPlatformRead } = await import("@guard/api/notifications");
      await markPlatformRead({ id });
      await Promise.all([unreadQ.refetch(), listQ.refetch()]);
    },
    markAllRead: async () => {
      const unread = (listQ.data ?? []).filter((n) => !n.read_at);
      const { markPlatformRead } = await import("@guard/api/notifications");
      await Promise.all(unread.map((n) => markPlatformRead({ id: n.id })));
      await Promise.all([unreadQ.refetch(), listQ.refetch()]);
    },
  };
}
