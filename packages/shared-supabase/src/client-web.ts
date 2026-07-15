import { createAuthStorage } from "./storage";
import { createSupabaseClient } from "./create-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function readWebEnv() {
  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv);
  const url =
    env.VITE_SUPABASE_URL ||
    env.EXPO_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    "";
  const key =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    "";
  return { url, publishableKey: key };
}

let _web: SupabaseClient<Database> | undefined;

export function getWebSupabase(): SupabaseClient<Database> {
  if (!_web) {
    const env = readWebEnv();
    if (!env.url || !env.publishableKey) {
      const missing = [
        ...(!env.url ? ["SUPABASE_URL / VITE_SUPABASE_URL"] : []),
        ...(!env.publishableKey ? ["SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
    }
    const storage = typeof window !== "undefined" ? createAuthStorage() : undefined;
    _web = createSupabaseClient({ ...env, storage });
  }
  return _web;
}
