#!/usr/bin/env node
/**
 * Verify log-ingest end-to-end (JWT + x-request-id + PII scrub).
 *
 * Usage:
 *   USER_JWT=eyJ... node scripts/verify-log-ingest.mjs
 *   # or login first and paste token from Supabase session
 *
 * Env:
 *   SUPABASE_URL / VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY
 *   USER_JWT (required) — access_token from supabase.auth.getSession()
 */
import { randomUUID } from "node:crypto";

const base =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://bigarvjahnxiuovepaxm.supabase.co";
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.USER_JWT;

if (!anonKey) {
  console.error("Missing SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}
if (!token) {
  console.error("Missing USER_JWT (Supabase access_token after login)");
  process.exit(1);
}

const requestId = randomUUID();
const body = {
  logs: [
    {
      level: "info",
      message: "mobile verify 0901234567 giadinh@test.com",
      app: "family",
      session_id: "verify-script",
      ts: new Date().toISOString(),
      context: { source: "verify-log-ingest.mjs" },
    },
  ],
};

const res = await fetch(`${base}/functions/v1/log-ingest`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
    "x-request-id": requestId,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log("HTTP", res.status, text);
console.log("x-request-id sent:", requestId);
console.log("\nVerify in Supabase → app_logs:");
console.log("- request_id =", requestId);
console.log("- user_id = JWT sub");
console.log("- message contains [REDACTED] for phone/email");

process.exit(res.ok ? 0 : 1);
