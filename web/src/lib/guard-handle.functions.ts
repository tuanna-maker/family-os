import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const GUARD_TASKS = [
  { id: "door", label: "Mở cửa khi quên khoá", fee: 50_000 },
  { id: "pet", label: "Chăm sóc thú cưng", fee: 80_000 },
  { id: "plant", label: "Tưới cây", fee: 40_000 },
  { id: "inspect", label: "Kiểm tra căn hộ khi đi vắng", fee: 50_000 },
  { id: "fetch", label: "Lấy hộ giấy tờ, đồ vật", fee: 40_000 },
  { id: "other", label: "Yêu cầu khác", fee: 30_000 },
] as const;
export type GuardTaskId = (typeof GUARD_TASKS)[number]["id"];

export const GUARD_HANDLE_BASE_FEE = 30_000;

const payloadSchema = z.object({
  task_id: z.enum(GUARD_TASKS.map((t) => t.id) as [GuardTaskId, ...GuardTaskId[]]),
  task_label: z.string().min(1).max(80),
  apartment: z.string().min(1).max(120),
  desired_time: z.string().max(120).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
  service_fee: z.number().min(0).default(GUARD_HANDLE_BASE_FEE),
  estimated_total: z.number().min(0),
});

export type GuardHandleInput = z.infer<typeof payloadSchema>;

export type GuardHandleRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: GuardHandleInput & { ticket_code?: string; submitted_at?: string };
};

export const createGuardHandle = createServerFn({ method: "POST" })
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
    const ticket_code = `GHD-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "guard_handle",
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

export const listMyGuardHandle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuardHandleRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "guard_handle")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as GuardHandleRow["payload"],
    }));
  });
