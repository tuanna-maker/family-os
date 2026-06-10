import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const DELIVERY_ITEM_TYPES = ["package", "food", "fragile", "document", "other"] as const;
export type DeliveryItemType = (typeof DELIVERY_ITEM_TYPES)[number];

export const DELIVERY_OPTIONS = [
  {
    id: "to_apartment",
    label: "Giao tận căn hộ",
    sub: "Bảo vệ giao trực tiếp đến cửa căn hộ của bạn",
    fee: 25_000,
  },
  {
    id: "to_door",
    label: "Giao đến cửa căn hộ",
    sub: "Bảo vệ để hàng trước cửa căn hộ",
    fee: 15_000,
  },
  {
    id: "at_counter",
    label: "Để tại quầy bảo vệ",
    sub: "Bảo vệ giữ hàng tại quầy, bạn đến nhận",
    fee: 0,
  },
] as const;
export type DeliveryOptionId = (typeof DELIVERY_OPTIONS)[number]["id"];

const payloadSchema = z.object({
  // 1. Order info
  item_type: z.enum(DELIVERY_ITEM_TYPES),
  weight_range: z.string().max(40).optional().nullable(),
  guard_note: z.string().max(200).optional().nullable(),
  // 2. Delivery info
  recipient_name: z.string().min(1).max(120),
  recipient_phone: z.string().min(6).max(40),
  apartment: z.string().min(1).max(120),
  floor_unit: z.string().max(60).optional().nullable(),
  expected_window: z.string().max(60).optional().nullable(),
  delivery_note: z.string().max(200).optional().nullable(),
  // 3. Option
  option_id: z.enum(DELIVERY_OPTIONS.map((o) => o.id) as [DeliveryOptionId, ...DeliveryOptionId[]]),
  option_label: z.string().max(80),
  delivery_fee: z.number().min(0),
  service_fee: z.number().min(0).default(0),
  estimated_total: z.number().min(0),
});

export type ApartmentDeliveryInput = z.infer<typeof payloadSchema>;

export type ApartmentDeliveryRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: ApartmentDeliveryInput & { ticket_code?: string; submitted_at?: string };
};

export const createApartmentDelivery = createServerFn({ method: "POST" })
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
    const ticket_code = `DLV-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "delivery",
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

export const listMyApartmentDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApartmentDeliveryRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "delivery")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as ApartmentDeliveryRow["payload"],
    }));
  });
