import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SubHeader } from "@mobile/components/SubHeader";
import { AvatarUploadButton } from "@mobile/components/AvatarUploadButton";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useAuth } from "@mobile/hooks/useAuth";
import { getMyContext } from "@guard/api/auth";
import { uploadAvatarFromUri, updateProfileAvatar } from "@mobile/api/avatars";
import { initialsFromName } from "@mobile/utils/guardFormat";

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
  const qc = useQueryClient();
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
  const avatarUrl = ctx?.profile?.avatar_url ?? null;

  const onUploadAvatar = async (uri: string) => {
    const url = await uploadAvatarFromUri(uri, "avatar");
    await updateProfileAvatar({ avatar_url: url });
    await qc.invalidateQueries({ queryKey: ["guard-my-context"] });
    showAppAlert({ title: "Thành công", message: "Đã cập nhật ảnh đại diện." });
  };

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="THÔNG TIN CÁ NHÂN" />
      <ScrollView className="flex-1 p-5">
        <View className="items-center mb-6">
          <AvatarUploadButton
            uri={avatarUrl}
            fallbackInitial={initialsFromName(fullName)}
            size={88}
            disabled={isLoading}
            onPick={onUploadAvatar}
          />
          <Text className="text-lg font-bold text-foreground mt-3">{fullName}</Text>
          <Text className="text-sm text-muted-foreground mt-1">{email}</Text>
        </View>

        <View className="bg-card rounded-2xl border border-border px-4">
          <InfoRow label="Họ và tên" value={fullName} />
          <InfoRow label="Email" value={email} />
          <InfoRow label="Vai trò" value={roleLabel} />
          <InfoRow label="Mã nhân viên" value={ctx?.userId?.slice(0, 8).toUpperCase() ?? "—"} />
          <InfoRow label="Dự án" value="STOS Residence" />
        </View>
      </ScrollView>
    </View>
  );
}
