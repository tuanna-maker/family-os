import { getSupabase } from "@shared/supabase/get-client";

/** Gửi hàng đợi push lên server (Expo Push) — chạy khi app mở / nền. */
export function firePushDispatch() {
  void getSupabase()
    .functions.invoke("dispatch-push", { body: {} })
    .catch(() => {});
}
