import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { SECURITY_NAV } from "@/constants/workspace-nav";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { Shield } from "lucide-react";

const ALLOWED = [
  "super_admin", "tenant_admin",
  "security_director", "security_supervisor", "guard_captain", "security_guard", "patrol",
];
const CLOUD_ALLOWED = ["super_admin", "saas_admin", "tenant_admin", "security_admin", "security_staff"] as const;

export const Route = createFileRoute("/security")({
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
  head: () => ({ meta: [{ title: "STOS Life · Security Operations" }] }),
  component: SecurityLayout,
});

function SecurityLayout() {
  const { user } = useMockAuth();
  const allowed = user && ALLOWED.includes(user.role);
  return (
    <ConsoleShell
      title="Security Operations Center"
      subtitle="Trung tâm chỉ huy an ninh & kiểm soát ra vào"
      nav={SECURITY_NAV}
      theme="dark"
      brand={{ title: "STOS Security", subtitle: "Command & Dispatch", icon: Shield }}
    >
      {allowed ? (
        <Outlet />
      ) : (
        <div className="p-10 max-w-xl mx-auto text-center text-white">
          <h2 className="text-[18px] font-semibold">Không có quyền truy cập Security Operations</h2>
          <p className="text-[13px] text-white/60 mt-2">
            Dành cho Security Director, Supervisor, Guard Captain, Security Guard, Patrol.
          </p>
        </div>
      )}
    </ConsoleShell>
  );
}
