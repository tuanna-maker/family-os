import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Phone, Shield, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { requireAuth } from "@/lib/require-auth";
import { MobileShell } from "@/components/mobile/MobileShell";
import {
  listProjectGuards,
  listProjectGuardSchedule,
  type ProjectGuard,
  type ProjectGuardShift,
} from "@/lib/guards-directory.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bao-ve")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Đội bảo vệ chung cư — STOS Life" }] }),
  component: GuardDirectoryPage,
});

const SHIFT_LABEL: Record<string, string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  night: "Ca đêm",
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function GuardDirectoryPage() {
  const fetchGuards = useServerFn(listProjectGuards);
  const fetchSchedule = useServerFn(listProjectGuardSchedule);

  // Default: 7 ngày tới
  const range = useMemo(() => {
    const today = new Date();
    const to = new Date();
    to.setDate(today.getDate() + 6);
    return { from: fmtDate(today), to: fmtDate(to) };
  }, []);

  const guardsQ = useQuery({
    queryKey: ["project-guards"],
    queryFn: () => fetchGuards(),
  });

  const scheduleQ = useQuery({
    queryKey: ["project-guard-schedule", range.from, range.to],
    queryFn: () => fetchScheduleFn(range),
  });

  function fetchScheduleFn(r: { from: string; to: string }) {
    return fetchSchedule({ data: r });
  }

  const [tab, setTab] = useState<"team" | "schedule">("team");

  const isUnscopedError = (err: unknown): boolean => {
    const m = (err as Error)?.message ?? "";
    return m.includes("chưa được liên kết với căn hộ");
  };

  return (
    <MobileShell>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/bao-an"
            className="h-9 w-9 grid place-items-center rounded-2xl bg-muted/60 active:scale-95 transition"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight">Đội bảo vệ chung cư</h1>
            <p className="text-[11px] text-muted-foreground">
              Lịch trực &amp; danh sách bảo vệ trực thuộc chung cư bạn
            </p>
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab("team")}
            className={cn(
              "flex-1 h-9 rounded-2xl text-sm font-semibold transition",
              tab === "team"
                ? "bg-brand text-primary-foreground"
                : "bg-muted/60 text-muted-foreground",
            )}
          >
            Đội bảo vệ
          </button>
          <button
            onClick={() => setTab("schedule")}
            className={cn(
              "flex-1 h-9 rounded-2xl text-sm font-semibold transition",
              tab === "schedule"
                ? "bg-brand text-primary-foreground"
                : "bg-muted/60 text-muted-foreground",
            )}
          >
            Lịch trực 7 ngày
          </button>
        </div>
      </header>

      {/* Unscoped resident: friendly empty state */}
      {((guardsQ.isError && isUnscopedError(guardsQ.error)) ||
        (scheduleQ.isError && isUnscopedError(scheduleQ.error))) && (
        <section className="px-4 mt-6">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-5 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Tài khoản chưa liên kết căn hộ
              </p>
              <p className="text-amber-800/80 dark:text-amber-200/80 mt-1">
                Vui lòng liên hệ Ban Quản Lý chung cư để được cập nhật căn hộ. Sau đó bạn sẽ xem được
                đội bảo vệ và lịch trực của chung cư mình.
              </p>
            </div>
          </div>
        </section>
      )}

      {tab === "team" && !isUnscopedError(guardsQ.error) && (
        <section className="px-4 mt-4 space-y-3 pb-24">
          {guardsQ.isLoading && (
            <div className="rounded-3xl bg-card border border-border p-6 text-sm text-muted-foreground">
              Đang tải đội bảo vệ…
            </div>
          )}
          {guardsQ.isError && !isUnscopedError(guardsQ.error) && (
            <div className="rounded-3xl bg-card border border-border p-6 text-sm text-destructive">
              Không tải được danh sách bảo vệ: {(guardsQ.error as Error).message}
            </div>
          )}
          {guardsQ.data && guardsQ.data.guards.length === 0 && (
            <div className="rounded-3xl bg-card border border-border p-6 text-sm text-muted-foreground text-center">
              Chưa có bảo vệ nào được phân công cho chung cư.
            </div>
          )}
          {guardsQ.data?.guards.map((g) => <GuardCard key={g.guard_id} g={g} />)}
        </section>
      )}

      {tab === "schedule" && !isUnscopedError(scheduleQ.error) && (
        <section className="px-4 mt-4 space-y-4 pb-24">
          {scheduleQ.isLoading && (
            <div className="rounded-3xl bg-card border border-border p-6 text-sm text-muted-foreground">
              Đang tải lịch trực…
            </div>
          )}
          {scheduleQ.isError && !isUnscopedError(scheduleQ.error) && (
            <div className="rounded-3xl bg-card border border-border p-6 text-sm text-destructive">
              Không tải được lịch: {(scheduleQ.error as Error).message}
            </div>
          )}
          {scheduleQ.data && <ScheduleByDate shifts={scheduleQ.data.shifts} />}
        </section>
      )}
    </MobileShell>
  );
}

