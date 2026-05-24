import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { supabase } from "@shared/supabase/client";
import { Home, CalendarDays, Bell, User } from "lucide-react";
import { cn } from "@shared/utils";

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
    if (!roles || roles.length === 0) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "App Bảo vệ — STOS Life" }] }),
  component: GuardLayout,
});

type Tab = { to: string; label: string; icon: typeof Home; exact?: boolean; badge?: number };

/** Bottom navigation tabs — exported for RTL tests */
export const GUARD_BOTTOM_TABS = [
  { to: "/guard", label: "Trang chủ", icon: Home, exact: true },
  { to: "/guard/schedule", label: "Lịch trực", icon: CalendarDays },
  { to: "/guard/notifications", label: "Thông báo", icon: Bell, badge: 2 },
  { to: "/guard/account", label: "Tài khoản", icon: User },
] as const satisfies readonly Tab[];

const tabs: Tab[] = [...GUARD_BOTTOM_TABS];


function GuardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-md min-h-screen pb-24 relative">
          <Outlet />
          <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md">
            <div className="mx-3 mb-3 rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl">
              <ul className="grid grid-cols-4">
                {tabs.map(({ to, label, icon: Icon, badge, exact }) => {
                  const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
                  return (
                    <li key={to}>
                      <Link
                        to={to as any}

                        className={cn(
                          "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium relative",
                          active ? "text-brand" : "text-muted-foreground",
                        )}
                      >
                        <div className="relative">
                          <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                          {badge ? (
                            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emergency text-white text-[9px] font-bold grid place-items-center">
                              {badge}
                            </span>
                          ) : null}
                        </div>
                        <span>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
