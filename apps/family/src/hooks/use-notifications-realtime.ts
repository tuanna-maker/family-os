import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/supabase/client";
import { useAuth } from "@shared/ui/hooks/use-auth";

export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-unread"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