function GuardCard({ g }: { g: ProjectGuard }) {
  const initials = (g.full_name ?? "BV")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  const roleLabel = g.role === "security_admin" ? "Trưởng ca / Quản lý" : "Bảo vệ";

  return (
    <div className="rounded-3xl bg-card border border-border p-4 flex items-center gap-3">
      <div className="h-12 w-12 rounded-2xl bg-tint-blue text-brand grid place-items-center font-semibold overflow-hidden shrink-0">
        {g.avatar_url ? (
          <img src={g.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{g.full_name ?? "Bảo vệ"}</p>
          {g.on_shift_today && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Đang trực
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          {roleLabel}
        </p>
        {g.next_shift_at && !g.on_shift_today && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ca tới: {new Date(g.next_shift_at).toLocaleString("vi-VN", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      {g.phone && (
        <a
          href={`tel:${g.phone}`}
          className="h-10 w-10 rounded-2xl bg-emerald-500 text-white grid place-items-center active:scale-95 transition shrink-0"
          aria-label="Gọi bảo vệ"
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function ScheduleByDate({ shifts }: { shifts: ProjectGuardShift[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ProjectGuardShift[]>();
    for (const s of shifts) {
      const arr = map.get(s.shift_date) ?? [];
      arr.push(s);
      map.set(s.shift_date, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  if (grouped.length === 0) {
    return (
      <div className="rounded-3xl bg-card border border-border p-6 text-sm text-muted-foreground text-center">
        Không có ca trực nào trong 7 ngày tới.
      </div>
    );
  }

  return (
    <>
      {grouped.map(([date, items]) => {
        const d = new Date(date);
        const isToday = fmtDate(new Date()) === date;
        return (
          <div key={date} className="rounded-3xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <Calendar className="h-4 w-4 text-brand" />
              <p className="text-sm font-semibold">
                {d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
              </p>
              {isToday && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                  Hôm nay
                </span>
              )}
            </div>
            <ul className="divide-y divide-border">
              {items.map((s) => (
                <li key={s.shift_id} className="px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-tint-blue text-brand grid place-items-center text-[11px] font-semibold shrink-0">
                    {(s.guard_name ?? "BV").split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.guard_name ?? "Bảo vệ"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {SHIFT_LABEL[s.shift_type] ?? s.shift_type} ·{" "}
                      {new Date(s.start_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(s.end_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <StatusPill status={s.status} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: {
      label: "Đã xếp",
      cls: "bg-muted text-muted-foreground",
    },
    checked_in: {
      label: "Đang trực",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
    checked_out: {
      label: "Hoàn tất",
      cls: "bg-tint-blue text-brand",
    },
    missed: {
      label: "Vắng",
      cls: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    },
    cancelled: {
      label: "Hủy",
      cls: "bg-muted text-muted-foreground line-through",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full", m.cls)}>{m.label}</span>
  );
}
