import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { PLATFORM_NAV } from "@/constants/workspace-nav";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { Building2 } from "lucide-react";

const ALLOWED = ["super_admin", "platform_ops", "billing_admin", "support", "auditor", "tenant_admin"];
const CLOUD_ALLOWED = ["super_admin", "saas_admin", "tenant_admin"] as const;

export const Route = createFileRoute("/console")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .in("role", CLOUD_ALLOWED);
    if (!roles || roles.length === 0) throw redirect({ to: "/workspaces" });
  },
  head: () => ({ meta: [{ title: "STOS Life · Platform Console" }] }),
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const { user } = useMockAuth();
  const allowed = user && ALLOWED.includes(user.role);
  return (
    <ConsoleShell
      title="Platform Console"
      subtitle="Quản trị nền tảng STOS Life đa tenant"
      nav={PLATFORM_NAV}
      brand={{ title: "STOS Platform", subtitle: "Residential Community OS", icon: Building2 }}
    >
      {allowed ? (
        <Outlet />
      ) : (
        <div className="p-10 max-w-xl mx-auto text-center">
          <h2 className="text-[18px] font-semibold">Bạn không có quyền truy cập Platform Console</h2>
          <p className="text-[13px] text-muted-foreground mt-2">
            Console dành cho Super Admin, Platform Ops, Billing, Support, Auditor và Tenant Admin.
          </p>
        </div>
      )}
    </ConsoleShell>
  );
}
