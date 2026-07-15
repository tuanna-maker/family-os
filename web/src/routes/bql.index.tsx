import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBqlOverview } from "@/lib/workspace-admin.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Building2, Users2, Home as HomeIcon, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bql/")({
  beforeLoad: () => { throw redirect({ to: "/ops" }); },
  component: BqlIndex,
});

function BqlIndex() {
  const fn = useServerFn(getBqlOverview);
  const { projectId } = useBqlProject();
  const { data, isLoading, error } = useQuery({
    queryKey: ["bql-overview", projectId],
    queryFn: () => fn({ data: { projectId: projectId || undefined } }),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>;
  if (error)
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Bạn cần vai trò BQL hoặc SaaS Admin để truy cập workspace này.
        </div>
      </div>
    );

  const t = data?.totals;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Tổng quan BQL</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý cư dân, căn hộ, yêu cầu dịch vụ trong các dự án bạn phụ trách.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Building2} tint="bg-tint-blue" color="text-brand" label="Dự án" value={t?.projects ?? 0} />
        <Stat icon={HomeIcon} tint="bg-tint-green" color="text-success" label="Căn hộ" value={t?.apartments ?? 0} />
        <Stat icon={Users2} tint="bg-tint-orange" color="text-warning" label="Đang ở" value={t?.occupied ?? 0} />
        <Stat
          icon={ClipboardList}
          tint="bg-tint-pink"
          color="text-emergency"
          label="Yêu cầu mở"
          value={t?.openRequests ?? 0}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dự án bạn quản lý</h2>
          <span className="text-[11px] text-muted-foreground">{data?.projects.length ?? 0} dự án</span>
        </header>
        <ul className="divide-y divide-border">
          {(data?.projects ?? []).map((p) => {
            const pct = p.apartments > 0 ? Math.round((p.occupied / p.apartments) * 100) : 0;
            return (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-tint-blue text-brand grid place-items-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.code}
                    {p.city ? ` · ${p.city}` : ""} · {p.blocks} block · {p.apartments} căn
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold tabular-nums">{pct}%</p>
                  <p className="text-[10px] text-muted-foreground">lấp đầy</p>
                </div>
              </li>
            );
          })}
          {(data?.projects.length ?? 0) === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có dự án nào được gán cho bạn.
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
  icon: typeof Building2;
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
