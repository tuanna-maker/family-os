import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_CREDS = {
  token: "stos_guard_bg_token",
  userId: "stos_guard_bg_user_id",
  url: "stos_guard_bg_url",
  anon: "stos_guard_bg_anon",
} as const;

const STATE_CREDS = {
  seenSecurityIds: "stos_guard_seen_security_ids",
  seenPlatformNotifIds: "stos_guard_seen_platform_notif_ids",
  seenChatMsgIds: "stos_guard_seen_chat_msg_ids",
  dismissedSecurityIds: "stos_guard_dismissed_security_ids",
  bootstrapped: "stos_guard_pull_bootstrapped",
} as const;

const LEGACY_AUTO_REPLY =
  /Bảo an đã nhận tin\. Đội trực sẽ phản hồi|Security received your message\. The on-duty team/i;

const SEEN_CAP = 300;

function readSupabaseEnv() {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    url:
      (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
      (extra.supabaseUrl as string | undefined) ||
      "",
    anon:
      (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
      (extra.supabaseAnonKey as string | undefined) ||
      "",
  };
}

async function loadCredentials() {
  const [token, userId, url, anon] = await Promise.all([
    AsyncStorage.getItem(AUTH_CREDS.token),
    AsyncStorage.getItem(AUTH_CREDS.userId),
    AsyncStorage.getItem(AUTH_CREDS.url),
    AsyncStorage.getItem(AUTH_CREDS.anon),
  ]);
  if (!token || !userId || !url || !anon) return null;
  return { token, userId, url, anon };
}

async function loadSeenSet(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

async function saveSeenSet(key: string, seen: Set<string>) {
  const capped = [...seen].slice(-SEEN_CAP);
  await AsyncStorage.setItem(key, JSON.stringify(capped));
}

export async function markGuardSecurityRequestSeen(id: string) {
  if (!id) return;
  const seen = await loadSeenSet(STATE_CREDS.seenSecurityIds);
  if (seen.has(id)) return;
  seen.add(id);
  await saveSeenSet(STATE_CREDS.seenSecurityIds, seen);
}

export async function loadDismissedSecurityRequestIds(): Promise<string[]> {
  return [...(await loadSeenSet(STATE_CREDS.dismissedSecurityIds))];
}

/** Ẩn yêu cầu cư dân đã đọc khỏi hộp thư (yêu cầu vẫn mở trên server). */
export async function dismissGuardSecurityRequests(ids: string[]) {
  if (ids.length === 0) return;
  const dismissed = await loadSeenSet(STATE_CREDS.dismissedSecurityIds);
  for (const id of ids) {
    if (id) dismissed.add(id);
  }
  await saveSeenSet(STATE_CREDS.dismissedSecurityIds, dismissed);
}

export async function markGuardPlatformNotifSeen(id: string) {
  if (!id) return;
  const seen = await loadSeenSet(STATE_CREDS.seenPlatformNotifIds);
  if (seen.has(id)) return;
  seen.add(id);
  await saveSeenSet(STATE_CREDS.seenPlatformNotifIds, seen);
}

export async function persistGuardBackgroundCredentials(accessToken: string, userId: string) {
  const { url, anon } = readSupabaseEnv();
  if (!url || !anon) return;
  await AsyncStorage.multiSet([
    [AUTH_CREDS.token, accessToken],
    [AUTH_CREDS.userId, userId],
    [AUTH_CREDS.url, url],
    [AUTH_CREDS.anon, anon],
  ]);
}

export async function clearGuardBackgroundCredentials() {
  await AsyncStorage.multiRemove(Object.values(AUTH_CREDS));
}

async function getJsonArray(
  url: string,
  anon: string,
  token: string,
  schema: "public" | "platform" = "public",
): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(schema !== "public" ? { "Accept-Profile": schema } : {}),
    },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Record<string, unknown>[];
  return Array.isArray(rows) ? rows : [];
}

type LocalAlert = {
  title: string;
  body?: string;
  channelId: "default" | "security" | "chat";
  id: string;
  kind: "security" | "platform" | "chat";
  data?: Record<string, unknown>;
};

export async function markGuardChatMessageNotified(messageId: string) {
  if (!messageId) return;
  const seen = await loadSeenSet(STATE_CREDS.seenChatMsgIds);
  if (seen.has(messageId)) return;
  seen.add(messageId);
  await saveSeenSet(STATE_CREDS.seenChatMsgIds, seen);
}

export async function shouldNotifyGuardChatMessage(messageId: string) {
  const seen = await loadSeenSet(STATE_CREDS.seenChatMsgIds);
  return !seen.has(messageId);
}

function chatPreviewBody(row: Record<string, unknown>) {
  const type = String(row.message_type ?? "text");
  const body = String(row.body ?? "").trim();
  if (type === "image") return body && body !== "Ảnh" ? body : "Đã gửi ảnh";
  if (type === "audio") return body && body !== "Ghi âm" ? body : "Đã gửi ghi âm";
  return body || "Tin nhắn mới";
}

function isLegacyAutoReplyRow(row: Record<string, unknown>) {
  return (
    String(row.sender_role ?? "") === "guard" &&
    LEGACY_AUTO_REPLY.test(String(row.body ?? ""))
  );
}

