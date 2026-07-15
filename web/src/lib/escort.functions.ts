import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const ESCORT_DIRECTIONS = [
  { id: "up", label: "Đưa lên căn hộ", sub: "Hỗ trợ đưa người già, trẻ em từ sảnh/lobby lên căn hộ an toàn." },
  { id: "down", label: "Đưa xuống căn hộ", sub: "Hỗ trợ đưa người già, trẻ em từ căn hộ xuống sảnh/lobby an toàn." },
] as const;
export type EscortDirection = (typeof ESCORT_DIRECTIONS)[number]["id"];

export const ESCORT_TARGETS = ["elderly", "child", "patient", "other"] as const;
export type EscortTarget = (typeof ESCORT_TARGETS)[number];

export const ESCORT_FREQUENCIES = ["once", "repeat"] as const;
export type EscortFrequency = (typeof ESCORT_FREQUENCIES)[number];

export const ESCORT_BASE_FEE = 30_000;

const payloadSchema = z.object({
  direction: z.enum(["up", "down"]),
  direction_label: z.string().max(60),

  recipient_name: z.string().min(1).max(120),
  recipient_age: z.number().int().min(0).max(120).optional().nullable(),
  recipient_target: z.enum(ESCORT_TARGETS),
  recipient_health: z.string().max(120).optional().nullable(),
  recipient_note: z.string().max(200).optional().nullable(),

  pickup_location: z.string().min(1).max(160),
  dropoff_location: z.string().min(1).max(160),
  scheduled_date: z.string().min(1).max(20),
  scheduled_time: z.string().min(1).max(10),
  frequency: z.enum(ESCORT_FREQUENCIES),
  assist_device: z.string().max(80).optional().nullable(),
  extra_note: z.string().max(200).optional().nullable(),

  contact_name: z.string().min(1).max(120),
  contact_phone: z.string().min(6).max(40),

  preferred_staff: z.string().max(120).optional().nullable(),

  estimated_total: z.number().min(0),
});

export type EscortInput = z.infer<typeof payloadSchema>;

export type EscortRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: EscortInput & { ticket_code?: string; submitted_at?: string };
};

export const createEscort = createServerFn({ method: "POST" })
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
    const ticket_code = `ESC-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "escort",
        status: "open",
        apartment: data.dropoff_location,
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

export const listMyEscorts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EscortRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "escort")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as EscortRow["payload"],
    }));
  });
