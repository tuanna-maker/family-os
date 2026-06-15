export const OS_PUSH_TYPES = new Set(["medicine", "parent_reminder"]);

export function isSecurityNotificationType(type: string | undefined) {
  if (!type) return false;
  return type.startsWith("security") || type === "sos";
}

export function shouldPresentOsNotification(type: string | undefined) {
  if (!type) return true;
  if (OS_PUSH_TYPES.has(type)) return true;
  if (isSecurityNotificationType(type)) return true;
  if (type === "security.chat") return true;
  return true;
}

export function notificationChannelForType(
  type: string | undefined,
): "default" | "security" | "chat" {
  if (type === "security.chat") return "chat";
  return isSecurityNotificationType(type) ? "security" : "default";
}
