import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyGuardNotificationPref } from "@mobile/utils/guardNotificationCache";

const STORAGE_KEY = "guard:notifications-enabled";

type GuardPrefsContextValue = {
  ready: boolean;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
};

const GuardPrefsContext = createContext<GuardPrefsContextValue>({
  ready: false,
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
});

export function GuardPrefsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [notificationsEnabled, setEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      const enabled = v !== "0";
      setEnabledState(enabled);
      if (!enabled) applyGuardNotificationPref(qc, false);
      setReady(true);
    });
  }, [qc]);

  const setNotificationsEnabled = useCallback(
    (enabled: boolean) => {
      setEnabledState(enabled);
      void AsyncStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
      applyGuardNotificationPref(qc, enabled);
    },
    [qc],
  );

  const value = useMemo(
    () => ({ ready, notificationsEnabled, setNotificationsEnabled }),
    [ready, notificationsEnabled, setNotificationsEnabled],
  );

  return <GuardPrefsContext.Provider value={value}>{children}</GuardPrefsContext.Provider>;
}

export function useGuardPrefs() {
  return useContext(GuardPrefsContext);
}
