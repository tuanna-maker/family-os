import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch } from "react-native";
import {
  LogOut,
  User,
  Shield,
  ChevronRight,
  Bell,
  Moon,
  HelpCircle,
  CalendarDays,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@mobile/hooks/useAuth";
import { getMyContext } from "@guard/api/auth";
import { initialsFromName } from "@mobile/utils/guardFormat";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";
import { useTheme } from "@mobile/theme/themeStore";
import { GuardHeaderActions } from "@mobile/components/GuardHeaderActions";
import { useGuardPrefs } from "@mobile/hooks/useGuardPrefs";

type MenuItem = {
  icon: typeof User;
  label: string;
  onPress?: () => void;
  value?: string;
  danger?: boolean;
  trailing?: React.ReactNode;
};

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const { colors, theme, toggleTheme } = useTheme();
  const { notificationsEnabled, setNotificationsEnabled } = useGuardPrefs();
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

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Tài khoản",
      items: [
        {
          icon: User,
          label: "Thông tin cá nhân",
          onPress: () => router.push("/account-profile"),
        },
        {
          icon: CalendarDays,
          label: "Lịch trực của tôi",
          onPress: () => router.push("/(tabs)/schedule"),
        },
      ],
    },
    {
      title: "Thiết lập",
      items: [
        {
          icon: Bell,
          label: "Thông báo",
          value: notificationsEnabled ? "Bật" : "Tắt",
          trailing: (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.muted, true: colors.brand }}
              thumbColor="#fff"
            />
          ),
        },
        {
          icon: Moon,
          label: "Giao diện tối",
          value: theme === "dark" ? "Bật" : "Tắt",
          trailing: (
            <Switch
              value={theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.muted, true: colors.brand }}
              thumbColor="#fff"
            />
          ),
        },
        {
          icon: HelpCircle,
          label: "Hỗ trợ & hướng dẫn",
          onPress: () =>
            Alert.alert(
              "Hỗ trợ",
              "Liên hệ quản lý an ninh STOS Residence qua bảng điều khiển hoặc hotline nội bộ.",
            ),
        },
      ],
    },
    {
      title: "Phiên đăng nhập",
      items: [
        {
          icon: LogOut,
          label: "Đăng xuất",
          danger: true,
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={tabPad}>
      <View
        className="px-5 pb-2 flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top + 12, 48) }}
      >
        <Text className="text-xl font-bold text-foreground">Tài khoản</Text>
        <GuardHeaderActions showBell={false} />
      </View>

      <View className="p-5 items-center">
        <View className="h-24 w-24 rounded-full bg-brand/15 items-center justify-center mb-4">
          {isLoading ? (
            <ActivityIndicator color={colors.brand} />
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

      {menuSections.map((section) => (
        <View key={section.title} className="px-5 mt-2 mb-2">
          <Text className="text-sm font-semibold text-muted-foreground mb-3 ml-2 uppercase">
            {section.title}
          </Text>
          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                className={`flex-row items-center p-4 ${idx < section.items.length - 1 ? "border-b border-border" : ""}`}
                onPress={item.onPress}
                disabled={!item.onPress && !item.trailing}
                activeOpacity={item.onPress ? 0.7 : 1}
              >
                <View
                  className={`h-8 w-8 rounded-full items-center justify-center mr-3 ${
                    item.danger ? "bg-emergency/15" : "bg-muted"
                  }`}
                >
                  <item.icon
                    size={16}
                    color={item.danger ? colors.emergency : colors.foreground}
                  />
                </View>
                <Text
                  className={`flex-1 text-base font-medium ${
                    item.danger ? "text-emergency" : "text-foreground"
                  }`}
                >
                  {item.label}
                </Text>
                {item.value ? (
                  <Text className="text-sm text-muted-foreground mr-2">{item.value}</Text>
                ) : null}
                {item.trailing ?? (item.onPress ? <ChevronRight size={20} color={colors.muted} /> : null)}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <View className="h-4" />
    </ScrollView>
  );
}
