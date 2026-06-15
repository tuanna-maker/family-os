import Constants from "expo-constants";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { presentFamilyNotificationRow } from "@mobile/lib/present-family-notification";
import { shouldPresentOsNotification } from "@mobile/lib/notification-os";
import { presentLocalNotification } from "@mobile/lib/push-native";
import {
  markFamilyChatMessageNotified,
  shouldNotifyFamilyChatMessage,
} from "@mobile/lib/chat-notification-pull";

const AUTH_CREDS = {
  token: "stos_family_bg_token",
  userId: "stos_family_bg_user_id",
  url: "stos_family_bg_url",
  anon: "stos_family_bg_anon",
} as const;

const STATE_CREDS = {
  seenIds: "stos_family_seen_notif_ids",
  bootstrapped: "stos_family_pull_bootstrapped",
} as const;

export type FamilyNotificationRow = {
  id: string;
  type: string;
  ref_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
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

async function getSeenIds(): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(STATE_CREDS.seenIds);
    if (!raw) return new Set();
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

async function saveSeenIds(ids: Set<string>) {
  try {
    const arr = Array.from(ids).slice(-200);
    await SecureStore.setItemAsync(STATE_CREDS.seenIds, arr.join(","));
  } catch {
    // Best-effort.
  }
}

export async function persistFamilyBackgroundCredentials(accessToken: string, userId: string) {
  const { url, anon } = readSupabaseEnv();
  if (!url || !anon) return;
  await SecureStore.setItemAsync(AUTH_CREDS.token, accessToken);
  await SecureStore.setItemAsync(AUTH_CREDS.userId, userId);
  await SecureStore.setItemAsync(AUTH_CREDS.url, url);
  await SecureStore.setItemAsync(AUTH_CREDS.anon, anon);
}

export async function clearFamilyBackgroundCredentials() {
  for (const key of Object.values(AUTH_CREDS)) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Best-effort.
    }
  }
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

async function fetchFamilyNotifications(
  url: string,
  anon: string,
  token: string,
  userId: string,
): Promise<FamilyNotificationRow[]> {
  const encodedUser = encodeURIComponent(userId);
  const apiUrl =
    `${url}/rest/v1/notifications` +
    `?user_id=eq.${encodedUser}` +
    `&dismissed_at=is.null` +
    `&select=id,type,ref_id,title,body,read_at,created_at` +
    `&order=created_at.desc&limit=30`;

  const res = await fetch(apiUrl, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as FamilyNotificationRow[];
  return Array.isArray(rows) ? rows : [];
}

/**
 * Poll public.notifications — hiện banner OS cho nhắc thuốc, nhắc việc con, phản hồi bảo vệ.
 * Lần đầu chỉ ghi nhận ID hiện có (không bắn notif cũ).
 */
export async function pullAndPresentFamilyNotifications(): Promise<boolean> {
  const creds = await loadCredentials();
  if (!creds) return false;

  const rows = await fetchFamilyNotifications(
    creds.url,
    creds.anon,
    creds.token,
    creds.userId,
  );
  if (rows.length === 0) return false;

  const bootKey = `${STATE_CREDS.bootstrapped}:${creds.userId}`;
  const bootstrapped = await SecureStore.getItemAsync(bootKey);
  const seenIds = await getSeenIds();

  if (!bootstrapped) {
    rows.forEach((r) => seenIds.add(r.id));
    await saveSeenIds(seenIds);
    await SecureStore.setItemAsync(bootKey, "1");
    return false;
  }

  const fresh = rows.filter((r) => !seenIds.has(r.id) && shouldPresentOsNotification(r.type)).reverse();

  if (fresh.length === 0) return false;

  for (const row of fresh) {
    const isChat = row.type === "security.chat";
    if (isChat && row.ref_id) {
      if (!(await shouldNotifyFamilyChatMessage(row.ref_id))) {
        seenIds.add(row.id);
        continue;
      }
      await markFamilyChatMessageNotified(row.ref_id);
      await presentLocalNotification({
        title: row.title || "Đội bảo an",
        body: row.body,
        channelId: "chat",
        identifier: `chat-${row.ref_id}`,
        data: {
          route: "/bao-an/chat",
          chatMessageId: row.ref_id,
          notificationId: row.id,
          type: row.type,
        },
      });
      seenIds.add(row.id);
      continue;
    }

    await presentFamilyNotificationRow(row);
    seenIds.add(row.id);
  }
  await saveSeenIds(seenIds);
  return true;
}
