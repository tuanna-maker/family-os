import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Resolve accessible project_ids for current user (BQL or SaaS scope). */
async function resolveScope(
  supabase: any,
  userId: string,
): Promise<{ isSaas: boolean; projectIds: string[] }> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, project_id, tenant_id")
    .eq("user_id", userId);
  const rs = roles ?? [];
  const isSaas = rs.some((r: any) => r.role === "super_admin" || r.role === "saas_admin");
  const bqlProjectIds: string[] = Array.from(
    new Set(
      rs
        .filter((r: any) => (r.role === "bql_manager" || r.role === "bql_staff") && r.project_id)
        .map((r: any) => r.project_id as string),
    ),
  );
  const tenantIds: string[] = Array.from(
    new Set(rs.filter((r: any) => r.role === "tenant_admin" && r.tenant_id).map((r: any) => r.tenant_id as string)),
  );
  let projectIds: string[] = bqlProjectIds;
  if (isSaas) {
    const { data: all } = await supabase.from("projects").select("id");
    projectIds = (all ?? []).map((p: any) => p.id as string);
  } else if (tenantIds.length > 0) {
    const { data: tp } = await supabase.from("projects").select("id").in("tenant_id", tenantIds);
    projectIds = Array.from(new Set([...projectIds, ...(tp ?? []).map((p: any) => p.id as string)]));
  }
  return { isSaas, projectIds };
}

export const listBqlProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ projects: Array<{ id: string; name: string; code: string }> }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { projects: [] };
    const { data } = await supabase
      .from("projects")
      .select("id, name, code")
      .in("id", projectIds)
      .order("name");
    return { projects: (data ?? []) as any };
  });

export type ResidentRow = {
  family_id: string;
  family_name: string;
  apartment_id: string;
  apartment_code: string;
  block_name: string | null;
  floor_number: number | null;
  project_id: string;
  project_name: string;
  relation: string;
  is_primary: boolean;
  move_in_date: string;
  move_out_date: string | null;
};

export const listBqlResidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; q?: string; activeOnly?: boolean } | undefined) =>
    z
      .object({ projectId: z.string().uuid().optional(), q: z.string().max(120).optional(), activeOnly: z.boolean().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: ResidentRow[]; projects: Array<{ id: string; name: string }> }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [], projects: [] };
    const scoped = data.projectId ? projectIds.filter((id) => id === data.projectId) : projectIds;
    if (scoped.length === 0) return { rows: [], projects: [] };

    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    const { data: aps } = await supabase
      .from("apartments")
      .select("id, code, project_id, floor_id, block_id")
      .in("project_id", scoped);
    const apIds = (aps ?? []).map((a: any) => a.id);
    if (apIds.length === 0) return { rows: [], projects: projects ?? [] };

    const blockIds = Array.from(new Set((aps ?? []).map((a: any) => a.block_id)));
    const floorIds = Array.from(new Set((aps ?? []).map((a: any) => a.floor_id)));
    const [{ data: blocks }, { data: floors }] = await Promise.all([
      supabase.from("blocks").select("id, name").in("id", blockIds),
      supabase.from("floors").select("id, floor_number").in("id", floorIds),
    ]);
    const blockMap = new Map((blocks ?? []).map((b: any) => [b.id, b.name]));
    const floorMap = new Map((floors ?? []).map((f: any) => [f.id, f.floor_number]));
    const apMap = new Map((aps ?? []).map((a: any) => [a.id, a]));
    const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

    let q = supabase
      .from("apartment_residents")
      .select("apartment_id, family_id, relation, is_primary, move_in_date, move_out_date")
      .in("apartment_id", apIds);
    if (data.activeOnly !== false) q = q.is("move_out_date", null);
    const { data: ars } = await q;

    const familyIds = Array.from(new Set((ars ?? []).map((r: any) => r.family_id)));
    const { data: fams } = familyIds.length
      ? await supabase.from("families").select("id, name").in("id", familyIds)
      : { data: [] as any[] };
    const famMap = new Map((fams ?? []).map((f: any) => [f.id, f.name]));

    let rows: ResidentRow[] = (ars ?? []).map((r: any) => {
      const ap = apMap.get(r.apartment_id) as any;
      return {
        family_id: r.family_id,
        family_name: famMap.get(r.family_id) ?? "—",
        apartment_id: r.apartment_id,
        apartment_code: ap?.code ?? "—",
        block_name: ap ? (blockMap.get(ap.block_id) as any) ?? null : null,
        floor_number: ap ? (floorMap.get(ap.floor_id) as any) ?? null : null,
        project_id: ap?.project_id ?? "",
        project_name: projectMap.get(ap?.project_id) ?? "—",
        relation: r.relation,
        is_primary: !!r.is_primary,
        move_in_date: r.move_in_date,
        move_out_date: r.move_out_date,
      };
    });
    if (data.q) {
      const needle = data.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.family_name.toLowerCase().includes(needle) ||
          r.apartment_code.toLowerCase().includes(needle) ||
          (r.block_name ?? "").toLowerCase().includes(needle),
      );
    }
    rows.sort((a, b) => a.project_name.localeCompare(b.project_name) || a.apartment_code.localeCompare(b.apartment_code));
    return { rows, projects: projects ?? [] };
  });

