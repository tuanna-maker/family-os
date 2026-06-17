import {
  formatSecurityStatusPush,
  isSecurityStatusNotification,
  parseSecurityStatusPhase,
  parseUnitLabelFromBody,
  shouldSkipLocalOsSecurityStatusNotification,
  type SecurityStatusPhase,
} from "@shared/utils/security-status-notify";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import {
  markFamilyOsNotificationPresented,
  shouldPresentFamilyOsNotification,
} from "@mobile/lib/family-notification-present-state";
import { notificationChannelForType } from "@mobile/lib/notification-os";
import { presentLocalNotification } from "@mobile/lib/push-native";
import {
  markFamilySecurityStatusSeen,
  shouldPresentFamilySecurityStatus,
} from "@mobile/lib/security-status-notify-state";

export type FamilyNotificationLike = {
  id: string;
  type?: string;
  ref_id?: string | null;
  title?: string | null;
  body?: string | null;
  created_at?: string;
  read_at?: string | null;
};

export async function presentFamilyNotificationRow(
  row: FamilyNotificationLike,
  opts?: { requestType?: string | null; requestLabel?: string | null },
): Promise<boolean> {
  if (row.type === "security.chat") return false;

  const presentable = {
    id: row.id,
    type: row.type,
    ref_id: row.ref_id,
    created_at: row.created_at,
    read_at: row.read_at,
  };
  if (!(await shouldPresentFamilyOsNotification(presentable))) return false;

  if (shouldSkipLocalOsSecurityStatusNotification(row.type)) {
    const status = parseSecurityStatusPhase(row.body, row.title);
    const requestId = row.ref_id ?? undefined;
    if (requestId && status) await markFamilySecurityStatusSeen(requestId, status);
    await markFamilyOsNotificationPresented(presentable);
    return false;
  }

  if (isSecurityStatusNotification(row.type, row.title)) {
    const requestId = row.ref_id ?? undefined;
    const status = parseSecurityStatusPhase(row.body, row.title);
    if (!requestId || !status) {
      await presentLocalNotification({
        title: row.title ?? "Thông báo bảo an",
        body: row.body,
        channelId: "security",
        identifier: `notif-${row.id}`,
        data: { notificationId: row.id, type: row.type },
      });
      await markFamilyOsNotificationPresented(presentable);
      return true;
    }

    if (!(await shouldPresentFamilySecurityStatus(requestId, status))) return false;

    const friendly = formatSecurityStatusPush({
      status,
      locale: getLocaleRef(),
      requestType: opts?.requestType,
      unitLabel: parseUnitLabelFromBody(row.body),
      requestLabel: opts?.requestLabel,
    });

    await presentLocalNotification({
      title: friendly.title,
      body: friendly.body,
      channelId: "security",
      identifier: `security-status-${requestId}-${status}`,
      data: {
        notificationId: row.id,
        type: row.type ?? "security.status_changed",
        requestId,
        status,
        route: "/bao-an/yeu-cau",
      },
    });
    await markFamilySecurityStatusSeen(requestId, status);
    await markFamilyOsNotificationPresented(presentable);
    return true;
  }

  await presentLocalNotification({
    title: row.title || "Thông báo mới",
    body: row.body,
    channelId: notificationChannelForType(row.type),
    identifier: `notif-${row.id}`,
    data: { notificationId: row.id, type: row.type },
  });
  await markFamilyOsNotificationPresented(presentable);
  return true;
}

export function securityStatusFromRow(row: {
  status?: string;
  request_type?: string;
  apartment?: string | null;
  building?: string | null;
  payload?: Record<string, unknown> | null;
}): {
  status: SecurityStatusPhase;
  requestType?: string;
  unitLabel?: string;
  requestLabel?: string;
} | null {
  const status = row.status as SecurityStatusPhase | undefined;
  if (status !== "in_progress" && status !== "resolved" && status !== "cancelled") return null;
  const payload = row.payload ?? {};
  const unit = [row.apartment, row.building].filter(Boolean).join(" · ") || undefined;
  return {
    status,
    requestType: row.request_type,
    unitLabel: unit,
    requestLabel: typeof payload.label === "string" ? payload.label : undefined,
  };
}
