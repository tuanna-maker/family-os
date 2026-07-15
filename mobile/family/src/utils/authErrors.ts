import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import { getStrings } from "@mobile/i18n/useI18n";

/** Map Supabase Auth errors to localized messages. */
export function mapAuthError(
  error: { message?: string } | string | null | undefined,
  locale?: AppLocale,
): string {
  const loc = locale ?? getLocaleRef();
  const a = getStrings(loc).auth;
  const raw = typeof error === "string" ? error : error?.message ?? "";
  const msg = raw.trim();
  if (!msg) return a.loginFailedGeneric;

  const lower = msg.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return a.invalidCredentials;
  }
  if (lower.includes("email not confirmed")) {
    return a.emailNotConfirmed;
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return a.tooManyRequests;
  }
  if (lower.includes("user not found")) {
    return a.userNotFound;
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return a.networkError;
  }

  return msg;
}
