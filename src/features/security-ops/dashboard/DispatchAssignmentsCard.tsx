import { ClipboardList, Sparkles, Hand, CheckCircle2, MapPin, Copy } from "lucide-react";
import { toast } from "sonner";
import { useDispatchRecords, updateDispatchStatus, type DispatchRecord } from "./dispatchStore";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PRIO_CLS: Record<DispatchRecord["priority"], string> = {
  P1: "bg-red-500/20 text-red-300 border-red-500/40",
  P2: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  P3: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

const STATUS_META: Record<DispatchRecord["status"], { label: string; cls: string }> = {
  dispatched: { label: "Đã gửi",   cls: "text-amber-300" },
  ack:        { label: "Xác nhận", cls: "text-sky-300" },
  on_site:    { label: "Tại hiện trường", cls: "text-emerald-300" },
  closed:     { label: "Đã đóng",  cls: "text-white/50" },
};

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function DispatchAssignmentsCard() {
  const records = useDispatchRecords();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-sky-400" />
          <h3 className="text-[13px] font-semibold">Bản ghi phân công SOS</h3>
        </div>
        <span className="text-[11px] text-white/50">{records.length} bản ghi</span>
      </div>

      {records.length === 0 ? (
        <div className="text-xs text-white/50 py-8 text-center border border-dashed border-white/10 rounded-lg">
          Chưa có điều động nào. Bấm <span className="text-red-300 font-medium">Điều phối SOS</span> ở góc trên để tạo.
        </div>
      ) : (
        <ol className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {records.map((r) => {
            const sm = STATUS_META[r.status];
            return (
              <li key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${PRIO_CLS[r.priority]}`}>
                    {r.priority}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5">
                    <span className="font-mono text-[11px] font-semibold tracking-wide text-white">{r.id}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(r.id); toast.success("Đã sao chép mã ticket"); }
                        catch { toast.error("Không sao chép được"); }
                      }}
                      className="text-white/50 hover:text-white transition"
                      aria-label="Sao chép mã ticket"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                  {r.autoAssigned ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      <Sparkles className="h-2.5 w-2.5" /> Tự động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                      <Hand className="h-2.5 w-2.5" /> Thủ công
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-white/40">{timeAgo(r.createdAt)} trước</span>
                </div>
                <div className="text-[13px] font-medium">{r.incidentType}</div>
                <div className="text-[11px] text-white/60 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {[r.zone, r.location].filter(Boolean).join(" · ")}
                </div>
                <div className="text-[11px] text-white/70 mt-1.5">
                  → <span className="font-medium">{r.teamName}</span>
                </div>
                {r.note && <div className="text-[11px] text-white/50 italic mt-1">"{r.note}"</div>}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className={`flex items-center gap-1 text-[11px] ${sm.cls}`}>
                    <CheckCircle2 className="h-3 w-3" /> {sm.label}
                  </span>
                  <Select value={r.status} onValueChange={(v) => updateDispatchStatus(r.id, v as DispatchRecord["status"])}>
                    <SelectTrigger className="h-7 w-[140px] text-[11px] bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dispatched">Đã gửi</SelectItem>
                      <SelectItem value="ack">Đội xác nhận</SelectItem>
                      <SelectItem value="on_site">Tại hiện trường</SelectItem>
                      <SelectItem value="closed">Đóng</SelectItem>
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
