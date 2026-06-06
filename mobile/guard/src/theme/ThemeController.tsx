import { useTheme } from "@mobile/theme/themeStore";
import { useColorScheme } from "nativewind";
import { useEffect, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";

/** Đồng bộ NativeWind color scheme với theme người dùng (mặc định dark như web). */
export function ThemeController({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      {children}
    </>
  );
}
