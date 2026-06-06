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

export function isDarkPalette(colors: AppColors) {
  return colors.background === "#0B0F17" || colors.background === "#141B2D";
}

export function cardShadow(colors: AppColors): ViewStyle {
  const dark = isDarkPalette(colors);
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: dark ? 2 : 4 },
      shadowOpacity: dark ? 0.35 : 0.1,
      shadowRadius: dark ? 8 : 12,
    },
    android: { elevation: dark ? 2 : 3 },
    default: {},
  }) as ViewStyle;
}

export { useTheme } from "@mobile/theme/themeStore";
