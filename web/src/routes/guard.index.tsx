import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shield, Bell, LogIn, LogOut, MapPin, AlertTriangle, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getActiveShift } from "@/lib/guard.functions";
import { unreadCount } from "@/lib/notifications.functions";

export const Route = createFileRoute("/guard/")({
  head: () => ({ meta: [{ title: "Bảo vệ — Trang chủ" }] }),
  loader: ({ context }) => {
    if (typeof window === "undefined") return;
    // Warm cache in parallel with route chunk loading — avoids waterfall
    context.queryClient.prefetchQuery({
      queryKey: ["guard-active-shift"],
      queryFn: () => getActiveShift(),
    });
    context.queryClient.prefetchQuery({
      queryKey: ["guard-unread"],
      queryFn: () => unreadCount(),
    });
  },
  component: GuardHome,
});

const SHIFT_LABEL: Record<string, { name: string; range: string }> = {
  morning: { name: "Ca sáng", range: "06:00 - 14:00" },
  afternoon: { name: "Ca chiều", range: "14:00 - 22:00" },
  night: { name: "Ca đêm", range: "22:00 - 06:00" },
};

function GuardHome() {
  const { user } = useAuth();
  const fetchShift = useServerFn(getActiveShift);
  const fetchUnread = useServerFn(unreadCount);
  const shiftQ = useQuery({ queryKey: ["guard-active-shift"], queryFn: () => fetchShift() });
  const unreadQ = useQuery({ queryKey: ["guard-unread"], queryFn: () => fetchUnread(), refetchInterval: 30000 });

  const fullName =
    (user?.user_metadata as { full_name?: string } | null)?.full_name ?? "Nhân viên bảo vệ";
  const initials = fullName
    .split(" ")
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const shift = shiftQ.data;
  const shiftMeta = shift ? SHIFT_LABEL[shift.shift_type] : null;
  const isWorking = shift?.status === "checked_in";
  const unread = unreadQ.data?.count ?? 0;

  return (
    <>
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
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </header>

      <section className="px-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand to-info grid place-items-center text-white font-bold text-base shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Xin chào,</p>
            <p className="text-lg font-bold truncate">{fullName}</p>
            <p className="text-[11px] text-muted-foreground">
              {shiftMeta ? `${shiftMeta.name}: ${shiftMeta.range}` : "Không có ca trực"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isWorking ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
              <span className={`text-[11px] font-medium ${isWorking ? "text-success" : "text-muted-foreground"}`}>
                {isWorking ? "Đang làm việc" : shift?.status === "scheduled" ? "Ca sắp tới" : "Chưa vào ca"}
              </span>
            </div>
          </div>
        </div>
      </section>

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
            <p className="text-[12px] text-white/80">Xem & xử lý</p>
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
