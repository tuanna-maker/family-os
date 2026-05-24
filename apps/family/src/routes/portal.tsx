import { createFileRoute, Link, useRouterState, redirect } from "@tanstack/react-router";
import { supabase } from "@shared/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@shared/ui/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/ui/ui/tabs";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Button } from "@shared/ui/ui/button";
import { RadioGroup, RadioGroupItem } from "@shared/ui/ui/radio-group";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  Baby,
  HeartPulse,
  Refrigerator,
  Sparkles,
  UsersRound,
  Settings,
  Bell,
  Mail,
  Search,
  Plus,
  ChevronDown,
  CalendarPlus,
  Receipt,
  Camera,
  Pill,
  NotebookPen,
  TrendingUp,
  Cloud,
  MapPin,
  Heart,
  GraduationCap,
  Music,
  Utensils,
  Stethoscope,
  ClipboardList,
  Syringe,
  FileText,
  Brain,
  Umbrella,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@shared/utils";
import { getMyContext } from "@/api/auth";
import { getDashboard } from "@/api/dashboard";
import { suggestMeals } from "@/api/food";
import { listFamilyEvents, type FamilyEventRow } from "@/api/family-events";
import { listNotifications, type NotificationRow } from "@/api/notifications";

export const Route = createFileRoute("/portal")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Cổng gia đình — STOS Life" }] }),
  component: PortalPage,
});

const AVATAR_USER =
  "https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=120&h=120&fit=crop&crop=faces";

