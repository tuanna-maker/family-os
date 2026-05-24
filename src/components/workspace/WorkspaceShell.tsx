import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Building2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { filterNavByRole, type NavItem } from "@/constants/navigation";
import { RoleSwitcher } from "@/components/core/RoleSwitcher";
import { TenantSwitcher } from "@/components/core/TenantSwitcher";

export type WorkspaceNavItem = NavItem;

export function WorkspaceShell({
  brand, subtitle, nav, headerRight, children,
}: {
  brand: string;
  subtitle?: string;
  nav: NavItem[];
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useMockAuth();
  const visibleNav = user ? filterNavByRole(nav, user.role) : nav;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <WorkspaceSidebar brand={brand} subtitle={subtitle} nav={visibleNav} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border px-3 sm:px-4 bg-card/40 backdrop-blur">
            <SidebarTrigger />
            <Link to="/workspaces"
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Workspaces
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {headerRight}
              <TenantSwitcher />
              <RoleSwitcher />
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function WorkspaceSidebar({ brand, subtitle, nav }: { brand: string; subtitle?: string; nav: NavItem[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={cn("px-3 pt-4 pb-3", collapsed && "px-2")}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight truncate">{brand}</p>
                {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
              </div>
            )}
          </div>
        </div>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item)}>
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="truncate flex-1 flex items-center gap-1.5">
                          {item.label}
                          {item.phase && item.phase !== "MVP" && (
                            <span className="text-[9px] uppercase text-muted-foreground border border-border rounded px-1">
                              {item.phase === "Phase 2" ? "P2" : "P3"}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
