import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getWebSupabase } from "./client-web";

let _client: SupabaseClient<Database> | undefined;

/** Gọi từ React Native trước khi dùng auth/API. Web lazy-init qua client-web. */
export function initSupabase(client: SupabaseClient<Database>) {
  _client = client;
}

export function getSupabase(): SupabaseClient<Database> {
  if (!_client) {
    _client = getWebSupabase();
  }
  return _client;
}

/** Giữ tương thích import `@shared/supabase/client`. */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver);
  },
});
