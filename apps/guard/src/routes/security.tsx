import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@shared/supabase/client";
import { Shield } from "lucide-react";

const CLOUD_ALLOWED = ["super_admin", "saas_admin", "tenant_admin", "security_admin", "security_staff"] as const;

export const Route = createFileRoute("/security")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } as any });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .in("role", [...CLOUD_ALLOWED]);
    if (!roles?.length) throw redirect({ to: "/guard" });
  },
  component: SecurityLayout,
});

function SecurityLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-400" />
        <div>
          <p className="text-sm font-semibold">Trung tâm điều hành an ninh</p>
          <p className="text-[10px] text-white/50">SOC · SOS dispatch</p>
        </div>
        <Link to="/guard" className="ml-auto text-xs text-white/60 hover:text-white">
          ← Bảo vệ
        </Link>
      </header>
      <main className="p-4 max-w-3xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
