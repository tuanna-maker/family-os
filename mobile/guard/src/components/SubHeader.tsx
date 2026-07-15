import type { ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@mobile/theme/themeStore";
import { UserAvatar } from "@mobile/components/UserAvatar";

export function SubHeader({
  title,
  back,
  right,
  avatarUrl,
  avatarInitial,
}: {
  title: string;
  back?: string | (() => void);
  right?: ReactNode;
  avatarUrl?: string | null;
  avatarInitial?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const onBack = () => {
    if (typeof back === "function") back();
    else if (back) router.push(back as never);
    else router.back();
  };

  return (
    <View
      className="px-4 pb-4 bg-background flex-row items-center border-b border-border"
      style={{ paddingTop: Math.max(insets.top + 8, 48) }}
    >
      <TouchableOpacity onPress={onBack} className="p-2 -ml-2 mr-2">
        <ChevronLeft size={24} color={colors.foreground} />
      </TouchableOpacity>
      {avatarUrl || avatarInitial ? (
        <UserAvatar
          uri={avatarUrl}
          initial={avatarInitial ?? title}
          size={36}
        />
      ) : null}
      <Text
        className={`text-lg font-bold flex-1 text-foreground ${avatarUrl || avatarInitial ? "ml-2.5" : ""}`}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}
