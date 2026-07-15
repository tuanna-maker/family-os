import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  ref_id: string | null;
  title: string;
  body: string | null;
};

type NotifyLocale = "vi" | "en";
type SecurityStatusPhase = "in_progress" | "resolved" | "cancelled";

const SECURITY_TYPES = new Set([
  "security.chat",
  "security.status_changed",
  "security.request",
  "sos",
]);

const TYPE_META: Record<string, { emoji: string; vi: string; en: string }> = {
  sos: { emoji: "🆘", vi: "yêu cầu SOS", en: "SOS request" },
  fire: { emoji: "🔥", vi: "báo cháy", en: "fire alert" },
  intrusion: { emoji: "🚨", vi: "báo xâm nhập", en: "intrusion alert" },
  noise: { emoji: "🔊", vi: "phản ánh tiếng ồn", en: "noise complaint" },
  package: { emoji: "📦", vi: "nhận hàng hộ", en: "package pickup" },
  shipping: { emoji: "📮", vi: "gửi hàng đi", en: "outbound parcel" },
  delivery: { emoji: "🛗", vi: "giao tận căn hộ", en: "doorstep delivery" },
  home_care: { emoji: "🏠", vi: "chăm sóc tại nhà", en: "home care visit" },
  escort: { emoji: "🤝", vi: "đưa đón căn hộ", en: "escort service" },
  remote_freight: { emoji: "🚚", vi: "chuyển hàng từ xa", en: "remote freight" },
  guard_handle: { emoji: "🛡️", vi: "bảo vệ xử lý hộ", en: "guard assistance" },
  hourly_guard: { emoji: "⏱️", vi: "bảo vệ theo giờ", en: "hourly guard" },
  custom_guard: { emoji: "🛡️", vi: "bảo vệ theo nhu cầu", en: "custom guard request" },
  other: { emoji: "📋", vi: "yêu cầu bảo an", en: "security request" },
};

function parseSecurityStatusPhase(body?: string | null, title?: string | null): SecurityStatusPhase | null {
  const text = `${body ?? ""} ${title ?? ""}`;
  const arrow = text.match(/→\s*(in_progress|resolved|cancelled)/i);
  if (arrow?.[1]) return arrow[1].toLowerCase() as SecurityStatusPhase;
  if (/\bresolved\b/i.test(text) || /xử lý xong|hoàn tất|all done|complete/i.test(text)) return "resolved";
  if (/\bin_progress\b/i.test(text) || /tiếp nhận|đã nhận tin|on it|helping/i.test(text)) return "in_progress";
  if (/\bcancelled\b/i.test(text) || /đã huỷ|cancelled/i.test(text)) return "cancelled";
  return null;
}

function formatFamilyStatusPush(input: {
  locale: NotifyLocale;
  status: SecurityStatusPhase;
  requestType?: string | null;
  unitLabel?: string | null;
  requestLabel?: string | null;
}) {
  const meta = TYPE_META[input.requestType ?? ""] ?? TYPE_META.other;
  const topic = (input.requestLabel ?? "").trim() || (input.locale === "en" ? meta.en : meta.vi);
  const place = input.unitLabel?.trim() ? ` · ${input.unitLabel.trim()}` : "";

  if (input.status === "in_progress") {
    if (input.locale === "en") {
      return {
        title: `${meta.emoji} Security team on it`,
        body: `We're helping with ${topic}${place}. We'll keep you updated!`,
      };
    }
    return {
      title: `${meta.emoji} Đội bảo an đã nhận tin`,
      body: `Đang hỗ trợ ${topic}${place}. Bạn yên tâm, chúng tôi sẽ cập nhật tiếp nhé!`,
    };
  }
  if (input.status === "resolved") {
    if (input.locale === "en") {
      return {
        title: "✅ All done",
        body: `${topic.charAt(0).toUpperCase()}${topic.slice(1)}${place} is complete. Thank you for trusting our security team!`,
      };
    }
    return {
      title: "✅ Đã xử lý xong",
      body: `${topic.charAt(0).toUpperCase()}${topic.slice(1)}${place} đã hoàn tất. Cảm ơn bạn đã tin tưởng đội bảo an!`,
    };
  }
  if (input.locale === "en") {
    return { title: "Request cancelled", body: `${topic}${place} is no longer being handled.` };
  }
  return { title: "Yêu cầu đã huỷ", body: `${topic}${place} không còn được xử lý.` };
}

