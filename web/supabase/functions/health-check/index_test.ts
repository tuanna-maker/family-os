import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FN_URL = Deno.env.get("HEALTH_CHECK_URL") ??
  "https://bigarvjahnxiuovepaxm.supabase.co/functions/v1/health-check";

Deno.test("health-check rejects without apikey", async () => {
  const res = await fetch(FN_URL);
  assertEquals(res.status, 401);
  await res.body?.cancel();
});
