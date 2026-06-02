import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ShieldCheck, Users2, Clock3, Building2, CalendarDays, AlertCircle } from "lucide-react";
import {
  listSaasGuards,
  listSaasGuardShifts,
  type SaasGuard,
  type SaasGuardShift,
} from "@/lib/saas-guards.functions";

export const Route = createFileRoute("/saas/guards")({
  head: () => ({ meta: [{ title: "Bảo vệ toàn hệ thống — SaaS" }] }),
  component: SaasGuardsPage,
});

function todayISO(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const SHIFT_LABEL: Record<string, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Đêm",
};

const STATUS_TONE: Record<string, string> = {
  scheduled: "bg-muted text-foreground",
  checked_in: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  checked_out: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  missed: "bg-red-500/15 text-red-600 dark:text-red-400",
  cancelled: "bg-zinc-400/15 text-zinc-500",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Đã xếp",
  checked_in: "Đang trực",
  checked_out: "Hoàn tất",
  missed: "Vắng",
  cancelled: "Hủy",
};

function SaasGuardsPage() {
  const fetchGuards = useServerFn(listSaasGuards);
  const fetchShifts = useServerFn(listSaasGuardShifts);

  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [range, setRange] = useState({ from: todayISO(0), to: todayISO(6) });

  const guardsQ = useQuery({
    queryKey: ["saas-guards"],
    queryFn: () => fetchGuards(),
  });

  const shiftsQ = useQuery({
    queryKey: ["saas-guard-shifts", range.from, range.to],
    queryFn: () => fetchShifts({ data: range }),
  });

  const guards = guardsQ.data ?? [];
  const shifts = shiftsQ.data ?? [];

  // Project options derived from guards
  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of guards) {
      if (g.project_id && g.project_name) m.set(g.project_id, g.project_name);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [guards]);

  // Filtered guards
  const filteredGuards = useMemo(() => {
    const term = q.trim().toLowerCase();
    return guards.filter((g) => {
      if (projectFilter !== "all" && g.project_id !== projectFilter) return false;
      if (roleFilter !== "all" && g.role !== roleFilter) return false;
      if (!term) return true;
      return (
        (g.full_name ?? "").toLowerCase().includes(term) ||
        (g.phone ?? "").toLowerCase().includes(term) ||
        (g.project_name ?? "").toLowerCase().includes(term) ||
        (g.project_code ?? "").toLowerCase().includes(term)
      );
    });
  }, [guards, q, projectFilter, roleFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = guards.length;
    const onShiftToday = guards.filter((g) => g.on_shift_today).length;
    const projectsCovered = new Set(
      guards.filter((g) => g.project_id).map((g) => g.project_id),
    ).size;
    const admins = guards.filter((g) => g.role === "security_admin").length;
    return { total, onShiftToday, projectsCovered, admins };
  }, [guards]);

  // Shifts grouped by date for the visible range
  const shiftsByDate = useMemo(() => {
    const m = new Map<string, SaasGuardShift[]>();
    const visible = projectFilter === "all"
      ? shifts
      : shifts.filter((s) => s.project_id === projectFilter);
    for (const s of visible) {
      if (!m.has(s.shift_date)) m.set(s.shift_date, []);
      m.get(s.shift_date)!.push(s);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [shifts, projectFilter]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          SaaS Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Danh bạ bảo vệ liên dự án
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tổng quan lực lượng bảo vệ trên toàn bộ chung cư/dự án trong nền tảng.
        </p>
      </header>

      {guardsQ.isError && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Không tải được danh sách bảo vệ</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(guardsQ.error as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Users2 className="h-4 w-4" />}
          label="Tổng bảo vệ"
          value={guardsQ.isLoading ? "…" : kpis.total.toString()}
        />
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Đang trực hôm nay"
          value={guardsQ.isLoading ? "…" : kpis.onShiftToday.toString()}
          tone="emerald"
        />
        <KpiCard
          icon={<Building2 className="h-4 w-4" />}
          label="Dự án phủ"
          value={guardsQ.isLoading ? "…" : kpis.projectsCovered.toString()}
        />
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Security admin"
          value={guardsQ.isLoading ? "…" : kpis.admins.toString()}
        />
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-card border border-border p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, SĐT, dự án…"
            className="h-10 pl-9 pr-3 w-full rounded-xl bg-muted/40 border border-border text-sm"
          />
        </div>
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-muted/40 border border-border text-sm"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="security_admin">Security Admin</option>
          <option value="security_staff">Security Staff</option>
        </select>
      </div>

      {/* Guards table */}
      <section className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {guardsQ.isLoading ? "Đang tải…" : `${filteredGuards.length} bảo vệ`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Bảo vệ</th>
                <th className="text-left p-4 font-medium">Dự án</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Vai trò</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">SĐT</th>
                <th className="text-left p-4 font-medium">Hôm nay</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Ca kế tiếp</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuards.map((g) => (
                <GuardRow key={`${g.guard_id}-${g.project_id ?? "_"}`} g={g} />
              ))}
              {!guardsQ.isLoading && filteredGuards.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    Không có bảo vệ phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Schedule */}
      <section className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Lịch ca trực</h2>
            <span className="text-xs text-muted-foreground">
              {shiftsQ.isLoading ? "…" : `${shifts.length} ca`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs"
            />
          </div>
        </div>

        <div className="p-5 space-y-5">
          {shiftsQ.isError && (
            <p className="text-sm text-destructive">
              {(shiftsQ.error as Error).message}
            </p>
          )}
          {shiftsQ.isLoading && (
            <p className="text-sm text-muted-foreground">Đang tải lịch…</p>
          )}
          {!shiftsQ.isLoading && shiftsByDate.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Không có ca trực trong khoảng này.
            </p>
          )}
          {shiftsByDate.map(([date, dayShifts]) => (
            <DayBlock key={date} date={date} shifts={dayShifts} />
          ))}
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
  tone?: "emerald" | "amber";
}) {
  const toneCls =
    tone === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "amber" ? "text-amber-600 dark:text-amber-400"
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

function GuardRow({ g }: { g: SaasGuard }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm font-semibold shrink-0 overflow-hidden">
            {g.avatar_url ? (
              <img src={g.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (g.full_name ?? "?").slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{g.full_name || "Chưa đặt tên"}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{g.guard_id.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        {g.project_name ? (
          <div>
            <p className="font-medium text-sm">{g.project_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {g.project_code}{g.tenant_name ? ` · ${g.tenant_name}` : ""}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Chưa gán dự án</span>
        )}
      </td>
      <td className="p-4 hidden md:table-cell">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            g.role === "security_admin"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {g.role === "security_admin" ? "Admin" : "Staff"}
        </span>
      </td>
      <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground">
        {g.phone || "—"}
      </td>
      <td className="p-4">
        {g.on_shift_today ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Đang trực
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Nghỉ</span>
        )}
      </td>
      <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
        {g.next_shift_at
          ? new Date(g.next_shift_at).toLocaleString("vi-VN", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            })
          : "—"}
      </td>
    </tr>
  );
}

function DayBlock({ date, shifts }: { date: string; shifts: SaasGuardShift[] }) {
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit",
  });
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">· {shifts.length} ca</span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {shifts.map((s) => (
          <div
            key={s.shift_id}
            className="rounded-xl border border-border bg-background/50 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock3 className="h-3 w-3 text-muted-foreground" />
                {SHIFT_LABEL[s.shift_type] ?? s.shift_type}
                <span className="text-muted-foreground font-normal">
                  · {new Date(s.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  –{new Date(s.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${STATUS_TONE[s.status] ?? "bg-muted"}`}
              >
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </div>
            <p className="font-medium truncate">{s.guard_name ?? "—"}</p>
            <p className="text-muted-foreground truncate">
              {s.project_name ?? "Chưa gán dự án"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
