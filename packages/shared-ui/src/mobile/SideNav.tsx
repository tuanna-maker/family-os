import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, ShieldCheck, Sparkles, User } from "lucide-react";
import { cn } from "@shared/utils";

/**
 * matchPrefixes — danh sách prefix coi như thuộc tab.
 * Dùng để highlight đúng khi user vào route con không cùng path với tab.
 */
const tabs = [
  { to: "/home", label: "Trang chủ", icon: Home, matchPrefixes: ["/home", "/dashboard"] },
  {
    to: "/gia-dinh",
    label: "Gia đình",
    icon: Users,
    matchPrefixes: [
      "/gia-dinh",
      "/lich-gia-dinh",
      "/cham-soc-ong-ba",
      "/con-cai",
      "/suc-khoe",
      "/chi-tieu",
      "/thuc-pham",
      "/du-lich",
      "/ky-niem-gia-dinh",
      "/quan-ly-giup-viec",
      "/lien-he",
    ],
  },
  { to: "/bao-an", label: "Bảo an", icon: ShieldCheck, matchPrefixes: ["/bao-an"] },
  { to: "/cong-dong", label: "Cộng đồng", icon: Sparkles, matchPrefixes: ["/cong-dong"] },
  {
    to: "/tai-khoan",
    label: "Tài khoản",
    icon: User,
    matchPrefixes: ["/tai-khoan", "/thong-bao", "/cai-dat", "/portal"],
  },
] as const;

function isActive(tab: (typeof tabs)[number], pathname: string): boolean {
  if (tab.to === "/home") return pathname === "/home" || tab.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return tab.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * SideNav — điều hướng dọc cho desktop/tablet (≥ md).
 * Ẩn trên mobile (đã có BottomNav).
 * Dùng `location.pathname` (target hiện tại — bao gồm cả khi đang pending)
 * để highlight phản hồi tức thì ngay khi user bấm tab.
 */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl px-4 py-6">
      <Link to={"/home" as any} className="flex items-center gap-2 px-2 mb-8">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand to-navy grid place-items-center shadow-[var(--shadow-soft)]">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" fill="currentColor" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">
            STOS <span className="text-brand">Life</span>
          </p>
          <p className="text-[10px] text-muted-foreground">Operating System for Residential Life</p>
        </div>
      </Link>

      <nav className="flex-1">
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const { to, label, icon: Icon } = tab;
            const active = isActive(tab, pathname);
            return (
              <li key={to}>
                <Link
                  to={to as any}
                  aria-current={active ? "page" : undefined}
                  data-active={active || undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors",
                    active
                      ? "bg-tint-blue text-brand"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="px-3 text-[10px] text-muted-foreground">STOS Life • v1.0.0</p>
    </aside>
  );
}
