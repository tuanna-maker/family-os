import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react-native";
import { PageHeader } from "@mobile/components/ui";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listSecurityChatMessages, sendSecurityChatMessage } from "@mobile/lib/security-chat";

export default function BaoAnChatScreen() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const q = useQuery({
    queryKey: ["security-chat", familyId],
    queryFn: () => listSecurityChatMessages(familyId),
    refetchInterval: 8000,
  });

  const sendMut = useMutation({
    mutationFn: () => sendSecurityChatMessage({ body: text, family_id: familyId }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["security-chat", familyId] });
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
      <PageHeader title="Chat bảo an" back="/(tabs)/bao-an" />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.sender_role === "resident";
          const system = item.sender_role === "system";
          return (
            <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
              <View
                style={[
                  styles.bubble,
                  mine && styles.bubbleMine,
                  system && styles.bubbleSystem,
                ]}
              >
                <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
                <Text style={[styles.time, mine && styles.bodyMine]}>
                  {new Date(item.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nhắn cho bảo an…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.send, !text.trim() && { opacity: 0.5 }]}
          onPress={() => text.trim() && sendMut.mutate()}
          disabled={!text.trim() || sendMut.isPending}
        >
          <Send color={colors.white} size={20} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleWrap: { marginBottom: 10, alignItems: "flex-start" },
  bubbleWrapMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "85%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bubbleMine: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  bubbleSystem: { backgroundColor: colors.mutedBg },
  body: { color: colors.foreground, fontSize: 15, lineHeight: 20 },
  bodyMine: { color: colors.white },
  time: { fontSize: 10, color: colors.muted, marginTop: 6, alignSelf: "flex-end" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
