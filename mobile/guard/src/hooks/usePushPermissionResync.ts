import { useEffect } from "react";
import { AppState } from "react-native";
import {
  getPushPermissionStatus,
  registerNativePushToken,
} from "@mobile/lib/push-native";

/** Đồng bộ token khi quay lại app — không tự bật toggle, không mở Cài đặt. */
export function usePushPermissionResync(
  notificationsEnabled: boolean,
  setNotificationsEnabled: (v: boolean) => void,
) {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void (async () => {
        const status = await getPushPermissionStatus();
        if (status === "denied" && notificationsEnabled) {
          setNotificationsEnabled(false);
          return;
        }
        if (status === "granted" && notificationsEnabled) {
          await registerNativePushToken("guard", { requestPermission: false });
        }
      })();
    });
    return () => sub.remove();
  }, [notificationsEnabled, setNotificationsEnabled]);
}
