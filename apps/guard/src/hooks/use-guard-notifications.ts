import { useQuery } from "@tanstack/react-query";
import { listPlatformNotifications, unreadPlatformCount } from "@/api/notifications";

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
  };
}
