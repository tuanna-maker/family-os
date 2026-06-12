import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react-native";
import { SubHeader } from "@mobile/components/SubHeader";
import { UserAvatar } from "@mobile/components/UserAvatar";
import { listGuardChatThreads } from "@guard/api/security-chat";
import { formatNotifTime } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";

export default function GuardChatListScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const q = useQuery({
    queryKey: ["guard-chat-threads"],
    queryFn: () => listGuardChatThreads(),
    staleTime: 15_000,
  });

  const threads = q.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="Tin nhắn cư dân" back="/(tabs)" />

      {q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.resident_user_id}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />
          }
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-8">
              <MessageCircle size={48} color={colors.muted} />
              <Text className="text-base font-semibold text-foreground mt-4 text-center">
                Chưa có tin nhắn
              </Text>
              <Text className="text-sm text-muted-foreground mt-2 text-center">
                Khi cư dân nhắn qua app Gia đình, hội thoại sẽ hiện tại đây để bạn phản hồi.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = (item.unread_count ?? 0) > 0;
            const unit = item.unit_label?.trim();
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                className="flex-row items-center gap-3 p-4 mb-3 rounded-2xl bg-card border border-border/60"
                onPress={() =>
                  router.push({
                    pathname: "/chat/[residentId]",
                    params: { residentId: item.resident_user_id, name: item.resident_name },
                  })
                }
              >
                <UserAvatar
                  uri={item.resident_avatar_url}
                  initial={item.resident_name || "Cư dân"}
                  size={48}
                />
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      className={`text-base flex-1 ${unread ? "font-bold" : "font-semibold"} text-foreground`}
                      numberOfLines={1}
                    >
                      {item.resident_name || "Cư dân"}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {formatNotifTime(item.last_at)}
                    </Text>
                  </View>
                  {unit ? (
                    <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
                      {unit}
                    </Text>
                  ) : null}
                  {item.last_body?.trim() ? (
                    <Text
                      className={`text-sm mt-1 ${unread ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      numberOfLines={2}
                    >
                      {item.last_sender_role === "guard" ? "Bạn: " : ""}
                      {item.last_body}
                    </Text>
                  ) : null}
                </View>
                {unread ? (
                  <View className="min-w-[22px] h-[22px] rounded-full bg-red-500 items-center justify-center px-1.5">
                    <Text className="text-[11px] font-bold text-white">
                      {item.unread_count > 9 ? "9+" : item.unread_count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
