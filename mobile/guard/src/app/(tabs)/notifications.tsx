import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Bell, BellOff, ShieldAlert, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGuardNotifications } from "@mobile/hooks/useGuardNotifications";
import { useGuardPrefs } from "@mobile/hooks/useGuardPrefs";
import { formatNotifTime } from "@mobile/utils/guardFormat";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";
import { useTheme } from "@mobile/theme/themeStore";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const { colors } = useTheme();
  const { notificationsEnabled } = useGuardPrefs();
  const { items, isLoading, markRead, markAllRead, unread } = useGuardNotifications();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={tabPad}>
      <View
        className="px-5 pb-4 bg-background border-b border-border flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top + 12, 48) }}
      >
        <Text className="text-xl font-bold text-foreground">Thông báo</Text>
        {notificationsEnabled && unread > 0 ? (
          <TouchableOpacity onPress={() => void markAllRead()}>
            <Text className="text-sm font-medium text-brand">Đánh dấu đã đọc</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="p-4">
        {!notificationsEnabled ? (
          <View className="items-center mt-12 px-6">
            <View className="h-16 w-16 rounded-full bg-muted items-center justify-center mb-4">
              <BellOff size={28} color={colors.muted} />
            </View>
            <Text className="text-base font-semibold text-foreground text-center">
              Thông báo đang tắt
            </Text>
            <Text className="text-sm text-muted-foreground text-center mt-2 leading-5">
              Bạn sẽ không nhận cập nhật mới và không thấy badge trên menu. Bật lại trong mục Tài
              khoản → Thiết lập.
            </Text>
            <TouchableOpacity
              className="mt-5 bg-brand rounded-xl px-5 py-3"
              onPress={() => router.push("/(tabs)/account")}
            >
              <Text className="text-white font-semibold">Mở cài đặt Tài khoản</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <ActivityIndicator className="mt-8" color={colors.brand} />
        ) : items.length === 0 ? (
          <View className="items-center mt-12">
            <Bell size={32} color={colors.muted} />
            <Text className="text-center text-muted-foreground mt-3">Chưa có thông báo.</Text>
          </View>
        ) : (
          items.map((n) => {
            const read = !!n.read_at;
            const isAlert = n.topic.includes("security") || n.topic.includes("sos");
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => !read && void markRead(n.id)}
                className={`p-4 rounded-2xl mb-3 border ${
                  read ? "bg-card border-border" : "bg-brand/10 border-brand/25"
                }`}
              >
                <View className="flex-row items-start">
                  <View
                    className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${
                      isAlert ? "bg-emergency/15" : "bg-brand/15"
                    }`}
                  >
                    {isAlert ? (
                      <ShieldAlert size={20} color="#ef4444" />
                    ) : (
                      <Bell size={20} color="#2563eb" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">{n.title}</Text>
                    {n.body ? (
                      <Text className="text-sm text-muted-foreground mt-0.5 leading-5">{n.body}</Text>
                    ) : null}
                    <View className="flex-row items-center mt-2">
                      <Clock size={12} color="#9ca3af" />
                      <Text className="text-xs text-muted-foreground ml-1">
                        {formatNotifTime(n.created_at)}
                      </Text>
                    </View>
                  </View>
                  {!read ? <View className="h-2.5 w-2.5 bg-brand rounded-full mt-2" /> : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
