import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { SubHeader } from "@/features/guard/SubHeader";
import { listShiftsRange, type GuardShift } from "@/lib/guard.functions";

export const Route = createFileRoute("/guard/schedule")({
  head: () => ({ meta: [{ title: "Lịch trực — Bảo vệ" }] }),
  component: SchedulePage,
});

const DAYS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-start week
  x.setDate(x.getDate() + diff);
  return x;
}
function fmt(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SchedulePage() {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const weekStart = anchor;
  const weekEnd = useMemo(() => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 6);
    return d;
  }, [anchor]);

  const fetchShifts = useServerFn(listShiftsRange);
  const q = useQuery({
    queryKey: ["guard-shifts-range", isoDate(weekStart), isoDate(weekEnd)],
    queryFn: () => fetchShifts({ data: { from: isoDate(weekStart), to: isoDate(weekEnd) } }),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, GuardShift[]>();
    for (const s of q.data ?? []) {
      const k = s.shift_date;
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [q.data]);

  const todayIso = isoDate(new Date());

  return (
    <>
      <SubHeader title="LỊCH TRỰC" back="/guard" />
      <section className="px-5 mt-3">
        <div className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between">
          <button
            onClick={() => {
              const d = new Date(anchor);
              d.setDate(d.getDate() - 7);
              setAnchor(d);
            }}
            className="h-8 w-8 rounded-full grid place-items-center bg-muted/30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">
            {fmt(weekStart)} – {fmt(weekEnd)}/{weekEnd.getFullYear()}
          </p>
          <button
            onClick={() => {
              const d = new Date(anchor);
              d.setDate(d.getDate() + 7);
              setAnchor(d);
            }}
            className="h-8 w-8 rounded-full grid place-items-center bg-muted/30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="px-5 mt-4 space-y-2.5">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
        ) : (
          Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const key = isoDate(d);
            const shifts = byDate.get(key) ?? [];
            const dayLabel = DAYS[d.getDay()];
            const isToday = key === todayIso;
            if (shifts.length === 0) {
              return (
                <div
                  key={key}
                  className="rounded-2xl bg-card border border-border p-3 flex items-center gap-4"
                >
                  <DayChip day={dayLabel} date={fmt(d)} dim />
                  <p className="text-sm font-semibold text-muted-foreground">NGHỈ</p>
                </div>
              );
            }
            return shifts.map((s) => (
              <ShiftCard key={s.id} shift={s} dayLabel={dayLabel} date={fmt(d)} isToday={isToday} />
            ));
          })
        )}
      </section>
    </>
  );
}

const SHIFT_LABEL: Record<string, string> = { morning: "Ca sáng", afternoon: "Ca chiều", night: "Ca đêm" };
const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  scheduled: { text: "Sắp tới", cls: "bg-[oklch(0.65_0.2_295)]/20 text-[oklch(0.75_0.2_295)]" },
  checked_in: { text: "Đang trực", cls: "bg-success/20 text-success" },
  checked_out: { text: "Đã xong", cls: "bg-muted text-muted-foreground" },
  missed: { text: "Bỏ ca", cls: "bg-emergency/20 text-emergency" },
  cancelled: { text: "Hủy", cls: "bg-muted text-muted-foreground" },
};

function ShiftCard({ shift, dayLabel, date, isToday }: { shift: GuardShift; dayLabel: string; date: string; isToday: boolean }) {
  const start = new Date(shift.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const end = new Date(shift.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const status = STATUS_LABEL[shift.status] ?? STATUS_LABEL.scheduled;
  return (
    <div
      className={`rounded-2xl border p-3 flex items-start gap-4 ${
        isToday ? "bg-brand/10 border-brand/40" : "bg-card border-border"
      }`}
    >
      <DayChip day={dayLabel} date={date} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold">
          <span className="text-success">{SHIFT_LABEL[shift.shift_type] ?? shift.shift_type}:</span> {start} - {end}
        </p>
        {shift.notes && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{shift.notes}</p>}
      </div>
      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${isToday ? "bg-brand text-white" : status.cls}`}>
        {isToday ? "Hôm nay" : status.text}
      </span>
    </div>
  );
}

function DayChip({ day, date, dim }: { day: string; date: string; dim?: boolean }) {
  return (
    <div className={`shrink-0 w-12 text-center ${dim ? "text-muted-foreground" : ""}`}>
      <p className="text-[10px] uppercase">{day}</p>
      <p className="text-sm font-bold">{date}</p>
    </div>
  );
}
