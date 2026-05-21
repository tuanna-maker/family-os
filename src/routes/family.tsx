import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { FAMILY_NAV } from "@/constants/workspace-nav";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { HeartPulse } from "lucide-react";

const ALLOWED = ["super_admin", "tenant_admin", "bql_manager"];
const CLOUD_ALLOWED = ["super_admin", "saas_admin", "tenant_admin", "bql_manager"] as const;

export const Route = createFileRoute("/family")({
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
  head: () => ({ meta: [{ title: "STOS Life · Family Core Governance" }] }),
  component: FamilyLayout,
});

function FamilyLayout() {
  const { user } = useMockAuth();
  const allowed = user && ALLOWED.includes(user.role);
  return (
    <ConsoleShell
      title="Family Core Governance"
      subtitle="Quản trị nhiều hộ gia đình trên nền tảng"
      nav={FAMILY_NAV}
      brand={{ title: "STOS Family Core", subtitle: "Household Registry & Services", icon: HeartPulse }}
    >
      {allowed ? (
        <Outlet />
      ) : (
        <div className="p-10 max-w-xl mx-auto text-center">
          <h2 className="text-[18px] font-semibold">Không có quyền truy cập Family Core</h2>
          <p className="text-[13px] text-muted-foreground mt-2">
            Family Core governance dành cho Super Admin, Tenant Admin, BQL Manager.
          </p>
        </div>
      )}
    </ConsoleShell>
  );
}
