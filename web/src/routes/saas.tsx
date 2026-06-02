import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { SAAS_NAV } from "@/constants/navigation";

export const Route = createFileRoute("/saas")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .in("role", ["super_admin", "saas_admin", "saas_support"]);
    if (!roles || roles.length === 0) throw redirect({ to: "/workspaces" });
  },
  head: () => ({ meta: [{ title: "SaaS Admin — STOS Life" }] }),
  component: SaasLayout,
});

function SaasLayout() {
  return (
    <WorkspaceShell brand="STOS · SaaS Admin" subtitle="Quản trị nền tảng" nav={SAAS_NAV}>
      <Outlet />
    </WorkspaceShell>
  );
}
