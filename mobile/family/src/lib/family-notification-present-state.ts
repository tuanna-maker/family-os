import * as SecureStore from "expo-secure-store";

const SEEN_IDS_KEY = "stos_family_os_presented_ids";
const SEEN_CAP = 300;

export type PresentableNotification = {
  id: string;
  type?: string;
  ref_id?: string | null;
  read_at?: string | null;
  created_at?: string;
};

function dayKey(createdAt?: string) {
  if (!createdAt) return "";
  return createdAt.slice(0, 10);
}

/** Khóa chống bắn OS trùng — theo id hoặc ref_id + ngày (nhắc thuốc / việc con). */
export function familyOsPresentKey(row: PresentableNotification) {
  const day = dayKey(row.created_at);
  if (row.type === "medicine" && row.ref_id && day) return `med:${row.ref_id}:${day}`;
  if (row.type === "parent_reminder" && row.ref_id && day) return `pr:${row.ref_id}:${day}`;
  return `id:${row.id}`;
}

async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(SEEN_IDS_KEY);
    if (!raw) return new Set();
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

async function saveSeen(seen: Set<string>) {
  try {
    await SecureStore.setItemAsync(SEEN_IDS_KEY, Array.from(seen).slice(-SEEN_CAP).join(","));
  } catch {
    // Best-effort.
  }
}

export async function shouldPresentFamilyOsNotification(row: PresentableNotification) {
  if (row.read_at) return false;
  const seen = await loadSeen();
  return !seen.has(familyOsPresentKey(row));
}

export async function markFamilyOsNotificationPresented(row: PresentableNotification) {
  const seen = await loadSeen();
  seen.add(familyOsPresentKey(row));
  seen.add(`id:${row.id}`);
  await saveSeen(seen);
}
