import { useEffect } from "react";
import { useAuth } from "@mobile/hooks/useAuth";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { syncProfileUiLocale } from "@shared/supabase/profile-locale";

/** Đồng bộ ngôn ngữ lên profile sau khi đăng nhập (push server-side). */
export function LocaleSyncBootstrap() {
  const { session } = useAuth();
  const { locale, ready } = useAppPrefs();

  useEffect(() => {
    if (!ready || !session?.user?.id) return;
    void syncProfileUiLocale(locale);
  }, [ready, session?.user?.id, locale]);

  return null;
}
