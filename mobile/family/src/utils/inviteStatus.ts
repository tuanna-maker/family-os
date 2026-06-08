import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import type { AppColors } from "@mobile/theme/palettes";
import { getStrings } from "@mobile/i18n/useI18n";

export function inviteStatusChip(
  inv: {
    revoked_at: string | null;
    accepted_at: string | null;
    expires_at: string;
  },
  c: AppColors,
  locale: AppLocale,
) {
  const st = getStrings(locale).screens.invite.status;
  const expired = new Date(inv.expires_at).getTime() < Date.now();
  if (inv.revoked_at) return { label: st.revoked, color: c.muted, bg: c.mutedBg };
  if (inv.accepted_at) return { label: st.accepted, color: c.foreground, bg: c.mutedBg };
  if (expired) return { label: st.expired, color: c.emergency, bg: c.tintRed };
  return { label: st.pending, color: c.brand, bg: c.tintBlue };
}

export function inviteIsActive(inv: {
  revoked_at: string | null;
  accepted_at: string | null;
  expires_at: string;
}) {
  if (inv.revoked_at || inv.accepted_at) return false;
  return new Date(inv.expires_at).getTime() >= Date.now();
}
