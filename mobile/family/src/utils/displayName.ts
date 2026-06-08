import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import { STRINGS } from "@mobile/i18n/strings";

const OWNER_SUFFIX = /\s*\(Chủ hộ\)\s*|\s*\(Head of household\)\s*/gi;

export function stripOwnerSuffix(name: string) {
  return name.replace(OWNER_SUFFIX, "").trim();
}

export function formatMemberName(
  raw: string | null | undefined,
  opts?: { isOwner?: boolean; appendOwner?: boolean; locale?: AppLocale },
) {
  const locale = opts?.locale ?? getLocaleRef();
  const c = STRINGS[locale].common;
  const base = stripOwnerSuffix(raw ?? "") || c.memberDefault;
  if (opts?.appendOwner && opts.isOwner) return `${base} (${c.ownerSuffix})`;
  return base;
}

export function memberRoleLabel(role: string | null | undefined, locale: AppLocale = getLocaleRef()) {
  const r = STRINGS[locale].roles;
  switch (role) {
    case "owner":
      return r.owner;
    case "child":
      return r.child;
    case "elderly":
      return r.elderly;
    case "member":
      return r.member;
    default:
      return role ?? null;
  }
}
