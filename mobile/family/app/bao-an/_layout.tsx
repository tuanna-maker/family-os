import { Stack } from "expo-router";
import { useTheme } from "@mobile/theme/themeStore";

export default function BaoAnLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
