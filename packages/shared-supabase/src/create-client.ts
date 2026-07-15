import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "./types";

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
  storage?: SupportedStorage;
};

export function createSupabaseClient(env: SupabaseEnv): SupabaseClient<Database> {
  if (!env.url || !env.publishableKey) {
    throw new Error(
      `Missing Supabase config. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or VITE_* on web).`,
    );
  }
  return createClient<Database>(env.url, env.publishableKey, {
    auth: {
      storage: env.storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
