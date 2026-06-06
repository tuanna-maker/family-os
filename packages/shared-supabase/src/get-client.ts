import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getWebSupabase } from "./client-web";

let _client: SupabaseClient<Database> | undefined;

function isReactNative() {
  return (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { product?: string }).product === "ReactNative"
  );
}

/** Gọi từ React Native trước khi dùng auth/API. Web lazy-init qua client-web. */
export function initSupabase(client: SupabaseClient<Database>) {
  _client = client;
}

export function getSupabase(): SupabaseClient<Database> {
  if (!_client) {
    if (isReactNative()) {
      throw new Error("Supabase chưa khởi tạo — gọi initSupabase() trước khi dùng API.");
    }
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
