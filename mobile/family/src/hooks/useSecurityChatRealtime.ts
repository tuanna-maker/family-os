import { useEffect } from "react";

import { AppState } from "react-native";

import { usePathname } from "expo-router";

import { useQueryClient } from "@tanstack/react-query";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@shared/supabase/get-client";

import { useAuth } from "@mobile/hooks/useAuth";

import { useAppPrefs } from "@mobile/hooks/useAppPrefs";

import { presentLocalNotification } from "@mobile/lib/push-native";

import {

  markFamilyChatMessageNotified,

  shouldNotifyFamilyChatMessage,

} from "@mobile/lib/chat-notification-pull";

import {

  chatMessagePreview,

  filterChatMessages,

  isLegacyAutoReply,

  type SecurityChatMessage,

} from "@mobile/lib/security-chat";



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



function shouldShowFamilyChatBanner(pathname: string | null) {
  const onChatScreen = pathname?.includes("bao-an/chat");
  if (onChatScreen && AppState.currentState === "active") return false;
  return true;
}



async function notifyFamilyGuardMessage(row: SecurityChatMessage) {

  if (!(await shouldNotifyFamilyChatMessage(row.id))) return;

  await markFamilyChatMessageNotified(row.id);

  await presentLocalNotification({

    title: "Đội bảo an",

    body: chatMessagePreview(row),

    channelId: "chat",

    identifier: `chat-${row.id}`,

    data: { route: "/bao-an/chat", chatMessageId: row.id },

  });

}



/** Luôn chạy ở root layout — báo tin bảo vệ trả lời khi app nền / tắt màn chat. */

export function useSecurityChatPush() {

  const qc = useQueryClient();

  const { session } = useAuth();

  const userId = session?.user?.id;

  const pathname = usePathname();

  const { pushEnabled } = useAppPrefs();



  useEffect(() => {

    if (!userId) return;

    const supabase = getSupabase();

    const channelName = `family-security-chat-push-${userId}`;

    const channel = subscribeChannel(supabase, channelName, (ch) =>

      ch.on(

        "postgres_changes",

        {

          event: "INSERT",

          schema: "public",

          table: "security_chat_messages",

          filter: `user_id=eq.${userId}`,

        },

        (payload) => {

          const row = payload.new as SecurityChatMessage | undefined;

          if (!row?.id || isLegacyAutoReply(row)) return;



          void qc.invalidateQueries({ queryKey: ["security-chat"] });



          if (row.sender_role !== "guard") return;

          if (!pushEnabled || !shouldShowFamilyChatBanner(pathname)) return;

          void notifyFamilyGuardMessage(row);

        },

      ),

    );

    return () => {

      void supabase.removeChannel(channel);

    };

  }, [userId, qc, pathname, pushEnabled]);

}



/** Chỉ trên màn chat — đồng bộ danh sách tin realtime. */

export function useSecurityChatCacheSync(familyId?: string | null) {

  const qc = useQueryClient();

  const { session } = useAuth();

  const userId = session?.user?.id;



  useEffect(() => {

    if (!userId) return;

    const supabase = getSupabase();

    const channelName = `family-security-chat-cache-${userId}`;

    const channel = subscribeChannel(supabase, channelName, (ch) =>

      ch.on(

        "postgres_changes",

        {

          event: "INSERT",

          schema: "public",

          table: "security_chat_messages",

          filter: `user_id=eq.${userId}`,

        },

        (payload) => {

          const row = payload.new as SecurityChatMessage | undefined;

          if (!row?.id || isLegacyAutoReply(row)) return;



          qc.setQueryData<SecurityChatMessage[]>(["security-chat", familyId ?? null], (old) => {

            const prev = old ?? [];

            if (prev.some((m) => m.id === row.id)) return prev;

            const withoutWelcome = prev.filter((m) => m.id !== "welcome");

            return filterChatMessages([...withoutWelcome, row]);

          });

        },

      ),

    );

    return () => {

      void supabase.removeChannel(channel);

    };

  }, [userId, familyId, qc]);

}



/** @deprecated Dùng useSecurityChatPush + useSecurityChatCacheSync */

export function useSecurityChatRealtime(familyId?: string | null) {

  useSecurityChatPush();

  useSecurityChatCacheSync(familyId);

}


