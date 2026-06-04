import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

type OutboxRow = {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  dedupe_key: string | null;
};

async function sendFcm(
  serverKey: string,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  if (tokens.length === 0) return { success: 0, failure: 0, invalidTokens: [] as string[] };
  const res = await fetch(FCM_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registration_ids: tokens,
      priority: "high",
      notification: { title, body, sound: "default" },
      data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" },
    }),
  });
  if (!res.ok) {
    return { success: 0, failure: tokens.length, invalidTokens: [] as string[] };
  }
  const json = (await res.json()) as {
    success?: number;
    failure?: number;
    results?: Array<{ error?: string }>;
  };
  const invalidTokens: string[] = [];
  (json.results ?? []).forEach((r, i) => {
    if (
      r.error === "NotRegistered" ||
      r.error === "InvalidRegistration" ||
      r.error === "MismatchSenderId"
    ) {
      invalidTokens.push(tokens[i]);
    }
  });
  return {
    success: json.success ?? 0,
    failure: json.failure ?? 0,
    invalidTokens,
  };
}

async function dispatchBatch(
  admin: ReturnType<typeof createClient>,
  opts: {
    priority: string;
    eventTypePattern: string;
    app: "guard" | "family" | "web";
    dedupeLike: (ev: OutboxRow) => string;
    limit?: number;
  },
  serverKey: string,
  stubMode: boolean,
) {
  const { data: pending, error: pickErr } = await admin
    .schema("platform")
    .from("outbox")
    .select("id, aggregate_id, event_type, payload, attempts")
    .eq("status", "pending")
    .eq("priority", opts.priority)
    .like("event_type", opts.eventTypePattern)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? 30);

  if (pickErr) throw new Error(pickErr.message);
  const events = (pending ?? []) as OutboxRow[];
  if (events.length === 0) return { processed: 0, sent: 0, failed: 0 };

  const ids = events.map((e) => e.id);
  await admin.schema("platform").from("outbox").update({ status: "dispatching" }).in("id", ids);

  let totalSent = 0;
  let totalFailed = 0;

  for (const ev of events) {
    try {
      const like = opts.dedupeLike(ev);
      const { data: notifs } = await admin
        .schema("platform")
        .from("notification")
        .select("id, user_id, title, body, data, dedupe_key")
        .eq("channel", "fcm")
        .eq("status", "queued")
        .like("dedupe_key", like);

      const rows = (notifs ?? []) as NotificationRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: tokenRows } = await admin
        .schema("platform")
        .from("device_token")
        .select("user_id, token")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("app", opts.app);

      const byUser = new Map<string, string[]>();
      for (const t of tokenRows ?? []) {
        const arr = byUser.get(t.user_id as string) ?? [];
        arr.push(t.token as string);
        byUser.set(t.user_id as string, arr);
      }

      const sentIds: string[] = [];
      const failedIds: string[] = [];
      const invalid: string[] = [];

      for (const n of rows) {
        const tokens = byUser.get(n.user_id) ?? [];
        if (tokens.length === 0 || stubMode) {
          sentIds.push(n.id);
          continue;
        }
        const result = await sendFcm(serverKey, tokens, n.title, n.body ?? "", n.data ?? {});
        totalSent += result.success;
        totalFailed += result.failure;
        invalid.push(...result.invalidTokens);
        if (result.success > 0) sentIds.push(n.id);
        else failedIds.push(n.id);
      }

      if (sentIds.length) {
        await admin
          .schema("platform")
          .from("notification")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", sentIds);
      }
      if (failedIds.length) {
        await admin
          .schema("platform")
          .from("notification")
          .update({ status: "failed", failed_reason: "fcm_error" })
          .in("id", failedIds);
      }
      if (invalid.length) {
        await admin.schema("platform").from("device_token").delete().in("token", invalid);
      }

      await admin
        .schema("platform")
        .from("outbox")
        .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
        .eq("id", ev.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = (ev.attempts ?? 0) + 1;
      await admin
        .schema("platform")
        .from("outbox")
        .update({
          status: attempts >= 5 ? "dead" : "failed",
          attempts,
          last_error: message,
          next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        })
        .eq("id", ev.id);
    }
  }

  return { processed: events.length, sent: totalSent, failed: totalFailed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fcmKey = Deno.env.get("FCM_SERVER_KEY") ?? "";
  const stubMode = fcmKey.length === 0;

  const admin = createClient(supabaseUrl, serviceKey);

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const sos = await dispatchBatch(
      admin,
      {
        priority: "P0",
        eventTypePattern: "sos.%",
        app: "guard",
        dedupeLike: (ev) => `sos:${ev.aggregate_id}:%`,
      },
      fcmKey,
      stubMode,
    );

    const familyStatus = await dispatchBatch(
      admin,
      {
        priority: "P0",
        eventTypePattern: "security.%",
        app: "family",
        dedupeLike: (ev) => `sec-status:${ev.aggregate_id}:%`,
      },
      fcmKey,
      stubMode,
    );

    const familyP1 = await dispatchBatch(
      admin,
      {
        priority: "P1",
        eventTypePattern: "security.%",
        app: "family",
        dedupeLike: (ev) => `sec-status:${ev.aggregate_id}:%`,
      },
      fcmKey,
      stubMode,
    );

    return new Response(
      JSON.stringify({ ok: true, stub: stubMode, sos, familyStatus, familyP1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
