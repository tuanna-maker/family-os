import { useEffect } from "react";
import { AppState } from "react-native";
import {
  getPushPermissionStatus,
  registerNativePushToken,
} from "@mobile/lib/push-native";
import { syncLocalReminderSchedule } from "@mobile/lib/local-reminder-scheduler";

/** Đồng bộ token khi quay lại app — không tự bật toggle, không mở Cài đặt. */
export function usePushPermissionResync(
  pushEnabled: boolean,
  setPushEnabled: (v: boolean) => void,
) {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void (async () => {
        const status = await getPushPermissionStatus();
        if (status === "denied" && pushEnabled) {
          setPushEnabled(false);
          return;
        }
        if (status === "granted" && pushEnabled) {
          await registerNativePushToken("family", { requestPermission: false });
          await syncLocalReminderSchedule(true);
        }
      })();
    });
    return () => sub.remove();
  }, [pushEnabled, setPushEnabled]);
}
