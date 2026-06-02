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

export type BlockRow = {
  id: string;
  code: string;
  name: string;
  project_id: string;
  project_name: string;
  total_floors: number | null;
  floors_count: number;
  apartments_count: number;
  occupied_count: number;
};

export const listBqlBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; q?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional(), q: z.string().max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: BlockRow[]; projects: Array<{ id: string; name: string }> }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [], projects: [] };
    const scoped = data.projectId ? projectIds.filter((id) => id === data.projectId) : projectIds;
    if (scoped.length === 0) return { rows: [], projects: [] };

    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    const { data: blocks } = await supabase
      .from("blocks")
      .select("id, code, name, project_id, total_floors")
      .in("project_id", scoped);
    const blockIds = (blocks ?? []).map((b: any) => b.id);
    const [{ data: floors }, { data: aps }] = await Promise.all([
      blockIds.length
        ? supabase.from("floors").select("id, block_id").in("block_id", blockIds)
        : Promise.resolve({ data: [] as any[] }),
      blockIds.length
        ? supabase.from("apartments").select("id, block_id, status").in("block_id", blockIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const floorCount = new Map<string, number>();
    for (const f of floors ?? []) floorCount.set(f.block_id, (floorCount.get(f.block_id) ?? 0) + 1);
    const apCount = new Map<string, number>();
    const occCount = new Map<string, number>();
    for (const a of aps ?? []) {
      apCount.set(a.block_id, (apCount.get(a.block_id) ?? 0) + 1);
      if (a.status === "occupied") occCount.set(a.block_id, (occCount.get(a.block_id) ?? 0) + 1);
    }
    const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

    let rows: BlockRow[] = (blocks ?? []).map((b: any) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      project_id: b.project_id,
      project_name: projectMap.get(b.project_id) ?? "—",
      total_floors: b.total_floors,
      floors_count: floorCount.get(b.id) ?? 0,
      apartments_count: apCount.get(b.id) ?? 0,
      occupied_count: occCount.get(b.id) ?? 0,
    }));
    if (data.q) {
      const n = data.q.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(n) || r.code.toLowerCase().includes(n) || r.project_name.toLowerCase().includes(n),
      );
    }
    rows.sort((a, b) => a.project_name.localeCompare(b.project_name) || a.name.localeCompare(b.name));
    return { rows, projects: projects ?? [] };
  });

export type FamilyRow = {
  id: string;
  name: string;
  owner_id: string;
  apartments: Array<{ apartment_id: string; code: string; project_id: string; project_name: string; is_primary: boolean; relation: string }>;
  apartments_count: number;
  members_count: number;
  primary_project_id: string | null;
  primary_project_name: string | null;
  primary_apartment_code: string | null;
  created_at: string;
};

