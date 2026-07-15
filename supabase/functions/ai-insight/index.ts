import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mustString(v: unknown, name: string) {
  if (typeof v !== "string" || !v.trim()) throw new Error(`${name} không hợp lệ`);
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-2.0-flash-001";
  const baseUrl = Deno.env.get("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1";
  if (!apiKey) return jsonResponse({ ok: false, error: "Chưa cấu hình OPENROUTER_API_KEY" }, 500);

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const prompt = mustString(body.prompt, "prompt").slice(0, 16_000);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional OpenRouter headers (helps in dashboard; safe if omitted)
        "HTTP-Referer": "family-app",
        "X-Title": "family-app",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Bạn là trợ lý phân tích cho ứng dụng gia đình. Trả lời ngắn gọn, dễ hiểu, tiếng Việt. Không dùng markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return jsonResponse({ ok: false, error: `AI lỗi (${res.status})`, detail: t.slice(0, 800) }, 502);
    }

    const data = (await res.json()) as any;
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return jsonResponse({ ok: false, error: "AI không trả về nội dung" }, 502);
    return jsonResponse({ ok: true, text });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

