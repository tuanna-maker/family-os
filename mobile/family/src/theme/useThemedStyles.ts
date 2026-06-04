import { useMemo } from "react";
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";
import type { AppColors } from "@mobile/theme/palettes";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: AppColors, fontScale: number) => T,
): T {
  const { colors, fontScale } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, fontScale)), [colors, fontScale]);
}