export const listBqlFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; q?: string } | undefined) =>
    z.object({ projectId: z.string().uuid().optional(), q: z.string().max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: FamilyRow[] }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [] };
    const scoped = data.projectId ? projectIds.filter((id) => id === data.projectId) : projectIds;
    if (scoped.length === 0) return { rows: [] };

    const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
    const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

    const { data: aps } = await supabase
      .from("apartments")
      .select("id, code, project_id")
      .in("project_id", scoped);
    const apIds = (aps ?? []).map((a: any) => a.id);
    if (apIds.length === 0) return { rows: [] };
    const apMap = new Map((aps ?? []).map((a: any) => [a.id, a]));

    const { data: ars } = await supabase
      .from("apartment_residents")
      .select("apartment_id, family_id, relation, is_primary, move_out_date")
      .in("apartment_id", apIds)
      .is("move_out_date", null);

    const familyIds = Array.from(new Set((ars ?? []).map((r: any) => r.family_id)));
    if (familyIds.length === 0) return { rows: [] };

    const [{ data: fams }, { data: members }] = await Promise.all([
      supabase.from("families").select("id, name, owner_id, created_at").in("id", familyIds),
      supabase.from("family_members").select("family_id").in("family_id", familyIds),
    ]);
    const memberCount = new Map<string, number>();
    for (const m of members ?? []) memberCount.set(m.family_id, (memberCount.get(m.family_id) ?? 0) + 1);

    const byFamily = new Map<string, FamilyRow["apartments"]>();
    for (const r of ars ?? []) {
      const ap = apMap.get(r.apartment_id) as any;
      if (!ap) continue;
      const arr = byFamily.get(r.family_id) ?? [];
      arr.push({
        apartment_id: r.apartment_id,
        code: ap.code,
        project_id: ap.project_id,
        project_name: projectMap.get(ap.project_id) ?? "—",
        is_primary: !!r.is_primary,
        relation: r.relation,
      });
      byFamily.set(r.family_id, arr);
    }

    let rows: FamilyRow[] = (fams ?? []).map((f: any) => {
      const aps = byFamily.get(f.id) ?? [];
      const primary = aps.find((a) => a.is_primary) ?? aps[0];
      return {
        id: f.id,
        name: f.name,
        owner_id: f.owner_id,
        apartments: aps,
        apartments_count: aps.length,
        members_count: memberCount.get(f.id) ?? 0,
        primary_project_id: primary?.project_id ?? null,
        primary_project_name: primary?.project_name ?? null,
        primary_apartment_code: primary?.code ?? null,
        created_at: f.created_at,
      };
    });

    if (data.q) {
      const n = data.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(n) ||
          (r.primary_apartment_code ?? "").toLowerCase().includes(n) ||
          r.apartments.some((a) => a.code.toLowerCase().includes(n)),
      );
    }
    rows.sort((a, b) => (a.primary_project_name ?? "").localeCompare(b.primary_project_name ?? "") || a.name.localeCompare(b.name));
    return { rows };
  });

// ============== Phí dịch vụ ==============
export type FeeRow = {
  id: string;
  project_id: string;
  project_name: string;
  apartment_id: string;
  apartment_code: string;
  fee_type: string;
  period: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  note: string | null;
};
export type FeePaymentRow = {
  id: string;
  fee_id: string;
  receipt_no: string;
  amount: number;
  method: string;
  reference: string | null;
  paid_at: string;
};

export const listBqlFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; status?: string; feeType?: string; q?: string } | undefined) =>
    z.object({
      projectId: z.string().uuid().optional(),
      status: z.enum(["unpaid","partial","paid","overdue","waived"]).optional(),
      feeType: z.enum(["management","parking","electricity","water","internet","other"]).optional(),
      q: z.string().max(120).optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: FeeRow[]; totals: { total: number; paid: number; due: number } }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [], totals: { total: 0, paid: 0, due: 0 } };
    const scoped = data.projectId ? projectIds.filter((id) => id === data.projectId) : projectIds;
    if (scoped.length === 0) return { rows: [], totals: { total: 0, paid: 0, due: 0 } };

    let q = supabase
      .from("apartment_fees")
      .select("id, project_id, apartment_id, fee_type, period, amount, paid_amount, due_date, status, note")
      .in("project_id", scoped)
      .order("due_date", { ascending: false })
      .limit(500);
    if (data.status) q = q.eq("status", data.status);
    if (data.feeType) q = q.eq("fee_type", data.feeType);
    const { data: fees, error } = await q;
    if (error) throw new Error(error.message);

    const apIds = Array.from(new Set((fees ?? []).map((f: any) => f.apartment_id)));
    const [{ data: aps }, { data: projects }] = await Promise.all([
      apIds.length ? supabase.from("apartments").select("id, code").in("id", apIds) : Promise.resolve({ data: [] as any[] }),
      supabase.from("projects").select("id, name").in("id", scoped),
    ]);
    const apMap = new Map((aps ?? []).map((a: any) => [a.id, a.code]));
    const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

    let rows: FeeRow[] = (fees ?? []).map((f: any) => ({
      id: f.id,
      project_id: f.project_id,
      project_name: projectMap.get(f.project_id) ?? "—",
      apartment_id: f.apartment_id,
      apartment_code: (apMap.get(f.apartment_id) as any) ?? "—",
      fee_type: f.fee_type,
      period: f.period,
      amount: Number(f.amount),
      paid_amount: Number(f.paid_amount),
      due_date: f.due_date,
      status: f.status,
      note: f.note,
    }));
    if (data.q) {
      const n = data.q.toLowerCase();
      rows = rows.filter((r) => r.apartment_code.toLowerCase().includes(n) || r.period.toLowerCase().includes(n) || r.project_name.toLowerCase().includes(n));
    }
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const paid = rows.reduce((s, r) => s + r.paid_amount, 0);
    return { rows, totals: { total, paid, due: total - paid } };
  });

