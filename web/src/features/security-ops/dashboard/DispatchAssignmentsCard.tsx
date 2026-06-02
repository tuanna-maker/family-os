import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardList,
  Sparkles,
  Hand,
  CheckCircle2,
  MapPin,
  Copy,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listRecentDispatches,
  updateSosStatus,
  type DispatchRow,
  type SosStatus,
} from "@/lib/security.functions";
import { useSosOpsStream } from "./use-sos-ops-stream";

const PRIO_CLS: Record<DispatchRow["priority"], string> = {
  P1: "bg-red-500/20 text-red-300 border-red-500/40",
  P2: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  P3: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "—": "bg-white/5 text-white/60 border-white/10",
};

const STATUS_META: Record<SosStatus, { label: string; cls: string }> = {
  open: { label: "Đang mở", cls: "text-amber-300" },
  in_progress: { label: "Đang xử lý", cls: "text-sky-300" },
  resolved: { label: "Hoàn thành", cls: "text-emerald-300" },
  cancelled: { label: "Đã huỷ", cls: "text-white/50" },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function DispatchAssignmentsCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRecentDispatches);
  const updateFn = useServerFn(updateSosStatus);

  const { data: records = [], isLoading } = useQuery<DispatchRow[]>({
    queryKey: ["recent-dispatches"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  // Shared ref-counted realtime channel (merged with OpenSosCard)
  useSosOpsStream();


  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: SosStatus }) =>
      updateFn({ data: { id: vars.id, status: vars.status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recent-dispatches"] });
      qc.invalidateQueries({ queryKey: ["open-sos"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Không cập nhật được"),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-sky-400" />
          <h3 className="text-[13px] font-semibold">Bản ghi phân công SOS</h3>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <Radio className="h-2.5 w-2.5" /> Realtime
          </span>
        </div>
        <span className="text-[11px] text-white/50">{records.length} bản ghi</span>
      </div>

      {isLoading ? (
        <div className="text-xs text-white/50 py-8 text-center">Đang tải...</div>
      ) : records.length === 0 ? (
        <div className="text-xs text-white/50 py-8 text-center border border-dashed border-white/10 rounded-lg">
          Chưa có điều động nào. Bấm{" "}
          <span className="text-red-300 font-medium">Điều phối SOS</span> ở góc
          trên để tạo.
        </div>
      ) : (
        <ol className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {records.map((r) => {
            const sm = STATUS_META[r.status] ?? STATUS_META.open;
            return (
              <li
                key={r.id}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${PRIO_CLS[r.priority]}`}
                  >
                    {r.priority}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5">
                    <span className="font-mono text-[11px] font-semibold tracking-wide text-white">
                      {r.ticket_code}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(r.ticket_code);
                          toast.success("Đã sao chép mã ticket");
                        } catch {
                          toast.error("Không sao chép được");
                        }
                      }}
                      className="text-white/50 hover:text-white transition"
                      aria-label="Sao chép mã ticket"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                  {r.auto_assigned ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      <Sparkles className="h-2.5 w-2.5" /> Tự động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                      <Hand className="h-2.5 w-2.5" /> Thủ công
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-white/40">
                    {timeAgo(r.created_at)} trước
                  </span>
                </div>
                <div className="text-[13px] font-medium">{r.incident_type}</div>
                <div className="text-[11px] text-white/60 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />{" "}
                  {[r.zone, r.location].filter(Boolean).join(" · ") || "—"}
                </div>
                {r.team_name && (
                  <div className="text-[11px] text-white/70 mt-1.5">
                    → <span className="font-medium">{r.team_name}</span>
                  </div>
                )}
                {r.note && (
                  <div className="text-[11px] text-white/50 italic mt-1">
                    "{r.note}"
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className={`flex items-center gap-1 text-[11px] ${sm.cls}`}>
                    <CheckCircle2 className="h-3 w-3" /> {sm.label}
                  </span>
                  <Select
                    value={r.status}
                    onValueChange={(v) =>
                      statusMut.mutate({ id: r.id, status: v as SosStatus })
                    }
                    disabled={statusMut.isPending}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-[11px] bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Đang mở</SelectItem>
                      <SelectItem value="in_progress">Đang xử lý</SelectItem>
                      <SelectItem value="resolved">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Đã huỷ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
