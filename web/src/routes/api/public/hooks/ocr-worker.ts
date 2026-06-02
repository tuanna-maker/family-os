import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SYSTEM = `Bạn là trợ lý OCR hoá đơn cho ứng dụng quản lý chi tiêu gia đình Việt Nam.
Phân tích ảnh hoá đơn / biên lai và trả về JSON với:
- merchant: tên cửa hàng
- total: tổng tiền cuối cùng, số nguyên VND
- date: ngày trên hoá đơn theo định dạng "YYYY-MM-DD" nếu nhận diện được, nếu không trả về ngày hôm nay
- category: MỘT trong: "Ăn uống","Nhà cửa","Con cái","Thú cưng","Y tế","Di chuyển","Giải trí","Khác"
- line_items: mảng { name, qty, price (VND) }, bỏ qua dòng tổng/thuế
- confidence: 0..1
Chỉ trả về JSON object thuần.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = supabaseAdmin as any;

async function processOne(jobId: string) {
  await admin
    .from("receipt_ocr_jobs")
    .update({ status: "processing", started_at: new Date().toISOString(), attempts: 1 })
    .eq("id", jobId);

  const { data: job, error: jerr } = await admin
    .from("receipt_ocr_jobs")
    .select("id, family_id, image_path")
    .eq("id", jobId)
    .single();
  if (jerr || !job) throw new Error("Job not found");

  const { data: signed, error: sErr } = await admin.storage
    .from("expense-receipts")
    .createSignedUrl(job.image_path as string, 600);
  if (sErr || !signed) throw new Error("Cannot sign image url");

  const imgRes = await fetch(signed.signedUrl as string);
  if (!imgRes.ok) throw new Error(`Image fetch ${imgRes.status}`);
  const buf = new Uint8Array(await imgRes.arrayBuffer());
  const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const dataUrl = `data:${mime};base64,${btoa(bin)}`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Phân tích hoá đơn này, trả về JSON." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!aiRes.ok) {
    const t = await aiRes.text();
    throw new Error(`AI ${aiRes.status}: ${t.slice(0, 200)}`);
  }
  const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = aiJson.choices?.[0]?.message?.content ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI trả về không phải JSON");
  }

  const total =
    typeof parsed.total === "string"
      ? Number(String(parsed.total).replace(/[^\d]/g, ""))
      : Number(parsed.total ?? 0);

  await admin.from("receipt_ocr_results").upsert(
    {
      job_id: jobId,
      family_id: job.family_id,
      merchant: parsed.merchant ?? null,
      total: Number.isFinite(total) ? total : null,
      scanned_date: parsed.date ?? null,
      category: parsed.category ?? "Khác",
      line_items: parsed.line_items ?? [],
      raw: parsed,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
    },
    { onConflict: "job_id" },
  );

  await admin
    .from("receipt_ocr_jobs")
    .update({ status: "done", completed_at: new Date().toISOString(), last_error: null })
    .eq("id", jobId);
}

export const Route = createFileRoute("/api/public/hooks/ocr-worker")({
  server: {
    handlers: {
      POST: async () => {
        if (!process.env.LOVABLE_API_KEY) {
          return Response.json(
            { ok: false, error: "Missing LOVABLE_API_KEY" },
            { status: 500 },
          );
        }
        const { data: jobs, error } = await admin
          .from("receipt_ocr_jobs")
          .select("id")
          .eq("status", "queued")
          .order("created_at", { ascending: true })
          .limit(5);
        if (error) {
          return Response.json({ ok: false, error: String(error.message ?? error) }, { status: 500 });
        }

        const list = (jobs ?? []) as Array<{ id: string }>;
        const results: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const j of list) {
          try {
            await processOne(j.id);
            results.push({ id: j.id, ok: true });
          } catch (e) {
            const msg = (e as Error).message ?? "unknown";
            await admin
              .from("receipt_ocr_jobs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                last_error: msg,
              })
              .eq("id", j.id);
            results.push({ id: j.id, ok: false, error: msg });
          }
        }
        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
