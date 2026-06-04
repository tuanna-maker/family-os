import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type AppPrefs = {
  theme: "light" | "dark";
  easyRead: boolean;
};

const KEY = "stos:app-prefs";
const DEFAULTS: AppPrefs = { theme: "dark", easyRead: false };

type Ctx = AppPrefs & {
  setTheme: (t: "light" | "dark") => void;
  setEasyRead: (v: boolean) => void;
  ready: boolean;
};

const AppPrefsContext = createContext<Ctx | null>(null);

export function AppPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPrefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: AppPrefs) => {
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const setTheme = useCallback(
    (theme: "light" | "dark") => setPrefs((p) => {
      const next = { ...p, theme };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }),
    [],
  );

  const setEasyRead = useCallback(
    (easyRead: boolean) => setPrefs((p) => {
      const next = { ...p, easyRead };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }),
    [],
  );

  return (
    <AppPrefsContext.Provider value={{ ...prefs, setTheme, setEasyRead, ready }}>
      {children}
    </AppPrefsContext.Provider>
  );
}

export function useAppPrefs() {
  const ctx = useContext(AppPrefsContext);
  if (!ctx) throw new Error("useAppPrefs requires AppPrefsProvider");
  return ctx;
}
