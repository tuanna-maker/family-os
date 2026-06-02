import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const HOLD_PLANS = ["standard", "extended", "long_term"] as const;
export type HoldPlan = (typeof HOLD_PLANS)[number];

export const ITEM_TYPES = ["package", "food", "fragile", "document", "other"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const HOLD_PLAN_META: Record<HoldPlan, { label: string; sub: string; price: string; dailyFee: number; freeDays: number }> = {
  standard: { label: "Giữ hộ tiêu chuẩn", sub: "Tối đa 3 ngày", price: "Miễn phí", dailyFee: 0, freeDays: 3 },
  extended: { label: "Giữ hộ mở rộng", sub: "4 – 7 ngày", price: "20.000đ / ngày", dailyFee: 20_000, freeDays: 3 },
  long_term: { label: "Giữ hộ dài hạn", sub: "Trên 7 ngày", price: "Liên hệ BQL", dailyFee: 20_000, freeDays: 3 },
};

const payloadSchema = z.object({
  address: z.string().min(1).max(200),
  recipient_name: z.string().min(1).max(120),
  phone: z.string().min(6).max(40),
  item_type: z.enum(ITEM_TYPES),
  courier: z.string().max(80).optional().nullable(),
  expected_date: z.string().min(1).max(20),
  expected_time_window: z.string().max(40).optional().nullable(),
  courier_note: z.string().max(200).optional().nullable(),
  hold_plan: z.enum(HOLD_PLANS),
  notify_on_arrival: z.boolean().default(true),
  photo_on_receive: z.boolean().default(true),
  estimated_cost: z.number().min(0).default(0),
});

export type PackageHoldInput = z.infer<typeof payloadSchema>;

export type PackageHoldRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: PackageHoldInput;
};

export const createPackageHold = createServerFn({ method: "POST" })
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
    const ticket_code = `PKG-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "package",
        status: "open",
        apartment: data.address,
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

export const listMyPackageHolds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PackageHoldRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "package")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as PackageHoldInput,
    }));
  });
