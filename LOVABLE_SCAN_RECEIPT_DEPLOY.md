# Lovable — Deploy Edge Function `scan-receipt`

> Mobile monorepo (`apps/family`) gọi `supabase.functions.invoke("scan-receipt")`.  
> Logic port từ `apps/family/src/features/family-core/scan-receipt.functions.ts` (Lovable serverFn cũ).  
> **Chỉ làm Supabase** — không sửa TanStack serverFn trên app Lovable.

---

## Cách gửi Lovable

| Bước | Gửi |
|------|-----|
| 1 | Copy khối **PROMPT** |
| 2 | Paste **FILE 1** (Edge Function code) |
| 3 | Paste **FILE 2** (config snippet) |
| 4 | Xác nhận secret **LOVABLE_API_KEY** đã set trên Edge Functions |

---

## PROMPT (copy → Lovable)

```text
Deploy Supabase Edge Function scan-receipt cho project bigarvjahnxiuovepaxm.

Mobile app (monorepo family-os) gọi:
  supabase.functions.invoke("scan-receipt", { body: { family_id, imageDataUrl } })
  Header JWT user tự gửi — verify_jwt = true.

Nhiệm vụ:
1. Deploy Edge Function đúng nội dung FILE 1 (port từ serverFn scan-receipt.functions.ts).
2. supabase/config.toml: [functions.scan-receipt] verify_jwt = true (FILE 2).
3. Edge Function Secrets (Dashboard):
   - LOVABLE_API_KEY = (cùng key đang dùng cho serverFn cũ)
   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto nếu deploy qua CLI)
4. CORS: cho phép mobile (capacitor://localhost, https://localhost, web origin).

Response contract (mobile đã implement):
  { ok: true, result: { merchant, total, date, category, note, line_items, scan_id } }
  { ok: false, error: string }

Bảng receipt_scans đã có + RLS scan_insert_family — insert phải dùng JWT user (anon client + Authorization header), KHÔNG service_role bypass.

Verify sau deploy:
  invoke scan-receipt với JWT user hợp lệ + imageDataUrl base64 nhỏ → { ok: true, scan_id } + row trong receipt_scans.

KHÔNG xóa serverFn cũ trên Lovable app (có thể giữ song song).
```

---

## FILE 1 — `supabase/functions/scan-receipt/index.ts`

**Đường dẫn repo:** `supabase/functions/scan-receipt/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = ["Ăn uống", "Nhà cửa", "Con cái", "Sức khỏe", "Giải trí", "Khác"] as const;

const SYSTEM = `Bạn là trợ lý OCR hoá đơn cho ứng dụng quản lý chi tiêu gia đình Việt Nam.
Phân tích ảnh hoá đơn / biên lai và trả về JSON với:
- merchant: tên cửa hàng (tiếng Việt nếu có)
- total: tổng tiền cuối cùng, đơn vị VND, chỉ số nguyên (không kèm "đ" hay dấu phẩy)
- date: ngày trên hoá đơn theo định dạng "DD/MM/YYYY", nếu không có thì "Hôm nay"
- category: ĐỀ XUẤT phân loại vào MỘT trong: "Ăn uống","Nhà cửa","Con cái","Sức khỏe","Giải trí","Khác"
- note: 1 dòng ngắn mô tả (tối đa 80 ký tự)
- line_items: mảng các dòng hàng hoá { name, qty, price } (price VND nguyên). Bỏ qua dòng tổng/thuế/giảm giá.
Chỉ trả về JSON object, không markdown.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateInput(body: Record<string, unknown>) {
  const family_id = body.family_id;
  const imageDataUrl = body.imageDataUrl;
  if (typeof family_id !== "string" || !/^[0-9a-f-]{36}$/i.test(family_id)) {
    return { ok: false as const, error: "family_id không hợp lệ" };
  }
  if (
    typeof imageDataUrl !== "string" ||
    imageDataUrl.length < 50 ||
    imageDataUrl.length > 8_000_000 ||
    !/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)
  ) {
    return { ok: false as const, error: "Ảnh không hợp lệ" };
  }
  return { ok: true as const, data: { family_id, imageDataUrl } };
}

function parseAiResult(raw: Record<string, unknown>) {
  const merchant = String(raw.merchant ?? "").slice(0, 120);
  if (!merchant) throw new Error("missing merchant");

  let total = raw.total;
  if (typeof total === "string") total = Number(String(total).replace(/[^\d]/g, ""));
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) throw new Error("invalid total");

  const date = String(raw.date ?? "Hôm nay").slice(0, 40);
  let category = String(raw.category ?? "Khác");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) category = "Khác";

  const note = String(raw.note ?? "").slice(0, 200);
  const line_items = Array.isArray(raw.line_items)
    ? raw.line_items.slice(0, 50).map((item) => {
        const row = item as Record<string, unknown>;
        return {
          name: String(row.name ?? "").slice(0, 120),
          qty: typeof row.qty === "number" ? row.qty : 1,
          price: typeof row.price === "number" ? row.price : 0,
        };
      })
    : [];

  return { merchant, total, date, category, note, line_items };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse({ ok: false, error: "Chưa cấu hình LOVABLE_API_KEY" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const validated = validateInput(body);
    if (!validated.ok) return jsonResponse(validated);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
              { type: "image_url", image_url: { url: validated.data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return jsonResponse({ ok: false, error: "Hệ thống đang bận, vui lòng thử lại sau." });
    }
    if (aiRes.status === 402) {
      return jsonResponse({ ok: false, error: "Hết credits AI. Vui lòng nạp thêm." });
    }
    if (!aiRes.ok) return jsonResponse({ ok: false, error: `Lỗi AI (${aiRes.status})` });

    const aiJson = (await aiRes.json()) as { choices?: { message?: { content?: string } }[] };
    const rawContent = aiJson.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const safe = parseAiResult(parsed);

    const { data: scan, error: insErr } = await supabase
      .from("receipt_scans")
      .insert({
        family_id: validated.data.family_id,
        created_by: userId,
        merchant: safe.merchant,
        total: safe.total,
        scanned_date: safe.date,
        category: safe.category,
        raw: parsed,
      })
      .select("id")
      .single();

    if (insErr) return jsonResponse({ ok: false, error: insErr.message });

    return jsonResponse({
      ok: true,
      result: { ...safe, scan_id: scan.id },
    });
  } catch (e) {
    console.error("scan-receipt failed", e);
    return jsonResponse({ ok: false, error: "Không đọc được hoá đơn. Hãy thử ảnh rõ hơn." });
  }
});
```

---

## FILE 2 — `supabase/config.toml` snippet

```toml
[functions.scan-receipt]
verify_jwt = true
```

---

## Secret bắt buộc

| Secret | Nguồn |
|--------|--------|
| `LOVABLE_API_KEY` | Cùng key serverFn cũ trên Lovable |
| `SUPABASE_ANON_KEY` | Auto khi deploy Edge (cần cho RLS insert với user JWT) |

---

## Sau deploy — test trên mobile

1. Đăng nhập app Family (`giadinh@securitytech.vn` / `Demo@12345`)
2. Vào **Chi tiêu → Quét hoá đơn**
3. Chụp/chọn ảnh → phải trả merchant/total + lưu `receipt_scans`

Không cần sửa `apps/family/src/api/scan-receipt.ts` — đã gọi đúng `invoke("scan-receipt")`.

---

## Checklist deliverable Lovable

- [ ] Edge `scan-receipt` deployed
- [ ] `verify_jwt = true`
- [ ] Secret `LOVABLE_API_KEY` set
- [ ] Test invoke OK + row `receipt_scans`
