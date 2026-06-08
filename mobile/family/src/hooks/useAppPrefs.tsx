import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setLocaleRef } from "@mobile/i18n/localeRef";

export type AppLocale = "vi" | "en";

type AppPrefs = {
  theme: "light" | "dark";
  easyRead: boolean;
  locale: AppLocale;
  hideProfileEmail: boolean;
  shareAnalytics: boolean;
};

const KEY = "stos:app-prefs";
const DEFAULTS: AppPrefs = {
  theme: "dark",
  easyRead: false,
  locale: "vi",
  hideProfileEmail: false,
  shareAnalytics: true,
};

type Ctx = AppPrefs & {
  setTheme: (t: "light" | "dark") => void;
  setEasyRead: (v: boolean) => void;
  setLocale: (l: AppLocale) => void;
  setHideProfileEmail: (v: boolean) => void;
  setShareAnalytics: (v: boolean) => void;
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

  useEffect(() => {
    setLocaleRef(prefs.locale);
  }, [prefs.locale]);

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

  const setLocale = useCallback(
    (locale: AppLocale) => setPrefs((p) => {
      const next = { ...p, locale };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }),
    [],
  );

  const setHideProfileEmail = useCallback(
    (hideProfileEmail: boolean) => setPrefs((p) => {
      const next = { ...p, hideProfileEmail };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }),
    [],
  );

  const setShareAnalytics = useCallback(
    (shareAnalytics: boolean) => setPrefs((p) => {
      const next = { ...p, shareAnalytics };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }),
    [],
  );

  return (
    <AppPrefsContext.Provider
      value={{
        ...prefs,
        setTheme,
        setEasyRead,
        setLocale,
        setHideProfileEmail,
        setShareAnalytics,
        ready,
      }}
    >
      {children}
    </AppPrefsContext.Provider>
  );
}

export function useAppPrefs() {
  const ctx = useContext(AppPrefsContext);
  if (!ctx) throw new Error("useAppPrefs requires AppPrefsProvider");
  return ctx;
}
