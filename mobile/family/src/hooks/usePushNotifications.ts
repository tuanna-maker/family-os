import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@shared/supabase/get-client";
import { useAuth } from "@mobile/hooks/useAuth";
import { registerNativePushToken } from "@mobile/lib/push-native";

export function usePushNotifications() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const done = useRef(false);

  useEffect(() => {
    if (!session || done.current) return;
    done.current = true;
    registerNativePushToken("family").catch(() => {
      done.current = false;
    });
  }, [session]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const supabase = getSupabase();
    const ch = supabase
      .channel(`family-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications-all"] });
          void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [session?.user?.id, qc]);
}
