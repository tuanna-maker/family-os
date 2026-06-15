import {
  defaultNotificationTitle,
  defaultSecurityNotificationTitle,
  formatSecurityStatusPush,
  isSecurityStatusNotification,
  parseSecurityStatusPhase,
  parseUnitLabelFromBody,
  type SecurityNotifyLocale,
} from "@shared/utils/security-status-notify";
import { getLocaleRef } from "@mobile/i18n/localeRef";

export function displayFamilyNotificationText(
  row: {
    type?: string;
    title?: string | null;
    body?: string | null;
    ref_id?: string | null;
  },
  locale?: SecurityNotifyLocale,
) {
  const lang = locale ?? getLocaleRef();
  if (!isSecurityStatusNotification(row.type, row.title)) {
    return { title: row.title ?? defaultNotificationTitle(lang), body: row.body };
  }
  const status = parseSecurityStatusPhase(row.body, row.title);
  if (!status) {
    return { title: row.title ?? defaultSecurityNotificationTitle(lang), body: row.body };
  }
  return formatSecurityStatusPush({
    status,
    locale: lang,
    unitLabel: parseUnitLabelFromBody(row.body),
  });
}
