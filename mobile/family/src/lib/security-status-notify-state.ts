import * as SecureStore from "expo-secure-store";
import { securityStatusDedupeKey, type SecurityStatusPhase } from "@shared/utils/security-status-notify";

const SEEN_KEY = "stos_family_seen_sec_status";

async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

async function saveSeen(seen: Set<string>) {
  try {
    await SecureStore.setItemAsync(SEEN_KEY, [...seen].slice(-120).join(","));
  } catch {
    // Best-effort.
  }
}

export async function shouldPresentFamilySecurityStatus(
  requestId: string,
  status: SecurityStatusPhase,
) {
  const seen = await loadSeen();
  return !seen.has(securityStatusDedupeKey(requestId, status));
}

export async function markFamilySecurityStatusSeen(requestId: string, status: SecurityStatusPhase) {
  const seen = await loadSeen();
  seen.add(securityStatusDedupeKey(requestId, status));
  await saveSeen(seen);
}