export const listBqlFeePayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { feeId: string }) => z.object({ feeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ rows: FeePaymentRow[] }> => {
    const { supabase } = context;
    const { data: ps, error } = await supabase
      .from("fee_payments")
      .select("id, fee_id, receipt_no, amount, method, reference, paid_at")
      .eq("fee_id", data.feeId)
      .order("paid_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: (ps ?? []).map((p: any) => ({ ...p, amount: Number(p.amount) })) };
  });

export const recordBqlFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      feeId: z.string().uuid(),
      amount: z.number().positive().max(1e10),
      method: z.enum(["cash","bank_transfer","vietqr","card","wallet"]),
      reference: z.string().max(80).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: fee, error: fErr } = await supabase
      .from("apartment_fees")
      .select("id, project_id, apartment_id, amount, paid_amount, status")
      .eq("id", data.feeId).single();
    if (fErr || !fee) throw new Error(fErr?.message ?? "Không tìm thấy phí");

    const receiptNo = `BL${new Date().getFullYear()}${String(Date.now() % 100000).padStart(5,"0")}`;
    const { error: pErr } = await supabase.from("fee_payments").insert({
      fee_id: fee.id, project_id: fee.project_id, apartment_id: fee.apartment_id,
      receipt_no: receiptNo, amount: data.amount, method: data.method,
      reference: data.reference ?? null, received_by: userId,
    });
    if (pErr) throw new Error(pErr.message);

    const newPaid = Number(fee.paid_amount) + data.amount;
    const newStatus = newPaid >= Number(fee.amount) ? "paid" : newPaid > 0 ? "partial" : fee.status;
    const { error: uErr } = await supabase
      .from("apartment_fees")
      .update({ paid_amount: newPaid, status: newStatus })
      .eq("id", fee.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true as const, receiptNo, newPaid, newStatus };
  });


// ============================== Module 7: Khách & xe ==============================

export type VisitorPassRow = {
  id: string;
  pass_code: string;
  guest_name: string;
  guest_phone: string | null;
  vehicle_plate: string | null;
  purpose: string | null;
  status: string;
  valid_from: string;
  valid_until: string;
  scanned_at: string | null;
  project_id: string | null;
  project_name: string;
  apartment_id: string | null;
  apartment_code: string | null;
  host_user_id: string;
  host_name: string;
  created_at: string;
};

