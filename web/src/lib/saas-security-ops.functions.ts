import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SaasSecurityRequest = {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  building: string | null;
  apartment: string | null;
  request_type: string;
  status: string;
  requester_id: string | null;
  requester_name: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_minutes: number | null;
};

export type SaasSecurityOpsSummary = {
  total: number;
  open_count: number;
  in_progress_count: number;
  resolved_count: number;
  cancelled_count: number;
  tenants_covered: number;
  projects_covered: number;
  mttr_minutes: number | null;
  ack_sla_minutes: number | null;
};

const filterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const listSaasSecurityRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d))
  .handler(async ({ data, context }): Promise<SaasSecurityRequest[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("list_saas_security_requests", {
      _from: data.from ?? null,
      _to: data.to ?? null,
      _tenant_id: data.tenant_id ?? null,
      _project_id: data.project_id ?? null,
      _status: data.status ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SaasSecurityRequest[];
  });

export const getSaasSecurityOpsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d))
  .handler(async ({ data, context }): Promise<SaasSecurityOpsSummary> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("saas_security_ops_summary", {
      _from: data.from ?? null,
      _to: data.to ?? null,
      _tenant_id: data.tenant_id ?? null,
      _project_id: data.project_id ?? null,
    } as never);
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return (row ?? {
      total: 0,
      open_count: 0,
      in_progress_count: 0,
      resolved_count: 0,
      cancelled_count: 0,
      tenants_covered: 0,
      projects_covered: 0,
      mttr_minutes: null,
      ack_sla_minutes: null,
    }) as SaasSecurityOpsSummary;
  });
