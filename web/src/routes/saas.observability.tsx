import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, AlertCircle, ShieldAlert, CheckCircle2,
  Server, Users, Bug, Eye, RefreshCw, Check,
} from "lucide-react";
import {
  getObservabilitySummary, getObservabilityTimeseries,
  listObservabilityAlerts, listObservabilityErrors, listObservabilityAudit,
  acknowledgeAlert,
  type ObsTimeseriesPoint,
} from "@/lib/saas-observability.functions";

export const Route = createFileRoute("/saas/observability")({
  head: () => ({ meta: [{ title: "Giám sát hệ thống — SaaS" }] }),
  component: ObservabilityPage,
});

const SEVERITY_TONE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

const LEVEL_TONE: Record<string, string> = {
  fatal: "bg-red-500/15 text-red-600 dark:text-red-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
  warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  debug: "bg-zinc-400/15 text-zinc-500",
};

function ObservabilityPage() {
  const qc = useQueryClient();
  const fetchSummary = useServerFn(getObservabilitySummary);
  const fetchTs = useServerFn(getObservabilityTimeseries);
  const fetchAlerts = useServerFn(listObservabilityAlerts);
  const fetchErrors = useServerFn(listObservabilityErrors);
  const fetchAudit = useServerFn(listObservabilityAudit);
  const ackFn = useServerFn(acknowledgeAlert);

  const [hours, setHours] = useState(24);

  const sumQ = useQuery({
    queryKey: ["obs-summary"],
    queryFn: () => fetchSummary({ data: undefined as never }),
    refetchInterval: 30_000,
  });
  const tsQ = useQuery({
    queryKey: ["obs-ts", hours],
    queryFn: () => fetchTs({ data: { hours } }),
    refetchInterval: 60_000,
  });
  const alertsQ = useQuery({
    queryKey: ["obs-alerts"],
    queryFn: () => fetchAlerts({ data: { limit: 20 } }),
    refetchInterval: 30_000,
  });
  const errorsQ = useQuery({
    queryKey: ["obs-errors"],
    queryFn: () => fetchErrors({ data: { limit: 30 } }),
    refetchInterval: 30_000,
  });
  const auditQ = useQuery({
    queryKey: ["obs-audit"],
    queryFn: () => fetchAudit({ data: { limit: 30 } }),
    refetchInterval: 60_000,
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => ackFn({ data: { alert_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["obs-alerts"] });
      qc.invalidateQueries({ queryKey: ["obs-summary"] });
    },
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["obs-summary"] });
    qc.invalidateQueries({ queryKey: ["obs-ts"] });
    qc.invalidateQueries({ queryKey: ["obs-alerts"] });
    qc.invalidateQueries({ queryKey: ["obs-errors"] });
    qc.invalidateQueries({ queryKey: ["obs-audit"] });
  };

  const s = sumQ.data;
  const healthTone =
    s?.health_status === "healthy" ? "text-emerald-600 dark:text-emerald-400"
    : s?.health_status === "degraded" ? "text-amber-600 dark:text-amber-400"
    : s?.health_status === "down" ? "text-red-600 dark:text-red-400"
    : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            SaaS Operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Giám sát hệ thống (Observability)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sức khỏe, hiệu năng, an toàn thông tin và bất thường — dữ liệu thật, tự làm mới mỗi 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[6, 24, 72, 168].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`h-9 px-3 rounded-xl text-xs font-medium border transition ${
                hours === h
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {h < 168 ? `${h}h` : "7d"}
            </button>
          ))}
          <button
            onClick={refreshAll}
            className="h-9 px-3 rounded-xl text-xs font-medium border border-border bg-card hover:bg-muted/50 flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
        </div>
      </header>

      {(sumQ.isError) && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Không tải được dữ liệu giám sát</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(sumQ.error as Error | undefined)?.message}
            </p>
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Server className={`h-4 w-4 ${healthTone}`} />}
          label="Sức khỏe hệ thống"
          value={
            sumQ.isLoading ? "…" :
            s?.health_status === "healthy" ? "Healthy"
            : s?.health_status === "degraded" ? "Degraded"
            : s?.health_status === "down" ? "Down"
            : "Unknown"
          }
          sub={s?.health_checked_at
            ? `Kiểm tra ${formatRelative(s.health_checked_at)} · ${s.health_duration_ms}ms`
            : "Chưa có dữ liệu"}
          toneCls={healthTone}
        />
        <KpiCard
          icon={<Bug className="h-4 w-4" />}
          label="Tỉ lệ lỗi 24h"
          value={s ? `${s.error_rate_pct}%` : "…"}
          sub={s ? `${s.errors_24h.toLocaleString()} lỗi / ${s.logs_24h.toLocaleString()} log` : ""}
          toneCls={(s?.error_rate_pct ?? 0) > 1 ? "text-red-600 dark:text-red-400" : "text-foreground"}
        />
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Cảnh báo chưa xử lý"
          value={s ? String(s.unack_alerts) : "…"}
          sub={s ? `${s.critical_alerts} critical · ${s.degraded_24h} degraded check` : ""}
          toneCls={(s?.critical_alerts ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Hoạt động"
          value={s ? s.active_users_24h.toLocaleString() : "…"}
          sub={s ? `${s.audit_24h} hành động admin 24h` : ""}
        />
      </div>

      {/* Health checks detail */}
      {s?.health_checks && Object.keys(s.health_checks).length > 0 && (
        <section className="rounded-3xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Health probes (lần kiểm tra gần nhất)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(s.health_checks).map(([k, v]) => {
              const ok = typeof v === "object" && v !== null
                ? ((v as Record<string, unknown>).ok === true || (v as Record<string, unknown>).status === "ok")
                : v === "ok" || v === true;
              return (
                <div key={k} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <span className="truncate">{k}</span>
                  {ok
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Timeseries */}
      <section className="rounded-3xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> Log theo giờ ({hours < 168 ? `${hours}h` : "7 ngày"})
          </h2>
          {tsQ.isLoading && <span className="text-xs text-muted-foreground">Đang tải…</span>}
        </div>
        <Timeseries data={tsQ.data ?? []} hours={hours} />
      </section>

      {/* Alerts + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-3xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Cảnh báo hệ thống
            </h2>
            <span className="text-xs text-muted-foreground">{alertsQ.data?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {alertsQ.data?.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Không có cảnh báo nào.</p>
            )}
            {alertsQ.data?.map((a) => (
              <div key={a.id} className="p-4 flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SEVERITY_TONE[a.severity] ?? ""}`}>
                  {a.severity.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.source} · {formatRelative(a.created_at)}
                    {a.acknowledged && a.acknowledged_at && (
                      <> · <span className="text-emerald-600 dark:text-emerald-400">đã xử lý {formatRelative(a.acknowledged_at)}</span></>
                    )}
                  </p>
                </div>
                {!a.acknowledged && (
                  <button
                    disabled={ackMutation.isPending}
                    onClick={() => ackMutation.mutate(a.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-foreground text-background hover:opacity-90 flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Ack
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Bug className="h-4 w-4" /> Log lỗi & cảnh báo (24h)
            </h2>
            <span className="text-xs text-muted-foreground">{errorsQ.data?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {errorsQ.data?.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Không có lỗi trong 24h.</p>
            )}
            {errorsQ.data?.map((e) => (
              <div key={e.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${LEVEL_TONE[e.level] ?? "bg-muted"}`}>
                    {e.level}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">{e.app}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                    {formatRelative(e.ts)}
                  </span>
                </div>
                <p className="text-sm break-words line-clamp-2">{e.message}</p>
                {e.user_name && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {e.user_name}{e.request_id ? ` · req ${e.request_id.slice(0, 8)}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Audit log */}
      <section className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" /> Audit log — hành động admin gần đây
          </h2>
          <span className="text-xs text-muted-foreground">{auditQ.data?.length ?? 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Hành động</th>
                <th className="text-left p-3 font-medium">Actor</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Target</th>
                <th className="text-left p-3 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {auditQ.data?.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Chưa có hành động nào.</td></tr>
              )}
              {auditQ.data?.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-medium">{a.action}</td>
                  <td className="p-3">{a.actor_name ?? <span className="text-muted-foreground italic">system</span>}</td>
                  <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                    {a.target_table ? `${a.target_table}${a.target_id ? `:${a.target_id.slice(0, 8)}` : ""}` : "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatRelative(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, toneCls,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; toneCls?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneCls ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Timeseries({ data, hours }: { data: ObsTimeseriesPoint[]; hours: number }) {
  // Aggregate into buckets per hour, split by level severity bands
  const buckets = useMemo(() => {
    const map = new Map<string, { hour: string; error: number; warn: number; info: number }>();
    for (const p of data) {
      const key = p.hour;
      const prev = map.get(key) ?? { hour: key, error: 0, warn: 0, info: 0 };
      if (p.level === "error" || p.level === "fatal") prev.error += Number(p.log_count);
      else if (p.level === "warn") prev.warn += Number(p.log_count);
      else prev.info += Number(p.log_count);
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [data]);

  const max = Math.max(1, ...buckets.map((b) => b.error + b.warn + b.info));

  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu trong khoảng này.</p>;
  }

  return (
    <div>
      <div className="flex items-end gap-px h-40">
        {buckets.map((b) => {
          const total = b.error + b.warn + b.info;
          const h = (total / max) * 100;
          return (
            <div key={b.hour} className="flex-1 flex flex-col justify-end group relative" title={`${new Date(b.hour).toLocaleString("vi-VN")}\nerror: ${b.error} · warn: ${b.warn} · info: ${b.info}`}>
              <div className="w-full flex flex-col" style={{ height: `${h}%` }}>
                {b.error > 0 && <div className="bg-red-500" style={{ flex: b.error }} />}
                {b.warn > 0 && <div className="bg-amber-500" style={{ flex: b.warn }} />}
                {b.info > 0 && <div className="bg-blue-500/60" style={{ flex: b.info }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
        <span>{new Date(buckets[0].hour).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
        <div className="flex items-center gap-3">
          <Legend color="bg-red-500" label="error" />
          <Legend color="bg-amber-500" label="warn" />
          <Legend color="bg-blue-500/60" label="info" />
        </div>
        <span>{new Date(buckets[buckets.length - 1].hour).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{hours < 168 ? `${hours} giờ gần nhất` : "7 ngày gần nhất"} · {buckets.length} điểm</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-2 h-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
