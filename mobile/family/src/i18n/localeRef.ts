import type { AppLocale } from "@mobile/hooks/useAppPrefs";

let currentLocale: AppLocale = "vi";

export function setLocaleRef(locale: AppLocale) {
  currentLocale = locale;
}

export function getLocaleRef(): AppLocale {
  return currentLocale;
}
