import type React from "react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldCheck,
  Siren,
  MapPin,
  Timer,
  Gauge,
  Users,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { exportKpiCsv } from "./opsKpiExport";
import {
  getOpsKpiReport,
  listOpsTeams,
  listSlaIncidents,
  type OpsKpiReport,
  type SlaIncidentRow,
} from "@/lib/security.functions";

const card = "rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white";
const subtle = "text-[11px] uppercase tracking-wider text-white/50";

const SEV_LABEL: Record<string, string> = {
  critical: "P1 · Critical",
  high: "P2 · High",
  medium: "P3 · Medium",
  low: "P4 · Low",
};
const SEV_TONE: Record<string, string> = {
  critical: "text-red-400",
  high: "text-amber-400",
  medium: "text-sky-400",
  low: "text-emerald-400",
};

function fmtMin(m: number | null) {
  if (m === null) return "—";
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${m.toFixed(1)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

function slaToneClass(pct: number | null): string {
  if (pct === null) return "text-white/40";
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

/** Percent delta cur vs prev. Higher-is-better drives tone via `goodWhenUp`. */
function pctDelta(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
function DeltaBadge({
  cur,
  prev,
  goodWhenUp,
  suffix = "%",
}: {
  cur: number | null;
  prev: number | null;
  goodWhenUp: boolean;
  suffix?: string;
}) {
  const d = pctDelta(cur, prev);
  if (d === null) {
    return <span className="text-[10px] text-white/40">— vs kỳ trước</span>;
  }
  const up = d > 0;
  const flat = d === 0;
  const good = flat ? null : up === goodWhenUp;
  const tone = flat
    ? "text-white/50"
    : good
      ? "text-emerald-400"
      : "text-red-400";
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {d}
      {suffix}
    </span>
  );
}

export function SecurityKpiStrip() {
  const fetchKpi = useServerFn(getOpsKpiReport);
  const { data, isLoading } = useQuery({
    queryKey: ["ops-kpi", 7],
    queryFn: () => fetchKpi({ data: { range_days: 7 } }),
    refetchInterval: 60_000,
  });

  const r = data;
  const tiles = [
    {
      label: "Bảo vệ trực hôm nay",
      value: r ? `${r.shifts_checked_in} / ${r.shifts_today}` : "—",
      sub: r ? `${r.guards_on_duty} bảo vệ có ca` : "Đang tải...",
      icon: ShieldCheck,
      accent: "text-emerald-400",
    },
    {
      label: "Sự cố đang mở",
      value: r ? String(r.incidents_open) : "—",
      sub: r ? `${r.incidents_total} tổng / ${r.range_days} ngày` : "",
      icon: Siren,
      accent: "text-red-400",
    },
    {
      label: "Phản ứng trung bình",
      value: r ? fmtMin(r.avg_resolution_minutes) : "—",
      sub: r ? `${r.incidents_resolved} đã xử lý` : "",
      icon: Timer,
      accent: "text-sky-400",
    },
    {
      label: "Tuần tra hôm nay",
      value: r ? String(r.patrol_logs_today) : "—",
      sub: r ? `${r.patrol_points_today} điểm khác nhau` : "",
      icon: MapPin,
      accent: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((k) => (
        <div key={k.label} className={card}>
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center">
              <k.icon className={`h-4 w-4 ${k.accent}`} />
            </div>
            <span className={`text-[10px] ${k.accent}`}>{isLoading ? "..." : "● Live"}</span>
          </div>
          <p className={`${subtle} mt-3`}>{k.label}</p>
          <p className="text-[24px] font-bold tabular-nums mt-1">{k.value}</p>
          <p className="text-[11px] text-white/50 mt-1">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function SlaReportCard() {
  const fetchKpi = useServerFn(getOpsKpiReport);
  const fetchTeams = useServerFn(listOpsTeams);
  const [range, setRange] = useState(7);
  const [team, setTeam] = useState<string>("");
  const [compare, setCompare] = useState(true);
  const [drill, setDrill] = useState<string | null>(null);

  const teamsQ = useQuery({
    queryKey: ["ops-teams"],
    queryFn: () => fetchTeams(),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading } = useQuery<OpsKpiReport>({
    queryKey: ["ops-kpi", range, team, compare],
    queryFn: () =>
      fetchKpi({
        data: {
          range_days: range,
          compare,
          ...(team ? { team } : {}),
        },
      }),
    refetchInterval: 60_000,
  });

  const prev = data?.previous ?? null;
  const compareLabel =
    range === 1 ? "24h trước" : range === 7 ? "tuần trước" : `${range} ngày trước`;
  const prevSlaBySev = new Map((prev?.sla ?? []).map((b) => [b.severity, b]));

  return (
    <div className={`${card} col-span-1 lg:col-span-3`}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-sky-400" />
          <h3 className="text-[13px] font-semibold">SLA phản ứng sự cố</h3>
          {team && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              Đội: {team}
            </span>
          )}
          {compare && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
              vs {compareLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => data && exportKpiCsv(data)}
              disabled={!data}
              className="px-2.5 py-1 rounded-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Tải CSV"
            >
              <FileSpreadsheet className="h-3 w-3" /> CSV
            </button>
            <button
              onClick={async () => {
                if (!data) return;
                const { exportKpiPdf } = await import("./opsKpiPdf");
                exportKpiPdf(data);
              }}
              disabled={!data}
              className="px-2.5 py-1 rounded-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Tải PDF"
            >
              <FileText className="h-3 w-3" /> PDF
            </button>
          </div>
          <button
            onClick={() => setCompare((v) => !v)}
            className={`px-2.5 py-1 rounded-md border text-[11px] inline-flex items-center gap-1 ${
              compare
                ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                : "border-white/10 text-white/60 hover:text-white"
            }`}
            title="So sánh với kỳ trước"
          >
            <TrendingUp className="h-3 w-3" />
            So sánh kỳ trước
          </button>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Users className="h-3.5 w-3.5 text-white/50" />
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/80 text-[11px] outline-none hover:border-white/20"
            >
              <option value="" className="bg-zinc-900">Tất cả đội/ca</option>
              {(teamsQ.data ?? []).map((t) => (
                <option key={t} value={t} className="bg-zinc-900">
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-2.5 py-1 rounded-md border ${
                  range === d
                    ? "bg-white/10 border-white/30 text-white"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {d === 1 ? "24h" : `${d} ngày`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-white/50">Đang tính toán KPI...</p>
      ) : data.sla.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Activity className="h-4 w-4" /> Chưa có sự cố nào trong {range} ngày qua.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-white/50 border-b border-white/10">
                <th className="text-left font-medium py-2">Mức độ</th>
                <th className="text-right font-medium py-2">Tổng</th>
                <th className="text-right font-medium py-2">Đã xử lý</th>
                <th className="text-right font-medium py-2">TB</th>
                <th className="text-right font-medium py-2">P90</th>
                <th className="text-right font-medium py-2">SLA mục tiêu</th>
                <th className="text-right font-medium py-2">% đạt SLA</th>
              </tr>
            </thead>
            <tbody>
              {data.sla.map((b) => {
                const pb = prevSlaBySev.get(b.severity);
                return (
                  <tr
                    key={b.severity}
                    onClick={() => setDrill(b.severity)}
                    className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <td className={`py-2.5 font-semibold ${SEV_TONE[b.severity] ?? "text-white"}`}>
                      <span className="inline-flex items-center gap-1">
                        {SEV_LABEL[b.severity] ?? b.severity}
                        <ChevronRight className="h-3 w-3 opacity-50" />
                      </span>
                    </td>
                    <td className="text-right tabular-nums">
                      <div>{b.total}</div>
                      {compare && (
                        <DeltaBadge
                          cur={b.total}
                          prev={pb?.total ?? 0}
                          goodWhenUp={false}
                        />
                      )}
                    </td>
                    <td className="text-right tabular-nums">{b.resolved}</td>
                    <td className="text-right tabular-nums">
                      <div>{fmtMin(b.avg_response_minutes)}</div>
                      {compare && (
                        <DeltaBadge
                          cur={b.avg_response_minutes}
                          prev={pb?.avg_response_minutes ?? null}
                          goodWhenUp={false}
                        />
                      )}
                    </td>
                    <td className="text-right tabular-nums">{fmtMin(b.p90_response_minutes)}</td>
                    <td className="text-right tabular-nums text-white/60">≤ {b.sla_target_minutes}m</td>
                    <td className={`text-right tabular-nums font-semibold ${slaToneClass(b.sla_pct)}`}>
                      <div>{b.sla_pct === null ? "—" : `${b.sla_pct}%`}</div>
                      {compare && (
                        <DeltaBadge
                          cur={b.sla_pct}
                          prev={pb?.sla_pct ?? null}
                          goodWhenUp={true}
                          suffix="pt"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
          <Stat
            label="Tổng sự cố"
            value={String(data.incidents_total)}
            delta={
              compare ? (
                <DeltaBadge
                  cur={data.incidents_total}
                  prev={prev?.incidents_total ?? null}
                  goodWhenUp={false}
                />
              ) : null
            }
          />
          <Stat
            label="Đang mở"
            value={String(data.incidents_open)}
            tone="text-red-400"
            delta={
              compare ? (
                <DeltaBadge
                  cur={data.incidents_open}
                  prev={prev?.incidents_open ?? null}
                  goodWhenUp={false}
                />
              ) : null
            }
          />
          <Stat
            label="Đã xử lý"
            value={String(data.incidents_resolved)}
            tone="text-emerald-400"
            delta={
              compare ? (
                <DeltaBadge
                  cur={data.incidents_resolved}
                  prev={prev?.incidents_resolved ?? null}
                  goodWhenUp={true}
                />
              ) : null
            }
          />
          <Stat
            label="TB toàn cục"
            value={fmtMin(data.avg_resolution_minutes)}
            tone="text-sky-400"
            delta={
              compare ? (
                <DeltaBadge
                  cur={data.avg_resolution_minutes}
                  prev={prev?.avg_resolution_minutes ?? null}
                  goodWhenUp={false}
                />
              ) : null
            }
          />
        </div>
      )}

      {drill && (
        <SlaDrillDownDrawer
          severity={drill}
          range={range}
          team={team || undefined}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

function SlaDrillDownDrawer({
  severity,
  range,
  team,
  onClose,
}: {
  severity: string;
  range: number;
  team?: string;
  onClose: () => void;
}) {
  const fetchList = useServerFn(listSlaIncidents);
  const { data, isLoading } = useQuery<SlaIncidentRow[]>({
    queryKey: ["sla-incidents", severity, range, team ?? ""],
    queryFn: () =>
      fetchList({ data: { severity, range_days: range, ...(team ? { team } : {}) } }),
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-zinc-950 border-l border-white/10 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50">
              Drill-down · {range === 1 ? "24h" : `${range} ngày`}
              {team ? ` · ${team}` : ""}
            </p>
            <h3 className={`text-[15px] font-semibold ${SEV_TONE[severity] ?? "text-white"}`}>
              {SEV_LABEL[severity] ?? severity}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/10 text-white/70"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-white/50">Đang tải danh sách sự cố...</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-white/50 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Không có sự cố nào.
            </p>
          ) : (
            data.map((i) => {
              const tone =
                i.within_sla === null
                  ? "text-white/50"
                  : i.within_sla
                    ? "text-emerald-400"
                    : "text-red-400";
              const badge =
                i.within_sla === null
                  ? "Chưa xử lý"
                  : i.within_sla
                    ? "Đạt SLA"
                    : "Trễ SLA";
              return (
                <div
                  key={i.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[12px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{i.title}</p>
                      <p className="text-white/50 mt-0.5 text-[11px]">
                        {i.type}
                        {i.location ? ` · ${i.location}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold whitespace-nowrap ${tone}`}>
                      {badge}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                    <span>{new Date(i.created_at).toLocaleString("vi-VN")}</span>
                    <span className="tabular-nums">
                      {i.response_minutes !== null
                        ? `${fmtMin(i.response_minutes)} / ≤ ${i.sla_target_minutes}m`
                        : `Mục tiêu ≤ ${i.sla_target_minutes}m`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  delta,
}: {
  label: string;
  value: string;
  tone?: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-white/50 uppercase tracking-wider text-[10px]">{label}</p>
      <p className={`mt-0.5 text-[15px] font-bold tabular-nums ${tone ?? "text-white"}`}>{value}</p>
      {delta ? <div className="mt-0.5">{delta}</div> : null}
    </div>
  );
}
