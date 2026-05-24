import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SubHeader } from "./guard.check-in";

export const Route = createFileRoute("/guard/schedule")({
  head: () => ({ meta: [{ title: "Lịch trực — Bảo vệ" }] }),
  component: SchedulePage,
});

type Shift =
  | { day: string; date: string; off: true }
  | {
      day: string;
      date: string;
      off?: false;
      shift: string;
      time: string;
      location: string;
      handover: string;
      tag?: "today" | "upcoming";
    };

const SHIFTS: Shift[] = [
  { day: "Thứ 2", date: "20/05", shift: "Ca sáng", time: "06:00 - 14:00", location: "Sảnh chính - Tòa A", handover: "Trần Văn Nam", tag: "today" },
  { day: "Thứ 3", date: "21/05", off: true },
  { day: "Thứ 4", date: "22/05", shift: "Ca đêm", time: "22:00 - 06:00", location: "Hầm xe B1", handover: "Lê Minh Đức", tag: "upcoming" },
  { day: "Thứ 5", date: "23/05", shift: "Ca sáng", time: "06:00 - 14:00", location: "Sảnh chính - Tòa A", handover: "Phạm Tuấn Anh", tag: "upcoming" },
  { day: "Thứ 6", date: "23/05", shift: "Ca sáng", time: "06:00 - 14:00", location: "Sảnh chính - Tòa A", handover: "Trần Văn Nam", tag: "upcoming" },
  { day: "Thứ 7", date: "25/05", shift: "Ca đêm", time: "22:00 - 06:00", location: "Hầm xe B1", handover: "Lê Minh Đức", tag: "upcoming" },
  { day: "CN", date: "26/05", off: true },
];

function SchedulePage() {
  return (
    <>
      <SubHeader title="LỊCH TRỰC" back="/guard" />

      <section className="px-5 mt-3">
        <div className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between">
          <button className="h-8 w-8 rounded-full grid place-items-center bg-muted/30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">20/05 – 26/05/2024</p>
          <button className="h-8 w-8 rounded-full grid place-items-center bg-muted/30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="px-5 mt-4 space-y-2.5">
        {SHIFTS.map((s) => {
          if (s.off) {
            return (
              <div
                key={s.date + s.day}
                className="rounded-2xl bg-card border border-border p-3 flex items-center gap-4"
              >
                <DayChip day={s.day} date={s.date} dim />
                <p className="text-sm font-semibold text-muted-foreground">NGHỈ</p>
              </div>
            );
          }
          return (
            <div
              key={s.date + s.day}
              className={`rounded-2xl border p-3 flex items-start gap-4 ${
                s.tag === "today"
                  ? "bg-brand/10 border-brand/40"
                  : "bg-card border-border"
              }`}
            >
              <DayChip day={s.day} date={s.date} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold">
                    <span className="text-success">{s.shift}:</span> {s.time}
                  </p>
                </div>
                <p className="text-[12px] mt-0.5">{s.location}</p>
                <p className="text-[11px] text-muted-foreground">
                  Người bàn giao: {s.handover}
                </p>
              </div>
              {s.tag && (
                <span
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    s.tag === "today"
                      ? "bg-brand text-white"
                      : "bg-[oklch(0.65_0.2_295)]/20 text-[oklch(0.75_0.2_295)]"
                  }`}
                >
                  {s.tag === "today" ? "Hôm nay" : "Sắp tới"}
                </span>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}

function DayChip({ day, date, dim }: { day: string; date: string; dim?: boolean }) {
  return (
    <div
      className={`shrink-0 w-12 text-center ${dim ? "text-muted-foreground" : ""}`}
    >
      <p className="text-[10px] uppercase">{day}</p>
      <p className="text-sm font-bold">{date}</p>
    </div>
  );
}
