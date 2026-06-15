import React, { useEffect, useRef } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SubHeader } from "@mobile/components/SubHeader";
import { SecurityChatBubble } from "@mobile/components/SecurityChatBubble";
import {
  SecurityChatComposer,
  type GuardChatSendPayload,
} from "@mobile/components/SecurityChatComposer";
import {
  getResidentChatProfile,
  listResidentChatMessages,
  markGuardChatRead,
  sendGuardChatMessage,
  type SecurityChatMessage,
} from "@guard/api/security-chat";
import { useGuardChatThreadRealtime } from "@mobile/hooks/useGuardChatRealtime";
import { filterChatMessages } from "@mobile/lib/chat-message-utils";
import { useTheme } from "@mobile/theme/themeStore";

export default function GuardChatThreadScreen() {
  const { residentId, name } = useLocalSearchParams<{ residentId: string; name?: string }>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const listRef = useRef<FlatList<SecurityChatMessage>>(null);

  useGuardChatThreadRealtime(residentId);

  const q = useQuery({
    queryKey: ["guard-chat-messages", residentId],
    queryFn: () => listResidentChatMessages(residentId!),
    enabled: !!residentId,
    staleTime: 10_000,
  });

  const profileQ = useQuery({
    queryKey: ["resident-chat-profile", residentId],
    queryFn: () => getResidentChatProfile(residentId!),
    enabled: !!residentId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!residentId) return;
    void markGuardChatRead(residentId).then(() => {
      qc.setQueryData<import("@guard/api/security-chat").GuardChatThread[]>(
        ["guard-chat-threads"],
        (old) =>
          old?.map((t) =>
            t.resident_user_id === residentId ? { ...t, unread_count: 0 } : t,
          ),
      );
    });
  }, [residentId, qc]);

  const sendMut = useMutation({
    mutationFn: (payload: GuardChatSendPayload) =>
      sendGuardChatMessage({ resident_user_id: residentId!, ...payload }),
    onSuccess: (row) => {
      qc.setQueryData<SecurityChatMessage[]>(["guard-chat-messages", residentId], (old) => {
        const prev = old ?? [];
        if (prev.some((m) => m.id === row.id)) return prev;
        return [...prev, row];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    },
  });

  const messages = filterChatMessages(q.data ?? []);
  const title =
    profileQ.data?.full_name?.trim() ||
    (typeof name === "string" && name ? name : "Cư dân");

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={8}
    >
      <SubHeader title={title} back="/chat" />

      {q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <SecurityChatBubble item={item} />}
        />
      )}

      <SecurityChatComposer
        sending={sendMut.isPending}
        onSend={async (payload) => {
          await sendMut.mutateAsync(payload);
        }}
      />
    </KeyboardAvoidingView>
  );
}
