export const FAMILY_BACKGROUND_NOTIFICATION_TASK = "stos-family-background-notification-fetch";

export async function registerFamilyBackgroundNotificationTask() {
  // Android: StosFamilyMonitorService foreground service (~10s poll).
}

export async function unregisterFamilyBackgroundNotificationTask() {
  // Android: stopped via stopNativeBackgroundMonitor().
}
