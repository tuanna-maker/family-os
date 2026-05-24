import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = performance.now();
  const checks: Record<string, unknown> = {};

  try {
    const { error: dbErr } = await supabase.from("families").select("id").limit(1);
    checks.db = dbErr ? { ok: false, error: dbErr.message } : { ok: true };
  } catch (e) {
    checks.db = { ok: false, error: String(e) };
  }

  try {
    const { error: authErr } = await supabase.auth.getSession();
    checks.auth = authErr ? { ok: false, error: authErr.message } : { ok: true };
  } catch (e) {
    checks.auth = { ok: false, error: String(e) };
  }

  const durationMs = Math.round(performance.now() - started);
  const allOk = Object.values(checks).every((c) => (c as { ok: boolean }).ok);

  await supabase.from("health_checks").insert({
    status: allOk ? "healthy" : "degraded",
    checks,
    duration_ms: durationMs,
  });

  return new Response(JSON.stringify({ status: allOk ? "healthy" : "degraded", checks, duration_ms: durationMs }), {
    headers: { "Content-Type": "application/json" },
    status: allOk ? 200 : 503,
  });
});
