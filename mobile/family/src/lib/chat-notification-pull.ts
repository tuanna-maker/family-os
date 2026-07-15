import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import { presentLocalNotification } from "@mobile/lib/push-native";



const AUTH_CREDS = {

  token: "stos_family_bg_token",

  userId: "stos_family_bg_user_id",

  url: "stos_family_bg_url",

  anon: "stos_family_bg_anon",

} as const;



const SEEN_CHAT_IDS = "stos_family_seen_chat_msg_ids";

const CHAT_BOOTSTRAP = "stos_family_chat_pull_bootstrapped";



const LEGACY_AUTO_REPLY =

  /Bảo an đã nhận tin\. Đội trực sẽ phản hồi|Security received your message\. The on-duty team/i;



type ChatRow = {
  id: string;
  sender_role: string;
  body: string | null;
  message_type?: string | null;
  created_at: string;
  push_dispatched_at?: string | null;
};



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

    SecureStore.getItemAsync(AUTH_CREDS.token),

    SecureStore.getItemAsync(AUTH_CREDS.userId),

    SecureStore.getItemAsync(AUTH_CREDS.url),

    SecureStore.getItemAsync(AUTH_CREDS.anon),

  ]);

  if (!token || !userId || !url || !anon) return null;

  return { token, userId, url, anon };

}



async function loadSeenChatIds(): Promise<Set<string>> {

  try {

    const raw = await SecureStore.getItemAsync(SEEN_CHAT_IDS);

    if (!raw) return new Set();

    return new Set(raw.split(",").filter(Boolean));

  } catch {

    return new Set();

  }

}



async function saveSeenChatIds(ids: Set<string>) {

  try {

    await SecureStore.setItemAsync(SEEN_CHAT_IDS, Array.from(ids).slice(-200).join(","));

  } catch {

    // Best-effort.

  }

}



export async function markFamilyChatMessageNotified(messageId: string) {

  if (!messageId) return;

  const seen = await loadSeenChatIds();

  seen.add(messageId);

  await saveSeenChatIds(seen);

}



export async function shouldNotifyFamilyChatMessage(messageId: string) {

  const seen = await loadSeenChatIds();

  return !seen.has(messageId);

}



function previewBody(row: ChatRow) {

  const type = row.message_type ?? "text";

  const body = (row.body ?? "").trim();

  if (type === "image") return body && body !== "Ảnh" ? body : "Đã gửi ảnh";

  if (type === "audio") return body && body !== "Ghi âm" ? body : "Đã gửi ghi âm";

  return body || "Tin nhắn mới";

}



function isLegacyAutoReply(row: ChatRow) {

  return row.sender_role === "guard" && LEGACY_AUTO_REPLY.test(row.body ?? "");

}



async function fetchGuardChatMessages(

  url: string,

  anon: string,

  token: string,

  userId: string,

): Promise<ChatRow[]> {

  const encodedUser = encodeURIComponent(userId);

  const apiUrl =

    `${url}/rest/v1/security_chat_messages` +

    `?user_id=eq.${encodedUser}` +

    `&sender_role=eq.guard` +

    `&select=id,sender_role,body,message_type,created_at,push_dispatched_at` +

    `&order=created_at.desc&limit=20`;



  const res = await fetch(apiUrl, {

    headers: {

      apikey: anon,

      Authorization: `Bearer ${token}`,

      Accept: "application/json",

    },

  });

  if (!res.ok) return [];

  const rows = (await res.json()) as ChatRow[];

  return Array.isArray(rows) ? rows : [];

}



/** Poll tin chat — fallback khi Expo push không tới (app nền/tắt). Không trùng dispatch-chat-push. */
export async function pullAndPresentFamilyChatNotifications(): Promise<boolean> {
  const creds = await loadCredentials();
  if (!creds) return false;

  const rows = await fetchGuardChatMessages(

    creds.url,

    creds.anon,

    creds.token,

    creds.userId,

  );

  if (rows.length === 0) return false;



  const bootKey = `${CHAT_BOOTSTRAP}:${creds.userId}`;

  const bootstrapped = await SecureStore.getItemAsync(bootKey);

  const seenIds = await loadSeenChatIds();



  if (!bootstrapped) {

    for (const row of rows) {

      if (row.id) seenIds.add(row.id);

    }

    await saveSeenChatIds(seenIds);

    await SecureStore.setItemAsync(bootKey, "1");

    return false;

  }



  const fresh = rows
    .filter(
      (r) =>
        r.id &&
        !seenIds.has(r.id) &&
        !isLegacyAutoReply(r) &&
        !r.push_dispatched_at,
    )
    .reverse();



  if (fresh.length === 0) return false;



  for (const row of fresh) {

    await presentLocalNotification({

      title: "Đội bảo an",

      body: previewBody(row),

      channelId: "chat",

      identifier: `chat-${row.id}`,

      data: { route: "/bao-an/chat", chatMessageId: row.id },

    });

    seenIds.add(row.id);

  }

  await saveSeenChatIds(seenIds);

  return true;

}


