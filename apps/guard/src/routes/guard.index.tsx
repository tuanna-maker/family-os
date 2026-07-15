import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Bell, LogIn, LogOut, MapPin, AlertTriangle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@shared/ui/hooks/use-auth";
import { listOpenResidentRequests } from "@/api/security";
import { useGuardNotifications } from "@/hooks/use-guard-notifications";

export const Route = createFileRoute("/guard/")({
  head: () => ({ meta: [{ title: "Bảo vệ — Trang chủ" }] }),
  component: GuardHome,
});

function GuardHome() {
  const { user } = useAuth();
  const { unread } = useGuardNotifications();
  const { data: openRequests = [] } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    refetchInterval: 60_000,
  });
  const fullName =
    (user?.user_metadata as { full_name?: string } | null)?.full_name ?? "Nhân viên bảo vệ";
  const initials = fullName
    .split(" ")
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Brand header */}
      <header className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-success to-brand grid place-items-center shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-wide">BẢO VỆ</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              STOS Residence
            </p>
          </div>
        </div>
        <Link
          to="/guard/notifications"
          className="relative h-10 w-10 rounded-full bg-card border border-border grid place-items-center"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emergency text-white text-[9px] font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </header>

      {/* Profile */}
      <section className="px-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand to-info grid place-items-center text-white font-bold text-base shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Xin chào,</p>
            <p className="text-lg font-bold truncate">{fullName}</p>
            <p className="text-[11px] text-muted-foreground">Ca sáng: 06:00 - 14:00</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] text-success font-medium">Đang làm việc</span>
            </div>
          </div>
        </div>
      </section>

      {/* Action grid */}
      <section className="px-5 mt-6 grid grid-cols-2 gap-3">
        <ActionTile
          to="/guard/check-in"
          icon={LogIn}
          title="VÀO CA"
          subtitle="Check-in"
          className="bg-gradient-to-br from-success to-[oklch(0.62_0.18_155)]"
        />
        <ActionTile
          to="/guard/check-out"
          icon={LogOut}
          title="KẾT THÚC CA"
          subtitle="Check-out"
          className="bg-gradient-to-br from-emergency to-pink"
        />
        <ActionTile
          to="/guard/patrol"
          icon={MapPin}
          title="TUẦN TRA"
          subtitle="Điểm danh"
          className="bg-gradient-to-br from-brand to-info"
        />
        <ActionTile
          to="/guard/incident"
          icon={AlertTriangle}
          title="BÁO SỰ CỐ"
          subtitle="Gửi báo cáo"
          className="bg-gradient-to-br from-warning to-[oklch(0.7_0.16_45)]"
        />
      </section>

      {/* Resident requests */}
      <section className="px-5 mt-3">
        <Link
          to="/guard/requests"
          className="flex items-center gap-4 rounded-3xl p-4 bg-gradient-to-br from-[oklch(0.55_0.2_295)] to-[oklch(0.45_0.2_280)] text-white shadow-lg active:scale-[0.98] transition"
        >
          <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold tracking-wide">YÊU CẦU CƯ DÂN</p>
            <p className="text-[12px] text-white/80">
              {openRequests.length > 0
                ? `${openRequests.length} yêu cầu đang mở · Xem & xử lý`
                : "Xem & xử lý"}
            </p>
          </div>
        </Link>
      </section>
    </>
  );
}

function ActionTile({
  to,
  icon: Icon,
  title,
  subtitle,
  className,
}: {
  to: string;
  icon: typeof Bell;
  title: string;
  subtitle: string;
  className: string;
}) {
  return (
    <Link
      to={to as any}
      className={`rounded-3xl p-4 text-white shadow-lg active:scale-[0.98] transition flex flex-col items-center justify-center min-h-[130px] ${className}`}
    >
      <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center mb-2">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-bold tracking-wide">{title}</p>
      <p className="text-[11px] text-white/80 mt-0.5">{subtitle}</p>
    </Link>
  );
}
