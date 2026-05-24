import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** Cron-triggered metrics rollup (refresh materialized views / aggregate tables). */
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.rpc("refresh_metrics_views");
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, refreshed_at: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