async function localizedSecurityStatusCopy(
  admin: SupabaseClient,
  notif: NotificationRow,
): Promise<{ title: string; body: string } | null> {
  if (notif.type !== "security.status_changed" && notif.type !== "security.request_status") return null;

  const status = parseSecurityStatusPhase(notif.body, notif.title);
  if (!status || !notif.ref_id) return null;

  const [{ data: profile }, { data: req }] = await Promise.all([
    admin.from("profiles").select("ui_locale").eq("id", notif.user_id).maybeSingle(),
    admin
      .from("security_requests")
      .select("request_type, apartment, building, payload, status")
      .eq("id", notif.ref_id)
      .maybeSingle(),
  ]);

  const locale: NotifyLocale = profile?.ui_locale === "en" ? "en" : "vi";
  const payload = (req?.payload ?? {}) as Record<string, unknown>;
  const unit = [req?.apartment, req?.building].filter(Boolean).join(" · ") || undefined;
  const requestLabel = typeof payload.label === "string" ? payload.label : undefined;

  return formatFamilyStatusPush({
    locale,
    status: (req?.status as SecurityStatusPhase) ?? status,
    requestType: req?.request_type,
    unitLabel: unit,
    requestLabel,
  });
}

function channelForType(type: string) {
  if (type === "security.chat") return "chat";
  if (SECURITY_TYPES.has(type) || type.startsWith("security")) return "security";
  return "default";
}

function routeForType(type: string) {
  if (type === "security.chat") return "/bao-an/chat";
  return "/thong-bao";
}

async function resolveApps(admin: SupabaseClient, userId: string): Promise<Array<"family" | "guard">> {
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["security_admin", "security_staff"]);
  if ((roles ?? []).length > 0) return ["guard"];
  return ["family"];
}

async function fetchTokens(admin: SupabaseClient, userId: string, apps: Array<"family" | "guard">) {
  const { data, error } = await admin
    .schema("platform")
    .from("device_token")
    .select("token")
    .eq("user_id", userId)
    .in("app", apps);
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
    const notificationId = (payload.notification_id ?? payload.record?.id) as string | undefined;
    if (!notificationId) {
      return new Response(JSON.stringify({ error: "missing_notification_id" }), { status: 400 });
    }

    const { data: row, error } = await admin
      .from("notifications")
      .select("id,user_id,type,ref_id,title,body")
      .eq("id", notificationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }

    const notif = row as NotificationRow;

    if (notif.type === "security.chat") {
      return new Response(JSON.stringify({ ok: true, skipped: "chat_push" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const localized = await localizedSecurityStatusCopy(admin, notif);
    const useStoredCopy =
      notif.type === "security.status_changed" &&
      notif.title &&
      !/→\s*(open|in_progress|resolved)/i.test(`${notif.title} ${notif.body ?? ""}`);
    const pushTitle = useStoredCopy
      ? notif.title
      : (localized?.title ?? notif.title || "Thông báo mới");
    const pushBody = useStoredCopy
      ? (notif.body ?? "")
      : (localized?.body ?? notif.body ?? "");

    const apps = await resolveApps(admin, notif.user_id);
    const tokens = await fetchTokens(admin, notif.user_id, apps);
    const channel = channelForType(notif.type);
    const data: Record<string, unknown> = {
      type: notif.type,
      notificationId: notif.id,
      route: routeForType(notif.type),
    };
    if (notif.type === "security.chat" && notif.ref_id) {
      data.chatMessageId = notif.ref_id;
    }

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title: pushTitle,
      body: pushBody,
      sound: "default",
      priority: "high",
      channelId: channel,
      android: { channelId: channel, priority: "high" },
      data,
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
