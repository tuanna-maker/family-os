import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSaasOverview } from "@/lib/workspace-admin.functions";
import { Building, Building2, Home as HomeIcon, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/saas/")({
  beforeLoad: () => { throw redirect({ to: "/console" }); },
  component: SaasIndex,
});

function SaasIndex() {
  const fn = useServerFn(getSaasOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["saas-overview"], queryFn: () => fn() });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>;
  if (error)
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Bạn cần vai trò SaaS Admin để truy cập workspace này.
        </div>
      </div>
    );

  const t = data?.totals;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Tổng quan nền tảng</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Theo dõi tenants, dự án và mức độ sử dụng STOS Life Platform.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Building} tint="bg-tint-blue" color="text-brand" label="Tenants" value={t?.tenants ?? 0} />
        <Stat icon={Building2} tint="bg-tint-green" color="text-success" label="Dự án" value={t?.projects ?? 0} />
        <Stat icon={HomeIcon} tint="bg-tint-orange" color="text-warning" label="Căn hộ" value={t?.apartments ?? 0} />
        <Stat icon={Users2} tint="bg-tint-purple" color="text-[oklch(0.65_0.2_295)]" label="Người dùng" value={t?.users ?? 0} />
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tenants gần đây</h2>
          <span className="text-[11px] text-muted-foreground">{data?.tenants.length ?? 0}</span>
        </header>
        <ul className="divide-y divide-border">
          {(data?.tenants ?? []).map((tn) => (
            <li key={tn.id} className="px-4 py-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-tint-blue text-brand grid place-items-center shrink-0">
                <Building className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate">{tn.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {tn.slug} · {tn.plan} · {tn.projects} dự án
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5",
                  tn.status === "active"
                    ? "bg-tint-green text-success"
                    : "bg-tint-orange text-warning",
                )}
              >
                {tn.status}
              </span>
            </li>
          ))}
          {(data?.tenants.length ?? 0) === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có tenant nào. Pha 5 sẽ seed dữ liệu mẫu (3 chung cư VN).
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  tint,
  color,
  label,
  value,
}: {
  icon: typeof Building;
  tint: string;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", tint)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
