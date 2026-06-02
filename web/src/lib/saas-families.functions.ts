import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SaasFamily = {
  family_id: string;
  family_name: string | null;
  family_apartment: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
  apartment_id: string | null;
  apartment_code: string | null;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  plan: "free" | "premium" | string;
  ocr_monthly_quota: number;
  insights_enabled: boolean;
  expires_at: string | null;
  created_at: string;
};

export type SaasFamiliesSummary = {
  total_families: number;
  free_count: number;
  premium_count: number;
  expiring_soon: number;
  projects_covered: number;
  tenants_covered: number;
};

const filterSchema = z.object({
  tenant_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  plan: z.enum(["free", "premium"]).nullable().optional(),
});

export const listSaasFamilies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<SaasFamily[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("list_saas_families", {
      _tenant_id: data.tenant_id ?? null,
      _project_id: data.project_id ?? null,
      _plan: data.plan ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SaasFamily[];
  });

export const getSaasFamiliesSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<SaasFamiliesSummary> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("saas_families_summary", {
      _tenant_id: data.tenant_id ?? null,
      _project_id: data.project_id ?? null,
    } as never);
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return (row ?? {
      total_families: 0,
      free_count: 0,
      premium_count: 0,
      expiring_soon: 0,
      projects_covered: 0,
      tenants_covered: 0,
    }) as SaasFamiliesSummary;
  });

const setPlanSchema = z.object({
  family_id: z.string().uuid(),
  plan: z.enum(["free", "premium"]),
  days: z.number().int().min(1).max(3650).default(30),
});

export const setFamilyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlanSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("admin_set_entitlement", {
      _family_id: data.family_id,
      _plan: data.plan,
      _days: data.days,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
