import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Flame, Wrench, Package, Car, MoreHorizontal } from "lucide-react";
import { SubHeader } from "./guard.check-in";

export const Route = createFileRoute("/guard/incident")({
  head: () => ({ meta: [{ title: "Báo sự cố — Bảo vệ" }] }),
  component: IncidentPage,
});

const TYPES = [
  { icon: AlertTriangle, label: "An ninh", desc: "Trật tự", color: "text-emergency", bg: "bg-emergency/10" },
  { icon: Flame, label: "PCCC", desc: "Cháy nổ", color: "text-warning", bg: "bg-warning/10" },
  { icon: Wrench, label: "Kỹ thuật", desc: "Hạ tầng", color: "text-brand", bg: "bg-brand/10" },
  { icon: Package, label: "Mất mát", desc: "Tài sản", color: "text-[oklch(0.7_0.16_45)]", bg: "bg-[oklch(0.7_0.16_45)]/10" },
  { icon: Car, label: "Giao thông", desc: "Xe cộ", color: "text-[oklch(0.65_0.2_295)]", bg: "bg-[oklch(0.65_0.2_295)]/10" },
  { icon: MoreHorizontal, label: "Khác", desc: "Khác", color: "text-muted-foreground", bg: "bg-muted/30" },
];

function IncidentPage() {
  return (
    <>
      <SubHeader title="BÁO SỰ CỐ" back="/guard" />
      <section className="px-5 mt-4">
        <div className="flex items-center justify-between text-[11px]">
          {["Loại sự cố", "Chi tiết", "Gửi báo cáo"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`h-7 w-7 rounded-full grid place-items-center text-xs font-bold ${
                  i === 0 ? "bg-brand text-white" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span className={i === 0 ? "font-semibold" : "text-muted-foreground"}>{s}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="px-5 mt-6">
        <p className="text-sm font-semibold mb-3">Chọn loại sự cố</p>
        <div className="grid grid-cols-2 gap-3">
          {TYPES.map(({ icon: Icon, label, desc, color, bg }) => (
            <button
              key={label}
              className="rounded-2xl bg-card border border-border p-4 text-center active:scale-[0.98] transition"
            >
              <div className={`h-12 w-12 rounded-2xl mx-auto grid place-items-center ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <p className="mt-2 text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
