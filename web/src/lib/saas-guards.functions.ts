import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SaasGuard = {
  guard_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: "security_admin" | "security_staff" | string;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  on_shift_today: boolean;
  next_shift_at: string | null;
};

export type SaasGuardShift = {
  shift_id: string;
  guard_id: string;
  guard_name: string | null;
  guard_avatar: string | null;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  shift_date: string;
  shift_type: "morning" | "afternoon" | "night" | string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "checked_in" | "checked_out" | "missed" | "cancelled" | string;
};

export const listSaasGuards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SaasGuard[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("list_all_guards");
    if (error) throw new Error(error.message);
    return (data ?? []) as SaasGuard[];
  });

const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listSaasGuardShifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }): Promise<SaasGuardShift[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("list_all_guard_shifts", {
      _from: data.from,
      _to: data.to,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as SaasGuardShift[];
  });
