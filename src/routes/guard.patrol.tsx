import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Check, QrCode } from "lucide-react";
import { SubHeader } from "./guard.check-in";

export const Route = createFileRoute("/guard/patrol")({
  head: () => ({ meta: [{ title: "Tuần tra — Bảo vệ" }] }),
  component: PatrolPage,
});

const POINTS = [
  { name: "Sảnh chính", time: "06:10", done: true },
  { name: "Hầm xe B1", time: "06:25", done: true },
  { name: "Thang máy", done: false },
  { name: "Tầng 5", done: false },
  { name: "Sân thượng", done: false },
];

function PatrolPage() {
  const done = POINTS.filter((p) => p.done).length;
  const pct = Math.round((done / POINTS.length) * 100);
  return (
    <>
      <SubHeader title="TUẦN TRA" back="/guard" />
      <section className="px-5 mt-4">
        <p className="text-success text-sm font-semibold">Ca sáng: 06:00 - 14:00</p>
        <div className="mt-4 rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ tuần tra</span>
            <span className="font-semibold">
              {done}/{POINTS.length} điểm
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full bg-success" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-success font-semibold">{pct}%</p>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Danh sách điểm tuần tra
        </p>
        <ul className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          {POINTS.map((p) => (
            <li key={p.name} className="flex items-center gap-3 p-3.5">
              <span
                className={`h-6 w-6 rounded-full grid place-items-center shrink-0 ${
                  p.done ? "bg-success" : "border border-border"
                }`}
              >
                {p.done ? (
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
              <span className="text-sm font-semibold flex-1">{p.name}</span>
              {p.done && p.time && (
                <span className="text-[11px] text-muted-foreground">
                  {p.time} · Đã điểm danh
                </span>
              )}
              {!p.done && (
                <span className="text-[11px] text-muted-foreground">Chưa điểm danh</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 mt-6">
        <button className="w-full h-14 rounded-2xl bg-brand text-white font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition">
          <QrCode className="h-5 w-5" />
          QUÉT QR / CHECK ĐIỂM
        </button>
      </section>
    </>
  );
}
