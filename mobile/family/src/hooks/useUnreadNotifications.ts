import { useQuery } from "@tanstack/react-query";
import { unreadCount } from "@mobile/api/notifications";
import { useAuth } from "@mobile/hooks/useAuth";

export function useUnreadNotifications() {
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => unreadCount(),
    enabled: !!session,
    refetchInterval: 30_000,
  });
  return { unread: q.data?.count ?? 0, refetch: q.refetch };
}
