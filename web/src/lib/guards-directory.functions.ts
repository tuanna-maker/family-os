import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export type ProjectGuard = {
  guard_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  on_shift_today: boolean;
  next_shift_at: string | null;
};

export type ProjectGuardShift = {
  shift_id: string;
  guard_id: string;
  guard_name: string | null;
  guard_avatar: string | null;
  shift_date: string;
  shift_type: "morning" | "afternoon" | "night" | string;
  start_at: string;
  end_at: string;
  status: string;
};

export const listProjectGuards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ project_id: string; guards: ProjectGuard[] }> => {
    const { supabase, userId } = context;
    const scope = await resolveResidentScope(supabase, userId);
    const { data, error } = await supabase.rpc("list_project_guards", {
      _project_id: scope.project_id,
    });
    if (error) throw new Error(error.message);
    return {
      project_id: scope.project_id,
      guards: (data ?? []) as ProjectGuard[],
    };
  });

const scheduleSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listProjectGuardSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scheduleSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ project_id: string; shifts: ProjectGuardShift[] }> => {
    const { supabase, userId } = context;
    const scope = await resolveResidentScope(supabase, userId);
    const { data: rows, error } = await supabase.rpc("list_project_guard_shifts", {
      _project_id: scope.project_id,
      _from: data.from,
      _to: data.to,
    });
    if (error) throw new Error(error.message);
    return {
      project_id: scope.project_id,
      shifts: (rows ?? []) as ProjectGuardShift[],
    };
  });
