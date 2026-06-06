import { useQuery } from "@tanstack/react-query";
import {
  listPlatformNotifications,
  unreadPlatformCount,
} from "@guard/api/notifications";

export function useGuardNotifications() {
  const unreadQ = useQuery({
    queryKey: ["guard-notifications-unread"],
    queryFn: () => unreadPlatformCount(),
    refetchInterval: 60_000,
  });

  const listQ = useQuery({
    queryKey: ["guard-notifications"],
    queryFn: () => listPlatformNotifications(),
    refetchInterval: 60_000,
  });

  return {
    unread: unreadQ.data?.count ?? 0,
    items: listQ.data ?? [],
    isLoading: listQ.isLoading,
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
