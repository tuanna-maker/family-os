import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { OPS_NAV } from "@/constants/workspace-nav";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { Building } from "lucide-react";

const ALLOWED = [
  "super_admin", "tenant_admin", "bql_manager", "bql_staff",
  "receptionist", "ops_staff", "tech_staff", "finance_staff",
];
const CLOUD_ALLOWED = ["super_admin", "saas_admin", "tenant_admin", "bql_manager", "bql_staff", "technician", "accountant"] as const;

export const Route = createFileRoute("/ops")({
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
  head: () => ({ meta: [{ title: "STOS Life · Operations Console" }] }),
  component: OpsLayout,
});

function OpsLayout() {
  const { user } = useMockAuth();
  const allowed = user && ALLOWED.includes(user.role);
  return (
    <ConsoleShell
      title="Operations Console"
      subtitle="Vận hành cộng đồng cư dân hằng ngày"
      nav={OPS_NAV}
      brand={{ title: "STOS Operations", subtitle: "Community Operations Center", icon: Building }}
    >
      {allowed ? (
        <Outlet />
      ) : (
        <div className="p-10 max-w-xl mx-auto text-center">
          <h2 className="text-[18px] font-semibold">Không có quyền truy cập Operations Console</h2>
          <p className="text-[13px] text-muted-foreground mt-2">
            Dành cho BQL, Lễ tân, Vận hành, Kỹ thuật, Kế toán.
          </p>
        </div>
      )}
    </ConsoleShell>
  );
}
