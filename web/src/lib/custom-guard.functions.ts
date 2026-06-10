import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const CUSTOM_GUARD_BASE_FEE = 100_000; // VND base
export const CUSTOM_GUARD_PER_GUARD = 80_000; // VND per guard per hour estimated

export const CUSTOM_GUARD_SERVICES = [
  { id: "patrol", label: "Tuần tra, giám sát", desc: "Tuần tra khu vực tầng/hành lang" },
  { id: "access", label: "Kiểm soát ra vào", desc: "Kiểm soát khách & nhân sự ra vào" },
  { id: "event", label: "Bảo vệ sự kiện", desc: "Tiệc, hội họp, sự kiện riêng" },
  { id: "asset", label: "Đảm bảo an ninh tài sản", desc: "Trông coi tài sản giá trị cao" },
  { id: "other", label: "Yêu cầu khác", desc: "Yêu cầu riêng — đội bảo an chuyên trách" },
] as const;

export type CustomGuardServiceId = (typeof CUSTOM_GUARD_SERVICES)[number]["id"];

const payloadSchema = z.object({
  service_id: z.enum(["patrol", "access", "event", "asset", "other"]),
  start_at: z.string().min(1).max(40),
  end_at: z.string().min(1).max(40).optional().nullable(),
  apartment: z.string().min(1).max(150),
  description: z.string().max(300).optional().nullable(),
  guard_count: z.number().int().min(1).max(20),
  equipment_support: z.boolean().default(false),
  vehicle_support: z.boolean().default(false),
  extra_notes: z.string().max(300).optional().nullable(),
  estimated_total: z.number().min(0),
});

export type CustomGuardInput = z.infer<typeof payloadSchema>;

export type CustomGuardRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: CustomGuardInput & { ticket_code?: string; submitted_at?: string };
};

export const createCustomGuard = createServerFn({ method: "POST" })
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
    const ticket_code = `CGD-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "custom_guard",
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

export const listMyCustomGuard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomGuardRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "custom_guard")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as CustomGuardRow["payload"],
    }));
  });
