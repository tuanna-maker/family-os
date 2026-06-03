import { createFileRoute, Link } from "@tanstack/react-router";
import securityHero from "../../../../src/assets/security-hero.jpg";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { MOBILE_HEADER_PT } from "@shared/ui/mobile/shellLayout";
import {
  ShieldCheck,
  Phone,
  MessageSquare,
  Camera,
  Flame,
  Building2,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sun,
  Moon,
  UserCheck,
  Calendar,
  ShoppingBasket,
  Receipt,
  Pill,
  Wrench,
  Package,
  UserX,
  MoreHorizontal,
  Truck,
  FileText,
  Bell,
  AlertTriangle,
  Heart,
  Users,
  GraduationCap,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { NotificationBell } from "@shared/ui/common/NotificationBell";
import { family } from "@/features/family-core";
import { cn } from "@shared/utils";
import { useTheme } from "@shared/ui/hooks/use-theme";
import { listNotifications, type NotificationRow } from "@/api/notifications";
import { getFamilyToday, type FamilyTodayMember, type StatusTone } from "@/api/family-today";
import { getSecurityStatus, type SecurityChip, type SecurityTone } from "@/api/security";
import { useFamilyContext } from "@/hooks/use-family-context";
import { useNotifications } from "@/hooks/use-notifications";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "STOS Life — Hệ điều hành cho gia đình đô thị" },
      {
        name: "description",
        content:
          "Bảo an gia đình, dịch vụ tòa nhà và quản lý cuộc sống — tất cả trong một ứng dụng.",
      },
    ],
  }),
  component: HomePage,
});

const SECURITY_CHIP_ICONS: Record<SecurityChip["key"], LucideIcon> = {
  camera: Camera,
  fire: Flame,
  elevator: Building2,
  intrusion: UserX,
  package: Package,
  tech: Wrench,
};

