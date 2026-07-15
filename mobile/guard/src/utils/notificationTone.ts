import type { PlatformNotification } from "@guard/api/notifications";

export function toneForNotification(n: PlatformNotification) {
  if (n.topic.startsWith("sos.")) return "bg-emergency/10 text-emergency";
  if (n.topic.includes("shift") || n.topic.includes("schedule")) return "bg-warning/10 text-warning";
  if (n.topic.includes("approved")) return "bg-success/10 text-success";
  return "bg-brand/10 text-brand";
}
