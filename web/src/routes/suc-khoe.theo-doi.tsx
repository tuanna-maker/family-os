import { createFileRoute, redirect, Link } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  UserCircle2,
  Pill,
  AlertTriangle,
  Stethoscope,
  Calendar,
  Clock,
  Droplet,
  HeartPulse,
  ShieldAlert,
  CheckCircle2,
  Check,
  Undo2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listHealth, markMedicineTaken, undoMedicineTaken } from "@/lib/health.functions";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suc-khoe/theo-doi")({
  head: () => ({ meta: [{ title: "Theo dõi sức khoẻ — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: HealthTabsPage,
});

type TabKey = "profile" | "meds" | "alerts";

const TABS: { key: TabKey; label: string; icon: typeof Pill }[] = [
  { key: "profile", label: "Hồ sơ", icon: UserCircle2 },
  { key: "meds", label: "Lịch thuốc", icon: Pill },
  { key: "alerts", label: "Cảnh báo", icon: AlertTriangle },
];

function HealthTabsPage() {
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const list = useServerFn(listHealth);
  const q = useQuery({
    queryKey: ["health-tabs", familyId],
    queryFn: () => list({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });

  const [tab, setTab] = useState<TabKey>("profile");
  const [member, setMember] = useState<string>("__all");
  const [liveBump, setLiveBump] = useState(0);
  const lastEventAt = useRef<number>(0);

  // Realtime: refetch on relevant inserts/updates for this family
  useEffect(() => {
    if (!familyId) return;
    const bump = () => {
      lastEventAt.current = Date.now();
      setLiveBump((n) => n + 1);
      q.refetch();
    };
    const channel = supabase
      .channel(`health-live-${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medicine_reminders", filter: `family_id=eq.${familyId}` },
        bump,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medical_appointments", filter: `family_id=eq.${familyId}` },
        bump,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `family_id=eq.${familyId}` },
        bump,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "health_profiles", filter: `family_id=eq.${familyId}` },
        bump,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medicine_logs", filter: `family_id=eq.${familyId}` },
        bump,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // Build member list from data (profiles + meds + appts)
  const members = useMemo(() => {
    const set = new Set<string>();
    q.data?.profiles.forEach((p) => set.add(p.name));
    q.data?.meds.forEach((m) => set.add(m.member_name));
    q.data?.appts.forEach((a) => set.add(a.member_name));
    return Array.from(set);
  }, [q.data]);

  const filterByMember = <T extends { name?: string; member_name?: string }>(rows: T[]) =>
    member === "__all" ? rows : rows.filter((r) => (r.name ?? r.member_name) === member);

  const profiles = filterByMember(q.data?.profiles ?? []);
  const meds = filterByMember(q.data?.meds ?? []).filter((m) => m.active);
  const appts = filterByMember(q.data?.appts ?? []);

  // Build alerts: appts trong 48h + meds có giờ uống + dị ứng/bệnh nền
  const alerts = useMemo(() => {
    if (!q.data) return [] as any[];
    const out: any[] = [];
    const now = Date.now();
    const horizon = now + 48 * 3600 * 1000;
    filterByMember(q.data.appts).forEach((a) => {
      const t = new Date(a.scheduled_at).getTime();
      if (a.status === "planned" && t >= now && t <= horizon) {
        out.push({
          kind: "appt",
          severity: "warn",
          title: `Lịch khám sắp tới — ${a.member_name}`,
          detail: `${a.doctor || "Khám tổng quát"} • ${new Date(a.scheduled_at).toLocaleString("vi-VN")}`,
        });
      }
    });
    filterByMember(q.data.meds).forEach((m) => {
      if (m.active && m.time_of_day) {
        out.push({
          kind: "med",
          severity: "info",
          title: `Nhắc thuốc — ${m.member_name}`,
          detail: `${m.medicine} • ${m.time_of_day}${m.dosage ? ` • ${m.dosage}` : ""}`,
        });
      }
    });
    filterByMember(q.data.profiles).forEach((p) => {
      if (p.allergies) {
        out.push({
          kind: "allergy",
          severity: "high",
          title: `Dị ứng — ${p.name}`,
          detail: p.allergies,
        });
      }
      if (p.conditions) {
        out.push({
          kind: "condition",
          severity: "warn",
          title: `Bệnh nền — ${p.name}`,
          detail: p.conditions,
        });
      }
    });
    return out;
  }, [q.data, member]);

  return (
    <MobileShell>
      <header className="px-4 pt-3 pb-2 flex items-start gap-3 sticky top-0 z-20 bg-background/95 backdrop-blur">
        <Link to="/suc-khoe" className="h-10 w-10 grid place-items-center rounded-2xl hover:bg-muted/40 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold tracking-tight leading-tight">Theo dõi sức khoẻ</h1>
          <p className="text-[11px] text-muted-foreground">Hồ sơ · Lịch thuốc · Cảnh báo</p>
        </div>
      </header>

      {/* Member chips */}
      <section className="px-4 pt-2">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 scrollbar-none">
          <MemberChip label="Cả nhà" active={member === "__all"} onClick={() => setMember("__all")} />
          {members.map((m) => (
            <MemberChip key={m} label={m} active={member === m} onClick={() => setMember(m)} />
          ))}
        </div>
      </section>

      {/* Tabs */}
      <section className="px-4 mt-4 sticky top-[60px] z-10 bg-background pb-2">
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-2xl">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count =
              t.key === "profile" ? profiles.length : t.key === "meds" ? meds.length : alerts.length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-10 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition",
                  active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] grid place-items-center",
                      active ? "bg-brand text-white" : "bg-muted text-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-2 pb-6 space-y-2">
        {(famLoading || q.isLoading) && <LoadingState />}
        {q.isError && <ErrorState message={(q.error as Error).message} />}
        {q.data && (
          <>
            {tab === "profile" && <ProfileTab rows={profiles} />}
            {tab === "meds" && <MedsTab rows={meds} todayLogs={q.data.todayLogs ?? []} familyId={familyId!} />}
            {tab === "alerts" && <AlertsTab rows={alerts} liveBump={liveBump} />}
          </>
        )}
      </section>
    </MobileShell>
  );
}

function MemberChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 h-9 px-3.5 rounded-full text-[12px] font-semibold border transition",
        active ? "bg-brand text-white border-brand" : "bg-card border-border text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ProfileTab({ rows }: { rows: any[] }) {
  if (rows.length === 0)
    return <EmptyState icon={<UserCircle2 className="h-5 w-5" />} title="Chưa có hồ sơ" description="Thêm hồ sơ ở mục Quản lý" />;
  return (
    <>
      {rows.map((p) => (
        <div key={p.id} className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-tint-blue grid place-items-center shrink-0">
              <UserCircle2 className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {[p.blood_type && `Nhóm máu ${p.blood_type}`, p.dob && `Sinh ${p.dob}`].filter(Boolean).join(" • ") || "—"}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {p.allergies && (
              <InfoLine icon={<ShieldAlert className="h-3.5 w-3.5 text-emergency" />} label="Dị ứng" value={p.allergies} />
            )}
            {p.conditions && (
              <InfoLine icon={<HeartPulse className="h-3.5 w-3.5 text-warning" />} label="Bệnh nền" value={p.conditions} />
            )}
            {p.notes && (
              <InfoLine icon={<Droplet className="h-3.5 w-3.5 text-brand" />} label="Ghi chú" value={p.notes} />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function InfoLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  );
}

function MedsTab({
  rows,
  todayLogs,
  familyId,
}: {
  rows: any[];
  todayLogs: { id: string; reminder_id: string; taken_at: string }[];
  familyId: string;
}) {
  const qc = useQueryClient();
  const mark = useServerFn(markMedicineTaken);
  const undo = useServerFn(undoMedicineTaken);

  const logByReminder = useMemo(() => {
    const m = new Map<string, { id: string; taken_at: string }>();
    todayLogs.forEach((l) => m.set(l.reminder_id, { id: l.id, taken_at: l.taken_at }));
    return m;
  }, [todayLogs]);

  const markMut = useMutation({
    mutationFn: (reminder_id: string) => mark({ data: { family_id: familyId, reminder_id } }),
    onSuccess: () => {
      toast.success("Đã ghi nhận");
      qc.invalidateQueries({ queryKey: ["health-tabs", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const undoMut = useMutation({
    mutationFn: (log_id: string) => undo({ data: { log_id } }),
    onSuccess: () => {
      toast.success("Đã hoàn tác");
      qc.invalidateQueries({ queryKey: ["health-tabs", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rows.length === 0)
    return <EmptyState icon={<Pill className="h-5 w-5" />} title="Chưa có lịch thuốc" description="Thêm ở mục Quản lý" />;

  // group by time slot for quick scanning
  const grouped = rows.reduce<Record<string, any[]>>((acc, m) => {
    const slot = (m.time_of_day || "Khác").trim();
    (acc[slot] ??= []).push(m);
    return acc;
  }, {});
  const slots = Object.keys(grouped).sort();

  return (
    <>
      {slots.map((slot) => (
        <div key={slot}>
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <Clock className="h-3.5 w-3.5 text-brand" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{slot}</span>
          </div>
          <div className="space-y-2">
            {grouped[slot].map((m) => {
              const log = logByReminder.get(m.id);
              const taken = !!log;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-2xl border p-3 flex items-start gap-3",
                    taken ? "bg-tint-green/40 border-success/30" : "bg-card border-border",
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-2xl grid place-items-center shrink-0",
                      taken ? "bg-success/15" : "bg-tint-pink",
                    )}
                  >
                    {taken ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Pill className="h-5 w-5 text-emergency" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        taken && "line-through text-muted-foreground",
                      )}
                    >
                      {m.medicine}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {m.member_name}
                      {m.dosage ? ` • ${m.dosage}` : ""}
                      {m.days_of_week ? ` • ${m.days_of_week}` : ""}
                    </p>
                    {taken && log && (
                      <p className="text-[11px] text-success mt-0.5">
                        Đã uống lúc {new Date(log.taken_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {m.notes && !taken && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">📝 {m.notes}</p>
                    )}
                  </div>
                  {taken ? (
                    <button
                      onClick={() => log && undoMut.mutate(log.id)}
                      disabled={undoMut.isPending}
                      className="shrink-0 h-9 px-3 rounded-xl border border-border text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-muted disabled:opacity-50"
                    >
                      <Undo2 className="h-3.5 w-3.5" /> Hoàn tác
                    </button>
                  ) : (
                    <button
                      onClick={() => markMut.mutate(m.id)}
                      disabled={markMut.isPending}
                      className="shrink-0 h-9 px-3 rounded-xl bg-brand text-white text-[12px] font-semibold inline-flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Đã uống
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function AlertsTab({ rows, liveBump }: { rows: any[]; liveBump: number }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (liveBump === 0) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1500);
    return () => clearTimeout(t);
  }, [liveBump]);

  const LiveBadge = (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          pulse ? "bg-emergency animate-pulse" : "bg-success",
        )}
      />
      {pulse ? "Cập nhật vừa rồi" : "Đang theo dõi realtime"}
    </div>
  );

  if (rows.length === 0)
    return (
      <div className="space-y-2">
        <div className="flex justify-end">{LiveBadge}</div>
        <div className="rounded-2xl bg-tint-green/40 border border-success/30 p-5 text-center">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
          <p className="text-sm font-semibold mt-2">Không có cảnh báo</p>
          <p className="text-[11px] text-muted-foreground mt-1">Tình trạng sức khoẻ ổn định</p>
        </div>
      </div>
    );

  const severityStyle: Record<string, { tint: string; color: string; icon: typeof AlertTriangle }> = {
    high: { tint: "bg-tint-pink", color: "text-emergency", icon: ShieldAlert },
    warn: { tint: "bg-tint-orange", color: "text-warning", icon: AlertTriangle },
    info: { tint: "bg-tint-blue", color: "text-brand", icon: Calendar },
  };

  return (
    <>
      <div className="flex justify-end">{LiveBadge}</div>
      {rows.map((a, i) => {
        const s = severityStyle[a.severity] ?? severityStyle.info;
        const Icon = a.kind === "appt" ? Stethoscope : a.kind === "med" ? Pill : s.icon;
        return (
          <div key={i} className="rounded-2xl bg-card border border-border p-3 flex items-start gap-3">
            <div className={cn("h-10 w-10 rounded-2xl grid place-items-center shrink-0", s.tint)}>
              <Icon className={cn("h-5 w-5", s.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{a.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{a.detail}</p>
            </div>
          </div>
        );
      })}
    </>
  );
}
