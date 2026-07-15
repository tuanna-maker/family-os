import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireChatPushDispatch } from "@shared/supabase";
import { getSupabase } from "@shared/supabase/get-client";
import type { SecurityChatMessageType } from "@shared/supabase";
import { getStrings } from "@mobile/i18n/useI18n";
import { getLocaleRef } from "@mobile/i18n/localeRef";

export type SecurityChatMessage = {
  id: string;
  sender_role: "resident" | "guard" | "system";
  body: string;
  message_type?: SecurityChatMessageType;
  media_url?: string | null;
  media_duration_ms?: number | null;
  created_at: string;
};

export type SendSecurityChatPayload = {
  body?: string;
  family_id?: string | null;
  message_type?: SecurityChatMessageType;
  media_url?: string | null;
  media_duration_ms?: number | null;
};

const LOCAL_KEY = "family-security-chat";

const LEGACY_AUTO_REPLY =
  /Bảo an đã nhận tin\. Đội trực sẽ phản hồi|Security received your message\. The on-duty team/i;

/** Tin auto-reply cũ (local fallback) — ẩn khỏi UI. */
export function isLegacyAutoReply(m: Pick<SecurityChatMessage, "sender_role" | "body">) {
  return m.sender_role === "guard" && LEGACY_AUTO_REPLY.test(m.body ?? "");
}

export function filterChatMessages(messages: SecurityChatMessage[]) {
  return messages.filter((m) => !isLegacyAutoReply(m));
}

export function chatMessagePreview(m: Pick<SecurityChatMessage, "body" | "message_type">) {
  const type = m.message_type ?? "text";
  const body = (m.body ?? "").trim();
  if (type === "image") return body && body !== "Ảnh" ? body : "Đã gửi ảnh";
  if (type === "audio") return body && body !== "Ghi âm" ? body : "Đã gửi ghi âm";
  return body || "Tin nhắn mới";
}
const MSG_COLS =
  "id,sender_role,body,message_type,media_url,media_duration_ms,created_at";

function isMissingTable(err: { code?: string; message?: string }) {
  return err.code === "42P01" || /does not exist|schema cache/i.test(err.message ?? "");
}

function isMissingColumn(err: { code?: string; message?: string }) {
  return err.code === "42703" || /column.*does not exist|schema cache/i.test(err.message ?? "");
}

async function loadLocal(userId: string): Promise<SecurityChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as SecurityChatMessage[]) : [];
  } catch {
    return [];
  }
}

async function saveLocal(userId: string, messages: SecurityChatMessage[]) {
  await AsyncStorage.setItem(`${LOCAL_KEY}:${userId}`, JSON.stringify(messages.slice(-80)));
}

export async function listSecurityChatMessages(familyId?: string | null) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let { data, error } = await supabase
    .from("security_chat_messages")
    .select(MSG_COLS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error && isMissingColumn(error)) {
    const fallback = await supabase
      .from("security_chat_messages")
      .select("id,sender_role,body,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100);
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error && isMissingTable(error)) return filterChatMessages(await loadLocal(user.id));
  if (error) throw new Error(error.message);

  await AsyncStorage.removeItem(`${LOCAL_KEY}:${user.id}`).catch(() => {});

  const rows = filterChatMessages((data ?? []) as SecurityChatMessage[]);
  if (rows.length === 0 && familyId) {
    return [
      {
        id: "welcome",
        sender_role: "system" as const,
        body: "Xin chào! Đây là kênh chat trực tiếp với đội bảo an. Gửi tin nhắn khi cần hỗ trợ.",
        message_type: "text" as const,
        created_at: new Date().toISOString(),
      },
    ];
  }
  return rows;
}

export async function sendSecurityChatMessage(payload: SendSecurityChatPayload) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const body = (payload.body ?? "").trim();
  const messageType = payload.message_type ?? "text";
  if (!body && !payload.media_url) throw new Error("Tin nhắn trống");

  const row = {
    user_id: user.id,
    family_id: payload.family_id ?? null,
    sender_role: "resident" as const,
    body: body || (messageType === "image" ? "Ảnh" : messageType === "audio" ? "Ghi âm" : ""),
    message_type: messageType,
    media_url: payload.media_url ?? null,
    media_duration_ms: payload.media_duration_ms ?? null,
  };

  let { data, error } = await supabase
    .from("security_chat_messages")
    .insert(row)
    .select(MSG_COLS)
    .single();

  if (error && isMissingColumn(error)) {
    const fallback = await supabase
      .from("security_chat_messages")
      .insert({
        user_id: user.id,
        family_id: payload.family_id ?? null,
        sender_role: "resident",
        body: row.body,
      })
      .select("id,sender_role,body,created_at")
      .single();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error && isMissingTable(error)) {
    const local = await loadLocal(user.id);
    const resident: SecurityChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender_role: "resident",
      body: row.body,
      message_type: messageType,
      media_url: payload.media_url ?? null,
      media_duration_ms: payload.media_duration_ms ?? null,
      created_at: new Date().toISOString(),
    };
    await saveLocal(user.id, [...local, resident]);
    return resident;
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error(getStrings(getLocaleRef()).common.sendMessageFailed);
  const sent = data as SecurityChatMessage;
  fireChatPushDispatch(supabase, sent.id);
  return sent;
}
