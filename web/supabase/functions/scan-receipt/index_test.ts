import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FN_URL = Deno.env.get("SCAN_URL") ??
  "https://bigarvjahnxiuovepaxm.supabase.co/functions/v1/scan-receipt";

Deno.test("scan-receipt rejects without Authorization", async () => {
  const res = await fetch(FN_URL, { method: "POST" });
  assertEquals(res.status === 401 || res.status === 403, true);
  await res.body?.cancel();
});

Deno.test("scan-receipt rejects invalid input shape (when authed)", async () => {
  const jwt = Deno.env.get("TEST_USER_JWT");
  if (!jwt) return;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ family_id: "not-a-uuid", imageDataUrl: "x" }),
  });
  const body = await res.json();
  assertEquals(body.ok, false);
});
