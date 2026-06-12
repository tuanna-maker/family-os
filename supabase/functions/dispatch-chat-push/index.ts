import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ChatRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  sender_role: "resident" | "guard" | "system";
  sender_id: string | null;
  body: string | null;
  message_type: string | null;
};

const LEGACY_AUTO_REPLY =
  /Bảo an đã nhận tin|Security received your message/i;

function previewBody(body: string | null, messageType: string | null) {
  const type = messageType ?? "text";
  const text = (body ?? "").trim();
  if (type === "image") return text && text !== "Ảnh" ? text : "Đã gửi ảnh";
  if (type === "audio") return text && text !== "Ghi âm" ? text : "Đã gửi ghi âm";
  return text || "Tin nhắn mới";
}

function isLegacyAutoReply(row: ChatRow) {
  return row.sender_role === "guard" && LEGACY_AUTO_REPLY.test(row.body ?? "");
}

async function loadMessage(admin: SupabaseClient, messageId: string) {
  const { data, error } = await admin
    .from("security_chat_messages")
    .select("id,user_id,project_id,sender_role,sender_id,body,message_type")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ChatRow | null;
}

async function guardUserIds(admin: SupabaseClient, projectId: string | null) {
  const ids = new Set<string>();

  if (projectId) {
    const { data: roles } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", ["security_admin", "security_staff"])
      .eq("project_id", projectId);
    for (const row of roles ?? []) {
      if (row.user_id) ids.add(row.user_id);
    }

    const { data: shifts } = await admin
      .from("guard_shifts")
      .select("guard_id")
      .eq("project_id", projectId);
    for (const row of shifts ?? []) {
      if (row.guard_id) ids.add(row.guard_id);
    }
  }

  if (ids.size === 0) {
    const { data: roles } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", ["security_admin", "security_staff"]);
    for (const row of roles ?? []) {
      if (row.user_id) ids.add(row.user_id);
    }
  }

  return [...ids];
}

async function fetchTokens(
  admin: SupabaseClient,
  userIds: string[],
  app: "family" | "guard",
) {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .schema("platform")
    .from("device_token")
    .select("token")
    .in("user_id", userIds)
    .eq("app", app);
  if (error) throw new Error(error.message);
  const tokens = (data ?? [])
    .map((row) => String(row.token ?? ""))
    .filter((t) => t.startsWith("ExponentPushToken"));
  return [...new Set(tokens)];
}

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: string;
  priority: string;
  channelId?: string;
  android?: { channelId: string; priority: string };
};

async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return { sent: 0 };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { data?: Array<{ status?: string }> };
  const sent = (json.data ?? []).filter((r) => r.status === "ok").length;
  return { sent };
}

async function authorizeCaller(req: Request, admin: SupabaseClient, row: ChatRow) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceRole && token === serviceRole) return true;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return false;

  if (row.sender_role === "resident") return row.user_id === user.id;
  if (row.sender_role === "guard") return row.sender_id === user.id;
  return false;
}

async function dispatchPush(admin: SupabaseClient, row: ChatRow) {
  if (isLegacyAutoReply(row)) {
    return { ok: true, skipped: "legacy_auto_reply" };
  }

  const body = previewBody(row.body, row.message_type);
  const pushMessages: ExpoPushMessage[] = [];

  const pushPayload = (
    to: string,
    title: string,
    data: Record<string, unknown>,
  ): ExpoPushMessage => ({
    to,
    title,
    body,
    sound: "default",
    priority: "high",
    channelId: "chat",
    android: { channelId: "chat", priority: "high" },
    data,
  });

  if (row.sender_role === "guard") {
    const tokens = await fetchTokens(admin, [row.user_id], "family");
    for (const to of tokens) {
      pushMessages.push(
        pushPayload(to, "Đội bảo an", { route: "/bao-an/chat", chatMessageId: row.id }),
      );
    }
  } else if (row.sender_role === "resident") {
    const guardIds = await guardUserIds(admin, row.project_id);
    const tokens = await fetchTokens(admin, guardIds, "guard");
    for (const to of tokens) {
      pushMessages.push(
        pushPayload(to, "Tin nhắn cư dân", {
          route: "/chat",
          residentId: row.user_id,
          chatMessageId: row.id,
        }),
      );
    }
  }

  const result = await sendExpoPush(pushMessages);
  return { ok: true, tokens: pushMessages.length, sent: result.sent };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json();
    const record = (payload.record ?? null) as ChatRow | null;
    const messageId = (payload.message_id ?? record?.id) as string | undefined;

    if (!messageId) {
      return new Response(JSON.stringify({ error: "missing_message_id" }), { status: 400 });
    }

    const row = record?.id === messageId ? record : await loadMessage(admin, messageId);
    if (!row) {
      return new Response(JSON.stringify({ error: "message_not_found" }), { status: 404 });
    }

    const allowed = await authorizeCaller(req, admin, row);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
    }

    const result = await dispatchPush(admin, row);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
