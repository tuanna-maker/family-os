import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Activity, ShieldCheck, Home as HomeIcon, ArrowLeft, FileClock, Users, Calendar, Heart, UserCog, Camera, Crown, LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type NavItem = { icon: LucideIcon; label: string; to: "/admin" | "/admin/super" | "/admin/family" | "/admin/security" | "/admin/audit" | "/admin/users" | "/admin/calendar" | "/admin/elderly-care" | "/admin/helpers" | "/admin/memories"; exact?: boolean };

const NAV: NavItem[] = [
  { icon: HomeIcon, label: "Tổng quan", to: "/admin", exact: true },
  { icon: Crown, label: "Super Admin", to: "/admin/super" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: Activity, label: "Family Core", to: "/admin/family" },
  { icon: Calendar, label: "Lịch gia đình", to: "/admin/calendar" },
  { icon: Heart, label: "Chăm sóc ông bà", to: "/admin/elderly-care" },
  { icon: UserCog, label: "Giúp việc", to: "/admin/helpers" },
  { icon: Camera, label: "Kỷ niệm", to: "/admin/memories" },
  { icon: ShieldCheck, label: "Security Core", to: "/admin/security" },
  { icon: FileClock, label: "Audit Logs", to: "/admin/audit" },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    navigate({ to: "/login" });
  };


  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground p-5">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand to-pink grid place-items-center text-lg shrink-0">
          🏠
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">STOS Life</p>
          <p className="text-[10px] text-sidebar-foreground/60">Admin Console</p>
        </div>
      </div>
      <nav className="space-y-1 text-sm">
        {NAV.map(({ icon: Icon, label, to, exact }, i) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={`${label}-${i}`}
              to={to}
              onClick={onNavigate}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 pt-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-emergency hover:bg-sidebar-accent/50 transition"
        >
          <LogOut className="h-4 w-4 shrink-0" /> Đăng xuất
        </button>
        <Link
          to="/home"
          onClick={onNavigate}
          className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Về ứng dụng
        </Link>
      </div>
    </div>
  );
}
