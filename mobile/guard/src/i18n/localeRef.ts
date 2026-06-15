import type { SecurityNotifyLocale } from "@shared/utils/security-status-notify";

let currentLocale: SecurityNotifyLocale = "vi";

export function setGuardLocaleRef(locale: SecurityNotifyLocale) {
  currentLocale = locale;
}

export function getGuardLocaleRef(): SecurityNotifyLocale {
  return currentLocale;
}

export function normalizeUiLocale(value?: string | null): SecurityNotifyLocale {
  return value === "en" ? "en" : "vi";
}