async function pollSecurityRequests(
  url: string,
  anon: string,
  token: string,
): Promise<LocalAlert[]> {
  const apiUrl =
    `${url}/rest/v1/security_requests` +
    `?status=eq.open&select=id,request_type,building,apartment,created_at` +
    `&order=created_at.desc&limit=20`;
  const rows = await getJsonArray(apiUrl, anon, token, "public");
  if (rows.length === 0) return [];

  const seen = await loadSeenSet(STATE_CREDS.seenSecurityIds);
  const bootKey = `${STATE_CREDS.bootstrapped}:security`;
  const bootstrapped = await AsyncStorage.getItem(bootKey);

  if (!bootstrapped) {
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (id) seen.add(id);
    }
    await saveSeenSet(STATE_CREDS.seenSecurityIds, seen);
    await AsyncStorage.setItem(bootKey, "1");
    return [];
  }

  const alerts: LocalAlert[] = [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const id = String(row.id ?? "");
    if (!id || seen.has(id)) continue;
    const type = String(row.request_type ?? "request");
    const place = [row.apartment, row.building].filter(Boolean).join(" · ");
    const title = type === "sos" || type === "fire" ? "SOS / Yêu cầu khẩn" : "Yêu cầu cư dân mới";
    const body = place ? `${place} — cần xử lý` : "Có yêu cầu mới cần xử lý";
    alerts.push({ title, body, channelId: "security", id, kind: "security" });
    seen.add(id);
  }
  if (alerts.length > 0) await saveSeenSet(STATE_CREDS.seenSecurityIds, seen);
  return alerts;
}

async function pollPlatformNotifications(
  url: string,
  anon: string,
  token: string,
  userId: string,
): Promise<LocalAlert[]> {
  const encodedUser = encodeURIComponent(userId);
  const apiUrl =
    `${url}/rest/v1/notification` +
    `?user_id=eq.${encodedUser}` +
    `&dismissed_at=is.null` +
    `&select=id,title,body,topic,created_at` +
    `&order=created_at.desc&limit=20`;
  const rows = await getJsonArray(apiUrl, anon, token, "platform");
  if (rows.length === 0) return [];

  const seen = await loadSeenSet(STATE_CREDS.seenPlatformNotifIds);
  const bootKey = `${STATE_CREDS.bootstrapped}:platform`;
  const bootstrapped = await AsyncStorage.getItem(bootKey);

  if (!bootstrapped) {
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (id) seen.add(id);
    }
    await saveSeenSet(STATE_CREDS.seenPlatformNotifIds, seen);
    await AsyncStorage.setItem(bootKey, "1");
    return [];
  }

  const alerts: LocalAlert[] = [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const id = String(row.id ?? "");
    if (!id || seen.has(id)) continue;
    const topic = String(row.topic ?? "");
    alerts.push({
      id,
      title: String(row.title ?? "Thông báo mới"),
      body: row.body ? String(row.body) : undefined,
      channelId: topic.startsWith("sos.") || topic.startsWith("security") ? "security" : "default",
      kind: "platform",
    });
    seen.add(id);
  }
  if (alerts.length > 0) await saveSeenSet(STATE_CREDS.seenPlatformNotifIds, seen);
  return alerts;
}

async function pollResidentChatMessages(
  url: string,
  anon: string,
  token: string,
): Promise<LocalAlert[]> {
  const apiUrl =
    `${url}/rest/v1/security_chat_messages` +
    `?sender_role=eq.resident` +
    `&select=id,user_id,sender_role,body,message_type,created_at` +
    `&order=created_at.desc&limit=30`;
  const rows = await getJsonArray(apiUrl, anon, token, "public");
  if (rows.length === 0) return [];

  const seen = await loadSeenSet(STATE_CREDS.seenChatMsgIds);
  const bootKey = `${STATE_CREDS.bootstrapped}:chat`;
  const bootstrapped = await AsyncStorage.getItem(bootKey);

  if (!bootstrapped) {
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (id) seen.add(id);
    }
    await saveSeenSet(STATE_CREDS.seenChatMsgIds, seen);
    await AsyncStorage.setItem(bootKey, "1");
    return [];
  }

  const alerts: LocalAlert[] = [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const id = String(row.id ?? "");
    const residentId = String(row.user_id ?? "");
    if (!id || !residentId || seen.has(id) || isLegacyAutoReplyRow(row)) continue;
    alerts.push({
      id,
      title: "Tin nhắn cư dân",
      body: chatPreviewBody(row),
      channelId: "chat",
      kind: "chat",
      data: { route: "/chat", residentId },
    });
    seen.add(id);
  }
  if (alerts.length > 0) await saveSeenSet(STATE_CREDS.seenChatMsgIds, seen);
  return alerts;
}

/** Poll Supabase — fallback SOS / platform (chat do dispatch-chat-push, không poll trùng). */
export async function pullAndPresentGuardNotifications(): Promise<boolean> {
  const creds = await loadCredentials();
  if (!creds) return false;

  const { presentLocalNotification } = await import("@mobile/lib/push-native");
  const securityAlerts = await pollSecurityRequests(creds.url, creds.anon, creds.token);
  const platformAlerts = await pollPlatformNotifications(
    creds.url,
    creds.anon,
    creds.token,
    creds.userId,
  );
  const all = [...securityAlerts, ...platformAlerts];
  if (all.length === 0) return false;

  for (const alert of all) {
    await presentLocalNotification({
      title: alert.title,
      body: alert.body,
      channelId: alert.channelId,
      identifier: `${alert.kind}-${alert.id}`,
      data: alert.data,
    });
  }
  return true;
}
