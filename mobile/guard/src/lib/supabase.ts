import "react-native-url-polyfill/auto";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedStorage } from "@supabase/supabase-js";
import { createSupabaseClient } from "@shared/supabase/create-client";
import { initSupabase } from "@shared/supabase/get-client";

const AUTH_PREFIX = "stos.guard.auth.";

const DEFAULT_URL = "https://bigarvjahnxiuovepaxm.supabase.co";
const DEFAULT_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZ2FydmphaG54aXVvdmVwYXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjc0MjUsImV4cCI6MjA5NDc0MzQyNX0.t6PAcFIUs1PS77MymF4nmMbIaN-YCiADzOhk5R9_0u4";

function authStorage(): SupportedStorage {
  return {
    getItem: (key) => AsyncStorage.getItem(AUTH_PREFIX + key),
    setItem: (key, value) => AsyncStorage.setItem(AUTH_PREFIX + key, value),
    removeItem: (key) => AsyncStorage.removeItem(AUTH_PREFIX + key),
  };
}

function readEnv() {
  const extra = Constants.expoConfig?.extra ?? {};
  const url =
    (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
    (extra.supabaseUrl as string | undefined) ||
    DEFAULT_URL;
  const key =
    (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    (extra.supabaseAnonKey as string | undefined) ||
    DEFAULT_KEY;
  return { url, key };
}

let initialized = false;
let initError: string | null = null;

export function getSupabaseInitError() {
  return initError;
}

export function ensureSupabase() {
  if (initialized) return;
  if (initError) return;
  try {
    const { url, key } = readEnv();
    initSupabase(
      createSupabaseClient({
        url,
        publishableKey: key,
        storage: authStorage(),
      }),
    );
    initialized = true;
  } catch (e) {
    initError = e instanceof Error ? e.message : "Không khởi tạo được Supabase";
  }
}

export function pilotPrefillEnabled(): boolean {
  const v = process.env.EXPO_PUBLIC_PILOT_PREFILL;
  if (v === "false") return false;
  const extra = Constants.expoConfig?.extra?.pilotPrefill;
  return extra !== false;
}

export function getPilotLoginDefaults() {
  if (!pilotPrefillEnabled()) {
    return { identifier: "", password: "", label: "" };
  }
  return {
    identifier: "nhanvienbaove@securitytech.vn",
    password: "Demo@12345",
    label: "Nhân viên bảo vệ",
  };
}
