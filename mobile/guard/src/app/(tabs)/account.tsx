import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { LogOut, User, Shield, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@mobile/hooks/useAuth";
import { getMyContext } from "@guard/api/auth";
import { initialsFromName } from "@mobile/utils/guardFormat";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";
import { useTheme } from "@mobile/theme/themeStore";

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { data: ctx, isLoading } = useQuery({
    queryKey: ["guard-my-context"],
    queryFn: () => getMyContext(),
  });

  const fullName =
    ctx?.profile?.full_name ??
    (user?.user_metadata as { full_name?: string } | null)?.full_name ??
    "Nhân viên bảo vệ";
  const email = ctx?.email ?? user?.email ?? "";
  const roleLabel = ctx?.roles.includes("security_admin")
    ? "Quản lý an ninh"
    : "Đội an ninh STOS";

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={tabPad}>
      <View className="p-5 items-center" style={{ paddingTop: Math.max(insets.top + 16, 56) }}>
        <View className="h-24 w-24 rounded-full bg-brand/15 items-center justify-center mb-4">
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-2xl font-bold text-brand">{initialsFromName(fullName)}</Text>
          )}
        </View>
        <Text className="text-xl font-bold text-foreground">{fullName}</Text>
        <Text className="text-muted-foreground mt-1">{email}</Text>
        <View className="mt-4 bg-brand/10 px-3 py-1 rounded-full flex-row items-center border border-brand/20">
          <Shield size={14} color={colors.brand} />
          <Text className="text-brand text-xs font-semibold uppercase tracking-wider ml-1.5">
            {roleLabel}
          </Text>
        </View>
      </View>

      <View className="px-5 mt-4 pb-8">
        <Text className="text-sm font-semibold text-muted-foreground mb-3 ml-2 uppercase">
          Thiết lập chung
        </Text>
        <View className="bg-card rounded-2xl border border-border overflow-hidden">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-border">
            <View className="h-8 w-8 rounded-full bg-muted items-center justify-center mr-3">
              <User size={16} color={colors.foreground} />
            </View>
            <Text className="flex-1 text-base text-foreground font-medium">Thông tin cá nhân</Text>
            <ChevronRight size={20} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4" onPress={handleLogout}>
            <View className="h-8 w-8 rounded-full bg-emergency/15 items-center justify-center mr-3">
              <LogOut size={16} color={colors.emergency} />
            </View>
            <Text className="flex-1 text-base text-emergency font-medium">Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
