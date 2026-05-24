import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Shield,
  Heart,
  Moon,
  Footprints,
  Flame,
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
  Calendar,
} from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listHealth } from "@/api/health";
import { cn } from "@shared/utils";

export const Route = createFileRoute("/suc-khoe")({
  head: () => ({ meta: [{ title: "Sức khỏe gia đình — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: HealthOverview,
});

const FAMILY_MEMBERS = [
  { id: "all", name: "Cả nhà", img: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=200&h=200&fit=crop&crop=faces", dot: null as string | null },
  { id: "dad", name: "Anh Hùng", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces", dot: "bg-brand" },
  { id: "mom", name: "Chị Lan", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces", dot: "bg-[oklch(0.65_0.2_295)]" },
  { id: "minh", name: "Bé Minh", img: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=200&h=200&fit=crop&crop=faces", dot: "bg-success" },
  { id: "an", name: "Bé An", img: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=200&h=200&fit=crop&crop=faces", dot: "bg-emergency" },
];

const VITALS = [
  { icon: Heart, color: "text-emergency", tint: "bg-tint-pink", label: "Nhịp tim trung bình", value: "72", unit: "bpm", status: "Bình thường", dot: "bg-success" },
  { icon: Moon, color: "text-[oklch(0.65_0.2_295)]", tint: "bg-tint-purple", label: "Giấc ngủ trung bình", value: "7h 32m", unit: "", status: "Tốt", dot: "bg-success" },
  { icon: Footprints, color: "text-brand", tint: "bg-tint-blue", label: "Số bước trung bình", value: "8.245", unit: "", status: "Tốt", dot: "bg-success" },
  { icon: Flame, color: "text-warning", tint: "bg-tint-orange", label: "Năng lượng", value: "85", unit: "/100", status: "Tốt", dot: "bg-success" },
];

const QUICK_ACTIONS = [
  { icon: Stethoscope, label: "Đặt lịch khám", tint: "bg-tint-blue", color: "text-brand", to: "/suc-khoe/quan-ly" },
  { icon: MessageCircle, label: "Tư vấn bác sĩ", tint: "bg-tint-green", color: "text-success" },
  { icon: Pill, label: "Nhắc uống thuốc", tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", to: "/suc-khoe/quan-ly" },
  { icon: FolderHeart, label: "Hồ sơ sức khỏe", tint: "bg-tint-orange", color: "text-warning", to: "/suc-khoe/quan-ly" },
  { icon: ShieldCheck, label: "Bảo hiểm sức khỏe", tint: "bg-tint-blue", color: "text-brand" },
];

const RECORDS = [
  { icon: TestTube, label: "Kết quả xét nghiệm", detail: "12 kết quả" },
  { icon: ClipboardList, label: "Đơn thuốc", detail: "8 đơn thuốc" },
  { icon: Syringe, label: "Tiêm chủng", detail: "Đầy đủ" },
  { icon: AlertTriangle, label: "Dị ứng", detail: "2 dị ứng đã ghi nhận" },
  { icon: FileHeart, label: "Bệnh sử", detail: "Không có bệnh nền" },
];

const INSIGHTS = [
  { emoji: "❤️", text: "Anh Hùng nên duy trì thói quen đi bộ, nhịp tim rất tốt." },
  { emoji: "🌙", text: "Chị Lan ngủ chưa đủ giấc. Nên ngủ sớm hơn 30 phút." },
  { emoji: "✅", text: "Cả nhà đã tiêm phòng đầy đủ. Tiếp theo: Cúm mùa (10/2024)" },
];

const ACTIVITY = [
  { icon: ShieldCheck, tint: "bg-tint-green", color: "text-success", text: "Bé Minh đã hoàn thành mục tiêu 8.000 bước", time: "08:35" },
  { icon: Calendar, tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", text: "Bạn có lịch khám \"Khám tổng quát định kỳ\" vào 24/05", time: "Hôm qua" },
];

const MEMBER_AVATAR: Record<string, string> = {
  "Bé Minh": "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=80&h=80&fit=crop&crop=faces",
  "Bé An": "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=80&h=80&fit=crop&crop=faces",
  "Anh Hùng": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces",
  "Chị Lan": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces",
};

function HealthOverview() {
  const { familyId } = useFamilyContext();
    const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const [activeMember, setActiveMember] = useState("all");

  const upcomingAppts = useMemo(() => {
    const list = q.data?.appts ?? [];
    const now = Date.now();
    return list
      .filter((a) => new Date(a.scheduled_at).getTime() >= now && a.status !== "cancelled")
      .slice(0, 2);
  }, [q.data]);

  const meds = (q.data?.meds ?? []).filter((m) => m.active).slice(0, 3);

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
          <button className="relative h-10 w-10 grid place-items-center rounded-2xl hover:bg-muted/40">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-emergency text-white text-[9px] font-bold grid place-items-center">3</span>
          </button>
        </header>

        {/* Member tabs */}
        <section className="px-4">
          <div className="flex gap-3.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {FAMILY_MEMBERS.map((m) => {
              const active = activeMember === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMember(m.id)}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className={cn(
                    "relative h-[60px] w-[60px] rounded-2xl overflow-hidden",
                    active && "ring-2 ring-brand ring-offset-2 ring-offset-background"
                  )}>
                    <img src={m.img} alt={m.name} className="h-full w-full object-cover" />
                    {m.dot && <span className={cn("absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background", m.dot)} />}
                  </div>
                  <span className="text-[11px] font-medium leading-tight">{m.name}</span>
                </button>
              );
            })}
            <button className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="h-[60px] w-[60px] rounded-2xl bg-muted/40 border border-border grid place-items-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">Thêm người</span>
            </button>
          </div>
        </section>

        {/* Overall status */}
        <section className="px-4 mt-4">
          <div className="rounded-3xl bg-card border border-border p-5 relative overflow-hidden">
            <p className="text-[14px] font-bold">Tình trạng sức khỏe tổng quan</p>
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck className="h-6 w-6 text-success" />
              <p className="text-[28px] font-bold text-success leading-none">Tốt</p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Cập nhật 09:30, 20/05/2024</p>
            <div className="absolute top-4 right-4 h-[90px] w-[110px] grid place-items-center opacity-90">
              <div className="absolute inset-0 rounded-full bg-success/10 blur-xl" />
              <svg viewBox="0 0 110 70" className="relative h-full w-full text-success">
                <path d="M0 35 L20 35 L25 20 L32 50 L40 10 L48 55 L55 30 L110 30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-success">
                <svg viewBox="0 0 64 40" className="h-12 w-16" fill="currentColor">
                  <circle cx="12" cy="10" r="5" /><rect x="7" y="16" width="10" height="20" rx="3" />
                  <circle cx="32" cy="9" r="5" /><rect x="26" y="15" width="12" height="22" rx="3" />
                  <circle cx="52" cy="10" r="5" /><rect x="47" y="16" width="10" height="20" rx="3" />
                </svg>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {VITALS.map((v) => (
                <div key={v.label} className="rounded-2xl bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-7 w-7 rounded-xl grid place-items-center shrink-0", v.tint)}>
                      <v.icon className={cn("h-3.5 w-3.5", v.color)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{v.label}</p>
                  </div>
                  <p className="mt-1.5 text-[18px] font-bold leading-none">
                    {v.value}{v.unit && <span className="text-[12px] font-medium text-muted-foreground ml-1">{v.unit}</span>}
                  </p>
                  <p className="text-[10px] mt-1.5 flex items-center gap-1 text-success">
                    <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} /> {v.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="px-4 mt-6">
          <h3 className="text-[15px] font-bold mb-3 tracking-tight">Thao tác nhanh</h3>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_ACTIONS.map((a) => {
              const inner = (
                <div className="flex flex-col items-center gap-2">
                  <div className={cn("h-[58px] w-full rounded-2xl border border-border grid place-items-center", a.tint)}>
                    <a.icon className={cn("h-[22px] w-[22px]", a.color)} strokeWidth={2.2} />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">{a.label}</span>
                </div>
              );
              return a.to ? (
                <Link key={a.label} to={a.to as never} className="block">{inner}</Link>
              ) : (
                <button key={a.label} className="block">{inner}</button>
              );
            })}
          </div>
        </section>

        {/* Upcoming appts + Meds */}
        <section className="px-4 mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold">Lịch khám sắp tới</h3>
              <Link to="/suc-khoe/quan-ly" className="text-[10px] font-semibold text-brand">Xem tất cả</Link>
            </div>
            <ul className="space-y-3">
              {(upcomingAppts.length > 0 ? upcomingAppts : SAMPLE_APPTS).map((a, i) => (
                <li key={a.id ?? i} className="flex items-start gap-2.5">
                  <img src={MEMBER_AVATAR[a.member_name] ?? FAMILY_MEMBERS[0].img} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold leading-tight truncate">{(a as any).title ?? "Khám tổng quát định kỳ"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">👤 {a.member_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatApptShort(a.scheduled_at)}</p>
                    {a.location && <p className="text-[10px] text-muted-foreground truncate">{a.location}</p>}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold">Nhắc uống thuốc</h3>
              <Link to="/suc-khoe/quan-ly" className="text-[10px] font-semibold text-brand">Xem tất cả</Link>
            </div>
            <ul className="space-y-3">
              {(meds.length > 0 ? meds : SAMPLE_MEDS).map((m, i) => (
                <li key={m.id ?? i} className="flex items-start gap-2.5">
                  <img src={MEMBER_AVATAR[m.member_name] ?? FAMILY_MEMBERS[0].img} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold leading-tight truncate">{m.member_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.medicine}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.dosage}{m.notes ? ` • ${m.notes}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-success leading-none">{(m.time_of_day ?? "08:00").slice(0,5)}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Còn {medCountdown(m.time_of_day)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* AI Insight */}
        <section className="px-4 mt-6">
          <div className="rounded-3xl bg-tint-purple/40 border border-[oklch(0.65_0.2_295/0.3)] p-4 relative">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[oklch(0.65_0.2_295)]/30 grid place-items-center shrink-0">
                <Brain className="h-6 w-6 text-[oklch(0.65_0.2_295)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-[oklch(0.65_0.2_295)]">AI Health Insight</p>
                  <button className="text-[10px] font-semibold text-[oklch(0.65_0.2_295)] border border-[oklch(0.65_0.2_295/0.4)] rounded-full px-2.5 py-1 flex items-center gap-1">
                    Xem chi tiết <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {INSIGHTS.map((i, k) => (
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
            {RECORDS.map((r) => (
              <Link key={r.label} to="/suc-khoe/quan-ly" className="block rounded-2xl bg-card border border-border p-2.5 text-center">
                <div className="h-10 grid place-items-center">
                  <r.icon className="h-6 w-6 text-[oklch(0.65_0.2_295)]" strokeWidth={2.2} />
                </div>
                <p className="text-[10px] font-semibold leading-tight mt-1">{r.label}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{r.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section className="px-4 mt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold tracking-tight">Hoạt động gần đây</h3>
            <button className="text-[12px] font-semibold text-brand">Xem tất cả</button>
          </div>
          <ul className="space-y-2.5">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-card border border-border px-3 py-2.5">
                <div className={cn("h-8 w-8 rounded-xl grid place-items-center shrink-0", a.tint)}>
                  <a.icon className={cn("h-4 w-4", a.color)} />
                </div>
                <p className="flex-1 text-[12px]">{a.text}</p>
                <p className="text-[11px] text-muted-foreground shrink-0">{a.time}</p>
              </li>
            ))}
          </ul>
        </section>
      </MobileShell>
  );
}

const SAMPLE_APPTS = [
  { id: "s1", member_name: "Anh Hùng", scheduled_at: new Date(Date.now() + 4 * 86400000).toISOString(), location: "Bệnh viện Vinmec", title: "Khám tổng quát định kỳ" } as any,
  { id: "s2", member_name: "Chị Lan", scheduled_at: new Date(Date.now() + 5 * 86400000).toISOString(), location: "Nha khoa Parkway", title: "Khám răng định kỳ" } as any,
];

const SAMPLE_MEDS = [
  { id: "m1", member_name: "Bé Minh", medicine: "Vitamin D3", dosage: "1 viên", notes: "Sau ăn sáng", time_of_day: "08:00", active: true } as any,
  { id: "m2", member_name: "Bé An", medicine: "Siro ho", dosage: "5ml", notes: "Sau ăn tối", time_of_day: "20:00", active: true } as any,
  { id: "m3", member_name: "Anh Hùng", medicine: "Omega 3", dosage: "1 viên", notes: "Sau ăn tối", time_of_day: "20:00", active: true } as any,
];

function formatApptShort(iso: string) {
  const d = new Date(iso);
  const hhmm = d.toTimeString().slice(0, 5);
  const dow = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][d.getDay()];
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
  if (mins < 60) return `${mins} phút`;
  return `${Math.floor(mins / 60)} giờ`;
}
