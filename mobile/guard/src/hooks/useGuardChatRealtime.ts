import { useEffect } from "react";

import { AppState } from "react-native";

import { usePathname } from "expo-router";

import { useQueryClient } from "@tanstack/react-query";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@shared/supabase/get-client";

import { useAuth } from "@mobile/hooks/useAuth";

import { useGuardPrefs } from "@mobile/hooks/useGuardPrefs";

import { presentLocalNotification } from "@mobile/lib/push-native";

import {

  markGuardChatMessageNotified,

  shouldNotifyGuardChatMessage,

} from "@mobile/lib/guard-notification-pull";

import {

  chatMessagePreview,

  filterChatMessages,

  isLegacyAutoReply,

} from "@mobile/lib/chat-message-utils";

import type { GuardChatThread, SecurityChatMessage } from "@guard/api/security-chat";



function removeStaleChannel(supabase: SupabaseClient, channelName: string) {

  for (const existing of supabase.getChannels()) {

    if (existing.topic === `realtime:${channelName}`) {

      void supabase.removeChannel(existing);

    }

  }

}



function subscribeChannel(

  supabase: SupabaseClient,

  channelName: string,

  build: (channel: RealtimeChannel) => RealtimeChannel,

) {

  removeStaleChannel(supabase, channelName);

  const channel = build(supabase.channel(channelName));

  void channel.subscribe();

  return channel;

}



function isOnResidentThread(pathname: string | null, residentUserId: string) {

  if (!pathname) return false;

  return pathname.includes(residentUserId);

}



function shouldShowGuardChatBanner(pathname: string | null, residentUserId: string) {
  if (isOnResidentThread(pathname, residentUserId) && AppState.currentState === "active") {
    return false;
  }
  return true;
}



async function notifyGuardResidentMessage(row: SecurityChatMessage, residentUserId: string) {
  if (!(await shouldNotifyGuardChatMessage(row.id))) return;
  // Nền / thoát app: chỉ nhận qua dispatch-chat-push — tránh trùng banner.
  if (AppState.currentState !== "active") return;

  await markGuardChatMessageNotified(row.id);
  await presentLocalNotification({
    title: "Tin nhắn cư dân",
    body: chatMessagePreview(row),
    channelId: "chat",
    identifier: `chat-${row.id}`,
    data: { route: "/chat", residentId: residentUserId, chatMessageId: row.id },
  });
}



/** Gọi một lần ở root layout — tránh subscribe trùng khi mở /chat. */

export function useGuardChatInboxRealtime() {

  const qc = useQueryClient();

  const { user } = useAuth();

  const userId = user?.id;

  const pathname = usePathname();

  const { notificationsEnabled } = useGuardPrefs();



  useEffect(() => {

    if (!userId) return;

    const supabase = getSupabase();

    const channelName = `guard-chat-inbox-${userId}`;

    const channel = subscribeChannel(supabase, channelName, (ch) =>

      ch.on(

        "postgres_changes",

        { event: "INSERT", schema: "public", table: "security_chat_messages" },

        (payload) => {

          const row = payload.new as SecurityChatMessage | undefined;

          if (!row?.id || isLegacyAutoReply(row)) return;



          void qc.invalidateQueries({ queryKey: ["guard-chat-threads"] });



          if (row.sender_role !== "resident") return;

          if (!notificationsEnabled) return;

          if (!shouldShowGuardChatBanner(pathname, row.user_id)) return;

          void notifyGuardResidentMessage(row, row.user_id);

        },

      ),

    );

    return () => {

      void supabase.removeChannel(channel);

    };

  }, [userId, qc, pathname, notificationsEnabled]);

}



export function useGuardChatThreadRealtime(residentUserId: string | undefined) {

  const qc = useQueryClient();

  const { user } = useAuth();

  const userId = user?.id;

  const pathname = usePathname();

  const { notificationsEnabled } = useGuardPrefs();



  useEffect(() => {

    if (!userId || !residentUserId) return;

    const supabase = getSupabase();

    const channelName = `guard-chat-thread-${userId}-${residentUserId}`;

    const channel = subscribeChannel(supabase, channelName, (ch) =>

      ch.on(

        "postgres_changes",

        {

          event: "INSERT",

          schema: "public",

          table: "security_chat_messages",

          filter: `user_id=eq.${residentUserId}`,

        },

        (payload) => {

          const row = payload.new as SecurityChatMessage | undefined;

          if (!row?.id || isLegacyAutoReply(row)) return;

          qc.setQueryData<SecurityChatMessage[]>(

            ["guard-chat-messages", residentUserId],

            (old) => {

              const prev = old ?? [];

              if (prev.some((m) => m.id === row.id)) return prev;

              return filterChatMessages([...prev, row]);

            },

          );

          if (!isLegacyAutoReply(row)) {

            qc.setQueryData<GuardChatThread[]>(["guard-chat-threads"], (old) => {

              if (!old) return old;

              return old.map((t) =>

                t.resident_user_id === residentUserId

                  ? {

                      ...t,

                      last_body: row.body,

                      last_sender_role: row.sender_role,

                      last_at: row.created_at,

                      unread_count:

                        row.sender_role === "resident" ? (t.unread_count ?? 0) + 1 : 0,

                    }

                  : t,

              );

            });

          }



          if (row.sender_role !== "resident") return;
          if (!notificationsEnabled) return;
          // Chỉ đồng bộ UI — thông báo do inbox realtime xử lý.
        },

      ),

    );

    return () => {

      void supabase.removeChannel(channel);

    };

  }, [userId, residentUserId, qc, pathname, notificationsEnabled]);

}


