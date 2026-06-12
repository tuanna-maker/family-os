import type { SupabaseClient } from "@supabase/supabase-js";

/** Gửi push chat qua Edge Function — fire-and-forget sau khi insert tin nhắn. */
export function fireChatPushDispatch(supabase: SupabaseClient, messageId: string | undefined | null) {
  if (!messageId) return;
  void supabase.functions
    .invoke("dispatch-chat-push", { body: { message_id: messageId } })
    .catch(() => {
      /* best-effort — poll/local vẫn hoạt động */
    });
}