export type ApartmentRow = {
  id: string;
  code: string;
  project_id: string;
  project_name: string;
  block_name: string | null;
  floor_number: number | null;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  residents: number;
};

export const listBqlApartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; q?: string; status?: string } | undefined) =>
    z
      .object({
        projectId: z.string().uuid().optional(),
        q: z.string().max(120).optional(),
        status: z.enum(["available", "occupied", "maintenance", "reserved"]).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: ApartmentRow[]; projects: Array<{ id: string; name: string }> }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [], projects: [] };
    const scoped = data.projectId ? projectIds.filter((id) => id === data.projectId) : projectIds;

    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    let q = supabase
      .from("apartments")
      .select("id, code, project_id, block_id, floor_id, area_m2, bedrooms, bathrooms, status")
      .in("project_id", scoped);
    if (data.status) q = q.eq("status", data.status);
    const { data: aps } = await q;

    const blockIds = Array.from(new Set((aps ?? []).map((a: any) => a.block_id)));
    const floorIds = Array.from(new Set((aps ?? []).map((a: any) => a.floor_id)));
    const apIds = (aps ?? []).map((a: any) => a.id);
    const [{ data: blocks }, { data: floors }, { data: ars }] = await Promise.all([
      blockIds.length
        ? supabase.from("blocks").select("id, name").in("id", blockIds)
        : Promise.resolve({ data: [] as any[] }),
      floorIds.length
        ? supabase.from("floors").select("id, floor_number").in("id", floorIds)
        : Promise.resolve({ data: [] as any[] }),
      apIds.length
        ? supabase
            .from("apartment_residents")
            .select("apartment_id, move_out_date")
            .in("apartment_id", apIds)
            .is("move_out_date", null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const blockMap = new Map((blocks ?? []).map((b: any) => [b.id, b.name]));
    const floorMap = new Map((floors ?? []).map((f: any) => [f.id, f.floor_number]));
    const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));
    const residentCount = new Map<string, number>();
    for (const r of ars ?? []) residentCount.set(r.apartment_id, (residentCount.get(r.apartment_id) ?? 0) + 1);

    let rows: ApartmentRow[] = (aps ?? []).map((a: any) => ({
      id: a.id,
      code: a.code,
      project_id: a.project_id,
      project_name: projectMap.get(a.project_id) ?? "—",
      block_name: (blockMap.get(a.block_id) as any) ?? null,
      floor_number: (floorMap.get(a.floor_id) as any) ?? null,
      area_m2: a.area_m2,
      bedrooms: a.bedrooms,
      bathrooms: a.bathrooms,
      status: a.status,
      residents: residentCount.get(a.id) ?? 0,
    }));
    if (data.q) {
      const needle = data.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(needle) ||
          (r.block_name ?? "").toLowerCase().includes(needle) ||
          r.project_name.toLowerCase().includes(needle),
      );
    }
    rows.sort(
      (a, b) =>
        a.project_name.localeCompare(b.project_name) ||
        (a.block_name ?? "").localeCompare(b.block_name ?? "") ||
        (a.floor_number ?? 0) - (b.floor_number ?? 0) ||
        a.code.localeCompare(b.code),
    );
    return { rows, projects: projects ?? [] };
  });

export type ServiceRequestRow = {
  id: string;
  project_id: string;
  project_name: string;
  apartment_code: string | null;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export const listBqlRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; status?: string } | undefined) =>
    z
      .object({
        projectId: z.string().uuid().optional(),
        status: z.enum(["open", "in_progress", "resolved", "closed", "all"]).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: ServiceRequestRow[]; projects: Array<{ id: string; name: string }> }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [], projects: [] };
    const scoped = data.projectId ? projectIds.filter((id) => id === data.projectId) : projectIds;

    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    let q = supabase
      .from("service_requests")
      .select("id, project_id, apartment_id, title, category, priority, status, created_at, resolved_at")
      .in("project_id", scoped)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: reqs } = await q;

    const apIds = Array.from(new Set((reqs ?? []).map((r: any) => r.apartment_id).filter(Boolean)));
    const { data: aps } = apIds.length
      ? await supabase.from("apartments").select("id, code").in("id", apIds)
      : { data: [] as any[] };
    const apMap = new Map((aps ?? []).map((a: any) => [a.id, a.code]));
    const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

    const rows: ServiceRequestRow[] = (reqs ?? []).map((r: any) => ({
      id: r.id,
      project_id: r.project_id,
      project_name: projectMap.get(r.project_id) ?? "—",
      apartment_code: r.apartment_id ? (apMap.get(r.apartment_id) as any) ?? null : null,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
    }));
    return { rows, projects: projects ?? [] };
  });

export const updateServiceRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["open", "in_progress", "resolved", "closed"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const resolved_at =
      data.status === "resolved" || data.status === "closed" ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("service_requests")
      .update({ status: data.status, resolved_at })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
