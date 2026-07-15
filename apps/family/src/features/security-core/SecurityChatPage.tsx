import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { SecurityShell } from "./components/SecurityShell";
import { cn } from "@shared/utils";
import { listSecurityChatMessages, sendSecurityChatMessage } from "@/api/security-chat";
import { useSecurityChatRealtime } from "@/hooks/use-security-chat-realtime";
import { useFamilyContext } from "@/hooks/use-family-context";
import { securityMeta } from "./data";

export function SecurityChatPage() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useSecurityChatRealtime(familyId);

  const q = useQuery({
    queryKey: ["security-chat", familyId],
    queryFn: () => listSecurityChatMessages(familyId),
    staleTime: 30_000,
  });

  const sendMut = useMutation({
    mutationFn: () => sendSecurityChatMessage({ body: text, family_id: familyId }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["security-chat"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [q.data?.length]);

  return (
    <SecurityShell title="Chat với bảo an" subtitle={`Hotline ${securityMeta.hotline} · phản hồi ~${securityMeta.responseTimeMinutes} phút`} back="/bao-an">
      <div className="flex flex-col min-h-[calc(100dvh-8rem)] px-4 mt-2">
        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {(q.data ?? []).map((m) => {
            const mine = m.sender_role === "resident";
            const system = m.sender_role === "system";
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start", system && "justify-center")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    mine && "bg-brand text-white rounded-br-md",
                    m.sender_role === "guard" && "bg-card border border-border rounded-bl-md",
                    system && "bg-muted/50 text-muted-foreground text-xs px-3 py-2 max-w-full text-center",
                  )}
                >
                  {!mine && !system && (
                    <p className="text-[10px] font-semibold text-success mb-0.5">Đội bảo an</p>
                  )}
                  {m.body}
                  <p
                    className={cn(
                      "text-[10px] mt-1 opacity-70",
                      mine ? "text-right" : "text-left",
                    )}
                  >
                    {new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur border-t border-border -mx-4 px-4">
          <form
            className="flex gap-2 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              sendMut.mutate();
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập tin nhắn…"
              rows={1}
              className="flex-1 min-h-12 max-h-28 rounded-2xl border border-border bg-card px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            <button
              type="submit"
              disabled={!text.trim() || sendMut.isPending}
              className="h-12 w-12 shrink-0 rounded-2xl bg-brand text-white grid place-items-center disabled:opacity-50"
              aria-label="Gửi"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </SecurityShell>
  );
}
