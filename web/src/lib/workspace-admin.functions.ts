import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verify caller has BQL access to at least one project (or is saas admin). Returns accessible project ids. */
export const requireBql = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, project_id, tenant_id")
      .eq("user_id", userId);
    const rs = roles ?? [];
    const isSaas = rs.some((r) => r.role === "super_admin" || r.role === "saas_admin");
    const projectIds = Array.from(
      new Set(
        rs
          .filter((r) => (r.role === "bql_manager" || r.role === "bql_staff") && r.project_id)
          .map((r) => r.project_id!),
      ),
    );
    if (!isSaas && projectIds.length === 0) {
      throw new Error("Forbidden: BQL role required");
    }
    return { ok: true as const, isSaas, projectIds };
  });

/** Verify caller is SaaS admin (super_admin or saas_admin). */
export const requireSaasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "saas_admin"]);
    if (!data || data.length === 0) {
      throw new Error("Forbidden: SaaS admin role required");
    }
    return { ok: true as const };
  });

export type BqlOverview = {
  projects: Array<{
    id: string;
    name: string;
    code: string;
    city: string | null;
    apartments: number;
    occupied: number;
    blocks: number;
  }>;
  totals: { projects: number; apartments: number; occupied: number; openRequests: number };
};


export const getBqlOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<BqlOverview> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, project_id")
      .eq("user_id", userId);
    const rs = roles ?? [];
    const isSaas = rs.some((r) => r.role === "super_admin" || r.role === "saas_admin");
    const scopedIds = Array.from(
      new Set(
        rs
          .filter((r) => (r.role === "bql_manager" || r.role === "bql_staff") && r.project_id)
          .map((r) => r.project_id!),
      ),
    );

    let query = supabase.from("projects").select("id, name, code, city").eq("status", "active");
    if (!isSaas) query = query.in("id", scopedIds);
    if (data.projectId) query = query.eq("id", data.projectId);
    const { data: projects } = await query;

    const ids = (projects ?? []).map((p) => p.id);
    const apartmentsByProject: Record<string, { total: number; occupied: number }> = {};
    const blocksByProject: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: aps } = await supabase
        .from("apartments")
        .select("id, project_id, status")
        .in("project_id", ids);
      for (const a of aps ?? []) {
        const cur = apartmentsByProject[a.project_id] ?? { total: 0, occupied: 0 };
        cur.total += 1;
        if (a.status === "occupied") cur.occupied += 1;
        apartmentsByProject[a.project_id] = cur;
      }
      const { data: bls } = await supabase.from("blocks").select("id, project_id").in("project_id", ids);
      for (const b of bls ?? []) {
        blocksByProject[b.project_id] = (blocksByProject[b.project_id] ?? 0) + 1;
      }
    }

    const { count: openRequests } = await supabase
      .from("security_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    const out = (projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      city: p.city,
      apartments: apartmentsByProject[p.id]?.total ?? 0,
      occupied: apartmentsByProject[p.id]?.occupied ?? 0,
      blocks: blocksByProject[p.id] ?? 0,
    }));
    return {
      projects: out,
      totals: {
        projects: out.length,
        apartments: out.reduce((s, p) => s + p.apartments, 0),
        occupied: out.reduce((s, p) => s + p.occupied, 0),
        openRequests: openRequests ?? 0,
      },
    };
  });

export type SaasOverview = {
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    projects: number;
  }>;
  totals: { tenants: number; projects: number; apartments: number; users: number };
};

export const getSaasOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SaasOverview> => {
    const { supabase } = context;
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, slug, plan, status")
      .order("created_at", { ascending: false });
    const tenantIds = (tenants ?? []).map((t) => t.id);

    const projectsByTenant: Record<string, number> = {};
    let totalProjects = 0;
    if (tenantIds.length > 0) {
      const { data: pjs } = await supabase
        .from("projects")
        .select("id, tenant_id")
        .in("tenant_id", tenantIds);
      for (const p of pjs ?? []) {
        projectsByTenant[p.tenant_id] = (projectsByTenant[p.tenant_id] ?? 0) + 1;
        totalProjects += 1;
      }
    }

    const { count: aptCount } = await supabase
      .from("apartments")
      .select("id", { count: "exact", head: true });
    const { count: userCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    return {
      tenants: (tenants ?? []).map((t) => ({
        ...t,
        projects: projectsByTenant[t.id] ?? 0,
      })),
      totals: {
        tenants: tenants?.length ?? 0,
        projects: totalProjects,
        apartments: aptCount ?? 0,
        users: userCount ?? 0,
      },
    };
  });
