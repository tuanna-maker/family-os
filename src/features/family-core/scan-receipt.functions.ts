import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  category: z.enum(["Ăn uống", "Nhà cửa", "Con cái", "Sức khỏe", "Giải trí", "Khác"]),
  note: z.string().max(200).optional().default(""),
  line_items: z.array(LineItemSchema).max(50).optional().default([]),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type ScanResult = z.infer<typeof ParsedSchema> & { scan_id: string };

const SYSTEM = `Bạn là trợ lý OCR hoá đơn cho ứng dụng quản lý chi tiêu gia đình Việt Nam.
Phân tích ảnh hoá đơn / biên lai và trả về JSON với:
- merchant: tên cửa hàng (tiếng Việt nếu có)
- total: tổng tiền cuối cùng, đơn vị VND, chỉ số nguyên (không kèm "đ" hay dấu phẩy)
- date: ngày trên hoá đơn theo định dạng "DD/MM/YYYY", nếu không có thì "Hôm nay"
- category: ĐỀ XUẤT phân loại vào MỘT trong: "Ăn uống","Nhà cửa","Con cái","Sức khỏe","Giải trí","Khác"
- note: 1 dòng ngắn mô tả (tối đa 80 ký tự)
- line_items: mảng các dòng hàng hoá { name, qty, price } (price VND nguyên). Bỏ qua dòng tổng/thuế/giảm giá.
Chỉ trả về JSON object, không markdown.`;

export const scanReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(
    async ({ data, context }): Promise<
      { ok: true; result: ScanResult } | { ok: false; error: string }
    > => {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) return { ok: false, error: "Chưa cấu hình LOVABLE_API_KEY" };
      const { supabase, userId } = context;

      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              {
                role: "user",
                content: [
                  { type: "text", text: "Phân tích hoá đơn này và trả về JSON." },
                  { type: "image_url", image_url: { url: data.imageDataUrl } },
                ],
              },
            ],
          }),
        });

        if (res.status === 429)
          return { ok: false, error: "Hệ thống đang bận, vui lòng thử lại sau." };
        if (res.status === 402) return { ok: false, error: "Hết credits AI. Vui lòng nạp thêm." };
        if (!res.ok) return { ok: false, error: `Lỗi AI (${res.status})` };

        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = json.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(raw);
        const safe = ParsedSchema.parse({
          ...parsed,
          total:
            typeof parsed.total === "string"
              ? Number(String(parsed.total).replace(/[^\d]/g, ""))
              : parsed.total,
        });

        const { data: scan, error: insErr } = await supabase
          .from("receipt_scans")
          .insert({
            family_id: data.family_id,
            created_by: userId,
            merchant: safe.merchant,
            total: safe.total,
            scanned_date: safe.date,
            category: safe.category,
            raw: parsed,
          })
          .select("id")
          .single();
        if (insErr) return { ok: false, error: insErr.message };

        return { ok: true, result: { ...safe, scan_id: scan.id } };
      } catch (e) {
        console.error("scanReceipt failed", e);
        return { ok: false, error: "Không đọc được hoá đơn. Hãy thử ảnh rõ hơn." };
      }
    },
  );
