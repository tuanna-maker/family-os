import React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SubHeader } from "@mobile/components/SubHeader";
import { useAuth } from "@mobile/hooks/useAuth";
import { getMyContext } from "@guard/api/auth";
import { initialsFromName } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-start py-3 border-b border-border">
      <Text className="text-sm text-muted-foreground flex-1 mr-3">{label}</Text>
      <Text className="text-sm font-medium text-foreground flex-1 text-right">{value}</Text>
    </View>
  );
}

export default function AccountProfileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { data: ctx, isLoading } = useQuery({
    queryKey: ["guard-my-context"],
    queryFn: () => getMyContext(),
  });

  const fullName =
    ctx?.profile?.full_name ??
    (user?.user_metadata as { full_name?: string } | null)?.full_name ??
    "Nhân viên bảo vệ";
  const email = ctx?.email ?? user?.email ?? "—";
  const roleLabel = ctx?.roles.includes("security_admin")
    ? "Quản lý an ninh"
    : "Nhân viên bảo vệ";

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="THÔNG TIN CÁ NHÂN" />
      <ScrollView className="flex-1 p-5">
        <View className="items-center mb-6">
          <View className="h-20 w-20 rounded-full bg-brand/15 items-center justify-center mb-3">
            {isLoading ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <Text className="text-xl font-bold text-brand">{initialsFromName(fullName)}</Text>
            )}
          </View>
          <Text className="text-lg font-bold text-foreground">{fullName}</Text>
          <Text className="text-sm text-muted-foreground mt-1">{email}</Text>
        </View>

        <View className="bg-card rounded-2xl border border-border px-4">
          <InfoRow label="Họ và tên" value={fullName} />
          <InfoRow label="Email" value={email} />
          <InfoRow label="Vai trò" value={roleLabel} />
          <InfoRow label="Mã nhân viên" value={ctx?.userId?.slice(0, 8).toUpperCase() ?? "—"} />
          <InfoRow label="Dự án" value="STOS Residence" />
        </View>

        <Text className="text-xs text-muted-foreground text-center mt-6 px-4">
          Liên hệ quản lý an ninh nếu cần cập nhật thông tin tài khoản.
        </Text>
      </ScrollView>
    </View>
  );
}
