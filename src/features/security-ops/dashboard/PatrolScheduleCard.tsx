import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, AlertTriangle, Clock, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type CheckpointStatus = "done" | "violation" | "pending" | "missed";

type Checkpoint = {
  id: string;
  time: string;     // HH:MM
  location: string;
  guard: string;
  status: CheckpointStatus;
  note?: string;
};

type Shift = {
  id: string;
  label: string;
  range: string;
  lead: string;
  checkpoints: Checkpoint[];
};

const SHIFTS: Shift[] = [
  {
    id: "S1", label: "Ca sáng", range: "06:00 – 14:00", lead: "G-014 · Trần Văn Hùng",
    checkpoints: [
      { id: "CP-101", time: "06:15", location: "Cổng chính", guard: "G-014", status: "done" },
      { id: "CP-102", time: "07:00", location: "Lobby A", guard: "G-019", status: "done" },
      { id: "CP-103", time: "08:30", location: "Tháp A · L05", guard: "G-007", status: "done" },
      { id: "CP-104", time: "10:00", location: "Hầm B1 · Khu C", guard: "G-021", status: "violation", note: "Trễ 12 phút, thiếu chữ ký" },
      { id: "CP-105", time: "11:30", location: "Sảnh sự kiện", guard: "G-033", status: "done" },
      { id: "CP-106", time: "13:30", location: "Bãi xe ngoài", guard: "G-028", status: "missed", note: "Không quét QR" },
    ],
  },
  {
    id: "S2", label: "Ca chiều", range: "14:00 – 22:00", lead: "G-021 · Lê Minh Tuấn",
    checkpoints: [
      { id: "CP-201", time: "14:15", location: "Cổng chính", guard: "G-021", status: "done" },
      { id: "CP-202", time: "15:30", location: "Tháp B · L12", guard: "G-019", status: "done" },
      { id: "CP-203", time: "17:00", location: "Lobby B", guard: "G-033", status: "pending" },
      { id: "CP-204", time: "18:30", location: "Hầm B2", guard: "G-007", status: "pending" },
      { id: "CP-205", time: "20:00", location: "Bãi xe ngoài", guard: "G-028", status: "pending" },
      { id: "CP-206", time: "21:30", location: "Sảnh sự kiện", guard: "G-014", status: "pending" },
    ],
  },
  {
    id: "S3", label: "Ca đêm", range: "22:00 – 06:00", lead: "G-007 · Phạm Quốc Đạt",
    checkpoints: [
      { id: "CP-301", time: "22:15", location: "Cổng chính", guard: "G-007", status: "pending" },
      { id: "CP-302", time: "00:00", location: "Hầm B1 + B2", guard: "G-019", status: "pending" },
      { id: "CP-303", time: "02:00", location: "Tháp A toàn nhà", guard: "G-014", status: "pending" },
      { id: "CP-304", time: "04:00", location: "Tháp B toàn nhà", guard: "G-021", status: "pending" },
      { id: "CP-305", time: "05:30", location: "Bãi xe ngoài", guard: "G-028", status: "pending" },
    ],
  },
];

const STATUS_META: Record<CheckpointStatus, { label: string; cls: string; icon: typeof Clock }> = {
  done:      { label: "Hoàn thành", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  violation: { label: "Vi phạm",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",      icon: AlertTriangle },
  pending:   { label: "Chờ",        cls: "bg-white/5 text-white/60 border-white/15",                icon: Clock },
  missed:    { label: "Bỏ lỡ",      cls: "bg-red-500/15 text-red-300 border-red-500/30",            icon: XCircle },
};

export function PatrolScheduleCard() {
  const [shiftId, setShiftId] = useState<string>("S1");
  const [filter, setFilter] = useState<"all" | CheckpointStatus>("all");
  const [shifts, setShifts] = useState<Shift[]>(SHIFTS);

  const shift = shifts.find((s) => s.id === shiftId)!;
  const visible = useMemo(
    () => (filter === "all" ? shift.checkpoints : shift.checkpoints.filter((c) => c.status === filter)),
    [shift, filter],
  );

  const summary = useMemo(() => {
    const counts = { done: 0, violation: 0, pending: 0, missed: 0 } as Record<CheckpointStatus, number>;
    shift.checkpoints.forEach((c) => { counts[c.status]++; });
    const total = shift.checkpoints.length;
    const pct = total ? Math.round((counts.done / total) * 100) : 0;
    return { counts, total, pct };
  }, [shift]);

  const updateStatus = (cpId: string, next: CheckpointStatus) => {
    setShifts((prev) => prev.map((s) =>
      s.id !== shiftId ? s : { ...s, checkpoints: s.checkpoints.map((c) => c.id === cpId ? { ...c, status: next } : c) }
    ));
    toast.success(`${cpId} → ${STATUS_META[next].label}`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white lg:col-span-2">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-sky-400" />
          <h3 className="text-[13px] font-semibold">Lịch tuần tra theo ca</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={shiftId} onValueChange={setShiftId}>
            <SelectTrigger className="h-8 w-[160px] bg-white/5 border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label} · {s.range}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-8 w-[130px] bg-white/5 border-white/10 text-white text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="done">Hoàn thành</SelectItem>
              <SelectItem value="violation">Vi phạm</SelectItem>
              <SelectItem value="pending">Chờ</SelectItem>
              <SelectItem value="missed">Bỏ lỡ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["done", "violation", "pending", "missed"] as CheckpointStatus[]).map((s) => {
          const m = STATUS_META[s];
          return (
            <div key={s} className={`rounded-lg border px-3 py-2 ${m.cls}`}>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
                <m.icon className="h-3 w-3" /> {m.label}
              </div>
              <div className="text-lg font-bold tabular-nums mt-0.5">{summary.counts[s]}</div>
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-white/50 mb-3">
        Trưởng ca: <span className="text-white/80">{shift.lead}</span> · Tiến độ {summary.pct}% ({summary.counts.done}/{summary.total})
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-emerald-400" style={{ width: `${summary.pct}%` }} />
      </div>

      {/* Timeline list */}
      <ol className="relative border-l border-white/10 pl-4 space-y-2">
        {visible.map((cp) => {
          const m = STATUS_META[cp.status];
          return (
            <li key={cp.id} className="relative">
              <span className={`absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full ${
                cp.status === "done" ? "bg-emerald-400" :
                cp.status === "violation" ? "bg-amber-400" :
                cp.status === "missed" ? "bg-red-400" : "bg-white/30"
              } ring-2 ring-[#0b1220]`} />
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="font-mono text-xs text-white/70 w-12">{cp.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{cp.location}</div>
                  <div className="text-[11px] text-white/50">{cp.id} · {cp.guard}{cp.note ? ` · ${cp.note}` : ""}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1 ${m.cls}`}>
                  <m.icon className="h-3 w-3" /> {m.label}
                </span>
                <Select value={cp.status} onValueChange={(v) => updateStatus(cp.id, v as CheckpointStatus)}>
                  <SelectTrigger className="h-7 w-[28px] bg-transparent border-white/10 text-white/60 px-1.5">
                    <span className="text-[10px]">⋯</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="done">Đánh dấu hoàn thành</SelectItem>
                    <SelectItem value="violation">Báo vi phạm</SelectItem>
                    <SelectItem value="missed">Đánh dấu bỏ lỡ</SelectItem>
                    <SelectItem value="pending">Đặt lại chờ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="text-xs text-white/50 py-4 text-center">Không có checkpoint phù hợp bộ lọc.</li>
        )}
      </ol>
    </div>
  );
}
