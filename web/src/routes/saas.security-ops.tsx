import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Search, ShieldCheck, AlertCircle, Building2, Activity, Timer, CheckCircle2, AlertTriangle,
} from "lucide-react";
import {
  listSaasSecurityRequests,
  getSaasSecurityOpsSummary,
  type SaasSecurityRequest,
} from "@/lib/saas-security-ops.functions";

export const Route = createFileRoute("/saas/security-ops")({
  head: () => ({ meta: [{ title: "SOC liên dự án — SaaS" }] }),
  component: SaasSecurityOpsPage,
});

const STATUS_TONE: Record<string, string> = {
  open: "bg-red-500/15 text-red-600 dark:text-red-400",
  assigned: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  acknowledged: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  closed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-zinc-400/15 text-zinc-500",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Mở",
  assigned: "Đã giao",
  acknowledged: "Đã tiếp nhận",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
  closed: "Đã đóng",
  cancelled: "Hủy",
};

const REQUEST_TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  noise: "Ồn ào",
  intrusion: "Đột nhập",
  fire: "Cháy nổ",
  medical: "Y tế",
  patrol: "Tuần tra",
  other: "Khác",
};

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function SaasSecurityOpsPage() {
  const fetchRequests = useServerFn(listSaasSecurityRequests);
  const fetchSummary = useServerFn(getSaasSecurityOpsSummary);

  const [days, setDays] = useState<number>(30);
  const [q, setQ] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const range = useMemo(
    () => ({ from: daysAgoISO(days), to: new Date().toISOString() }),
    [days],
  );

  const baseFilter = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      tenant_id: tenantFilter === "all" ? null : tenantFilter,
      project_id: projectFilter === "all" ? null : projectFilter,
      status: statusFilter === "all" ? null : statusFilter,
    }),
    [range, tenantFilter, projectFilter, statusFilter],
  );

  const listQ = useQuery({
    queryKey: ["saas-sec-ops-list", baseFilter],
    queryFn: () => fetchRequests({ data: baseFilter }),
  });

  const summaryQ = useQuery({
    queryKey: ["saas-sec-ops-summary", baseFilter],
    queryFn: () =>
      fetchSummary({
        data: {
          from: baseFilter.from,
          to: baseFilter.to,
          tenant_id: baseFilter.tenant_id,
          project_id: baseFilter.project_id,
        },
      }),
  });

  const rows = listQ.data ?? [];
  const summary = summaryQ.data;

  // Tenant / project options derived from rows (always reflect current dataset)
  const tenantOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.tenant_id && r.tenant_name) m.set(r.tenant_id, r.tenant_name);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.project_id && r.project_name) m.set(r.project_id, r.project_name);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.requester_name, r.assignee_name, r.tenant_name, r.project_name, r.project_code,
        r.building, r.apartment, r.request_type, r.status,
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            SaaS Operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            SOC liên dự án (Security Operations)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi yêu cầu bảo an và sự cố trên toàn bộ tenant, chung cư trong nền tảng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`h-9 px-3 rounded-xl text-xs font-medium border transition ${
                days === d
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </header>

      {(listQ.isError || summaryQ.isError) && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Không tải được dữ liệu SOC</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(listQ.error as Error | undefined)?.message ??
                (summaryQ.error as Error | undefined)?.message}
            </p>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Tổng yêu cầu"
          value={summaryQ.isLoading ? "…" : String(summary?.total ?? 0)}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Đang mở"
          value={summaryQ.isLoading ? "…" : String(summary?.open_count ?? 0)}
          tone="red"
        />
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Đang xử lý"
          value={summaryQ.isLoading ? "…" : String(summary?.in_progress_count ?? 0)}
          tone="amber"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Đã xử lý"
          value={summaryQ.isLoading ? "…" : String(summary?.resolved_count ?? 0)}
          tone="emerald"
        />
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          label="MTTR (phút)"
          value={
            summaryQ.isLoading
              ? "…"
              : summary?.mttr_minutes != null
                ? String(Math.round(summary.mttr_minutes))
                : "—"
          }
        />
      </div>

      {/* Coverage strip */}
      <div className="rounded-2xl bg-card border border-border p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Stat icon={<Building2 className="h-4 w-4" />} label="Tenant phủ" value={summary?.tenants_covered ?? 0} />
        <Stat icon={<Building2 className="h-4 w-4" />} label="Dự án phủ" value={summary?.projects_covered ?? 0} />
        <Stat label="Hủy" value={summary?.cancelled_count ?? 0} />
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-card border border-border p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm cư dân, dự án, căn hộ, loại sự cố…"
            className="h-10 pl-9 pr-3 w-full rounded-xl bg-muted/40 border border-border text-sm"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={(e) => { setTenantFilter(e.target.value); setProjectFilter("all"); }}
          className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm"
        >
          <option value="all">Tất cả tenant ({tenantOptions.length})</option>
          {tenantOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm"
        >
          <option value="all">Tất cả dự án ({projectOptions.length})</option>
          {projectOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm"
        >
          <option value="all">Mọi trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <section className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {listQ.isLoading ? "Đang tải…" : `${filteredRows.length} yêu cầu`}
          </h2>
          <span className="text-xs text-muted-foreground">
            {days} ngày gần nhất
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Loại</th>
                <th className="text-left p-4 font-medium">Cư dân / Vị trí</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Dự án / Tenant</th>
                <th className="text-left p-4 font-medium">Trạng thái</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Tiếp nhận</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Thời gian xử lý</th>
                <th className="text-left p-4 font-medium">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => <RequestRow key={r.id} r={r} />)}
              {!listQ.isLoading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    Không có yêu cầu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "red";
}) {
  const toneCls =
    tone === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "amber" ? "text-amber-600 dark:text-amber-400"
    : tone === "red" ? "text-red-600 dark:text-red-400"
    : "text-foreground";
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneCls}`}>{value}</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function RequestRow({ r }: { r: SaasSecurityRequest }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="p-4">
        <p className="font-medium text-sm">{REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}</p>
        <p className="text-[11px] text-muted-foreground font-mono">{r.id.slice(0, 8)}</p>
      </td>
      <td className="p-4">
        <p className="font-medium text-sm truncate">{r.requester_name ?? "Ẩn danh"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[r.building, r.apartment].filter(Boolean).join(" · ") || "—"}
        </p>
      </td>
      <td className="p-4 hidden md:table-cell">
        {r.project_name ? (
          <div>
            <p className="text-sm font-medium truncate">{r.project_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {r.project_code}{r.tenant_name ? ` · ${r.tenant_name}` : ""}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Chưa gán dự án</span>
        )}
      </td>
      <td className="p-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-muted"}`}>
          {STATUS_LABEL[r.status] ?? r.status}
        </span>
      </td>
      <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground">
        {r.assignee_name ?? "—"}
      </td>
      <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
        {r.resolution_minutes != null ? `${Math.round(r.resolution_minutes)} phút` : "—"}
      </td>
      <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(r.created_at).toLocaleString("vi-VN", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        })}
      </td>
    </tr>
  );
}