export const listBqlVisitorPasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; status?: string; q?: string }) => input ?? {})
  .handler(async ({ data, context }): Promise<{ rows: VisitorPassRow[] }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [] };
    const allowed = data.projectId ? (projectIds.includes(data.projectId) ? [data.projectId] : []) : projectIds;
    if (allowed.length === 0) return { rows: [] };

    let q = supabase
      .from("visitor_passes")
      .select("id, pass_code, guest_name, guest_phone, vehicle_plate, purpose, status, valid_from, valid_until, scanned_at, project_id, apartment_id, host_user_id, created_at")
      .in("project_id", allowed)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: passes, error } = await q;
    if (error) throw new Error(error.message);

    const aIds = Array.from(new Set((passes ?? []).map((p: any) => p.apartment_id).filter(Boolean)));
    const pIds = Array.from(new Set((passes ?? []).map((p: any) => p.project_id).filter(Boolean)));
    const hIds = Array.from(new Set((passes ?? []).map((p: any) => p.host_user_id).filter(Boolean)));

    const [{ data: apts }, { data: projs }, { data: profs }] = await Promise.all([
      aIds.length ? supabase.from("apartments").select("id, code").in("id", aIds) : Promise.resolve({ data: [] }),
      pIds.length ? supabase.from("projects").select("id, name").in("id", pIds) : Promise.resolve({ data: [] }),
      hIds.length ? supabase.from("profiles").select("id, full_name").in("id", hIds) : Promise.resolve({ data: [] }),
    ]);
    const aMap = new Map((apts ?? []).map((x: any) => [x.id, x.code]));
    const pMap = new Map((projs ?? []).map((x: any) => [x.id, x.name]));
    const hMap = new Map((profs ?? []).map((x: any) => [x.id, x.full_name]));

    let rows: VisitorPassRow[] = (passes ?? []).map((p: any) => ({
      id: p.id,
      pass_code: p.pass_code,
      guest_name: p.guest_name,
      guest_phone: p.guest_phone,
      vehicle_plate: p.vehicle_plate,
      purpose: p.purpose,
      status: p.status,
      valid_from: p.valid_from,
      valid_until: p.valid_until,
      scanned_at: p.scanned_at,
      project_id: p.project_id,
      project_name: pMap.get(p.project_id) ?? "—",
      apartment_id: p.apartment_id,
      apartment_code: aMap.get(p.apartment_id) ?? null,
      host_user_id: p.host_user_id,
      host_name: hMap.get(p.host_user_id) ?? "—",
      created_at: p.created_at,
    }));
    if (data.q) {
      const Q = data.q.toLowerCase();
      rows = rows.filter((r) =>
        r.guest_name.toLowerCase().includes(Q) ||
        (r.vehicle_plate ?? "").toLowerCase().includes(Q) ||
        (r.pass_code ?? "").toLowerCase().includes(Q) ||
        (r.apartment_code ?? "").toLowerCase().includes(Q) ||
        (r.guest_phone ?? "").toLowerCase().includes(Q));
    }
    return { rows };
  });

export const updateVisitorPassStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "used", "expired", "cancelled"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = { status: data.status };
    if (data.status === "used") patch.scanned_at = new Date().toISOString();
    const { error } = await supabase.from("visitor_passes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================== Module 8: An ninh & Sự cố ==============================

export type IncidentRow = {
  id: string; type: string; severity: string; title: string; description: string | null;
  location: string | null; status: string; resolved_at: string | null; created_at: string;
  project_id: string | null; project_name: string;
  reporter_id: string | null; reporter_name: string;
  assigned_to: string | null; assigned_name: string;
};

export const listBqlIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; status?: string; severity?: string; q?: string }) => input ?? {})
  .handler(async ({ data, context }): Promise<{ rows: IncidentRow[] }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { rows: [] };
    const allowed = data.projectId ? (projectIds.includes(data.projectId) ? [data.projectId] : []) : projectIds;
    if (allowed.length === 0) return { rows: [] };
    let q = supabase.from("incidents").select("*").in("project_id", allowed).order("created_at", { ascending: false }).limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
    const { data: items, error } = await q;
    if (error) throw new Error(error.message);
    const pIds = Array.from(new Set((items ?? []).map((x: any) => x.project_id).filter(Boolean)));
    const uIds = Array.from(new Set((items ?? []).flatMap((x: any) => [x.reporter_id, x.assigned_to]).filter(Boolean)));
    const [{ data: projs }, { data: profs }] = await Promise.all([
      pIds.length ? supabase.from("projects").select("id, name").in("id", pIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabase.from("profiles").select("id, full_name").in("id", uIds) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((projs ?? []).map((x: any) => [x.id, x.name]));
    const uMap = new Map((profs ?? []).map((x: any) => [x.id, x.full_name]));
    let rows: IncidentRow[] = (items ?? []).map((x: any) => ({
      id: x.id, type: x.type, severity: x.severity, title: x.title, description: x.description,
      location: x.location, status: x.status, resolved_at: x.resolved_at, created_at: x.created_at,
      project_id: x.project_id, project_name: pMap.get(x.project_id) ?? "—",
      reporter_id: x.reporter_id, reporter_name: uMap.get(x.reporter_id) ?? "—",
      assigned_to: x.assigned_to, assigned_name: uMap.get(x.assigned_to) ?? "—",
    }));
    if (data.q) {
      const Q = data.q.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(Q) || (r.location ?? "").toLowerCase().includes(Q) || r.project_name.toLowerCase().includes(Q));
    }
    return { rows };
  });

export const updateIncidentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "investigating", "resolved", "closed"]),
    resolution_notes: z.string().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const patch: any = { status: data.status };
    if (data.status === "resolved" || data.status === "closed") patch.resolved_at = new Date().toISOString();
    if (data.resolution_notes) patch.resolution_notes = data.resolution_notes;
    const { error } = await context.supabase.from("incidents").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SecurityRow = {
  total_incidents: number;
  open_incidents: number;
  critical_incidents: number;
  resolved_today: number;
  patrols_today: number;
  shifts_active: number;
  security_requests_open: number;
};

