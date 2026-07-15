import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/supabase/client";
import { useAuth } from "@shared/ui/hooks/use-auth";

/** Realtime + invalidate danh sách security_requests của cư dân. */
export function useSecurityRequestsRealtime() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`security_requests:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_requests", filter: `requester_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["security-requests"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
