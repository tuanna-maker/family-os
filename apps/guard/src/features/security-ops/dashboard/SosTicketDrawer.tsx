import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, MessageSquarePlus, CheckCircle2, PlayCircle, XCircle, Inbox } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@shared/ui/ui/sheet";
import { Button } from "@shared/ui/ui/button";
import { Badge } from "@shared/ui/ui/badge";
import { Textarea } from "@shared/ui/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@shared/supabase/client";
import {
  addSosNote, listSosEvents, updateSosStatus,
  type OpenSosRow, type SosEvent, type SosStatus,
} from "@/api/security";

const PRIORITY_CLS: Record<string, string> = {
  P1: "border-red-500/60 bg-red-500/15 text-red-600 dark:text-red-300",
  P2: "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  P3: "border-sky-500/60 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "—": "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  in_progress: "Đang xử lý",
  resolved: "Hoàn thành",
  cancelled: "Đã huỷ",
  dispatched: "Đã điều động",
};

const EVENT_META: Record<string, { label: string; cls: string }> = {
  dispatched: { label: "Điều động", cls: "bg-sky-500" },
  status_change: { label: "Cập nhật trạng thái", cls: "bg-indigo-500" },
  note: { label: "Ghi chú", cls: "bg-muted-foreground" },
};

function fmtTime(s: string) {
  const d = new Date(s);
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" });
}

export function SosTicketDrawer({
  row, open, onOpenChange,
}: {
  row: OpenSosRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
        const [note, setNote] = useState("");

  const { data: events = [], isLoading } = useQuery<SosEvent[]>({
    queryKey: ["sos-events", row?.id],
    queryFn: () => listSosEvents({ id: row!.id }),
    enabled: !!row && open,
    // Realtime drives invalidation; long safety-net poll only.
    refetchInterval: open ? 60_000 : false,
  });

  // Realtime: stream events for this specific ticket + its row updates
  useEffect(() => {
    if (!row?.id || !open) return;
    const ch = supabase
      .channel(`sos-ticket-${row.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_events", filter: `request_id=eq.${row.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["sos-events", row.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "security_requests", filter: `id=eq.${row.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["open-sos"] });
          qc.invalidateQueries({ queryKey: ["sos-events", row.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [row?.id, open, qc]);


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sos-events", row?.id] });
    qc.invalidateQueries({ queryKey: ["open-sos"] });
    qc.invalidateQueries({ queryKey: ["guard-open-requests"] });
  };

  const statusMut = useMutation({
    mutationFn: (vars: { status: SosStatus; note?: string }) =>
      updateSosStatus({ id: row!.id, status: vars.status, note: vars.note }),
    onSuccess: (_d, vars) => {
      toast.success(`Đã chuyển sang "${STATUS_LABEL[vars.status]}"`);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi"),
  });

  const noteMut = useMutation({
    mutationFn: (n: string) => addSosNote({ id: row!.id, note: n }),
    onSuccess: () => {
      toast.success("Đã ghi chú");
      setNote("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi"),
  });

  if (!row) return null;
  const busy = statusMut.isPending || noteMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${PRIORITY_CLS[row.priority]} font-semibold`}>
              {row.priority}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {STATUS_LABEL[row.status] ?? row.status}
            </Badge>
          </div>
          <SheetTitle className="text-base">{row.incident_type}</SheetTitle>
          <SheetDescription className="text-xs space-y-0.5">
            <div className="font-mono">{row.ticket_code}</div>
            <div>{[row.zone, row.location].filter(Boolean).join(" · ") || "—"}</div>
            {row.team_name && <div>Đội: {row.team_name}</div>}
          </SheetDescription>
        </SheetHeader>

        {/* Status actions */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Cập nhật trạng thái</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm" variant="outline" className="justify-start gap-2"
              disabled={busy || row.status === "in_progress"}
              onClick={() => statusMut.mutate({ status: "in_progress" })}
            >
              <Inbox className="h-3.5 w-3.5" /> Tiếp nhận
            </Button>
            <Button
              size="sm" variant="outline" className="justify-start gap-2"
              disabled={busy || row.status === "in_progress"}
              onClick={() => statusMut.mutate({ status: "in_progress", note: "Đội đã đến hiện trường" })}
            >
              <PlayCircle className="h-3.5 w-3.5" /> Đang xử lý
            </Button>
            <Button
              size="sm" className="justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={busy}
              onClick={() => statusMut.mutate({ status: "resolved" })}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
            </Button>
            <Button
              size="sm" variant="outline" className="justify-start gap-2"
              disabled={busy}
              onClick={() => statusMut.mutate({ status: "cancelled" })}
            >
              <XCircle className="h-3.5 w-3.5" /> Huỷ
            </Button>
          </div>
        </div>

        {/* Add note */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Ghi chú nhanh</div>
          <Textarea
            rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Đội đến hiện trường, đã liên hệ cư dân..."
          />
          <Button
            size="sm" className="gap-1.5"
            disabled={busy || !note.trim()}
            onClick={() => noteMut.mutate(note.trim())}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> Ghi log
          </Button>
        </div>

        {/* Timeline */}
        <div className="mt-6 space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Nhật ký xử lý
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4">Đang tải...</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">Chưa có sự kiện.</p>
          ) : (
            <ol className="relative border-l border-border ml-1.5 space-y-3 pt-1">
              {events.map((ev) => {
                const meta = EVENT_META[ev.event_type] ?? { label: ev.event_type, cls: "bg-muted-foreground" };
                return (
                  <li key={ev.id} className="ml-4">
                    <span className={`absolute -left-[5px] flex h-2.5 w-2.5 rounded-full ${meta.cls} ring-2 ring-background`} />
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-medium">{meta.label}</span>
                      {ev.to_status && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ev.from_status ? `${STATUS_LABEL[ev.from_status] ?? ev.from_status} → ` : ""}
                          {STATUS_LABEL[ev.to_status] ?? ev.to_status}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(ev.created_at)}</span>
                    </div>
                    {ev.note && <p className="text-xs text-muted-foreground mt-0.5">{ev.note}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
