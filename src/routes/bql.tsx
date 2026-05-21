import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { BqlProjectProvider, BqlProjectSelector } from "@/lib/bql-context";
import { BQL_NAV } from "@/constants/navigation";

export const Route = createFileRoute("/bql")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const allowed = (roles ?? []).some((r) =>
      ["super_admin", "saas_admin", "tenant_admin", "bql_manager", "bql_staff", "accountant", "security_admin", "security_staff"].includes(r.role as string),
    );
    if (!allowed) throw redirect({ to: "/workspaces" });
  },
  head: () => ({ meta: [{ title: "BQL Portal — STOS Life" }] }),
  component: BqlLayout,
});

function BqlLayout() {
  return (
    <BqlProjectProvider>
      <WorkspaceShell brand="STOS · BQL" subtitle="Ban quản lý" nav={BQL_NAV} headerRight={<BqlProjectSelector />}>
        <Outlet />
      </WorkspaceShell>
    </BqlProjectProvider>
  );
}
