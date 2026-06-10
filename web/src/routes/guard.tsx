import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const CLOUD_GUARD_ROLES = [
  "super_admin",
  "saas_admin",
  "tenant_admin",
  "security_admin",
  "security_staff",
] as const;

export const Route = createFileRoute("/guard")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as Record<string, string> });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .in("role", CLOUD_GUARD_ROLES);
    if (!roles?.length) throw redirect({ to: "/workspaces" });
  },
  head: () => ({
    meta: [
      { title: "STOS Guard — Ca trực & tuần tra" },
      {
        name: "description",
        content: "Ứng dụng mobile cho đội bảo vệ: ca trực, tuần tra, quét QR, nhiệm vụ.",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
  }),
  component: GuardLayout,
});

function GuardLayout() {
  return <Outlet />;
}
