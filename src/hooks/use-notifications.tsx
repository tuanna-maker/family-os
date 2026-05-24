import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { unreadCount } from "@/lib/notifications.functions";

/** Subscribe to realtime notifications for the current user + return unread count. */
export function useNotifications() {
  const queryClient = useQueryClient();
  const getCount = useServerFn(unreadCount);

  const q = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => getCount(),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`notif:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { unread: q.data?.count ?? 0, isLoading: q.isLoading };
}