const securityToneStyles: Record<SecurityTone, { chip: string; text: string; dot: string; headline: string }> = {
  success: { chip: "bg-tint-green", text: "text-success", dot: "bg-success", headline: "text-success" },
  warning: { chip: "bg-tint-orange", text: "text-warning", dot: "bg-warning", headline: "text-warning" },
  emergency: { chip: "bg-tint-red", text: "text-emergency", dot: "bg-emergency", headline: "text-emergency" },
  muted: { chip: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground", headline: "text-muted-foreground" },
};

const services = [
  { id: "sos", label: "SOS", sub: "khẩn cấp", Icon: ShieldCheck, color: "text-emergency", bg: "bg-tint-red", to: "/bao-an" },
  { id: "fire", label: "Báo cháy", sub: "", Icon: Flame, color: "text-warning", bg: "bg-tint-orange", to: "/bao-an" },
  { id: "package", label: "Nhận hàng", sub: "giúp", Icon: Package, color: "text-brand", bg: "bg-tint-blue", to: "/bao-an" },
  { id: "stranger", label: "Báo người", sub: "lạ", Icon: UserX, color: "text-pink", bg: "bg-tint-purple", to: "/bao-an" },
  { id: "tech", label: "Hỗ trợ", sub: "kỹ thuật", Icon: Wrench, color: "text-brand", bg: "bg-tint-blue", to: "/bao-an" },
  { id: "more", label: "Xem thêm", sub: "", Icon: MoreHorizontal, color: "text-muted-foreground", bg: "bg-muted", to: "/bao-an" },
];

const toneStyles: Record<StatusTone, { dot: string; chip: string; text: string }> = {
  success: { dot: "bg-success", chip: "bg-tint-green", text: "text-success" },
  warning: { dot: "bg-warning", chip: "bg-tint-orange", text: "text-warning" },
  info: { dot: "bg-brand", chip: "bg-tint-blue", text: "text-brand" },
  emergency: { dot: "bg-emergency", chip: "bg-tint-red", text: "text-emergency" },
  muted: { dot: "bg-muted-foreground", chip: "bg-muted", text: "text-muted-foreground" },
};

const kindMeta: Record<FamilyTodayMember["kind"], { Icon: typeof ShieldCheck; bg: string; color: string; label: string }> = {
  elderly: { Icon: Heart, bg: "bg-tint-pink", color: "text-pink", label: "Ông/Bà" },
  child: { Icon: GraduationCap, bg: "bg-tint-blue", color: "text-brand", label: "Con" },
  adult: { Icon: UserCheck, bg: "bg-tint-purple", color: "text-pink", label: "Bố/Mẹ" },
};


const ACTIVITY_PAGE_SIZE = 5;

const activityVisuals: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  medicine: { Icon: Pill, color: "text-emergency", bg: "bg-tint-red" },
  health: { Icon: Heart, color: "text-pink", bg: "bg-tint-pink" },
  calendar: { Icon: Calendar, color: "text-brand", bg: "bg-tint-blue" },
  event: { Icon: Calendar, color: "text-brand", bg: "bg-tint-blue" },
  expense: { Icon: Receipt, color: "text-warning", bg: "bg-tint-orange" },
  bill: { Icon: FileText, color: "text-emergency", bg: "bg-tint-red" },
  food: { Icon: ShoppingBasket, color: "text-success", bg: "bg-tint-green" },
  delivery: { Icon: Truck, color: "text-success", bg: "bg-tint-green" },
  security: { Icon: ShieldCheck, color: "text-emergency", bg: "bg-tint-red" },
  alert: { Icon: AlertTriangle, color: "text-warning", bg: "bg-tint-orange" },
  tech: { Icon: Wrench, color: "text-brand", bg: "bg-tint-blue" },
  family: { Icon: Users, color: "text-brand", bg: "bg-tint-blue" },
};
const defaultActivityVisual = { Icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  const hhmm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return hhmm;
  if (isYesterday) return `Hôm qua ${hhmm}`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function HomePage() {
  const { theme, toggle } = useTheme();
  const { familyId } = useFamilyContext();
  const { unread } = useNotifications();
  const [pageCount, setPageCount] = useState(1);
      const limit = pageCount * ACTIVITY_PAGE_SIZE;
  const activitiesQuery = useQuery({
    queryKey: ["home-activities", limit],
    queryFn: () => listNotifications({ limit, offset: 0 }),
  });
    const familyTodayQuery = useQuery({
    queryKey: ["family-today", familyId],
    queryFn: () => getFamilyToday({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const securityQuery = useQuery({
    queryKey: ["security-status", familyId],
    queryFn: () => getSecurityStatus({ family_id: familyId! }),
    enabled: !!familyId,
    refetchInterval: 30000,
  });
  const activities: NotificationRow[] = activitiesQuery.data?.rows ?? [];
  const total = activitiesQuery.data?.total ?? 0;
  const hasMore = activities.length < total;
  const todayMembers = familyTodayQuery.data?.members ?? [];
  const security = securityQuery.data;
  const securityTone: SecurityTone = security?.overall ?? "success";
  const securityStyle = securityToneStyles[securityTone];
  const securityHeadline = security?.headline ?? (securityQuery.isLoading ? "Đang kiểm tra…" : "Tất cả bình thường");
  const securityChips: SecurityChip[] = security?.chips ?? [
    { key: "camera", label: "Camera & An ninh", value: "—", tone: "muted", count: 0 },
    { key: "fire", label: "PCCC", value: "—", tone: "muted", count: 0 },
    { key: "elevator", label: "Thang máy", value: "—", tone: "muted", count: 0 },
  ];
  const securityUpdated = security?.updated_at
    ? `Cập nhật ${formatActivityTime(security.updated_at)}`
    : security?.subline ?? "Theo dõi liên tục";
  return (
    <MobileShell>
      {/* Header */}
      <header className={`px-4 pb-3 flex items-center gap-2 ${MOBILE_HEADER_PT}`}>
        <div className="flex items-center gap-2 shrink min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand to-navy grid place-items-center shadow-[var(--shadow-soft)] shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <div className="leading-tight truncate">
            <p className="text-lg font-bold tracking-tight">
              STOS <span className="text-brand">Life</span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug truncate max-w-[100px]">
              Operating System for Residential Life
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-xs text-muted-foreground">Xin chào,</p>
          <p className="text-sm font-bold tracking-tight truncate">
            {family.name} <span>👋</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            className="h-10 w-10 rounded-full bg-card border border-border grid place-items-center text-foreground active:scale-95 transition touch-manipulation"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NotificationBell unread={unread} />
        </div>
      </header>

      {/* Hero security */}
      <section className="px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sidebar via-sidebar-accent to-sidebar text-sidebar-foreground shadow-[var(--shadow-card)]">
          <img
            src={securityHero}
            alt="Đội bảo an STOS"
            className="absolute inset-0 h-full w-full object-cover object-right opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/10" />

          <div className="relative p-5">
            <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              Dịch vụ bảo an gia đình
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight max-w-[260px]">
              An toàn gia đình
              <br />
              là ưu tiên hàng đầu
            </h1>

            {/* feature badges */}
            <div className="mt-4 flex flex-wrap gap-2 max-w-[280px]">
              <FeatureBadge Icon={ShieldCheck} title="Hỗ trợ nhanh" sub="24/7" />
              <FeatureBadge Icon={Clock} title="Có mặt nhanh" sub="5–10 phút" />
              <FeatureBadge Icon={UserCheck} title="Đội ngũ chuyên nghiệp" sub="Tận tâm – Tin cậy" />
            </div>

            {/* CTAs */}
            <div className="mt-5 space-y-2.5 max-w-[300px]">
              <Link
                to="/bao-an"
                className="flex items-center gap-3 rounded-2xl bg-emergency px-4 py-3 shadow-[var(--shadow-soft)] active:scale-[0.98] transition"
              >
                <div className="h-10 w-10 rounded-xl bg-white/15 grid place-items-center">
                  <Phone className="h-5 w-5" fill="currentColor" />
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-bold">Gọi hỗ trợ ngay</p>
                  <p className="text-xs text-white/80">Nhấn để gọi đội ngũ bảo an</p>
                </div>
              </Link>
              <Link
                to="/bao-an"
                className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/25 px-4 py-3 active:scale-[0.98] transition"
              >
                <div className="h-10 w-10 rounded-xl bg-white/15 grid place-items-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-bold">Nhắn tin cho bảo an</p>
                  <p className="text-xs text-white/70">Trao đổi – Yêu cầu</p>
                </div>
              </Link>
            </div>

            {/* status pill */}
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-sm border border-white/20 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-semibold">Hỗ trợ 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Safety status row */}
      <section className="px-4 mt-4">
        <Link
          to="/bao-an"
          className={cn(
            "rounded-3xl bg-card border p-4 flex items-center gap-3 overflow-x-auto no-scrollbar active:scale-[0.99] transition",
            securityTone === "emergency"
              ? "border-emergency/50"
              : securityTone === "warning"
                ? "border-warning/50"
                : "border-border",
          )}
        >
          <div className="flex items-center gap-3 shrink-0">
            <div className={cn("h-11 w-11 rounded-2xl grid place-items-center relative", securityStyle.chip)}>
              <ShieldCheck className={cn("h-5 w-5", securityStyle.text)} />
              {securityTone !== "success" && (
                <span className={cn("absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card animate-pulse", securityStyle.dot)} />
              )}
            </div>
            <div className="leading-tight">
              <p className="text-sm text-muted-foreground">Tình trạng an toàn</p>
              <p className={cn("text-base font-bold", securityStyle.headline)}>{securityHeadline}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{securityUpdated}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-border shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            {securityChips.map((c) => {
              const Icon = SECURITY_CHIP_ICONS[c.key] ?? ShieldCheck;
              const style = securityToneStyles[c.tone];
              return (
                <div key={c.key} className="flex items-center gap-2">
                  <div className={cn("h-9 w-9 rounded-xl grid place-items-center shrink-0 relative", style.chip)}>
                    <Icon className={cn("h-4 w-4", style.text)} />
                    {c.count > 0 && (
                      <span className={cn("absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-xs font-bold grid place-items-center text-white", style.dot)}>
                        {c.count}
                      </span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold truncate max-w-[90px]">{c.label}</p>
                    <p className={cn("text-xs", c.tone === "success" ? "text-muted-foreground" : style.text)}>{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
        </Link>

      </section>

      {/* Dịch vụ bảo an grid */}
      <section className="px-4 mt-6">
        <div className="rounded-3xl bg-card border border-border p-4">
          <h2 className="text-lg font-bold tracking-tight mb-3">Dịch vụ bảo an</h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {services.map((s) => (
              <Link key={s.id} to={s.to} className="flex flex-col items-center gap-2 group">
                <div
                  className={cn(
                    "h-16 w-full rounded-2xl grid place-items-center transition-transform group-active:scale-95",
                    s.bg,
                  )}
                >
                  {s.id === "sos" ? (
                    <div className="h-10 w-10 rounded-full bg-emergency grid place-items-center text-white text-sm font-black">
                      SOS
                    </div>
                  ) : (
                    <s.Icon className={cn("h-7 w-7", s.color)} strokeWidth={2.2} />
                  )}
                </div>
                <p className="text-[13px] font-semibold text-center leading-tight">
                  {s.label}
                  {s.sub && (
                    <>
                      <br />
                      <span className="font-medium text-[12px]">{s.sub}</span>
                    </>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Gia đình hôm nay */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold tracking-tight">Gia đình hôm nay</h2>
            <Link to="/gia-dinh" className="text-sm font-semibold text-brand flex items-center gap-0.5">
              Xem tất cả <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {familyTodayQuery.isLoading || !familyId ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : todayMembers.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Chưa có thành viên nào trong gia đình.
              </p>
              <Link
                to="/gia-dinh"
                className="mt-2 inline-block text-sm font-semibold text-brand"
              >
                Thêm thành viên →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {todayMembers.map((m) => (
                <FamilyMemberRow key={m.id} member={m} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Hoạt động gần đây */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold tracking-tight">Hoạt động gần đây</h2>
            <Link to="/thong-bao" className="text-sm font-semibold text-brand flex items-center gap-0.5">
              Xem tất cả <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {activitiesQuery.isLoading ? (
            <ul className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 h-3 rounded bg-muted" />
                  <div className="h-3 w-10 rounded bg-muted shrink-0" />
                </li>
              ))}
            </ul>
          ) : activitiesQuery.isError ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Không tải được hoạt động. Vui lòng thử lại.
            </p>
          ) : activities.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Chưa có hoạt động nào.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {activities.map((a) => {
                  const v = activityVisuals[a.type] ?? defaultActivityVisual;
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <div className={cn("h-9 w-9 rounded-full grid place-items-center shrink-0", v.bg)}>
                        <v.Icon className={cn("h-4 w-4", v.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug truncate">
                          {a.title}
                        </p>
                        {a.body && (
                          <p className="text-sm text-muted-foreground leading-snug truncate">
                            {a.body}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatActivityTime(a.created_at)}
                      </span>
                      {!a.read_at && (
                        <span className="h-2 w-2 rounded-full bg-brand shrink-0" aria-label="Chưa đọc" />
                      )}
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setPageCount((p) => p + 1)}
                  disabled={activitiesQuery.isFetching}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/40 py-2.5 text-sm font-semibold text-foreground active:scale-[0.98] transition disabled:opacity-60"
                >
                  {activitiesQuery.isFetching ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
                    </>
                  ) : (
                    <>
                      Xem thêm
                      <span className="text-muted-foreground font-normal">
                        ({activities.length}/{total})
                      </span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </MobileShell>
  );
}

function FeatureBadge({
  Icon,
  title,
  sub,
}: {
  Icon: typeof ShieldCheck;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-2 py-1.5">
      <div className="h-6 w-6 rounded-md bg-brand/40 grid place-items-center shrink-0">
        <Icon className="h-3 w-3" />
      </div>
      <div className="leading-tight">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-xs text-white/70">{sub}</p>
      </div>
    </div>
  );
}

function FamilyMemberRow({ member }: { member: FamilyTodayMember }) {
  const meta = kindMeta[member.kind];
  const tone = toneStyles[member.tone];
  const initials = member.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  const dueLabel = member.due_at
    ? new Date(member.due_at).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-muted/30 p-2.5">
      <div className="relative shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.name}
            className="h-11 w-11 rounded-2xl object-cover"
          />
        ) : (
          <div
            className={cn(
              "h-11 w-11 rounded-2xl grid place-items-center font-bold text-base",
              meta.bg,
              meta.color,
            )}
          >
            {initials || <meta.Icon className="h-5 w-5" />}
          </div>
        )}
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card",
            tone.dot,
          )}
          aria-hidden
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-base font-bold truncate">{member.name}</p>
          <span className="text-xs text-muted-foreground font-medium truncate">
            · {member.role ?? meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold",
              tone.chip,
              tone.text,
            )}
          >
            <meta.Icon className="h-3 w-3" />
            {member.status}
          </span>
          {member.detail && (
            <span className="text-xs text-muted-foreground truncate">
              {member.detail}
            </span>
          )}
        </div>
      </div>

      {dueLabel && (
        <span className="text-sm font-semibold text-muted-foreground shrink-0">
          {dueLabel}
        </span>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </li>
  );
}
