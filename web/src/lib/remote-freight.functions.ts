import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveResidentScope } from "@/lib/resident-scope.server";

export const FREIGHT_ITEM_TYPES = ["package", "document", "fragile", "food", "other"] as const;
export type FreightItemType = (typeof FREIGHT_ITEM_TYPES)[number];

export const FREIGHT_WEIGHTS = [
  { id: "u1", label: "Dưới 1 kg" },
  { id: "1-5", label: "1 – 5 kg" },
  { id: "5-10", label: "5 – 10 kg" },
  { id: "o10", label: "Trên 10 kg" },
] as const;
export type FreightWeightId = (typeof FREIGHT_WEIGHTS)[number]["id"];

export const REMOTE_FREIGHT_BASE_FEE = 25_000;

const payloadSchema = z.object({
  // Sender (pickup address)
  sender_name: z.string().min(1).max(120),
  sender_phone: z.string().min(6).max(40),
  sender_address: z.string().min(1).max(200),
  sender_note: z.string().max(200).optional().nullable(),
  // Recipient (apartment)
  apartment: z.string().min(1).max(120),
  recipient_name: z.string().min(1).max(120),
  recipient_phone: z.string().min(6).max(40),
  // Item
  item_type: z.enum(FREIGHT_ITEM_TYPES),
  weight_id: z.enum(FREIGHT_WEIGHTS.map((w) => w.id) as [FreightWeightId, ...FreightWeightId[]]),
  weight_label: z.string().max(40),
  item_note: z.string().max(200).optional().nullable(),
  // Fee
  service_fee: z.number().min(0).default(REMOTE_FREIGHT_BASE_FEE),
  estimated_total: z.number().min(0),
});

export type RemoteFreightInput = z.infer<typeof payloadSchema>;

export type RemoteFreightRow = {
  id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  payload: RemoteFreightInput & { ticket_code?: string; submitted_at?: string };
};

export const createRemoteFreight = createServerFn({ method: "POST" })
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
    const ticket_code = `RFR-${ymd}-${rand}`;

    const scope = await resolveResidentScope(supabase, userId);
    const { data: row, error } = await supabase
      .from("security_requests")
      .insert({
        requester_id: userId,
        request_type: "remote_freight",
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

export const listMyRemoteFreights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RemoteFreightRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_requests")
      .select("id, status, created_at, resolved_at, payload")
      .eq("request_type", "remote_freight")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as string,
      created_at: r.created_at as string,
      resolved_at: r.resolved_at as string | null,
      payload: (r.payload ?? {}) as RemoteFreightRow["payload"],
    }));
  });
