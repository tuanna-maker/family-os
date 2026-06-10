import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Người lạ",
  noise: "Tiếng ồn",
  package: "Nhận hàng",
  other: "Yêu cầu khác",
};

function labelFor(req: { request_type?: string | null; ticket_code?: string | null }) {
  return req.ticket_code || TYPE_LABEL[req.request_type ?? ""] || "Yêu cầu bảo an";
}

/**
 * Lắng nghe realtime các thay đổi trên security_requests + sos_events
 * thuộc về user hiện tại để hiển thị toast khi bảo an tiếp nhận / ghi chú / hoàn tất.
 */
export function useSecurityRequestNotifications() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;
  const ownedRequestIds = useRef<Set<string>>(new Set());
  const prevStatus = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!userId) return;

    // Prime sở hữu request từ cache hiện tại
    const cached = qc.getQueriesData<any[]>({ queryKey: ["security-requests"] });
    for (const [, data] of cached) {
      if (!Array.isArray(data)) continue;
      for (const r of data) {
        if (r?.requester_id === userId && r?.id) {
          ownedRequestIds.current.add(r.id);
          if (r.status) prevStatus.current.set(r.id, r.status);
        }
      }
    }

    const channel = supabase
      .channel(`sec-req-notify-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "security_requests",
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as any;
          const id = next?.id as string;
          if (!id) return;
          ownedRequestIds.current.add(id);
          const old = prevStatus.current.get(id);
          const status = next.status as string;
          const title = labelFor(next);

          if (old && old !== status) {
            if (status === "in_progress") {
              toast.success("Bảo an đã tiếp nhận yêu cầu", { description: title });
            } else if (status === "resolved") {
              toast.success("Yêu cầu đã hoàn tất", { description: title });
            } else if (status === "cancelled") {
              toast(`Đã huỷ: ${title}`);
            }
          }
          prevStatus.current.set(id, status);
          qc.invalidateQueries({ queryKey: ["security-requests"] });
          qc.invalidateQueries({ queryKey: ["guard-request-detail", id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_requests",
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (next?.id) {
            ownedRequestIds.current.add(next.id);
            prevStatus.current.set(next.id, next.status);
          }
          qc.invalidateQueries({ queryKey: ["security-requests"] });
        },
      )
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
