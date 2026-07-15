import { Users2, Building2, Cpu, Activity, BarChart3, Database } from "lucide-react";
import { useCollection } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import type { Resident, Building } from "@/types/core";

export function FooterStats() {
  const { scope } = useTenant();
  const residents = scope(useCollection<Resident>("residents"));
  const buildings = scope(useCollection<Building>("buildings"));

  const items = [
    { icon: Users2, label: "Tổng số người dùng", value: `${residents.length.toLocaleString("vi-VN")} cư dân` },
    { icon: Building2, label: "Tổng số toà nhà", value: `${buildings.length} toà nhà` },
    { icon: Cpu, label: "Thiết bị kết nối", value: "1.248 thiết bị" },
    { icon: Activity, label: "Uptime hệ thống", value: "99,98%" },
    { icon: BarChart3, label: "API Calls (7 ngày)", value: "18.7M" },
    { icon: Database, label: "Dữ liệu đã lưu trữ", value: "14,2 TB" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-tint-blue text-brand grid place-items-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] text-muted-foreground truncate">{it.label}</p>
              <p className="text-[14px] font-bold tabular-nums truncate">{it.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
