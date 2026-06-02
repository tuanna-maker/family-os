import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LogEntrySchema = z.object({
  level: z.enum(["debug", "info", "warn", "error", "fatal"]).default("info"),
  message: z.string().min(1).max(2000),
  context: z.record(z.unknown()).default({}),
  app: z.enum(["family", "guard"]).default("family"),
  session_id: z.string().max(64).default(""),
  device_info: z.record(z.unknown()).default({}),
  ts: z.string().datetime().optional(),
});

const BodySchema = z.object({
  logs: z.array(LogEntrySchema).min(1).max(50),
});

// Strip obvious PII patterns from message + context strings
const PII_PATTERNS: RegExp[] = [
  /\b\d{9,12}\b/g,                     // phone numbers
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // emails
  /Bearer\s+[A-Za-z0-9._-]+/gi,        // bearer tokens
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT
];

function scrub(value: string): string {
  let out = value;
  for (const p of PII_PATTERNS) out = out.replace(p, "[REDACTED]");
  return out.slice(0, 2000);
}

function scrubJson(input: unknown): unknown {
  if (typeof input === "string") return scrub(input);
  if (Array.isArray(input)) return input.map(scrubJson);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) out[k] = scrubJson(v);
    return out;
  }
  return input;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const authHeader = req.headers.get("Authorization");

  // verify_jwt=true means the platform already validated the JWT. We still
  // need the user id, so resolve via anon client + auth header.
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await authedClient.auth.getUser();
    const userId = userData.user?.id ?? null;

    const rawBody = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid payload", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = parsed.data.logs.map((l) => ({
      level: l.level,
      message: scrub(l.message),
      context: scrubJson(l.context) as Record<string, unknown>,
      user_id: userId,
      app: l.app,
      session_id: l.session_id,
      device_info: l.device_info,
      request_id: requestId,
      ts: l.ts ?? new Date().toISOString(),
    }));

    const { error } = await admin.from("app_logs").insert(rows);
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, count: rows.length, request_id: requestId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("log-ingest error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
