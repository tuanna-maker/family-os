import type { SupabaseClient } from "@supabase/supabase-js";

/** Gửi push chat qua Edge Function — retry một lần nếu lần đầu thất bại. */
export function fireChatPushDispatch(supabase: SupabaseClient, messageId: string | undefined | null) {
  if (!messageId) return;

  const invoke = () =>
    supabase.functions.invoke("dispatch-chat-push", { body: { message_id: messageId } });

  void (async () => {
    const first = await invoke();
    if (!first.error) return;
    await new Promise((r) => setTimeout(r, 600));
    const second = await invoke();
    if (second.error) {
      console.warn("[chat-push] dispatch failed:", second.error.message);
    }
  })();
}
