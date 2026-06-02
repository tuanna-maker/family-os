import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = supabaseAdmin as any;

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

type DeviceTokenRow = { token: string; platform: string; user_id: string };

export type DispatchOptions = {
  priority: "P0" | "P1" | "P2";
  eventTypePattern: string; // e.g. 'sos.%' or 'medicine.%'
  app: "guard" | "family" | "web";
  // Build the LIKE pattern used to match notification rows for an outbox event.
  dedupeLike: (ev: OutboxRow) => string;
  limit?: number;
};

async function sendFcm(
  serverKey: string,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { success: 0, failure: 0, invalidTokens: [] };
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
    return { success: 0, failure: tokens.length, invalidTokens: [] };
  }
  const json = (await res.json()) as {
    success: number;
    failure: number;
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
  return { success: json.success ?? 0, failure: json.failure ?? 0, invalidTokens };
}

export async function dispatchBatch(opts: DispatchOptions) {
  const serverKey = process.env.FCM_SERVER_KEY ?? "";
  const stubMode = serverKey.length === 0;

  const { data: pending, error: pickErr } = await admin
    .schema("platform")
    .from("outbox")
    .select("id, aggregate_id, event_type, payload, attempts")
    .eq("status", "pending")
    .eq("priority", opts.priority)
    .like("event_type", opts.eventTypePattern)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? 50);

  if (pickErr) {
    return { ok: false as const, error: pickErr.message };
  }

  const events = (pending ?? []) as OutboxRow[];
  if (events.length === 0) {
    return { ok: true as const, processed: 0, sent: 0, failed: 0, stub: stubMode };
  }

  const ids = events.map((e) => e.id);
  await admin
    .schema("platform")
    .from("outbox")
    .update({ status: "dispatching" })
    .in("id", ids);

  let totalSent = 0;
  let totalFailed = 0;

  for (const ev of events) {
    try {
      const { data: notifs } = await admin
        .schema("platform")
        .from("notification")
        .select("id, user_id, title, body, data, dedupe_key")
        .eq("channel", "fcm")
        .eq("status", "queued")
        .like("dedupe_key", opts.dedupeLike(ev));

      const rows = (notifs ?? []) as NotificationRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

      const { data: tokenRows } = await admin
        .schema("platform")
        .from("device_token")
        .select("user_id, token, platform")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("app", opts.app);

      const byUser = new Map<string, DeviceTokenRow[]>();
      for (const t of (tokenRows ?? []) as DeviceTokenRow[]) {
        const arr = byUser.get(t.user_id) ?? [];
        arr.push(t);
        byUser.set(t.user_id, arr);
      }

      const sentNotifIds: string[] = [];
      const failedNotifIds: string[] = [];
      const invalidTokens: string[] = [];

      for (const n of rows) {
        const tokens = (byUser.get(n.user_id) ?? []).map((t) => t.token);
        if (tokens.length === 0 || stubMode) {
          sentNotifIds.push(n.id);
          continue;
        }
        const result = await sendFcm(
          serverKey,
          tokens,
          n.title,
          n.body ?? "",
          n.data ?? {},
        );
        totalSent += result.success;
        totalFailed += result.failure;
        invalidTokens.push(...result.invalidTokens);
        if (result.success > 0) sentNotifIds.push(n.id);
        else failedNotifIds.push(n.id);
      }

      if (sentNotifIds.length > 0) {
        await admin
          .schema("platform")
          .from("notification")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .in("id", sentNotifIds);
      }
      if (failedNotifIds.length > 0) {
        await admin
          .schema("platform")
          .from("notification")
          .update({ status: "failed", failed_reason: "fcm_error" })
          .in("id", failedNotifIds);
      }

      if (invalidTokens.length > 0) {
        await admin
          .schema("platform")
          .from("device_token")
          .delete()
          .in("token", invalidTokens);
      }

      await admin
        .schema("platform")
        .from("outbox")
        .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
        .eq("id", ev.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = (ev.attempts ?? 0) + 1;
      const dead = attempts >= 5;
      await admin
        .schema("platform")
        .from("outbox")
        .update({
          status: dead ? "dead" : "failed",
          attempts,
          last_error: message,
          next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        })
        .eq("id", ev.id);
    }
  }

  return {
    ok: true as const,
    processed: events.length,
    sent: totalSent,
    failed: totalFailed,
    stub: stubMode,
  };
}
