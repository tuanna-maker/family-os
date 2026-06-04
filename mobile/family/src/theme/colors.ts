import { Platform, type ViewStyle } from "react-native";
import { darkPalette } from "@mobile/theme/palettes";
import type { AppColors } from "@mobile/theme/palettes";

/** Fallback khi chưa có ThemeProvider — runtime dùng `useTheme().colors`. */
export const colors = darkPalette;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  screen: 16,
} as const;

export function cardShadow(colors: AppColors): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: colors.navy === colors.foreground ? "#000" : colors.navy,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  }) as ViewStyle;
}

export { useTheme } from "@mobile/theme/themeStore";
