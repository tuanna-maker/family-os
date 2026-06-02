import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users2, Building as BuildingIcon, Building2, Home as HomeIcon, UsersRound,
  ClipboardList, AlertTriangle, Shield, TrendingUp, TrendingDown, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformStats } from "@/lib/console-stats.functions";

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString("vi-VN");
  return String(n);
}

export function KpiStrip() {
  const fn = useServerFn(getPlatformStats);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    retry: false,
  });

  const kpis = [
    { label: "Tenant", value: data?.tenants, delta: 12.5, icon: Users2, tint: "bg-tint-blue", color: "text-brand" },
    { label: "Dự án", value: data?.projects, delta: 8.3, icon: BuildingIcon, tint: "bg-tint-purple", color: "text-[oklch(0.55_0.18_295)]" },
    { label: "Toà nhà", value: data?.blocks, delta: 6.7, icon: Building2, tint: "bg-tint-green", color: "text-success" },
    { label: "Căn hộ", value: data?.apartments, delta: 9.4, icon: HomeIcon, tint: "bg-tint-orange", color: "text-warning" },
    { label: "Cư dân", value: data?.residents, delta: 5.6, icon: UsersRound, tint: "bg-tint-pink", color: "text-pink" },
    { label: "Yêu cầu mở", value: data?.requests_open, delta: -3.1, icon: ClipboardList, tint: "bg-tint-blue", color: "text-info" },
    { label: "Sự cố khẩn", value: data?.incidents_open, delta: -1.8, icon: AlertTriangle, tint: "bg-tint-red", color: "text-emergency" },
    { label: "An ninh chờ", value: data?.security_open, delta: 0, icon: Shield, tint: "bg-tint-green", color: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {kpis.map((k) => {
        const Icon = k.icon;
        const positive = k.delta >= 0;
        return (
          <div key={k.label} className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-xl grid place-items-center shrink-0", k.tint)}>
                <Icon className={cn("h-4 w-4", k.color)} />
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{k.label}</p>
            </div>
            <p className="mt-2 text-[22px] font-bold tabular-nums leading-none min-h-[22px]">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground inline" />
              ) : isError ? (
                <span className="text-[12px] text-muted-foreground font-normal">—</span>
              ) : (
                fmt(k.value ?? 0)
              )}
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-[11px]">
              {positive ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-emergency" />
              )}
              <span className={cn("font-medium tabular-nums", positive ? "text-success" : "text-emergency")}>
                {positive ? "+" : ""}{k.delta.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">tuần trước</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
