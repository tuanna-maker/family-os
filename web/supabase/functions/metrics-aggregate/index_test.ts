import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FN_URL = Deno.env.get("METRICS_URL") ??
  "https://bigarvjahnxiuovepaxm.supabase.co/functions/v1/metrics-aggregate";

Deno.test("metrics-aggregate rejects without apikey", async () => {
  const res = await fetch(FN_URL, { method: "POST" });
  assertEquals(res.status, 401);
  await res.body?.cancel();
});
