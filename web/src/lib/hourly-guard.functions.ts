import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const HOURLY_GUARD_RATE = 80_000; // VND per guard per hour
export const HOURLY_GUARD_DURATIONS = [2, 4, 6, 8] as const;

const payloadSchema = z.object({
  service_date: z.string().min(1).max(20), // YYYY-MM-DD or display
  start_time: z.string().min(1).max(10), // HH:mm
  end_time: z.string().min(1).max(10),
  hours: z.number().int().min(1).max(24),
  apartment: z.string().min(1).max(150),
  description: z.string().max(200).optional().nullable(),
  guard_count: z.number().int().min(1).max(10),
  equipment_support: z.boolean().default(false),
  extra_notes: z.string().max(300).optional().nullable(),
  unit_price: z.number().min(0).default(HOURLY_GUARD_RATE),
  estimated_total: z.number().min(0),
});

export type HourlyGuardInput = z.infer<typeof payloadSchema>;

export type HourlyGuardRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: HourlyGuardInput & { ticket_code?: string; submitted_at?: string };
};

export const createHourlyGuard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => payloadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const ymd =
      String(now.getUTCFullYear()).slice(-2) +
      String(now.getUTCMonth() + 1).padStart(2, "0") +
      String(now.getUTCDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const ticket_code = `HGD-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "hourly_guard",
        status: "open",
        apartment: data.apartment,
        apartment_id: scope.apartment_id,
        payload: {
          ...data,
          ticket_code,
          submitted_at: now.toISOString(),
        } as never,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, ticket_code, created_at: row.created_at as string };
  });

export const listMyHourlyGuard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HourlyGuardRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "hourly_guard")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as HourlyGuardRow["payload"],
    }));
  });
