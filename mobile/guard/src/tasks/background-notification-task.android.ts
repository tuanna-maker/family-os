export const GUARD_BACKGROUND_NOTIFICATION_TASK = "stos-guard-background-notification-fetch";

export async function registerGuardBackgroundNotificationTask() {
  // Android: StosGuardMonitorService foreground service (~10s poll).
}

export async function unregisterGuardBackgroundNotificationTask() {
  // Android: stopped via stopNativeBackgroundMonitor().
}
