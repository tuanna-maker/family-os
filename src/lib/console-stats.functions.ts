import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlatformStats = {
  tenants: number;
  projects: number;
  blocks: number;
  apartments: number;
  residents: number;
  requests_open: number;
  incidents_open: number;
  security_open: number;
};

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformStats> => {
    const { supabase } = context;
    const head = { count: "exact" as const, head: true };
    const [t, p, b, a, ar, ro, ru, so] = await Promise.all([
      supabase.from("tenants").select("id", head),
      supabase.from("projects").select("id", head),
      supabase.from("blocks").select("id", head),
      supabase.from("apartments").select("id", head),
      supabase.from("apartment_residents").select("id", head).is("move_out_date", null),
      supabase.from("service_requests").select("id", head).eq("status", "open"),
      supabase.from("service_requests").select("id", head).eq("priority", "urgent").neq("status", "resolved"),
      supabase.from("security_requests").select("id", head).in("status", ["open", "in_progress"]),
    ]);
    return {
      tenants: t.count ?? 0,
      projects: p.count ?? 0,
      blocks: b.count ?? 0,
      apartments: a.count ?? 0,
      residents: ar.count ?? 0,
      requests_open: ro.count ?? 0,
      incidents_open: ru.count ?? 0,
      security_open: so.count ?? 0,
    };
  });

export type OpsStats = {
  open_requests: number;
  incidents_in_progress: number;
  occupancy_pct: number;
  occupancy_by_block: Array<{ block_id: string; name: string; total: number; occupied: number; pct: number }>;
  complaints: Array<{
    id: string; title: string; priority: string; status: string;
    apartment_code: string | null; created_at: string;
  }>;
  work_orders: Array<{
    id: string; title: string; category: string; status: string;
    apartment_code: string | null; created_at: string;
  }>;
};

export const getOpsStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpsStats> => {
    const { supabase } = context;
    const head = { count: "exact" as const, head: true };

    const [openReq, incidents, blocks, apartments, occupied, complaints, workOrders] = await Promise.all([
      supabase.from("service_requests").select("id", head).eq("status", "open"),
      supabase.from("service_requests").select("id", head)
        .in("status", ["open", "in_progress"])
        .in("category", ["security", "incident", "emergency"]),
      supabase.from("blocks").select("id, name"),
      supabase.from("apartments").select("id, block_id"),
      supabase.from("apartment_residents")
        .select("apartment_id, apartments!inner(block_id)")
        .is("move_out_date", null),
      supabase.from("service_requests")
        .select("id, title, priority, status, created_at, apartments(code)")
        .in("category", ["complaint", "noise", "general"])
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("service_requests")
        .select("id, title, category, status, created_at, apartments(code)")
        .in("category", ["maintenance", "technical", "cleaning", "elevator", "electrical"])
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    // Occupancy by block
    const apts = (apartments.data ?? []) as Array<{ id: string; block_id: string }>;
    const occ = (occupied.data ?? []) as Array<{ apartment_id: string; apartments: { block_id: string } | null }>;
    const totalByBlock = new Map<string, number>();
    const occByBlock = new Map<string, Set<string>>();
    for (const a of apts) totalByBlock.set(a.block_id, (totalByBlock.get(a.block_id) ?? 0) + 1);
    for (const o of occ) {
      const bid = o.apartments?.block_id;
      if (!bid) continue;
      if (!occByBlock.has(bid)) occByBlock.set(bid, new Set());
      occByBlock.get(bid)!.add(o.apartment_id);
    }
    const occupancy_by_block = (blocks.data ?? []).map((b: any) => {
      const total = totalByBlock.get(b.id) ?? 0;
      const occupied = occByBlock.get(b.id)?.size ?? 0;
      return {
        block_id: b.id,
        name: b.name,
        total,
        occupied,
        pct: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    });
    const totalAll = apts.length;
    const occAll = occ.length;
    const occupancy_pct = totalAll > 0 ? Math.round((occAll / totalAll) * 1000) / 10 : 0;

    const mapList = (rows: any[]) =>
      (rows ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        priority: r.priority,
        category: r.category,
        status: r.status,
        created_at: r.created_at,
        apartment_code: r.apartments?.code ?? null,
      }));

    return {
      open_requests: openReq.count ?? 0,
      incidents_in_progress: incidents.count ?? 0,
      occupancy_pct,
      occupancy_by_block,
      complaints: mapList(complaints.data ?? []),
      work_orders: mapList(workOrders.data ?? []),
    };
  });

// ---------- Detail lists ----------
export type RequestDetail = {
  id: string; title: string; description: string | null;
  priority: string; status: string; category: string;
  apartment_code: string | null; project_id: string | null;
  created_at: string; updated_at: string;
};

export const getOpsRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind?: "complaint" | "work_order" | "all" }) => ({
    kind: input?.kind ?? "all",
  }))
  .handler(async ({ context, data }): Promise<RequestDetail[]> => {
    const { supabase } = context;
    const COMPLAINT = ["complaint", "noise", "general"];
    const WORK = ["maintenance", "technical", "cleaning", "elevator", "electrical"];
    const cats = data.kind === "complaint" ? COMPLAINT
      : data.kind === "work_order" ? WORK
      : [...COMPLAINT, ...WORK];
    const { data: rows, error } = await supabase
      .from("service_requests")
      .select("id, title, description, priority, status, category, project_id, created_at, updated_at, apartments(code)")
      .in("category", cats)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id, title: r.title, description: r.description,
      priority: r.priority, status: r.status, category: r.category,
      project_id: r.project_id,
      apartment_code: r.apartments?.code ?? null,
      created_at: r.created_at, updated_at: r.updated_at,
    }));
  });
