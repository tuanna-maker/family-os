export const OS_PUSH_TYPES = new Set(["medicine", "parent_reminder"]);

export function isSecurityNotificationType(type: string | undefined) {
  if (!type) return false;
  return type.startsWith("security") || type === "sos";
}

export function shouldPresentOsNotification(type: string | undefined) {
  if (!type) return false;
  if (OS_PUSH_TYPES.has(type)) return true;
  return isSecurityNotificationType(type);
}

export function notificationChannelForType(type: string | undefined): "default" | "security" {
  return isSecurityNotificationType(type) ? "security" : "default";
}
