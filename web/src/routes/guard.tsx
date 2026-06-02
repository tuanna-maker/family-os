import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Home, CalendarDays, Bell, User, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { SosAlertOverlay } from "@/components/sos/SosAlertOverlay";
import { unreadCount } from "@/lib/notifications.functions";

export const Route = createFileRoute("/guard")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .in("role", ["super_admin", "security_admin", "security_staff"]);
    if (!roles || roles.length === 0) throw redirect({ to: "/workspaces" });
  },
  head: () => ({
    meta: [
      { title: "App Bảo vệ — STOS Life" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Bảo vệ" },
    ],
    links: [
      { rel: "manifest", href: "/manifest-guard.json" },
      { rel: "apple-touch-icon", href: "/icons/guard-192.png" },
    ],
  }),
  component: GuardLayout,
});

function GuardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchUnread = useServerFn(unreadCount);
  const unreadQ = useQuery({
    queryKey: ["guard-unread"],
    queryFn: () => fetchUnread(),
    refetchInterval: 30000,
  });
  const unread = unreadQ.data?.count ?? 0;

  const sideTabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean; badge: number }> = [
    { to: "/guard", label: "Trang chủ", icon: Home, exact: true, badge: 0 },
    { to: "/guard/schedule", label: "Lịch trực", icon: CalendarDays, badge: 0 },
    { to: "/guard/notifications", label: "Thông báo", icon: Bell, badge: unread },
    { to: "/guard/account", label: "Tài khoản", icon: User, badge: 0 },
  ];

  const baoAnActive = pathname === "/guard/requests" || pathname.startsWith("/guard/requests/");

  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-md min-h-screen pb-28 relative">
          <Outlet />
          <SosAlertOverlay />
          <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md">
            <div className="mx-3 mb-3 rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl relative">
              {/* Floating center Bảo An button */}
              <Link
                to="/guard/requests"
                aria-label="Bảo an"
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 -top-6 h-16 w-16 rounded-full grid place-items-center shadow-[0_8px_24px_-6px_rgba(220,38,38,0.6)] ring-4 ring-background transition active:scale-95",
                  baoAnActive
                    ? "bg-gradient-to-br from-emergency to-pink text-white"
                    : "bg-gradient-to-br from-emergency to-pink text-white",
                )}
              >
                <div className="flex flex-col items-center leading-none">
                  <ShieldAlert className="h-6 w-6" strokeWidth={2.4} />
                  <span className="text-[9px] font-bold mt-0.5 tracking-wide">BẢO AN</span>
                </div>
              </Link>
              <ul className="grid grid-cols-5">
                {sideTabs.slice(0, 2).map((t) => (
                  <NavItem key={t.to} {...t} pathname={pathname} />
                ))}
                {/* spacer for floating button */}
                <li aria-hidden className="h-[60px]" />
                {sideTabs.slice(2).map((t) => (
                  <NavItem key={t.to} {...t} pathname={pathname} />
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  badge,
  exact,
  pathname,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  badge: number;
  exact?: boolean;
  pathname: string;
}) {
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <li>
      <Link
        to={to as any}
        className={cn(
          "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium relative",
          active ? "text-brand" : "text-muted-foreground",
        )}
      >
        <div className="relative">
          <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emergency text-white text-[9px] font-bold grid place-items-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <span>{label}</span>
      </Link>
    </li>
  );
}
