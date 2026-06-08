import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import type { AppColors } from "@mobile/theme/palettes";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import { getStrings } from "@mobile/i18n/useI18n";

export function bookingStatusLabel(status: string, locale: AppLocale = getLocaleRef()) {
  const labels = getStrings(locale).community.status;
  return labels[status as keyof typeof labels] ?? labels.pending;
}

export function bookingStatusChip(status: string, c: AppColors, locale: AppLocale = getLocaleRef()) {
  const label = bookingStatusLabel(status, locale);
  switch (status) {
    case "confirmed":
    case "in_progress":
      return { label, color: c.brand, bg: c.tintBlue };
    case "done":
      return { label, color: c.success, bg: c.tintGreen };
    case "cancelled":
      return { label, color: c.muted, bg: c.mutedBg };
    default:
      return { label, color: c.warning, bg: c.tintOrange };
  }
}
