import { useEffect, useRef } from "react";
import { useAuth } from "@mobile/hooks/useAuth";
import { registerNativePushToken } from "@mobile/lib/push-native";

export function usePushNotifications() {
  const { session } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!session || done.current) return;
    done.current = true;
    registerNativePushToken("family").catch(() => {
      done.current = false;
    });
  }, [session]);
}
