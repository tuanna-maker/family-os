import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useSystemScheme } from "react-native";
import { darkPalette, lightPalette, type AppColors } from "@mobile/theme/palettes";

export type ThemePreference = "dark" | "light" | "system";

const STORAGE_KEY = "guard:theme";

type ThemeContextValue = {
  preference: ThemePreference;
  theme: "light" | "dark";
  colors: AppColors;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: "dark",
  theme: "dark",
  colors: darkPalette,
  setPreference: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") {
        setPreferenceState(v);
      }
      setReady(true);
    });
  }, []);

  const theme: "light" | "dark" =
    preference === "system" ? (system === "light" ? "light" : "dark") : preference;

  const colors = theme === "light" ? lightPalette : darkPalette;

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [setPreference, theme]);

  const value = useMemo(
    () => ({ preference, theme, colors, setPreference, toggleTheme }),
    [preference, theme, colors, setPreference, toggleTheme],
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
