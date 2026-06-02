import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Shield,
  Stethoscope,
  MessageCircle,
  Pill,
  FolderHeart,
  ShieldCheck,
  Plus,
  TestTube,
  ClipboardList,
  Syringe,
  AlertTriangle,
  FileHeart,
  Brain,
  ChevronRight,
  Check,
  Activity as ActivityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { LoadingState, ErrorState } from "@/components/common/States";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listHealth, markMedicineTaken } from "@/lib/health.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suc-khoe")({
  head: () => ({ meta: [{ title: "Sức khỏe gia đình — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: HealthOverview,
});

const AVATAR_EMOJIS = ["👨", "👩", "🧒", "👧", "👴", "👵", "🧑", "👦"];
function avatarFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_EMOJIS[h % AVATAR_EMOJIS.length];
}

const RECORD_KIND_LABEL: Record<string, string> = {
  weight: "Cân nặng",
  height: "Chiều cao",
  blood_pressure: "Huyết áp",
  glucose: "Đường huyết",
  temperature: "Nhiệt độ",
  note: "Khác",
};

function HealthOverview() {
  const { familyId } = useFamilyContext();
  const list = useServerFn(listHealth);
  const markTaken = useServerFn(markMedicineTaken);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => list({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: 60_000,
  });
  const [activeMember, setActiveMember] = useState<string>("__all");

  const takenMut = useMutation({
    mutationFn: (reminder_id: string) => markTaken({ data: { family_id: familyId!, reminder_id } }),
    onSuccess: () => {
      toast.success("Đã ghi nhận uống thuốc");
      qc.invalidateQueries({ queryKey: ["health-overview", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = q.data;

  // Build members from profiles + meds + appts (so dummy-named meds/appts cũng có)
  const members = useMemo(() => {
    const names = new Set<string>();
    data?.profiles.forEach((p) => names.add(p.name));
    data?.meds.forEach((m) => names.add(m.member_name));
    data?.appts.forEach((a) => names.add(a.member_name));
    return Array.from(names);
  }, [data]);

  const filterMember = <T extends { member_name?: string; name?: string }>(rows: T[]) =>
    activeMember === "__all" ? rows : rows.filter((r) => (r.name ?? r.member_name) === activeMember);

  // Upcoming appts (next 2)
  const upcomingAppts = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return filterMember(data.appts)
      .filter((a) => a.status === "planned" && new Date(a.scheduled_at).getTime() >= now)
      .slice(0, 2);
  }, [data, activeMember]);

  // Active meds with time, top 3
  const takenIds = useMemo(() => new Set((data?.todayLogs ?? []).map((l) => l.reminder_id)), [data]);
  const todayMeds = useMemo(() => {
    if (!data) return [];
    return filterMember(data.meds)
      .filter((m) => m.active && m.time_of_day)
      .slice(0, 3);
  }, [data, activeMember]);

  // Real RECORD counts
  const recordCounts = useMemo(() => {
    const recs = filterMember(data?.records ?? []);
    const apptsAll = filterMember(data?.appts ?? []);
    const medsAll = filterMember(data?.meds ?? []).filter((m) => m.active);
    const profs = filterMember(data?.profiles ?? []);
    const allergyCount = profs.filter((p) => p.allergies && p.allergies.trim()).length;
    const condCount = profs.filter((p) => p.conditions && p.conditions.trim()).length;
    return {
      tests: recs.length,
      meds: medsAll.length,
      appts: apptsAll.length,
      allergies: allergyCount,
      conditions: condCount,
    };
  }, [data, activeMember]);

  // Vitals from latest records by kind
  const vitalsMap = useMemo(() => {
    const m = new Map<string, { value: string; recorded_at: string }>();
    filterMember(data?.records ?? []).forEach((r) => {
      if (!m.has(r.kind) && r.value) m.set(r.kind, { value: r.value, recorded_at: r.recorded_at });
    });
    return m;
  }, [data, activeMember]);

  // Notification count: appts <=24h + meds active scheduled today not taken
  const notifCount = useMemo(() => {
    if (!data) return 0;
    const now = Date.now();
    const horizon = now + 24 * 3600_000;
    const a = data.appts.filter((x) => x.status === "planned" && new Date(x.scheduled_at).getTime() >= now && new Date(x.scheduled_at).getTime() <= horizon).length;
    const m = data.meds.filter((x) => x.active && x.time_of_day && !takenIds.has(x.id)).length;
    return a + m;
  }, [data, takenIds]);

  // Derived insights (simple, real)
  const insights = useMemo(() => {
    if (!data) return [] as { emoji: string; text: string }[];
    const out: { emoji: string; text: string }[] = [];
    const missingProfile = members.filter((n) => !data.profiles.some((p) => p.name === n));
    if (missingProfile.length > 0) {
      out.push({ emoji: "📝", text: `Có ${missingProfile.length} thành viên chưa có hồ sơ sức khỏe: ${missingProfile.slice(0, 3).join(", ")}` });
    }
    const next7 = data.appts.filter((a) => {
      const t = new Date(a.scheduled_at).getTime();
      return a.status === "planned" && t >= Date.now() && t <= Date.now() + 7 * 86400_000;
    });
    if (next7.length > 0) out.push({ emoji: "🩺", text: `${next7.length} lịch khám trong 7 ngày tới.` });
    const allergies = data.profiles.filter((p) => p.allergies && p.allergies.trim());
    if (allergies.length > 0) out.push({ emoji: "⚠️", text: `${allergies.length} thành viên có ghi nhận dị ứng. Hãy lưu ý khi kê thuốc.` });
    if (out.length === 0) out.push({ emoji: "✅", text: "Mọi thứ ổn định. Hãy duy trì thói quen ghi nhận hàng ngày." });
    return out;
  }, [data, members]);

  // Recent activity from medicine_logs today + latest appts done + latest records
  const activity = useMemo(() => {
    if (!data) return [] as { icon: any; tint: string; color: string; text: string; time: string }[];
    const items: any[] = [];
    data.todayLogs.slice(0, 3).forEach((l) => {
      const med = data.meds.find((m) => m.id === l.reminder_id);
      if (med) items.push({
        icon: Pill, tint: "bg-tint-green", color: "text-success",
        text: `${med.member_name} đã uống ${med.medicine}`,
        time: new Date(l.taken_at).toTimeString().slice(0, 5),
      });
    });
    data.records.slice(0, 2).forEach((r) => {
      items.push({
        icon: ActivityIcon, tint: "bg-tint-blue", color: "text-brand",
        text: `${r.member_name} • ${r.title}${r.value ? ` · ${r.value}` : ""}`,
        time: new Date(r.recorded_at).toLocaleDateString("vi-VN"),
      });
    });
    return items.slice(0, 4);
  }, [data]);

  if (q.isLoading) return <MobileShell><div className="p-4"><LoadingState /></div></MobileShell>;
  if (q.isError) return <MobileShell><div className="p-4"><ErrorState message={(q.error as Error).message} /></div></MobileShell>;

  return (
    <MobileShell>
      <header className="px-4 pt-3 pb-3 flex items-start gap-3">
        <Link to="/gia-dinh" className="h-10 w-10 grid place-items-center rounded-2xl hover:bg-muted/40 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight leading-tight">Sức khỏe gia đình</h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Shield className="h-3.5 w-3.5 text-brand" /> Chăm sóc sức khỏe – An tâm mỗi ngày
          </p>
        </div>
        <Link to="/suc-khoe/theo-doi" className="relative h-10 w-10 grid place-items-center rounded-2xl hover:bg-muted/40">
          <Bell className="h-[18px] w-[18px]" />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-emergency text-white text-[9px] font-bold grid place-items-center">{notifCount}</span>
          )}
        </Link>
      </header>

      {/* Member tabs */}
      <section className="px-4">
        <div className="flex gap-3.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <MemberTab name="Cả nhà" emoji="👨‍👩‍👧‍👦" active={activeMember === "__all"} onClick={() => setActiveMember("__all")} />
          {members.map((name) => (
            <MemberTab key={name} name={name} emoji={avatarFor(name)} active={activeMember === name} onClick={() => setActiveMember(name)} />
          ))}
          <Link to="/suc-khoe/quan-ly" className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="h-[60px] w-[60px] rounded-2xl bg-muted/40 border border-border grid place-items-center">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Thêm</span>
          </Link>
        </div>
      </section>

      {/* Overall status (from real signals) */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-card border border-border p-5">
          <p className="text-[14px] font-bold">Tình trạng sức khỏe tổng quan</p>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheck className={cn("h-6 w-6", notifCount === 0 ? "text-success" : "text-warning")} />
            <p className={cn("text-[28px] font-bold leading-none", notifCount === 0 ? "text-success" : "text-warning")}>
              {notifCount === 0 ? "Ổn định" : "Cần chú ý"}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {notifCount === 0 ? "Không có cảnh báo nào." : `${notifCount} việc cần theo dõi trong 24h tới`}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {(["weight", "blood_pressure", "glucose", "temperature"] as const).map((k) => {
              const v = vitalsMap.get(k);
              return (
                <div key={k} className="rounded-2xl bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground leading-tight">{RECORD_KIND_LABEL[k]}</p>
                  <p className="mt-1.5 text-[18px] font-bold leading-none">
                    {v?.value ?? <span className="text-muted-foreground">—</span>}
                  </p>
                  <p className="text-[10px] mt-1.5 text-muted-foreground">
                    {v ? new Date(v.recorded_at).toLocaleDateString("vi-VN") : "Chưa ghi nhận"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-4 mt-6">
        <h3 className="text-[15px] font-bold mb-3 tracking-tight">Thao tác nhanh</h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={FolderHeart} label="Theo dõi" tint="bg-tint-blue" color="text-brand" to="/suc-khoe/theo-doi" />
          <QuickAction icon={Stethoscope} label="Lịch khám" tint="bg-tint-green" color="text-success" to="/suc-khoe/quan-ly" />
          <QuickAction icon={Pill} label="Nhắc thuốc" tint="bg-tint-purple" color="text-[oklch(0.65_0.2_295)]" to="/suc-khoe/quan-ly" />
          <QuickAction icon={MessageCircle} label="Hồ sơ" tint="bg-tint-orange" color="text-warning" to="/suc-khoe/quan-ly" />
        </div>
      </section>

      {/* Upcoming appts + Meds */}
      <section className="px-4 mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold">Lịch khám sắp tới</h3>
            <Link to="/suc-khoe/quan-ly" className="text-[10px] font-semibold text-brand">Xem tất cả</Link>
          </div>
          {upcomingAppts.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Không có lịch khám sắp tới.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingAppts.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5">
                  <span className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">{avatarFor(a.member_name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold leading-tight truncate">{a.doctor ?? "Khám tổng quát"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.member_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatApptShort(a.scheduled_at)}</p>
                    {a.location && <p className="text-[10px] text-muted-foreground truncate">{a.location}</p>}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold">Nhắc uống thuốc</h3>
            <Link to="/suc-khoe/quan-ly" className="text-[10px] font-semibold text-brand">Xem tất cả</Link>
          </div>
          {todayMeds.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Chưa có nhắc thuốc.</p>
          ) : (
            <ul className="space-y-3">
              {todayMeds.map((m) => {
                const taken = takenIds.has(m.id);
                return (
                  <li key={m.id} className="flex items-start gap-2.5">
                    <span className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">{avatarFor(m.member_name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold leading-tight truncate">{m.medicine}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.member_name}{m.dosage ? ` • ${m.dosage}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">{(m.time_of_day ?? "").slice(0, 5)}{taken ? " • đã uống" : ` • còn ${medCountdown(m.time_of_day)}`}</p>
                    </div>
                    <button
                      onClick={() => !taken && takenMut.mutate(m.id)}
                      disabled={taken || takenMut.isPending}
                      className={cn(
                        "h-7 w-7 grid place-items-center rounded-full shrink-0",
                        taken ? "bg-success/20 text-success" : "bg-brand/10 text-brand hover:bg-brand/20",
                      )}
                      aria-label={taken ? "Đã uống" : "Đánh dấu đã uống"}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* AI Insight (derived from real data) */}
      <section className="px-4 mt-6">
        <div className="rounded-3xl bg-tint-purple/40 border border-[oklch(0.65_0.2_295/0.3)] p-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[oklch(0.65_0.2_295)]/30 grid place-items-center shrink-0">
              <Brain className="h-6 w-6 text-[oklch(0.65_0.2_295)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[oklch(0.65_0.2_295)]">Tổng hợp sức khỏe</p>
              <ul className="mt-2 space-y-1.5">
                {insights.map((i, k) => (
                  <li key={k} className="text-[11px] leading-snug">
                    <span className="mr-1.5">{i.emoji}</span>{i.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Hồ sơ sức khỏe */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold tracking-tight">Hồ sơ sức khỏe</h3>
          <Link to="/suc-khoe/quan-ly" className="text-[12px] font-semibold text-brand">Xem tất cả</Link>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <RecordTile icon={TestTube} label="Chỉ số" detail={`${recordCounts.tests} bản ghi`} />
          <RecordTile icon={ClipboardList} label="Đơn thuốc" detail={`${recordCounts.meds} đang dùng`} />
          <RecordTile icon={Syringe} label="Lịch khám" detail={`${recordCounts.appts} mục`} />
          <RecordTile icon={AlertTriangle} label="Dị ứng" detail={`${recordCounts.allergies} ghi nhận`} />
          <RecordTile icon={FileHeart} label="Bệnh nền" detail={`${recordCounts.conditions} ghi nhận`} />
        </div>
      </section>

      {/* Recent activity */}
      <section className="px-4 mt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold tracking-tight">Hoạt động gần đây</h3>
          <Link to="/suc-khoe/theo-doi" className="text-[12px] font-semibold text-brand">Xem tất cả</Link>
        </div>
        {activity.length === 0 ? (
          <p className="text-[12px] text-muted-foreground px-3">Chưa có hoạt động nào.</p>
        ) : (
          <ul className="space-y-2.5">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-card border border-border px-3 py-2.5">
                <div className={cn("h-8 w-8 rounded-xl grid place-items-center shrink-0", a.tint)}>
                  <a.icon className={cn("h-4 w-4", a.color)} />
                </div>
                <p className="flex-1 text-[12px]">{a.text}</p>
                <p className="text-[11px] text-muted-foreground shrink-0">{a.time}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MobileShell>
  );
}

function MemberTab({ name, emoji, active, onClick }: { name: string; emoji: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0">
      <div className={cn(
        "h-[60px] w-[60px] rounded-2xl overflow-hidden grid place-items-center text-3xl bg-muted",
        active && "ring-2 ring-brand ring-offset-2 ring-offset-background",
      )}>
        {emoji}
      </div>
      <span className="text-[11px] font-medium leading-tight max-w-[64px] truncate">{name}</span>
    </button>
  );
}

function QuickAction({ icon: Icon, label, tint, color, to }: { icon: any; label: string; tint: string; color: string; to: string }) {
  return (
    <Link to={to as never} className="block">
      <div className="flex flex-col items-center gap-2">
        <div className={cn("h-[58px] w-full rounded-2xl border border-border grid place-items-center", tint)}>
          <Icon className={cn("h-[22px] w-[22px]", color)} strokeWidth={2.2} />
        </div>
        <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
      </div>
    </Link>
  );
}

function RecordTile({ icon: Icon, label, detail }: { icon: any; label: string; detail: string }) {
  return (
    <Link to="/suc-khoe/quan-ly" className="block rounded-2xl bg-card border border-border p-2.5 text-center">
      <div className="h-10 grid place-items-center">
        <Icon className="h-6 w-6 text-[oklch(0.65_0.2_295)]" strokeWidth={2.2} />
      </div>
      <p className="text-[10px] font-semibold leading-tight mt-1">{label}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{detail}</p>
    </Link>
  );
}

function formatApptShort(iso: string) {
  const d = new Date(iso);
  const hhmm = d.toTimeString().slice(0, 5);
  const dow = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
  return `${hhmm} • ${dow}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function medCountdown(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 86400000;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}p`;
  return `${Math.floor(mins / 60)}h`;
}
