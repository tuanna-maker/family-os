import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { darkPalette, lightPalette, type AppColors } from "@mobile/theme/palettes";

type ThemeState = {
  colors: AppColors;
  fontScale: number;
  theme: "light" | "dark";
  easyRead: boolean;
};

let state: ThemeState = {
  colors: darkPalette,
  fontScale: 1,
  theme: "dark",
  easyRead: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: ThemeState) {
  state = next;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useTheme() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return snap;
}

/** @deprecated Prefer useTheme().colors — kept for gradual migration */
export function getStaticColors() {
  return state.colors;
}

export function ThemeBridge({ children }: { children: ReactNode }) {
  const { theme, easyRead, ready } = useAppPrefs();

  useEffect(() => {
    if (!ready) return;
    setState({
      theme,
      easyRead,
      fontScale: easyRead ? 1.12 : 1,
      colors: theme === "light" ? lightPalette : darkPalette,
    });
  }, [theme, easyRead, ready]);

  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return <ThemeContext.Provider value={snap}>{children}</ThemeContext.Provider>;
}

const ThemeContext = createContext<ThemeState>(state);

export function useThemeContext() {
  return useContext(ThemeContext);
}
