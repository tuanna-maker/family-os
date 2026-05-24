import { createFileRoute } from "@tanstack/react-router";
import { Users2, HeartPulse, Package, Activity } from "lucide-react";

export const Route = createFileRoute("/family/")({
  head: () => ({ meta: [{ title: "Family Core Governance — STOS Life" }] }),
  component: FamilyDashboard,
});

const KPIS = [
  { label: "Hộ gia đình đang quản lý", value: "1,284", icon: Users2, tint: "bg-tint-blue", color: "text-brand" },
  { label: "Người cao tuổi", value: "342", icon: HeartPulse, tint: "bg-tint-orange", color: "text-warning" },
  { label: "Module đã kích hoạt", value: "6 / 9", icon: Package, tint: "bg-tint-purple", color: "text-[oklch(0.55_0.18_295)]" },
  { label: "Storage sử dụng", value: "68%", icon: Activity, tint: "bg-tint-green", color: "text-success" },
];

function FamilyDashboard() {
  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-4">
            <div className={`h-9 w-9 rounded-lg ${k.tint} grid place-items-center mb-3`}>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="text-[24px] font-bold mt-1 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <p className="text-[14px] font-semibold">Family Core Governance</p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Multi-household registry, quota, consent, audit — đang phát triển. Family Core là 1 domain trong nền tảng.
        </p>
      </div>
    </div>
  );
}