export const getBqlSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string }) => input ?? {})
  .handler(async ({ data, context }): Promise<SecurityRow & { recentIncidents: IncidentRow[]; activeShifts: Array<{ id: string; guard_name: string; shift_type: string; start_at: string; end_at: string; check_in_at: string | null; project_name: string }>; recentPatrols: Array<{ id: string; guard_name: string; checkpoint_code: string; scanned_at: string; project_name: string }> }> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    if (projectIds.length === 0) return { total_incidents: 0, open_incidents: 0, critical_incidents: 0, resolved_today: 0, patrols_today: 0, shifts_active: 0, security_requests_open: 0, recentIncidents: [], activeShifts: [], recentPatrols: [] };
    const allowed = data.projectId ? (projectIds.includes(data.projectId) ? [data.projectId] : []) : projectIds;
    if (allowed.length === 0) return { total_incidents: 0, open_incidents: 0, critical_incidents: 0, resolved_today: 0, patrols_today: 0, shifts_active: 0, security_requests_open: 0, recentIncidents: [], activeShifts: [], recentPatrols: [] };
    const today = new Date(); today.setHours(0,0,0,0);
    const todayIso = today.toISOString();

    const [incRes, srRes, shiftRes, patrolRes] = await Promise.all([
      supabase.from("incidents").select("id, project_id, status, severity, resolved_at, created_at").in("project_id", allowed),
      supabase.from("security_requests").select("id, status").eq("status", "open").in("project_id", allowed),
      supabase.from("guard_shifts").select("id, guard_id, shift_type, start_at, end_at, check_in_at, project_id, status").in("project_id", allowed).gte("end_at", new Date().toISOString()).order("start_at", { ascending: true }).limit(50),
      supabase.from("patrol_logs").select("id, guard_id, checkpoint_code, scanned_at, project_id").in("project_id", allowed).gte("scanned_at", todayIso).order("scanned_at", { ascending: false }).limit(20),
    ]);
    const incs = incRes.data ?? [];
    const shifts = (shiftRes.data ?? []).filter((s: any) => s.status === "scheduled" || s.status === "in_progress" || s.check_in_at);
    const patrols = patrolRes.data ?? [];

    const guardIds = Array.from(new Set([...shifts.map((s: any) => s.guard_id), ...patrols.map((p: any) => p.guard_id)].filter(Boolean)));
    const pIds = Array.from(new Set([...shifts.map((s: any) => s.project_id), ...patrols.map((p: any) => p.project_id)].filter(Boolean)));
    const [{ data: profs }, { data: projs }] = await Promise.all([
      guardIds.length ? supabase.from("profiles").select("id, full_name").in("id", guardIds) : Promise.resolve({ data: [] }),
      pIds.length ? supabase.from("projects").select("id, name").in("id", pIds) : Promise.resolve({ data: [] }),
    ]);
    const uMap = new Map((profs ?? []).map((x: any) => [x.id, x.full_name]));
    const pMap = new Map((projs ?? []).map((x: any) => [x.id, x.name]));

    // recent incidents — top 10
    const recent = incs.slice(0, 10);
    const recProjIds = Array.from(new Set(recent.map((x: any) => x.project_id).filter(Boolean)));
    const { data: recProjs } = recProjIds.length ? await supabase.from("projects").select("id, name").in("id", recProjIds) : { data: [] } as any;
    const rpMap = new Map((recProjs ?? []).map((x: any) => [x.id, x.name]));

    return {
      total_incidents: incs.length,
      open_incidents: incs.filter((x: any) => x.status === "open" || x.status === "investigating").length,
      critical_incidents: incs.filter((x: any) => x.severity === "critical" || x.severity === "high").length,
      resolved_today: incs.filter((x: any) => x.resolved_at && new Date(x.resolved_at) >= today).length,
      patrols_today: patrols.length,
      shifts_active: shifts.length,
      security_requests_open: (srRes.data ?? []).length,
      recentIncidents: recent.map((x: any) => ({
        id: x.id, type: "", severity: x.severity, title: "", description: null, location: null,
        status: x.status, resolved_at: x.resolved_at, created_at: x.created_at,
        project_id: x.project_id, project_name: (rpMap.get(x.project_id) as string) ?? "—",
        reporter_id: null, reporter_name: "—", assigned_to: null, assigned_name: "—",
      })),
      activeShifts: shifts.slice(0, 20).map((s: any) => ({
        id: s.id, guard_name: uMap.get(s.guard_id) ?? "—",
        shift_type: s.shift_type, start_at: s.start_at, end_at: s.end_at,
        check_in_at: s.check_in_at, project_name: pMap.get(s.project_id) ?? "—",
      })),
      recentPatrols: patrols.map((p: any) => ({
        id: p.id, guard_name: uMap.get(p.guard_id) ?? "—",
        checkpoint_code: p.checkpoint_code, scanned_at: p.scanned_at,
        project_name: pMap.get(p.project_id) ?? "—",
      })),
    };
  });

