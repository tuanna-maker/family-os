import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, type ComponentType, useState } from "react";
import {
  Building2, ChevronsLeft, ChevronsRight, Search, Bell, Calendar,
  LayoutGrid, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { PLATFORM_NAV, filterConsoleNav, type ConsoleNavItem, type ConsoleNavGroup } from "@/constants/workspace-nav";
import { TenantSwitcher } from "@/components/core/TenantSwitcher";
import { RoleSwitcher } from "@/components/core/RoleSwitcher";
import { ROLES } from "@/constants/permissions";

export interface ConsoleShellBrand {
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
}

export function ConsoleShell({
  title, subtitle, headerRight, children,
  nav = PLATFORM_NAV,
  brand = { title: "STOS Life", subtitle: "Nền tảng vận hành cộng đồng cư dân" },
  theme = "light",
}: {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  nav?: ConsoleNavGroup[];
  brand?: ConsoleShellBrand;
  theme?: "light" | "dark";
}) {
  const { user } = useMockAuth();
  const [collapsed, setCollapsed] = useState(false);
  const visibleGroups = user ? filterConsoleNav(nav, user.role) : [];
  const dark = theme === "dark";

  return (
    <div className={cn("min-h-screen flex w-full text-foreground", dark ? "bg-[oklch(0.18_0.02_260)]" : "bg-[oklch(0.985_0.005_250)]")}>
      <ConsoleSidebar
        groups={visibleGroups}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        brand={brand}
        dark={dark}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn("h-16 flex items-center gap-3 border-b px-5", dark ? "bg-[oklch(0.22_0.025_260)] border-white/10 text-white" : "bg-white border-border")}>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className={cn("text-[12px] truncate", dark ? "text-white/60" : "text-muted-foreground")}>{subtitle}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {headerRight ?? <DefaultHeaderTools dark={dark} />}
            <TenantSwitcher />
            <RoleSwitcher />
            <Link
              to="/workspaces"
              className={cn("h-8 px-2 inline-flex items-center gap-1 rounded-md text-[12px]", dark ? "text-white/60 hover:bg-white/10" : "text-muted-foreground hover:bg-muted/50")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Link>
            <NotifIcon dark={dark} />
            <MsgIcon dark={dark} />
            <UserChip dark={dark} />
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function DefaultHeaderTools({ dark }: { dark?: boolean }) {
  const surface = dark ? "bg-white/5 border-white/10 text-white/80 hover:bg-white/10" : "bg-white border-border text-foreground/80 hover:bg-muted/40";
  const inputSurface = dark ? "bg-white/5 border-white/10" : "bg-white border-border";
  return (
    <>
      <button className={cn("h-9 px-3 inline-flex items-center gap-2 rounded-lg border text-[12.5px]", surface)}>
        <Calendar className={cn("h-3.5 w-3.5", dark ? "text-white/50" : "text-muted-foreground")} />
        <span className="tabular-nums">14/05/2024 – 20/05/2024</span>
      </button>
      <div className={cn("hidden md:flex h-9 w-64 items-center gap-2 rounded-lg border px-3", inputSurface)}>
        <Search className={cn("h-3.5 w-3.5", dark ? "text-white/50" : "text-muted-foreground")} />
        <input
          placeholder="Tìm kiếm..."
          className={cn("flex-1 bg-transparent outline-none text-[13px]", dark ? "text-white placeholder:text-white/40" : "placeholder:text-muted-foreground")}
        />
        <kbd className={cn("text-[10px] border rounded px-1 py-0.5", dark ? "text-white/50 border-white/15" : "text-muted-foreground border-border")}>
          Ctrl + K
        </kbd>
      </div>
    </>
  );
}

function NotifIcon({ dark }: { dark?: boolean }) {
  return (
    <button className={cn("relative h-9 w-9 grid place-items-center rounded-lg border", dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-border bg-white hover:bg-muted/40")}>
      <Bell className={cn("h-4 w-4", dark ? "text-white/70" : "text-muted-foreground")} />
      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emergency text-[10px] font-semibold text-white grid place-items-center">
        12
      </span>
    </button>
  );
}

function MsgIcon({ dark }: { dark?: boolean }) {
  return (
    <button className={cn("relative h-9 w-9 grid place-items-center rounded-lg border", dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-border bg-white hover:bg-muted/40")}>
      <MessageSquare className={cn("h-4 w-4", dark ? "text-white/70" : "text-muted-foreground")} />
      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-info text-[10px] font-semibold text-white grid place-items-center">
        5
      </span>
    </button>
  );
}

function UserChip({ dark }: { dark?: boolean }) {
  const { user } = useMockAuth();
  if (!user) return null;
  return (
    <div className={cn("flex items-center gap-2 pl-2 border-l ml-1", dark ? "border-white/10" : "border-border")}>
      <div className="text-right hidden sm:block">
        <p className="text-[12.5px] font-semibold leading-tight">{user.fullName}</p>
        <p className={cn("text-[11px] leading-tight", dark ? "text-white/60" : "text-muted-foreground")}>
          {ROLES[user.role].name}
        </p>
      </div>
      <div className="h-9 w-9 rounded-full bg-tint-blue text-brand grid place-items-center text-[13px] font-semibold">
        {user.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
      </div>
    </div>
  );
}

function ConsoleSidebar({
  groups, collapsed, onToggle, brand, dark,
}: {
  groups: { label: string; items: ConsoleNavItem[] }[];
  collapsed: boolean;
  onToggle: () => void;
  brand: ConsoleShellBrand;
  dark: boolean;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const BrandIcon = brand.icon ?? Building2;
  return (
    <aside
      className={cn(
        "shrink-0 border-r flex flex-col transition-[width]",
        dark ? "bg-[oklch(0.22_0.025_260)] border-white/10 text-white" : "bg-white border-border",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      <div className={cn("px-4 pt-5 pb-4 flex items-center gap-2.5", collapsed && "px-3 justify-center")}>
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
          <BrandIcon className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight">{brand.title}</p>
            {brand.subtitle && (
              <p className={cn("text-[10.5px] leading-tight", dark ? "text-white/60" : "text-muted-foreground")}>
                {brand.subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((g) => (
          <div key={g.label} className="mt-3">
            {!collapsed && (
              <p className={cn("px-2 pt-1 pb-1.5 text-[10px] uppercase tracking-[0.08em] font-semibold", dark ? "text-white/40" : "text-muted-foreground/80")}>
                {g.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={`${g.label}-${it.label}`}>
                  <NavRow item={it} pathname={pathname} collapsed={collapsed} dark={dark} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className={cn("m-2 h-9 px-3 inline-flex items-center justify-center gap-2 rounded-lg text-[12px]", dark ? "text-white/60 hover:bg-white/10" : "text-muted-foreground hover:bg-muted/50")}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Thu gọn</>)}
      </button>
    </aside>
  );
}

function NavRow({
  item, pathname, collapsed, dark,
}: { item: ConsoleNavItem; pathname: string; collapsed: boolean; dark?: boolean }) {
  const Icon = item.icon;
  const active =
    !!item.to &&
    (pathname === item.to || (item.to !== "/console" && item.to !== "/ops" && item.to !== "/security" && item.to !== "/family" && pathname.startsWith(`${item.to}/`)));
  const disabled = !item.to;

  const inner = (
    <>
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand" : dark ? "text-white/60" : "text-muted-foreground")} />
      {!collapsed && (
        <span className="flex-1 truncate text-[12.5px]">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span
          className={cn(
            "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold",
            item.badge === "Mới" && "bg-tint-orange text-warning",
            item.badge === "Sắp có" && (dark ? "bg-white/10 text-white/50" : "bg-muted text-muted-foreground"),
            item.badge === "Beta" && "bg-tint-purple text-[oklch(0.55_0.18_295)]",
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  const className = cn(
    "flex items-center gap-2.5 px-2.5 h-9 rounded-lg transition-colors",
    active
      ? "bg-tint-blue text-brand font-semibold"
      : dark ? "text-white/80 hover:bg-white/10" : "text-foreground/80 hover:bg-muted/50",
    disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
    collapsed && "justify-center px-0",
  );

  if (disabled) {
    return <div className={className} title={`${item.label} · Sắp có`}>{inner}</div>;
  }
  if (item.external) {
    return <a href={item.to} className={className}>{inner}</a>;
  }
  return <Link to={item.to!} className={className}>{inner}</Link>;
}
