import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "./auth.functions";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .limit(1);
  if (!data || data.length === 0) throw new Error("Forbidden: super_admin required");
}

export type RoleDistribution = Record<AppRole, number>;

export type SuperAdminStats = {
  users_total: number;
  users_30d: number;
  families_total: number;
  role_distribution: RoleDistribution;
  security: {
    open: number;
    in_progress: number;
    resolved_today: number;
    total_30d: number;
  };
  recent_role_changes: Array<{
    id: string;
    created_at: string;
    action: string;
    actor_name: string | null;
    target_id: string | null;
    target_name: string | null;
    role: AppRole | null;
  }>;
};

const ALL_ROLES: AppRole[] = [
  "super_admin",
  "family_owner",
  "family_member",
  "security_admin",
  "security_staff",
];

export const getSuperAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperAdminStats> => {
    const { supabase, userId } = context;
    await assertSuperAdmin(supabase, userId);

    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const [
      usersTotalRes,
      users30Res,
      familiesRes,
      rolesRes,
      secOpenRes,
      secInProgRes,
      secResolvedTodayRes,
      sec30Res,
      auditRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30),
      supabase.from("families").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("role"),
      supabase
        .from("security_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("security_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress"),
      supabase
        .from("security_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved")
        .gte("resolved_at", startToday.toISOString()),
      supabase
        .from("security_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30),
      supabase
        .from("audit_logs")
        .select("id, actor_id, action, target_id, metadata, created_at")
        .ilike("action", "role.%")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const role_distribution = ALL_ROLES.reduce((acc, r) => {
      acc[r] = 0;
      return acc;
    }, {} as RoleDistribution);
    for (const row of rolesRes.data ?? []) {
      const r = row.role as AppRole;
      if (r in role_distribution) role_distribution[r]++;
    }

    const auditRows = auditRes.data ?? [];
    const profileIds = Array.from(
      new Set(
        auditRows.flatMap((r: any) =>
          [r.actor_id, r.target_id].filter((v): v is string => !!v),
        ),
      ),
    );
    const nameMap = new Map<string, string>();
    if (profileIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds);
      (profs ?? []).forEach((p: any) => nameMap.set(p.id, p.full_name ?? ""));
    }

    return {
      users_total: usersTotalRes.count ?? 0,
      users_30d: users30Res.count ?? 0,
      families_total: familiesRes.count ?? 0,
      role_distribution,
      security: {
        open: secOpenRes.count ?? 0,
        in_progress: secInProgRes.count ?? 0,
        resolved_today: secResolvedTodayRes.count ?? 0,
        total_30d: sec30Res.count ?? 0,
      },
      recent_role_changes: auditRows.map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        action: r.action,
        actor_name: r.actor_id ? nameMap.get(r.actor_id) ?? null : null,
        target_id: r.target_id,
        target_name: r.target_id ? nameMap.get(r.target_id) ?? null : null,
        role: (r.metadata?.role as AppRole) ?? null,
      })),
    };
  });
