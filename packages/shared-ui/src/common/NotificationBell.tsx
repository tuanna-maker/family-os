import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

type NotificationBellProps = {
  unread?: number;
  to?: string;
};

export function NotificationBell({ unread = 0, to = "/thong-bao" }: NotificationBellProps) {
  return (
    <Link
      to={to}
      className="h-10 w-10 rounded-2xl bg-card border border-border grid place-items-center relative"
      aria-label={`Thông báo (${unread} chưa đọc)`}
    >
      <Bell className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emergency text-white text-[10px] font-bold grid place-items-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
