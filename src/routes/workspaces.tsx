import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listMyWorkspaces, type WorkspaceItem } from "@/lib/workspaces.functions";
import { Home, Building2, ShieldCheck, Crown, ChevronRight, LayoutDashboard, HeartPulse, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspaces")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Chọn workspace — STOS Life" }] }),
  component: WorkspacesPage,
});

const KIND_META: Record<
  WorkspaceItem["kind"],
  { label: string; tint: string; color: string; icon: typeof Home }
> = {
  resident: { label: "Cư dân", tint: "bg-tint-blue", color: "text-brand", icon: Home },
  bql: { label: "Ban quản lý", tint: "bg-tint-green", color: "text-success", icon: Building2 },
  tenant_admin: {
    label: "Tenant Admin",
    tint: "bg-tint-orange",
    color: "text-warning",
    icon: ShieldCheck,
  },
  saas_admin: { label: "SaaS Admin", tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", icon: Crown },
  platform: { label: "Platform", tint: "bg-tint-purple", color: "text-[oklch(0.65_0.2_295)]", icon: LayoutDashboard },
  ops: { label: "Operations", tint: "bg-tint-green", color: "text-success", icon: Building2 },
  security: { label: "Security", tint: "bg-tint-orange", color: "text-warning", icon: ShieldCheck },
  family_gov: { label: "Family Core", tint: "bg-tint-blue", color: "text-brand", icon: HeartPulse },
  guard: { label: "STOS Guard", tint: "bg-tint-green", color: "text-success", icon: Smartphone },
};

function WorkspacesPage() {
  const fn = useServerFn(listMyWorkspaces);
  const { data, isLoading } = useQuery({ queryKey: ["my-workspaces"], queryFn: () => fn() });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">STOS Life Platform</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Chọn workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi workspace tương ứng với một vai trò bạn đang nắm giữ.
          </p>
        </header>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Đang tải workspace...</div>
        )}

        {!isLoading && (data?.items.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Bạn chưa có workspace nào. Hệ thống sẽ tạo workspace Cư dân mặc định khi bạn vào{" "}
              <Link to="/portal" className="text-brand font-medium">Cổng gia đình</Link>.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {data?.items.map((w) => {
            const meta = KIND_META[w.kind];
            const Icon = meta.icon;
            return (
              <Link
                key={`${w.kind}:${w.id}`}
                to={w.to}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition px-4 py-4"
              >
                <div className={cn("h-11 w-11 rounded-xl grid place-items-center", meta.tint)}>
                  <Icon className={cn("h-5 w-5", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold truncate">{w.name}</p>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
                      {meta.label}
                    </span>
                  </div>
                  {w.subtitle && (
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                      {w.subtitle}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
