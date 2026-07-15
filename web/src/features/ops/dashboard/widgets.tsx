import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ClipboardList, AlertTriangle, Wallet, Users2, TrendingUp, TrendingDown,
  Clock, CheckCircle2, MessageSquareWarning, Wrench, Loader2,
  Plus, Settings2, UserPlus, CheckCheck, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOpsStats, type OpsStats } from "@/lib/console-stats.functions";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { useMockAuth } from "@/contexts/MockAuthContext";

// ---------- Shared hook ----------
function useOps() {
  const fn = useServerFn(getOpsStats);
  return useQuery({
    queryKey: ["ops-stats"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
    retry: false,
  });
}

function fmtMoney(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return n.toLocaleString("vi-VN");
}

// ---------- KPI strip ----------
export function OpsKpiStrip() {
  const { data, isLoading, isError } = useOps();
  const kpis = [
    {
      label: "Yêu cầu mở", to: "/ops/complaints" as const,
      value: data ? String(data.open_requests) : "—",
      delta: 5.2, icon: ClipboardList, tint: "bg-tint-blue", color: "text-brand",
    },
    {
      label: "Sự cố đang xử lý", to: "/ops/work-orders" as const,
      value: data ? String(data.incidents_in_progress) : "—",
      delta: -12.5, icon: AlertTriangle, tint: "bg-tint-orange", color: "text-warning",
    },
    {
      label: "Công nợ tháng", to: "/ops/fee" as const,
      value: "412M", delta: -4.2, icon: Wallet, tint: "bg-tint-green", color: "text-success",
      mock: true,
    },
    {
      label: "Tỷ lệ lấp đầy", to: "/ops/occupancy" as const,
      value: data ? `${data.occupancy_pct}%` : "—",
      delta: 1.8, icon: Users2, tint: "bg-tint-purple", color: "text-[oklch(0.55_0.18_295)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => {
        const up = k.delta >= 0;
        return (
          <Link
            key={k.label} to={k.to}
            className="rounded-2xl border border-border bg-white p-4 shadow-soft relative block hover:border-brand/50 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className={`h-9 w-9 rounded-lg ${k.tint} grid place-items-center`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className={cn("flex items-center gap-1 text-[10.5px] font-medium tabular-nums",
                up ? "text-success" : "text-emergency")}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {up ? "+" : ""}{k.delta}%
              </div>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-3 flex items-center gap-1.5">
              {k.label}
              {k.mock && <span className="text-[9px] px-1 rounded bg-warning/10 text-warning normal-case tracking-normal">Demo</span>}
            </p>
            <p className="text-[24px] font-bold mt-1 tabular-nums flex items-center gap-2">
              {isLoading && !k.mock ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : k.value}
            </p>
            {isError && !k.mock && <p className="text-[10px] text-muted-foreground mt-1">Chưa có dữ liệu</p>}
          </Link>
        );
      })}
    </div>
  );
}

// ---------- SLA (kept mock — no resolution-time data yet) ----------
const SLA_DATA = Array.from({ length: 14 }, (_, i) => ({
  d: `T${i + 1}`, inTime: 80 + Math.round(Math.random() * 15), breach: Math.round(Math.random() * 8),
}));
export function SlaTicketsCard() {
  const onTime = 89.3, target = 90;
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-semibold flex items-center gap-2">
            SLA xử lý yêu cầu (14 ngày)
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Demo</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cần cấu hình SLA & thời gian xử lý</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Đúng hạn</p>
            <p className="text-[22px] font-bold tabular-nums">{onTime}%</p>
            <p className={cn("text-[10.5px] tabular-nums font-medium", onTime >= target ? "text-success" : "text-warning")}>
              Mục tiêu {target}%
            </p>
          </div>
          <PermissionGate roles={["super_admin", "tenant_admin", "bql_manager"]}>
            <button
              onClick={() => toast.info("Mở cấu hình SLA", { description: "Chỉ Manager/Admin có quyền chỉnh ngưỡng SLA." })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] hover:bg-muted transition"
            >
              <Settings2 className="h-3.5 w-3.5" /> Cấu hình
            </button>
          </PermissionGate>
        </div>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={SLA_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 10 }} stroke="oklch(0.6 0.01 260)" />
            <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.6 0.01 260)" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line type="monotone" dataKey="inTime" stroke="oklch(0.55 0.2 264)" strokeWidth={2} dot={false} name="Đúng hạn" />
            <Line type="monotone" dataKey="breach" stroke="oklch(0.65 0.22 30)" strokeWidth={2} dot={false} name="Vi phạm" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------- Occupancy (REAL) ----------
