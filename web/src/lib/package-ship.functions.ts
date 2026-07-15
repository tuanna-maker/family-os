import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const SHIP_ITEM_TYPES = ["package", "document", "fragile", "food", "other"] as const;
export type ShipItemType = (typeof SHIP_ITEM_TYPES)[number];

export const COURIERS = [
  { id: "ghn", label: "Giao Hàng Nhanh (GHN)", sub: "Giao nhanh 24h", fee: 25_000 },
  { id: "viettel", label: "Viettel Post", sub: "Giao tiêu chuẩn 1–2 ngày", fee: 20_000 },
  { id: "jt", label: "J&T Express", sub: "Giao tiết kiệm 2–3 ngày", fee: 18_000 },
  { id: "vnpost", label: "VNPost (Bưu điện)", sub: "Giao tiêu chuẩn 2–3 ngày", fee: 15_000 },
] as const;
export type CourierId = (typeof COURIERS)[number]["id"];

const payloadSchema = z.object({
  sender_name: z.string().min(1).max(120),
  sender_address: z.string().min(1).max(200),
  sender_phone: z.string().min(6).max(40),
  recipient_name: z.string().min(1).max(120),
  recipient_address: z.string().min(1).max(200),
  recipient_phone: z.string().min(6).max(40),
  item_type: z.enum(SHIP_ITEM_TYPES),
  weight: z.string().max(40).optional().nullable(),
  dimensions: z.string().max(60).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  courier_id: z.enum(COURIERS.map((c) => c.id) as [CourierId, ...CourierId[]]),
  courier_label: z.string().max(80),
  shipping_fee: z.number().min(0),
  insurance: z.boolean().default(false),
  pack_help: z.boolean().default(false),
  notify_recipient: z.boolean().default(true),
  note: z.string().max(200).optional().nullable(),
  estimated_total: z.number().min(0),
});

export type PackageShipInput = z.infer<typeof payloadSchema>;

export type PackageShipRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: PackageShipInput & { ticket_code?: string; submitted_at?: string };
};

export const createPackageShip = createServerFn({ method: "POST" })
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
    const ticket_code = `SHIP-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "shipping",
        status: "open",
        apartment: data.sender_address,
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

export const listMyPackageShips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PackageShipRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "shipping")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as PackageShipRow["payload"],
    }));
  });
