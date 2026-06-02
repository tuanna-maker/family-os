// Smoke tests for log-ingest. Run with: supabase functions test
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FN_URL = Deno.env.get("LOG_INGEST_URL") ??
  "https://bigarvjahnxiuovepaxm.supabase.co/functions/v1/log-ingest";

Deno.test("log-ingest rejects without Authorization", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs: [{ message: "x" }] }),
  });
  // Platform-level verify_jwt returns 401 before reaching handler
  assertEquals(res.status === 401 || res.status === 403, true);
  await res.body?.cancel();
});

Deno.test("log-ingest rejects invalid payload (when authed)", async () => {
  const jwt = Deno.env.get("TEST_USER_JWT");
  if (!jwt) return; // skip in CI without a test user
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ logs: [] }),
  });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});
