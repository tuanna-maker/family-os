import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type RequestRow = {
  id: string;
  request_type: string;
  status: string;
  project_id: string | null;
  building: string | null;
  apartment: string | null;
  payload: Record<string, unknown> | null;
};

const TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Người lạ / xâm nhập",
  noise: "Tiếng ồn",
  package: "Nhận hàng hộ",
  shipping: "Gửi hàng đi",
  delivery: "Giao tận căn hộ",
  home_care: "Chăm sóc tại nhà",
  escort: "Đưa đón căn hộ",
  remote_freight: "Chuyển hàng từ xa",
  guard_handle: "Bảo vệ xử lý hộ",
  hourly_guard: "Bảo vệ theo giờ",
  custom_guard: "Bảo vệ theo nhu cầu",
  other: "Yêu cầu mới",
};

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

async function fetchGuardTokens(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .schema("platform")
    .from("device_token")
    .select("token")
    .in("user_id", userIds)
    .eq("app", "guard");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((r) => String(r.token ?? "")).filter((t) => t.startsWith("ExponentPushToken")))];
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
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data?: Array<{ status?: string }> };
  return { sent: (json.data ?? []).filter((r) => r.status === "ok").length };
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
    const record = (payload.record ?? null) as RequestRow | null;
    const requestId = (payload.request_id ?? record?.id) as string | undefined;
    if (!requestId) {
      return new Response(JSON.stringify({ error: "missing_request_id" }), { status: 400 });
    }

    const row =
      record?.id === requestId
        ? record
        : ((
            await admin
              .from("security_requests")
              .select("id,request_type,status,project_id,building,apartment,payload")
              .eq("id", requestId)
              .maybeSingle()
          ).data as RequestRow | null);

    if (!row) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }
    if (row.status !== "open") {
      return new Response(JSON.stringify({ ok: true, skipped: "not_open" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const guardIds = await guardUserIds(admin, row.project_id);
    const tokens = await fetchGuardTokens(admin, guardIds);
    const typeLabel = TYPE_LABEL[row.request_type] ?? row.request_type;
    const isSos = row.request_type === "sos" || row.request_type === "fire";
    const location = [row.building, row.apartment].filter(Boolean).join(" · ");
    const body = location || "Có yêu cầu mới cần xử lý";

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title: isSos ? "SOS / Yêu cầu khẩn" : `Yêu cầu: ${typeLabel}`,
      body,
      sound: "default",
      priority: "high",
      channelId: "security",
      android: { channelId: "security", priority: "high" },
      data: {
        type: "security.request",
        requestId: row.id,
        route: "/(tabs)/requests",
      },
    }));

    const result = await sendExpoPush(messages);
    return new Response(JSON.stringify({ ok: true, tokens: messages.length, sent: result.sent }), {
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
