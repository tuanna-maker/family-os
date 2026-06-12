import { useRef } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listSecurityChatMessages,
  sendSecurityChatMessage,
  type SecurityChatMessage,
  type SendSecurityChatPayload,
} from "@mobile/lib/security-chat";
import { useSecurityChatCacheSync } from "@mobile/hooks/useSecurityChatRealtime";
import { SecurityChatBubble } from "@mobile/components/security/SecurityChatBubble";
import { SecurityChatComposer } from "@mobile/components/security/SecurityChatComposer";
import { useI18n } from "@mobile/i18n/useI18n";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

export default function BaoAnChatScreen() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { locale, s } = useI18n();
  const chat = s.security.chat;
  const listRef = useRef<FlatList<SecurityChatMessage>>(null);
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.background },
    list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  }));

  useSecurityChatCacheSync(familyId);

  const q = useQuery({
    queryKey: ["security-chat", familyId],
    queryFn: () => listSecurityChatMessages(familyId),
    staleTime: 30_000,
  });

  const sendMut = useMutation({
    mutationFn: (payload: SendSecurityChatPayload) =>
      sendSecurityChatMessage({ ...payload, family_id: familyId }),
    onSuccess: (row) => {
      qc.setQueryData<SecurityChatMessage[]>(["security-chat", familyId], (old) => {
        const prev = (old ?? []).filter((m) => m.id !== "welcome");
        if (prev.some((m) => m.id === row.id)) return prev;
        return [...prev, row];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const messages = q.data ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={8}
    >
      <PageHeader title={chat.title} back="/(tabs)/bao-an" />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        style={styles.root}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <SecurityChatBubble
            item={item}
            mine={item.sender_role === "resident"}
            locale={locale}
            guardLabel={chat.guardLabel}
          />
        )}
      />

      <SecurityChatComposer
        placeholder={chat.placeholder}
        sending={sendMut.isPending}
        onSend={async (payload) => {
          await sendMut.mutateAsync(payload);
        }}
      />
    </KeyboardAvoidingView>
  );
}