const MOCK_OCC = [
  { name: "Tòa A", total: 240, occupied: 232 },
  { name: "Tòa B", total: 240, occupied: 218 },
  { name: "Tòa C", total: 180, occupied: 174 },
];
export function OccupancyCard() {
  const { data, isLoading } = useOps();
  const rows = useMemo(() => {
    const src = data?.occupancy_by_block?.length
      ? data.occupancy_by_block.map((b) => ({ name: b.name, total: b.total, occupied: b.occupied }))
      : MOCK_OCC;
    return src.map((b) => ({ ...b, pct: b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0 }));
  }, [data]);
  const isMock = !data?.occupancy_by_block?.length;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <h3 className="text-[14px] font-semibold flex items-center gap-2">
        Tỷ lệ lấp đầy theo tòa
        {isMock && !isLoading && <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Demo</span>}
      </h3>
      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="font-medium">{r.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.occupied}/{r.total} · <span className="text-foreground font-semibold">{r.pct}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full",
                    r.pct >= 95 ? "bg-success" : r.pct >= 85 ? "bg-brand" : "bg-warning")}
                  style={{ width: `${r.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Fee collection (kept mock — no fees table) ----------
const FEE_DATA = [
  { m: "T1", thu: 2.1, no: 0.3 }, { m: "T2", thu: 2.3, no: 0.4 }, { m: "T3", thu: 2.4, no: 0.5 },
  { m: "T4", thu: 2.2, no: 0.6 }, { m: "T5", thu: 2.5, no: 0.4 }, { m: "T6", thu: 2.45, no: 0.41 },
];
export function FeeCollectionChart() {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-semibold flex items-center gap-2">
            Thu phí dịch vụ
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Demo</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cần module thu phí · 6 tháng</p>
        </div>
        <div className="flex items-center gap-3 text-[10.5px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand" />Đã thu</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-warning" />Công nợ</span>
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={FEE_DATA} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 10 }} stroke="oklch(0.6 0.01 260)" />
            <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.6 0.01 260)" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="thu" fill="oklch(0.55 0.2 264)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="no" fill="oklch(0.75 0.18 70)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------- Complaints (REAL) ----------
const SEV: Record<string, { label: string; cls: string }> = {
  urgent: { label: "Nghiêm trọng", cls: "bg-emergency/10 text-emergency border-emergency/20" },
  high: { label: "Cao", cls: "bg-warning/10 text-warning border-warning/20" },
  normal: { label: "Trung bình", cls: "bg-info/10 text-info border-info/20" },
  low: { label: "Thấp", cls: "bg-muted text-muted-foreground border-border" },
};
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  return `${Math.floor(h / 24)} ngày`;
}

export function ComplaintQueue() {
  const { data, isLoading } = useOps();
  const { can } = useMockAuth();
  const list = data?.complaints ?? [];
  const canView = can("service_request.view");
  const canAssign = can("service_request.assign");
  const canResolve = can("service_request.resolve");
  const canCreate = can("service_request.create");

  if (!canView) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4 text-warning" />Phản ánh mới
        </h3>
        <div className="py-8 text-center text-[12px] text-muted-foreground flex flex-col items-center gap-2">
          <Lock className="h-4 w-4" />
          Bạn không có quyền xem phản ánh.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4 text-warning" />Phản ánh mới
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{list.length} chờ phân công</span>
          <PermissionGate permission="service_request.create">
            <button
              onClick={() => toast.success("Tạo phản ánh mới")}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-brand text-white hover:opacity-90"
            >
              <Plus className="h-3 w-3" /> Tạo
            </button>
          </PermissionGate>
        </div>
      </div>
      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Không có phản ánh đang chờ.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const sev = SEV[c.priority] ?? SEV.normal;
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">{c.id.slice(0, 8)}</span>
                    {c.apartment_code && <><span>·</span><span>{c.apartment_code}</span></>}
                  </div>
                  <p className="text-[13px] font-medium truncate mt-0.5">{c.title}</p>
                </div>
                <span className={cn("text-[10.5px] px-2 py-0.5 rounded-md border font-medium whitespace-nowrap", sev.cls)}>
                  {sev.label}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap flex items-center gap-1">
                  <Clock className="h-3 w-3" />{timeAgo(c.created_at)}
                </span>
                <div className="flex items-center gap-1">
                  {canAssign && (
                    <button
                      onClick={() => toast.success(`Phân công ${c.id.slice(0, 8)}`)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] border border-border hover:bg-muted"
                      title="Phân công"
                    >
                      <UserPlus className="h-3 w-3" />
                    </button>
                  )}
                  {canResolve && (
                    <button
                      onClick={() => toast.success(`Đã xử lý ${c.id.slice(0, 8)}`)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] bg-success/10 text-success hover:bg-success/20"
                      title="Đánh dấu hoàn thành"
                    >
                      <CheckCheck className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!canAssign && !canResolve && !canCreate && (
        <p className="text-[10.5px] text-muted-foreground mt-3 flex items-center gap-1"><Lock className="h-3 w-3" />Chế độ chỉ đọc</p>
      )}
    </div>
  );
}

// ---------- Work Orders (REAL) ----------
const ST: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  in_progress: { label: "Đang thực hiện", cls: "bg-tint-blue text-brand", icon: Wrench },
  open: { label: "Chờ xử lý", cls: "bg-muted text-muted-foreground", icon: Clock },
  resolved: { label: "Hoàn thành", cls: "bg-tint-green text-success", icon: CheckCircle2 },
};

export function WorkOrdersTable() {
  const { data, isLoading } = useOps();
  const { can } = useMockAuth();
  const list = data?.work_orders ?? [];
  const canView = can("service_request.view");
  const canAssign = can("service_request.assign");
  const canResolve = can("service_request.resolve");

  if (!canView) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-brand" />Lệnh công việc
        </h3>
        <div className="py-10 text-center text-[12px] text-muted-foreground flex flex-col items-center gap-2">
          <Lock className="h-4 w-4" />
          Bạn không có quyền xem lệnh công việc.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-brand" />Lệnh công việc
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{list.length} bản ghi gần nhất</span>
          <PermissionGate permission="service_request.assign">
            <button
              onClick={() => toast.success("Tạo lệnh công việc mới")}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-brand text-white hover:opacity-90"
            >
              <Plus className="h-3 w-3" /> Tạo lệnh
            </button>
          </PermissionGate>
        </div>
      </div>
      {isLoading ? (
        <div className="py-10 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Chưa có lệnh công việc nào.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-muted-foreground text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Mã</th>
                <th className="text-left px-3 py-2 font-medium">Công việc</th>
                <th className="text-left px-3 py-2 font-medium">Vị trí</th>
                <th className="text-left px-3 py-2 font-medium">Trạng thái</th>
                <th className="text-left px-3 py-2 font-medium">Thời gian</th>
                <th className="text-right px-3 py-2 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w: any) => {
                const s = ST[w.status] ?? ST.open;
                const Icon = s.icon;
                const isOpen = w.status !== "resolved";
                return (
                  <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{w.id.slice(0, 8)}</td>
                    <td className="px-3 py-2.5 font-medium">{w.title}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{w.apartment_code ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium", s.cls)}>
                        <Icon className="h-3 w-3" />{s.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{timeAgo(w.created_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isOpen && canAssign && (
                          <button
                            onClick={() => toast.success(`Phân công ${w.id.slice(0, 8)}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] border border-border hover:bg-muted"
                          >
                            <UserPlus className="h-3 w-3" />
                          </button>
                        )}
                        {isOpen && canResolve && (
                          <button
                            onClick={() => toast.success(`Hoàn thành ${w.id.slice(0, 8)}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] bg-success/10 text-success hover:bg-success/20"
                          >
                            <CheckCheck className="h-3 w-3" />
                          </button>
                        )}
                        {!isOpen && <span className="text-[10.5px] text-muted-foreground">—</span>}
                        {isOpen && !canAssign && !canResolve && (
                          <span className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3 w-3" /></span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
