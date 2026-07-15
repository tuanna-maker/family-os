import { useQuery } from "@tanstack/react-query";
import { unreadCount } from "@/api/notifications";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";

export function useNotifications() {
  useNotificationsRealtime();
  const q = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => unreadCount(),
    refetchInterval: 60_000,
  });
  return { unread: q.data?.count ?? 0, isLoading: q.isLoading };
}
