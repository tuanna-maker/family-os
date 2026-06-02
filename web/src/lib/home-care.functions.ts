import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const CARE_TARGETS = ["elderly", "child", "patient", "other"] as const;
export type CareTarget = (typeof CARE_TARGETS)[number];

export const CARE_DURATIONS = [
  { id: "h2", label: "2 giờ", hours: 2, fee: 120_000 },
  { id: "h4", label: "4 giờ", hours: 4, fee: 220_000 },
  { id: "h8", label: "8 giờ (cả ngày)", hours: 8, fee: 400_000 },
  { id: "overnight", label: "Qua đêm (12h)", hours: 12, fee: 600_000 },
] as const;
export type CareDurationId = (typeof CARE_DURATIONS)[number]["id"];

export const CARE_TASKS = [
  "Trông coi, ở bên cạnh",
  "Hỗ trợ ăn uống",
  "Nhắc uống thuốc",
  "Hỗ trợ vệ sinh cá nhân",
  "Đo huyết áp / nhiệt độ",
  "Đưa đi dạo trong toà nhà",
  "Hỗ trợ vận động nhẹ",
  "Trò chuyện, đọc sách",
] as const;

const payloadSchema = z.object({
  // 1. Recipient
  target: z.enum(CARE_TARGETS),
  recipient_name: z.string().min(1).max(120),
  recipient_age: z.number().int().min(0).max(120).optional().nullable(),
  apartment: z.string().min(1).max(120),
  floor_unit: z.string().max(60).optional().nullable(),
  // 2. Schedule
  start_date: z.string().min(1).max(20),
  start_time: z.string().min(1).max(10),
  duration_id: z.enum(CARE_DURATIONS.map((d) => d.id) as [CareDurationId, ...CareDurationId[]]),
  duration_label: z.string().max(80),
  duration_hours: z.number().min(0),
  // 3. Care needs
  tasks: z.array(z.string().max(80)).max(20).default([]),
  health_notes: z.string().max(300).optional().nullable(),
  // 4. Contact
  contact_name: z.string().min(1).max(120),
  contact_phone: z.string().min(6).max(40),
  special_request: z.string().max(300).optional().nullable(),
  // 5. Cost
  base_fee: z.number().min(0),
  service_fee: z.number().min(0).default(0),
  estimated_total: z.number().min(0),
});

export type HomeCareInput = z.infer<typeof payloadSchema>;

export type HomeCareRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: HomeCareInput & { ticket_code?: string; submitted_at?: string };
};

export const createHomeCare = createServerFn({ method: "POST" })
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
    const ticket_code = `CARE-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "home_care",
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

export const listMyHomeCare = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomeCareRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "home_care")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as HomeCareRow["payload"],
    }));
  });
