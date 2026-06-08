import { useMemo } from "react";
import { useAppPrefs, type AppLocale } from "@mobile/hooks/useAppPrefs";
import { STRINGS, type I18nStrings } from "./strings";

export function useI18n() {
  const { locale, setLocale } = useAppPrefs();
  const s = useMemo(() => STRINGS[locale], [locale]);
  return { locale, setLocale, s };
}

export function getStrings(locale: AppLocale): I18nStrings {
  return STRINGS[locale];
}