export type OperationsReport = {
  projects_count: number;
  apartments_count: number;
  residents_count: number;
  // Requests
  requests_total: number;
  requests_open: number;
  requests_in_progress: number;
  requests_done: number;
  requests_sla_breach: number;
  // Incidents
  incidents_total: number;
  incidents_open: number;
  incidents_critical: number;
  // Fees
  fees_total_amount: number;
  fees_paid_amount: number;
  fees_outstanding: number;
  fees_overdue_count: number;
  // Visitors
  visitor_passes_active: number;
  visitor_passes_used_30d: number;
  // Charts
  requests_by_category: Array<{ category: string; count: number }>;
  requests_trend_14d: Array<{ date: string; count: number }>;
  fees_by_project: Array<{ project_name: string; total: number; paid: number }>;
};

export const getBqlOperationsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string; days?: number }) => input ?? {})
  .handler(async ({ data, context }): Promise<OperationsReport> => {
    const { supabase, userId } = context;
    const { projectIds } = await resolveScope(supabase, userId);
    const empty: OperationsReport = {
      projects_count: 0, apartments_count: 0, residents_count: 0,
      requests_total: 0, requests_open: 0, requests_in_progress: 0, requests_done: 0, requests_sla_breach: 0,
      incidents_total: 0, incidents_open: 0, incidents_critical: 0,
      fees_total_amount: 0, fees_paid_amount: 0, fees_outstanding: 0, fees_overdue_count: 0,
      visitor_passes_active: 0, visitor_passes_used_30d: 0,
      requests_by_category: [], requests_trend_14d: [], fees_by_project: [],
    };
    if (projectIds.length === 0) return empty;
    const allowed = data.projectId ? (projectIds.includes(data.projectId) ? [data.projectId] : []) : projectIds;
    if (allowed.length === 0) return empty;

    const days = data.days ?? 30;
    const since = new Date(); since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();
    const today = new Date(); today.setHours(0,0,0,0);
    const trendStart = new Date(); trendStart.setDate(trendStart.getDate() - 13); trendStart.setHours(0,0,0,0);

    const [apRes, arRes, reqRes, incRes, feeRes, vpRes, projRes] = await Promise.all([
      supabase.from("apartments").select("id", { count: "exact", head: true }).in("project_id", allowed),
      supabase.from("apartment_residents").select("family_id", { count: "exact", head: true }).is("move_out_date", null),
      supabase.from("service_requests").select("id, category, status, created_at, due_at, project_id").in("project_id", allowed).gte("created_at", sinceIso),
      supabase.from("incidents").select("id, status, severity, created_at").in("project_id", allowed).gte("created_at", sinceIso),
      supabase.from("apartment_fees").select("id, amount, paid_amount, status, due_date, project_id").in("project_id", allowed),
      supabase.from("visitor_passes").select("id, status, scanned_at, project_id").in("project_id", allowed),
      supabase.from("projects").select("id, name").in("id", allowed),
    ]);

    const reqs = reqRes.data ?? [];
    const incs = incRes.data ?? [];
    const fees = feeRes.data ?? [];
    const vps = vpRes.data ?? [];
    const projMap = new Map((projRes.data ?? []).map((p: any) => [p.id, p.name]));

    // Requests by category
    const catMap = new Map<string, number>();
    for (const r of reqs) {
      const k = (r as any).category ?? "other";
      catMap.set(k, (catMap.get(k) ?? 0) + 1);
    }
    // Trend 14d
    const trend: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(trendStart); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ date: key, count: 0 });
    }
    for (const r of reqs) {
      const key = String((r as any).created_at).slice(0, 10);
      const slot = trend.find(t => t.date === key);
      if (slot) slot.count++;
    }
    // Fees by project
    const fpMap = new Map<string, { total: number; paid: number }>();
    for (const f of fees) {
      const pid = (f as any).project_id;
      const cur = fpMap.get(pid) ?? { total: 0, paid: 0 };
      cur.total += Number((f as any).amount) || 0;
      cur.paid += Number((f as any).paid_amount) || 0;
      fpMap.set(pid, cur);
    }
    const feesByProject = Array.from(fpMap.entries()).map(([pid, v]) => ({
      project_name: (projMap.get(pid) as string) ?? "—",
      total: v.total, paid: v.paid,
    })).sort((a, b) => b.total - a.total).slice(0, 8);

    const now = Date.now();
    const slaBreach = reqs.filter((r: any) => r.due_at && new Date(r.due_at).getTime() < now && r.status !== "done" && r.status !== "closed" && r.status !== "cancelled").length;

    const feesTotal = fees.reduce((s, f: any) => s + (Number(f.amount) || 0), 0);
    const feesPaid = fees.reduce((s, f: any) => s + (Number(f.paid_amount) || 0), 0);
    const overdue = fees.filter((f: any) => f.status !== "paid" && f.due_date && new Date(f.due_date) < today).length;

    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    return {
      projects_count: allowed.length,
      apartments_count: apRes.count ?? 0,
      residents_count: arRes.count ?? 0,
      requests_total: reqs.length,
      requests_open: reqs.filter((r: any) => r.status === "new" || r.status === "open").length,
      requests_in_progress: reqs.filter((r: any) => r.status === "in_progress" || r.status === "assigned").length,
      requests_done: reqs.filter((r: any) => r.status === "done" || r.status === "closed" || r.status === "resolved").length,
      requests_sla_breach: slaBreach,
      incidents_total: incs.length,
      incidents_open: incs.filter((i: any) => i.status === "open" || i.status === "investigating").length,
      incidents_critical: incs.filter((i: any) => i.severity === "critical" || i.severity === "high").length,
      fees_total_amount: feesTotal,
      fees_paid_amount: feesPaid,
      fees_outstanding: Math.max(0, feesTotal - feesPaid),
      fees_overdue_count: overdue,
      visitor_passes_active: vps.filter((v: any) => v.status === "active").length,
      visitor_passes_used_30d: vps.filter((v: any) => v.scanned_at && new Date(v.scanned_at) >= thirtyAgo).length,
      requests_by_category: Array.from(catMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      requests_trend_14d: trend,
      fees_by_project: feesByProject,
    };
  });
