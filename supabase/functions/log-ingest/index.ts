import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-session-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const logs = Array.isArray(body.logs) ? body.logs : [body];

    const rows = logs.slice(0, 50).map((l: Record<string, unknown>) => ({
      level: String(l.level ?? "info").slice(0, 10),
      message: String(l.message ?? "").slice(0, 2000),
      context: l.context ?? {},
      user_id: l.user_id ?? null,
      app: l.app === "guard" ? "guard" : "family",
      session_id: String(l.session_id ?? "").slice(0, 64),
      device_info: l.device_info ?? {},
      request_id: requestId,
      ts: l.ts ?? new Date().toISOString(),
    }));

    const { error } = await supabase.from("app_logs").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: rows.length, request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
