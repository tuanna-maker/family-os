import { ReactNode } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@mobile/theme/themeStore";
import { spacing } from "@mobile/theme/colors";
import { getTabBarBottomInset } from "@mobile/theme/tabBar";

export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
  insetTabBar = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Thêm padding dưới cho thanh tab nổi (mặc định bật trong nhóm tabs). */
  insetTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { colors } = useTheme();
  const inTabs = segments[0] === "(tabs)";
  const bottomPad =
    Math.max(insets.bottom, 16) + (insetTabBar && inTabs ? getTabBarBottomInset(insets) - insets.bottom : 0);

  const rootStyle = { flex: 1 as const, backgroundColor: colors.background };
  const content = [{ paddingHorizontal: spacing.screen }, { paddingBottom: bottomPad }, contentStyle];

  if (scroll) {
    return (
      <ScrollView
        style={[rootStyle, style]}
        contentContainerStyle={content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[rootStyle, { paddingHorizontal: spacing.screen, paddingBottom: insets.bottom }, style, contentStyle]}>
      {children}
    </View>
  );
}
