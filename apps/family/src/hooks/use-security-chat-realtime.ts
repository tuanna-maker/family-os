import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/supabase/client";
import { useAuth } from "@shared/ui/hooks/use-auth";
import type { SecurityChatMessage } from "@/api/security-chat";

export function useSecurityChatRealtime(familyId?: string | null) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`security-chat:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_chat_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SecurityChatMessage | undefined;
          if (!row?.id) return;
          qc.setQueryData<SecurityChatMessage[]>(["security-chat", familyId], (old) => {
            const prev = old ?? [];
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev.filter((m) => m.id !== "welcome"), row];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, familyId, qc]);
}
