import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, UsersRound, Sparkles, AlertCircle, Building2, Crown, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  listSaasFamilies, getSaasFamiliesSummary, setFamilyPlan,
  type SaasFamily,
} from "@/lib/saas-families.functions";

export const Route = createFileRoute("/saas/families")({
  head: () => ({ meta: [{ title: "Hộ gia đình toàn hệ thống — SaaS" }] }),
  component: SaasFamiliesPage,
});

const PLAN_LABEL: Record<string, string> = { free: "Free", premium: "Premium" };
const PLAN_TONE: Record<string, string> = {
  free: "bg-muted text-foreground",
  premium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(s: string | null) {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000);
}

function SaasFamiliesPage() {
  const fetchList = useServerFn(listSaasFamilies);
  const fetchSummary = useServerFn(getSaasFamiliesSummary);
  const mutatePlan = useServerFn(setFamilyPlan);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const filters = useMemo(
    () => ({
      tenant_id: tenantFilter === "all" ? null : tenantFilter,
      project_id: projectFilter === "all" ? null : projectFilter,
      plan: planFilter === "all" ? null : (planFilter as "free" | "premium"),
    }),
    [tenantFilter, projectFilter, planFilter],
  );

  const listQ = useQuery({
    queryKey: ["saas-families", filters],
    queryFn: () => fetchList({ data: filters }),
  });
  const sumQ = useQuery({
    queryKey: ["saas-families-summary", filters],
    queryFn: () => fetchSummary({ data: { tenant_id: filters.tenant_id, project_id: filters.project_id } }),
  });

  const families = listQ.data ?? [];

  const tenantOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of families) if (f.tenant_id && f.tenant_name) m.set(f.tenant_id, f.tenant_name);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [families]);

  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of families) if (f.project_id && f.project_name) m.set(f.project_id, f.project_name);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [families]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return families;
    return families.filter((f) =>
      [f.family_name, f.owner_name, f.owner_email, f.apartment_code, f.family_apartment]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }, [families, q]);

  const planMut = useMutation({
    mutationFn: (vars: { family_id: string; plan: "free" | "premium"; days?: number }) =>
      mutatePlan({ data: { family_id: vars.family_id, plan: vars.plan, days: vars.days ?? 30 } }),
    onSuccess: () => {
      toast.success("Cập nhật gói thành công");
      qc.invalidateQueries({ queryKey: ["saas-families"] });
      qc.invalidateQueries({ queryKey: ["saas-families-summary"] });
    },
    onError: (e: Error) => toast.error(e.message || "Không cập nhật được gói"),
  });

  const s = sumQ.data;

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <UsersRound className="size-3.5" /> SaaS · Hộ gia đình
        </div>
        <h1 className="text-2xl font-semibold">Quản trị hộ gia đình liên tenant</h1>
        <p className="text-sm text-muted-foreground">
          Toàn bộ hộ gia đình, gói AI Premium và entitlement xuyên tenant.
        </p>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <KpiCard icon={UsersRound} label="Tổng hộ" value={s?.total_families ?? 0} />
        <KpiCard icon={Sparkles} label="Free" value={s?.free_count ?? 0} />
        <KpiCard icon={Crown} label="Premium" value={s?.premium_count ?? 0} accent="amber" />
        <KpiCard icon={AlertCircle} label="Sắp hết hạn (7d)" value={s?.expiring_soon ?? 0} accent="red" />
        <KpiCard icon={Building2} label="Dự án phủ" value={s?.projects_covered ?? 0} />
        <KpiCard icon={Building2} label="Tenants" value={s?.tenants_covered ?? 0} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hộ, chủ hộ, email, căn hộ…"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Select value={tenantFilter} onChange={setTenantFilter} options={[["all", "Tất cả tenant"], ...tenantOptions]} />
        <Select value={projectFilter} onChange={setProjectFilter} options={[["all", "Tất cả dự án"], ...projectOptions]} />
        <Select
          value={planFilter}
          onChange={setPlanFilter}
          options={[["all", "Tất cả gói"], ["free", "Free"], ["premium", "Premium"]]}
        />
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="text-sm font-medium">
            Danh sách hộ gia đình{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </div>
          {listQ.isFetching ? (
            <span className="text-xs text-muted-foreground">Đang tải…</span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left">Hộ gia đình</th>
                <th className="px-4 py-2.5 text-left">Chủ hộ</th>
                <th className="px-4 py-2.5 text-left">Căn hộ / Dự án</th>
                <th className="px-4 py-2.5 text-left">Tenant</th>
                <th className="px-4 py-2.5 text-center">Thành viên</th>
                <th className="px-4 py-2.5 text-left">Gói AI</th>
                <th className="px-4 py-2.5 text-left">Hạn</th>
                <th className="px-4 py-2.5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {listQ.error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-destructive">
                    {(listQ.error as Error).message}
                  </td>
                </tr>
              ) : filtered.length === 0 && !listQ.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Không có hộ gia đình phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => <FamilyRow key={f.family_id} f={f} onSetPlan={planMut.mutate} busy={planMut.isPending} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FamilyRow({
  f, onSetPlan, busy,
}: {
  f: SaasFamily;
  onSetPlan: (v: { family_id: string; plan: "free" | "premium"; days?: number }) => void;
  busy: boolean;
}) {
  const days = daysUntil(f.expires_at);
  const expiringSoon = f.plan === "premium" && days !== null && days <= 7;
  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="font-medium">{f.family_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">
          Tạo {fmtDate(f.created_at)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div>{f.owner_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{f.owner_email ?? ""}</div>
      </td>
      <td className="px-4 py-3">
        <div>{f.apartment_code ?? f.family_apartment ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{f.project_name ?? "Chưa gán dự án"}</div>
      </td>
      <td className="px-4 py-3 text-sm">{f.tenant_name ?? "—"}</td>
      <td className="px-4 py-3 text-center tabular-nums">{f.member_count ?? 0}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_TONE[f.plan] ?? PLAN_TONE.free}`}>
          {f.plan === "premium" ? <Crown className="size-3" /> : null}
          {PLAN_LABEL[f.plan] ?? f.plan}
        </span>
        {f.insights_enabled ? (
          <div className="mt-1 text-[11px] text-muted-foreground">AI insights · OCR {f.ocr_monthly_quota}/tháng</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm">
        {f.plan === "premium" ? (
          <div className={expiringSoon ? "text-red-600 dark:text-red-400" : ""}>
            <div className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {fmtDate(f.expires_at)}
            </div>
            {days !== null ? (
              <div className="text-xs text-muted-foreground">
                {days >= 0 ? `Còn ${days} ngày` : `Hết hạn ${Math.abs(days)} ngày`}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {f.plan === "premium" ? (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm(`Hạ xuống Free cho hộ "${f.family_name}"?`)) {
                onSetPlan({ family_id: f.family_id, plan: "free" });
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            <ArrowDownRight className="size-3.5" /> Hạ Free
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => onSetPlan({ family_id: f.family_id, plan: "premium", days: 30 })}
            className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            <ArrowUpRight className="size-3.5" /> Nâng Premium 30d
          </button>
        )}
      </td>
    </tr>
  );
}

function KpiCard({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: "amber" | "red";
}) {
  const tone =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}