const MEMBERS = [
  { name: "Anh Hùng", role: "Bố", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces" },
  { name: "Chị Lan", role: "Mẹ", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces" },
  { name: "Bé Minh", role: "Con trai", img: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=200&h=200&fit=crop&crop=faces" },
  { name: "Bé An", role: "Con gái", img: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=200&h=200&fit=crop&crop=faces" },
  { name: "Ông Nội", role: "Ông", img: "https://images.unsplash.com/photo-1559963110-71b394e7494d?w=200&h=200&fit=crop&crop=faces" },
];

const NAV = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/portal" },
  { label: "Gia đình", icon: Users, to: "/admin/family" },
  { label: "Lịch gia đình", icon: Calendar, to: "/lich-gia-dinh" },
  { label: "Chi tiêu gia đình", icon: Wallet, to: "/chi-tieu" },
  { label: "Đồng hành cùng con", icon: Baby, to: "/con-cai" },
  { label: "Sức khỏe gia đình", icon: HeartPulse, to: "/suc-khoe" },
  { label: "Thực phẩm & Tủ lạnh", icon: Refrigerator, to: "/thuc-pham" },
  { label: "Dịch vụ & Tiện ích", icon: Sparkles, to: "/du-lich" },
  { label: "Cộng đồng", icon: UsersRound, to: "/cong-dong" },
  { label: "Cài đặt", icon: Settings, to: "/cai-dat/thong-bao" },
] as const;

const SCHEDULE = [
  { time: "06:30", title: "Bé Minh đi học", sub: "Trường Tiểu học Lê Quý Đôn", tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", icon: GraduationCap },
  { time: "17:30", title: "Bé An học Piano", sub: "Phòng 203 - STOS Club", tint: "bg-tint-green", color: "text-success", icon: Music },
  { time: "19:00", title: "Cả nhà ăn tối", sub: "Phòng 1502", tint: "bg-tint-orange", color: "text-warning", icon: Utensils },
  { time: "20:00", title: "Mẹ uống thuốc Vitamin D3", sub: "Sau ăn tối", tint: "bg-tint-pink", color: "text-emergency", icon: Pill },
];

const EXPENSE_CATS = [
  { label: "Ăn uống", value: 5_535_000, pct: 30, color: "oklch(0.7 0.18 264)" },
  { label: "Nhà cửa", value: 4_612_000, pct: 25, color: "oklch(0.72 0.17 152)" },
  { label: "Con cái", value: 2_760_000, pct: 15, color: "oklch(0.73 0.17 50)" },
  { label: "Đi lại", value: 1_845_000, pct: 10, color: "oklch(0.68 0.24 25)" },
  { label: "Giải trí", value: 1_476_000, pct: 8, color: "oklch(0.65 0.2 295)" },
  { label: "Khác", value: 2_214_000, pct: 12, color: "oklch(0.7 0.05 250)" },
];

const HEALTH = [
  { who: "Mẹ", what: "Nhắc uống thuốc", when: "20:00 hôm nay", icon: Pill, tint: "bg-tint-pink", color: "text-emergency" },
  { who: "Ông Nội", what: "Khám định kỳ", when: "Thứ 6, 24/05", icon: Stethoscope, tint: "bg-tint-green", color: "text-success" },
  { who: "Bé Minh", what: "Tiêm vắc xin", when: "Tháng 6/2024", icon: Syringe, tint: "bg-tint-blue", color: "text-brand" },
];

const HEALTH_QUICK = [
  { label: "Hồ sơ sức khỏe", icon: FileText, tint: "bg-tint-green", color: "text-success" },
  { label: "Lịch khám", icon: Calendar, tint: "bg-tint-blue", color: "text-brand" },
  { label: "Đơn thuốc", icon: ClipboardList, tint: "bg-tint-orange", color: "text-warning" },
  { label: "Tiêm chủng", icon: Syringe, tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]" },
];

const CHILD_QUICK = [
  { label: "Lịch học", icon: Calendar, tint: "bg-tint-blue", color: "text-brand" },
  { label: "Bài tập", icon: NotebookPen, tint: "bg-tint-orange", color: "text-warning" },
  { label: "Thành tích", icon: Sparkles, tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]" },
  { label: "Hoạt động", icon: Users, tint: "bg-tint-pink", color: "text-emergency" },
  { label: "Chiều cao", icon: TrendingUp, tint: "bg-tint-green", color: "text-success" },
];

const ATTENTION = [
  { title: "Mẹ cần uống thuốc", sub: "20:00 hôm nay", tag: "Sắp đến", tagTint: "bg-tint-pink text-emergency", icon: Pill, iconTint: "bg-tint-pink", iconColor: "text-emergency" },
  { title: "Bé Minh kiểm tra bài tập", sub: "18:00 hôm nay", tag: "Sắp đến", tagTint: "bg-tint-blue text-brand", icon: Calendar, iconTint: "bg-tint-blue", iconColor: "text-brand" },
  { title: "Hóa đơn điện đến hạn", sub: "Ngày mai", tag: "Đến hạn", tagTint: "bg-tint-orange text-warning", icon: Receipt, iconTint: "bg-tint-orange", iconColor: "text-warning" },
  { title: "Ông Nội tiêm định kỳ", sub: "Thứ 5, 23/05", tag: "Đến hạn", tagTint: "bg-tint-purple text-[oklch(0.65_0.2_295)]", icon: Syringe, iconTint: "bg-tint-purple", iconColor: "text-[oklch(0.65_0.2_295)]" },
];

const MEAL_FALLBACK_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop";

function formatExpiry(days: number | null) {
  if (days === null) return "Chưa rõ HSD";
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hết hạn hôm nay";
  if (days === 1) return "Còn 1 ngày";
  return `Còn ${days} ngày`;
}

const EVENT_STYLE: Record<string, { tint: string; color: string; icon: typeof Calendar }> = {
  school: { tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", icon: GraduationCap },
  medical: { tint: "bg-tint-green", color: "text-success", icon: Stethoscope },
  medication: { tint: "bg-tint-pink", color: "text-emergency", icon: Pill },
  travel: { tint: "bg-tint-blue", color: "text-brand", icon: MapPin },
  payment: { tint: "bg-tint-orange", color: "text-warning", icon: Receipt },
  family: { tint: "bg-tint-orange", color: "text-warning", icon: Utensils },
};

function mapEvent(e: FamilyEventRow) {
  const style = EVENT_STYLE[e.category] ?? EVENT_STYLE.family;
  const d = new Date(e.starts_at);
  const time = e.all_day
    ? "Cả ngày"
    : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const sub = [e.member_name, e.location, e.notes].filter(Boolean).join(" · ") || "Không có ghi chú";
  return { time, sub, tint: style.tint, color: style.color, icon: style.icon };
}

const NOTIF_STYLE: Record<string, { tint: string; color: string; icon: typeof Calendar; tag: string; tagTint: string }> = {
  medicine: { tint: "bg-tint-pink", color: "text-emergency", icon: Pill, tag: "Sắp đến", tagTint: "bg-tint-pink text-emergency" },
  parent_reminder: { tint: "bg-tint-blue", color: "text-brand", icon: Calendar, tag: "Nhắc việc", tagTint: "bg-tint-blue text-brand" },
  payment: { tint: "bg-tint-orange", color: "text-warning", icon: Receipt, tag: "Đến hạn", tagTint: "bg-tint-orange text-warning" },
};

function mapNotif(n: NotificationRow) {
  const style = NOTIF_STYLE[n.type] ?? {
    tint: "bg-tint-blue", color: "text-brand", icon: Bell, tag: "Thông báo", tagTint: "bg-tint-blue text-brand",
  };
  const due = n.due_at ? new Date(n.due_at) : new Date(n.created_at);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  let when: string;
  if (dueDay.getTime() === today.getTime())
    when = `${due.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} hôm nay`;
  else if (dueDay.getTime() === tomorrow.getTime())
    when = `Ngày mai · ${due.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  else
    when = due.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return { sub: n.body ? `${when} · ${n.body}` : when, iconTint: style.tint, iconColor: style.color, icon: style.icon, tag: style.tag, tagTint: style.tagTint };
}

const INSIGHTS = [
  { icon: Calendar, tint: "bg-tint-blue", color: "text-brand", text: "Bé Minh có lịch học dày vào thứ 3 và thứ 5, nên ngủ sớm trước 22:00." },
  { icon: Wallet, tint: "bg-tint-orange", color: "text-warning", text: "Gia đình bạn chi tiêu cho ăn uống nhiều hơn 12% so với trung bình. Bạn muốn xem gợi ý tiết kiệm?" },
  { icon: Refrigerator, tint: "bg-tint-green", color: "text-success", text: "Có 2 thực phẩm trong tủ lạnh sắp hết hạn: Sữa tươi, Cà hồi. Nên sử dụng trong 2 ngày." },
  { icon: Umbrella, tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", text: "Thời tiết mai có mưa, đừng quên mang theo ô khi đưa bé đi học." },
];

function PortalPage() {
      const { data: ctx } = useQuery({ queryKey: ["my-ctx"], queryFn: () => getMyContext() });
  const familyId = ctx?.family?.id ?? null;
  const { data: d } = useQuery({
    queryKey: ["dashboard", familyId],
    queryFn: () => getDashboard({ family_id: familyId! }),
    enabled: !!familyId,
    refetchInterval: 60_000,
  });

    const { data: foodData } = useQuery({
    queryKey: ["meals", familyId],
    queryFn: () => suggestMeals({ family_id: familyId! }),
    enabled: !!familyId,
    refetchInterval: 5 * 60_000,
  });
  const expiringItems = foodData?.expiring ?? [];
  const suggestedMeals = foodData?.suggestions ?? [];
  const expiringCount = (d?.food?.expiring_soon ?? 0) + (d?.food?.expired ?? 0);

  // Today's family events
    const todayRange = (() => {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(); e.setHours(23, 59, 59, 999);
    return { from: s.toISOString(), to: e.toISOString() };
  })();
  const { data: todayEvents } = useQuery({
    queryKey: ["family-events-today", familyId, todayRange.from],
    queryFn: () => listFamilyEvents({ family_id: familyId!, from: todayRange.from, to: todayRange.to }),
    enabled: !!familyId,
    refetchInterval: 2 * 60_000,
  });

  // Unread notifications for "Việc cần chú ý"
    const { data: notifData } = useQuery({
    queryKey: ["notifications-attention"],
    queryFn: () => listNotifications({ only_unread: true, limit: 6 }),
    refetchInterval: 60_000,
  });
  const attentionItems = notifData?.rows ?? [];

  const expCur = d?.expenses_month?.total ?? 18_450_000;
  const expPrev = d?.expenses_prev_month?.total ?? 0;
  const expDelta = expPrev > 0 ? Math.round(((expCur - expPrev) / expPrev) * 1000) / 10 : 8.2;
  const memberCount = d?.member_count ?? MEMBERS.length;
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  return (
    <div className="bg-background text-foreground min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar memberCount={memberCount} />
        <div className="flex-1 px-6 py-5 space-y-5 overflow-x-hidden">
          {/* Row 1: Members + Quick actions */}
          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-7">
              <CardHeader title="Thành viên gia đình" action={<Link to="/admin/family" className="text-[13px] font-semibold text-brand">Xem tất cả</Link>} />
              <div className="grid grid-cols-6 gap-4">
                {MEMBERS.map((m) => (
                  <div key={m.name} className="flex flex-col items-center text-center">
                    <img src={m.img} alt={m.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-card shadow" />
                    <p className="mt-2 text-[13px] font-semibold truncate w-full">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.role}</p>
                  </div>
                ))}
                <button type="button" onClick={() => setAddMemberOpen(true)} className="flex flex-col items-center gap-2 group">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-border grid place-items-center text-muted-foreground group-hover:border-brand group-hover:text-brand transition">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Thêm</span>
                </button>
              </div>
            </Card>
            <Card className="col-span-5">
              <CardHeader title="Thao tác nhanh" />
              <div className="grid grid-cols-5 gap-3">
                <QuickAction icon={CalendarPlus} label="Thêm lịch" tint="bg-tint-blue" color="text-brand" to="/lich-gia-dinh" />
                <QuickAction icon={Wallet} label="Ghi chi tiêu" tint="bg-tint-green" color="text-success" to="/chi-tieu" />
                <QuickAction icon={Camera} label="Chụp hóa đơn" tint="bg-tint-blue" color="text-brand" to="/chi-tieu/scan" />
                <QuickAction icon={Pill} label="Nhắc uống thuốc" tint="bg-tint-pink" color="text-emergency" to="/suc-khoe" />
                <QuickAction icon={NotebookPen} label="Tạo ghi chú" tint="bg-tint-orange" color="text-warning" />
              </div>
            </Card>
          </div>

          {/* Row 2: Schedule + Expense + Attention */}
          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-4">
              <CardHeader title="Lịch gia đình hôm nay" action={<Link to="/lich-gia-dinh" className="text-[13px] font-semibold text-brand">Xem lịch đầy đủ</Link>} />
              <div className="space-y-3">
                {(todayEvents ?? []).length === 0 && (
                  <p className="text-[12px] text-muted-foreground px-1 py-6 text-center">Hôm nay chưa có lịch nào.</p>
                )}
                {(todayEvents ?? []).slice(0, 5).map((s) => {
                  const m = mapEvent(s);
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3">
                      <div className={cn("h-7 px-2.5 rounded-full grid place-items-center text-[12px] font-semibold shrink-0", m.tint, m.color)}>{m.time}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.sub}</p>
                      </div>
                      <div className={cn("h-9 w-9 rounded-2xl grid place-items-center shrink-0", m.tint)}>
                        <m.icon className={cn("h-4 w-4", m.color)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="col-span-4">
              <CardHeader title={`Chi tiêu tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} action={<Link to="/chi-tieu" className="text-[13px] font-semibold text-brand">Xem chi tiết</Link>} />
              <div>
                <p className="text-[26px] font-bold tracking-tight leading-none">{expCur.toLocaleString("vi-VN")}đ</p>
                <p className="mt-1.5 text-[12px] text-success font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 rotate-180" />
                  {Math.abs(expDelta)}% so với tháng {new Date().getMonth() || 12}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <DonutChart cats={EXPENSE_CATS} />
                  <ul className="flex-1 space-y-1.5">
                    {EXPENSE_CATS.map((c) => (
                      <li key={c.label} className="flex items-center gap-2 text-[12px]">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                        <span className="flex-1 text-muted-foreground">{c.label}</span>
                        <span className="font-semibold tabular-nums">{c.value.toLocaleString("vi-VN")}đ</span>
                        <span className="w-7 text-right text-muted-foreground tabular-nums">{c.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 rounded-xl bg-tint-green/40 px-3 py-2 text-[12px] text-success font-medium">
                  Bạn đã chi tiêu ít hơn 1.650.000đ so với ngân sách
                </div>
              </div>
            </Card>
            <Card className="col-span-4">
              <CardHeader title="Việc cần chú ý hôm nay" action={<Link to="/thong-bao" className="text-[13px] font-semibold text-brand">Xem tất cả</Link>} />
              <ul className="space-y-3">
                {attentionItems.length === 0 && (
                  <li className="text-[12px] text-muted-foreground px-1 py-6 text-center">Không có việc cần chú ý.</li>
                )}
                {attentionItems.slice(0, 4).map((n) => {
                  const m = mapNotif(n);
                  return (
                    <li key={n.id} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3">
                      <div className={cn("h-9 w-9 rounded-2xl grid place-items-center shrink-0", m.iconTint)}>
                        <m.icon className={cn("h-4 w-4", m.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.sub}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full shrink-0", m.tagTint)}>{m.tag}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* Row 3: Children + Health + Food */}
          <div className="grid grid-cols-12 gap-5">
            <Card className="col-span-4">
              <CardHeader title="Đồng hành cùng con" action={<Link to="/con-cai" className="text-[13px] font-semibold text-brand">Xem chi tiết</Link>} />
              <ul className="space-y-3">
                <ChildRow img="https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=120&h=120&fit=crop&crop=faces" name="Bé Minh" age="10 tuổi" status="Hôm nay có 3 lịch" extra="1 bài tập chưa hoàn thành" extraTone="warn" />
                <ChildRow img="https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=120&h=120&fit=crop&crop=faces" name="Bé An" age="7 tuổi" status="Hôm nay có 2 lịch" extra="Đã hoàn thành bài tập" extraTone="ok" />
              </ul>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {CHILD_QUICK.map((q) => (
                  <QuickAction key={q.label} icon={q.icon} label={q.label} tint={q.tint} color={q.color} small />
                ))}
              </div>
            </Card>
            <Card className="col-span-4">
              <CardHeader title="Sức khỏe gia đình" action={<Link to="/suc-khoe" className="text-[13px] font-semibold text-brand">Xem chi tiết</Link>} />
              <ul className="space-y-3">
                {HEALTH.map((h) => (
                  <li key={h.who} className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-2xl grid place-items-center shrink-0", h.tint)}>
                      <h.icon className={cn("h-4 w-4", h.color)} />
                    </div>
                    <p className="text-[13px] font-semibold w-16 shrink-0">{h.who}</p>
                    <p className="flex-1 text-[12px] text-muted-foreground">{h.what}</p>
                    <p className="text-[12px] font-medium tabular-nums">{h.when}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {HEALTH_QUICK.map((q) => (
                  <QuickAction key={q.label} icon={q.icon} label={q.label} tint={q.tint} color={q.color} small />
                ))}
              </div>
            </Card>
            <Card className="col-span-4">
              <CardHeader title="Thực phẩm & Tủ lạnh" action={<Link to="/thuc-pham" className="text-[13px] font-semibold text-brand">Xem chi tiết</Link>} />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Thực phẩm sắp hết hạn</p>
                  <p className="mt-1 text-[26px] font-bold leading-none">
                    {expiringCount} <span className="text-[12px] font-medium text-muted-foreground">mục</span>
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {expiringItems.length === 0 && (
                      <li className="text-[11px] text-muted-foreground">Tủ lạnh đang ổn 👍</li>
                    )}
                    {expiringItems.slice(0, 3).map((it) => (
                      <li key={it.name} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold truncate">{it.name}</span>
                        <span
                          className={cn(
                            "text-[10px] font-medium shrink-0",
                            (it.days ?? 99) <= 0 ? "text-emergency" : (it.days ?? 99) <= 2 ? "text-warning" : "text-muted-foreground",
                          )}
                        >
                          {formatExpiry(it.days)}
                        </span>
                      </li>
                    ))}
                    {expiringItems.length > 3 && (
                      <li className="text-[10px] text-muted-foreground">+{expiringItems.length - 3} mục khác</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-2xl bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Gợi ý món ăn hôm nay</p>
                  <ul className="mt-2 space-y-2">
                    {suggestedMeals.length === 0 && (
                      <li className="text-[11px] text-muted-foreground">Chưa có gợi ý.</li>
                    )}
                    {suggestedMeals.slice(0, 3).map((m) => (
                      <li key={m.title} className="flex items-center gap-2">
                        <img src={MEAL_FALLBACK_IMG} alt="" className="h-9 w-9 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold truncate">{m.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.reason} · {m.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Link
                to="/thuc-pham"
                className="mt-3 w-full h-10 rounded-xl bg-brand/15 text-brand text-[13px] font-semibold flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" /> Xem thực đơn & Mua sắm
              </Link>
            </Card>
          </div>

          {/* Insights */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-tint-purple grid place-items-center shrink-0">
                <Brain className="h-5 w-5 text-[oklch(0.65_0.2_295)]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[oklch(0.65_0.2_295)]">AI Family Insight</p>
                <p className="text-[11px] text-muted-foreground">Gợi ý hôm nay cho gia đình bạn</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {INSIGHTS.map((i, k) => (
                <div key={k} className="rounded-2xl bg-muted/30 p-3 flex items-start gap-2.5">
                  <div className={cn("h-8 w-8 rounded-xl grid place-items-center shrink-0", i.tint)}>
                    <i.icon className={cn("h-4 w-4", i.color)} />
                  </div>
                  <p className="text-[12px] leading-snug">{i.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
      <AddMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} />
    </div>
  );
}

function AddMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<"invite" | "manual">("invite");
  const [submitting, setSubmitting] = useState(false);

  // Invite form
  const [email, setEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [role, setRole] = useState("family_member");
  const [relation, setRelation] = useState("");
  const [message, setMessage] = useState("");

  // Manual form
  const [mName, setMName] = useState("");
  const [mRelation, setMRelation] = useState("");
  const [mBirthday, setMBirthday] = useState("");

  const reset = () => {
    setEmail(""); setInviteName(""); setRelation(""); setMessage("");
    setMName(""); setMRelation(""); setMBirthday("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Simulated submission — backend wiring can be added later.
      await new Promise((r) => setTimeout(r, 500));
      if (tab === "invite") {
        if (!email.trim()) { toast.error("Vui lòng nhập email"); return; }
        toast.success(`Đã gửi lời mời tới ${email}`);
      } else {
        if (!mName.trim()) { toast.error("Vui lòng nhập tên thành viên"); return; }
        toast.success(`Đã thêm ${mName} vào hộ gia đình`);
      }
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Thêm thành viên</DialogTitle>
          <DialogDescription>
            Mời người thân qua email hoặc thêm thành viên không sử dụng ứng dụng.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "invite" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Mời qua email</TabsTrigger>
            <TabsTrigger value="manual">Thêm trực tiếp</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="invite" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="vidu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iname">Tên hiển thị</Label>
                <Input id="iname" placeholder="Tên người được mời" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="relation">Quan hệ</Label>
                <Input id="relation" placeholder="Bố, Mẹ, Con, Ông, Bà..." value={relation} onChange={(e) => setRelation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <RadioGroup value={role} onValueChange={setRole} className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="family_member" id="r-member" />
                    <span className="text-sm">Thành viên</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="family_owner" id="r-owner" />
                    <span className="text-sm">Chủ hộ</span>
                  </label>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="msg">Lời nhắn (tuỳ chọn)</Label>
                <Input id="msg" placeholder="Tham gia gia đình mình nhé!" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="mname">Tên thành viên *</Label>
                <Input id="mname" placeholder="VD: Bé An" value={mName} onChange={(e) => setMName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mrel">Quan hệ</Label>
                <Input id="mrel" placeholder="Bố, Mẹ, Con, Ông, Bà..." value={mRelation} onChange={(e) => setMRelation(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mbday">Ngày sinh</Label>
                <Input id="mbday" type="date" value={mBirthday} onChange={(e) => setMBirthday(e.target.value)} />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Dùng cho thành viên không sử dụng ứng dụng (ví dụ trẻ nhỏ, người lớn tuổi).
              </p>
            </TabsContent>

            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Huỷ
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang xử lý..." : tab === "invite" ? "Gửi lời mời" : "Thêm thành viên"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-[260px] shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-5 py-4 flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-2xl bg-brand grid place-items-center shadow-[0_4px_12px_-4px_oklch(0.55_0.2_264/0.5)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
            <polygon points="12,2 14.5,8.5 21.5,9 16,13.5 18,20.5 12,16.5 6,20.5 8,13.5 2.5,9 9.5,8.5" />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-[14px] font-bold">STOS <span className="font-medium text-muted-foreground">Life</span></p>
          <p className="text-[10px] text-muted-foreground">Family Operating System</p>
        </div>
      </div>
      <nav className="px-3 py-2 flex-1 overflow-y-auto">
        {NAV.map((n) => {
          const active = pathname === n.to;
          return (
            <Link
              key={n.label}
              to={n.to as never}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium mb-0.5 transition",
                active ? "bg-tint-blue text-brand" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <n.icon className="h-[18px] w-[18px]" />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-2xl bg-tint-purple/60 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[oklch(0.65_0.2_295)]" />
          <p className="text-[13px] font-bold text-[oklch(0.65_0.2_295)]">AI Family Assistant</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Trợ lý thông minh cho gia đình bạn</p>
        <button className="mt-3 h-9 px-4 rounded-xl bg-[oklch(0.65_0.2_295)] text-white text-[12px] font-semibold">Hỏi ngay</button>
      </div>
      <div className="px-5 py-4 border-t border-border">
        <p className="text-[12px] font-bold">Gia đình hôm nay</p>
        <p className="text-[11px] text-muted-foreground mt-1">Thứ Hai, 20/05/2024</p>
        <div className="mt-3 flex items-center gap-3">
          <Cloud className="h-7 w-7 text-warning" />
          <div className="flex-1">
            <p className="text-[18px] font-bold leading-none">28°<span className="text-[11px] text-muted-foreground">C</span></p>
            <p className="text-[10px] text-muted-foreground">29° / 22°</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> Hà Nội</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ memberCount }: { memberCount: number }) {
  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur px-6 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[20px] font-bold tracking-tight">Gia đình tôi</h1>
          <Heart className="h-4 w-4 text-emergency" />
        </div>
        <p className="text-[11px] text-muted-foreground">Căn hộ A12-15 · STOS Residence</p>
      </div>
      <div className="relative w-[380px] max-w-[40%]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Tìm thành viên, lịch, chi tiêu..."
          className="w-full h-10 rounded-xl bg-muted/40 border border-border pl-9 pr-16 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">Ctrl + K</kbd>
      </div>
      <button className="relative h-10 w-10 grid place-items-center rounded-xl hover:bg-muted/40">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-emergency text-white text-[9px] font-bold grid place-items-center">8</span>
      </button>
      <button className="h-10 w-10 grid place-items-center rounded-xl hover:bg-muted/40">
        <Mail className="h-[18px] w-[18px]" />
      </button>
      <button className="flex items-center gap-2 pl-2 pr-1 h-10 rounded-xl hover:bg-muted/40">
        <img src={AVATAR_USER} alt="" className="h-9 w-9 rounded-full object-cover" />
        <div className="text-left leading-tight">
          <p className="text-[13px] font-bold">Gia đình Minh</p>
          <p className="text-[10px] text-muted-foreground">Thành viên ({memberCount})</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      <button className="h-10 px-4 rounded-xl bg-brand text-white text-[13px] font-semibold flex items-center gap-1.5">
        <Plus className="h-4 w-4" /> Thêm thành viên
      </button>
    </header>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl bg-card border border-border p-5 shadow-sm", className)}>{children}</section>;
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
      {action}
    </div>
  );
}

function QuickAction({
  icon: Icon, label, tint, color, to, small,
}: { icon: typeof Plus; label: string; tint: string; color: string; to?: string; small?: boolean }) {
  const inner = (
    <div className="flex flex-col items-center gap-2 group">
      <div className={cn("rounded-2xl grid place-items-center w-full transition group-hover:scale-105", tint, small ? "h-12" : "h-16")}>
        <Icon className={cn(small ? "h-5 w-5" : "h-6 w-6", color)} strokeWidth={2.2} />
      </div>
      <span className={cn("font-medium text-center leading-tight", small ? "text-[10px]" : "text-[11px]")}>{label}</span>
    </div>
  );
  return to ? <Link to={to as never} className="block">{inner}</Link> : <button className="block w-full">{inner}</button>;
}

function ChildRow({ img, name, age, status, extra, extraTone }: { img: string; name: string; age: string; status: string; extra: string; extraTone: "ok" | "warn" }) {
  return (
    <li className="flex items-center gap-3">
      <img src={img} alt={name} className="h-12 w-12 rounded-2xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold">{name} <span className="font-normal text-muted-foreground">({age})</span></p>
        <p className="text-[11px] text-muted-foreground">{status}</p>
        <p className={cn("text-[11px] font-semibold", extraTone === "warn" ? "text-emergency" : "text-success")}>{extra}</p>
      </div>
    </li>
  );
}

function DonutChart({ cats }: { cats: { pct: number; color: string }[] }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-[110px] w-[110px] -rotate-90 shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.3 0.02 250)" strokeWidth="14" />
      {cats.map((c2, i) => {
        const len = (c * c2.pct) / 100;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={c2.color} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={-offset} />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
