import { z } from "zod";
import { requireUser } from "@shared/supabase/auth";

const InputSchema = z.object({
  family_id: z.string().uuid(),
  imageDataUrl: z
    .string()
    .min(50)
    .max(8_000_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,/i, "Ảnh không hợp lệ"),
});

const LineItemSchema = z.object({
  name: z.string().min(1).max(120),
  qty: z.number().min(0).max(10000).optional().default(1),
  price: z.number().min(0).max(1_000_000_000).optional().default(0),
});

const ParsedSchema = z.object({
  merchant: z.string().min(1).max(120),
  total: z.number().min(0).max(1_000_000_000),
  date: z.string().min(1).max(40),
  category: z.string().min(1).max(64),
  note: z.string().max(200).optional().default(""),
  line_items: z.array(LineItemSchema).max(50).optional().default([]),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type ScanResult = z.infer<typeof ParsedSchema> & { scan_id: string };

/** Gọi Supabase Edge Function `scan-receipt` (triển khai AI server-side). */
export async function scanReceipt(
  input: z.infer<typeof InputSchema>,
): Promise<{ ok: true; result: ScanResult } | { ok: false; error: string }> {
  const data = InputSchema.parse(input);
  const { supabase } = await requireUser();
  const { data: payload, error } = await supabase.functions.invoke("scan-receipt", {
    body: { family_id: data.family_id, imageDataUrl: data.imageDataUrl },
  });
  if (error) return { ok: false, error: error.message };
  const body = payload as { ok?: boolean; result?: ScanResult; error?: string };
  if (!body?.ok || !body.result) return { ok: false, error: body?.error ?? "Quét hoá đơn thất bại" };
  return { ok: true, result: body.result };
}
