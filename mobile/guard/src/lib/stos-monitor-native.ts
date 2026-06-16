import { NativeModules, Platform } from "react-native";

type StosMonitorNative = {
  stopMonitor: () => void;
};

const Native = NativeModules.StosMonitor as StosMonitorNative | undefined;

/** Không còn khởi chạy foreground service — FCM + BackgroundFetch đủ cho Android. */
export function startNativeBackgroundMonitor(
  _accessToken: string,
  _userId: string,
  _app: "guard" | "family" = "guard",
) {
  stopNativeBackgroundMonitor();
}

export function stopNativeBackgroundMonitor() {
  if (Platform.OS !== "android" || !Native?.stopMonitor) return;
  Native.stopMonitor();
}
