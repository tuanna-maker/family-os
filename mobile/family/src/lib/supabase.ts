import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { SupportedStorage } from "@supabase/supabase-js";
import { createSupabaseClient } from "@shared/supabase/create-client";
import { initSupabase } from "@shared/supabase/get-client";

const AUTH_PREFIX = "stos.auth.";

function secureStorage(): SupportedStorage {
  return {
    getItem: (key) => SecureStore.getItemAsync(AUTH_PREFIX + key),
    setItem: (key, value) => SecureStore.setItemAsync(AUTH_PREFIX + key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(AUTH_PREFIX + key),
  };
}

function readEnv() {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    url:
      (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
      (extra.supabaseUrl as string | undefined) ||
      "",
    key:
      (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
      (extra.supabaseAnonKey as string | undefined) ||
      "",
  };
}

let initialized = false;

export function ensureSupabase() {
  if (initialized) return;
  const { url, key } = readEnv();
  initSupabase(
    createSupabaseClient({
      url,
      publishableKey: key,
      storage: secureStorage(),
    }),
  );
  initialized = true;
}

export function pilotPrefillEnabled(): boolean {
  const v = process.env.EXPO_PUBLIC_PILOT_PREFILL;
  if (v === "false") return false;
  const extra = Constants.expoConfig?.extra?.pilotPrefill;
  return extra !== false;
}

export function getPilotLoginDefaults() {
  if (!pilotPrefillEnabled()) {
    return { identifier: "", password: "" };
  }
  return {
    identifier: "giadinh@securitytech.vn",
    password: "Demo@12345",
  };
}
