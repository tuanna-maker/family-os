import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getStrings } from "./useI18n";

export function localeTag(locale: AppLocale): string {
  return locale === "en" ? "en-US" : "vi-VN";
}

export function formatCurrency(n: number, locale: AppLocale): string {
  const formatted = (n ?? 0).toLocaleString(localeTag(locale));
  return locale === "en" ? `${formatted} VND` : `${formatted}đ`;
}

export function formatDate(iso: string | Date, locale: AppLocale, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(localeTag(locale), opts ?? { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string | Date, locale: AppLocale): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(localeTag(locale));
}

export function formatTime(iso: string | Date, locale: AppLocale): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(localeTag(locale), { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeAgo(iso: string, locale: AppLocale): string {
  const t = getStrings(locale).time;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return t.justNow;
  if (m < 60) return t.minutesAgo(m);
  const h = Math.floor(m / 60);
  if (h < 24) return t.hoursAgo(h);
  return t.daysAgo(Math.floor(h / 24));
}

export function formatActivityTime(iso: string, locale: AppLocale): string {
  const t = getStrings(locale).time;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  const hhmm = formatTime(d, locale);
  if (sameDay) return hhmm;
  if (isYesterday) return t.yesterdayAt(hhmm);
  return d.toLocaleDateString(localeTag(locale), { day: "2-digit", month: "2-digit" });
}

export function formatApptTime(iso: string, locale: AppLocale): string {
  const t = getStrings(locale).time;
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hhmm = formatTime(d, locale);
  if (sameDay) return t.todayAt(hhmm);
  return `${hhmm} · ${d.toLocaleDateString(localeTag(locale), { day: "2-digit", month: "2-digit" })}`;
}

export function formatMonthYear(year: number, month: number, locale: AppLocale): string {
  return new Date(year, month, 1).toLocaleDateString(localeTag(locale), {
    month: "long",
    year: "numeric",
  });
}

export function formatExpenseMonthLabel(locale: AppLocale, date = new Date()): string {
  return date.toLocaleDateString(localeTag(locale), { month: "long" });
}

export function formatMedCountdown(t: string | null, locale: AppLocale): string {
  if (!t) return "—";
  const ov = getStrings(locale).screens.health.overview;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 86400000;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return ov.medMins(mins);
  return ov.medHours(Math.floor(mins / 60));
}
