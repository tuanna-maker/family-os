/**
 * Hủy lịch local cũ. Nhắc thuốc / việc con do server cron + FCM (không lên lịch trùng trên máy).
 */
export async function syncLocalReminderSchedule(pushEnabled: boolean) {
  const Notifications = await import("expo-notifications");
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith("stos-local-"))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!pushEnabled) return;
}
