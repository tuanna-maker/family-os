import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyContext } from "@guard/api/auth";
import { getGuardLocaleRef, normalizeUiLocale, setGuardLocaleRef } from "@mobile/i18n/localeRef";
import { useAuth } from "@mobile/hooks/useAuth";

/** Đồng bộ ngôn ngữ từ profile (cùng cài đặt với app Family). */
export function GuardLocaleBootstrap() {
  const { session } = useAuth();
  const { data } = useQuery({
    queryKey: ["guard-my-context"],
    queryFn: () => getMyContext(),
    enabled: !!session,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!session) {
      setGuardLocaleRef("vi");
      return;
    }
    const locale = normalizeUiLocale(data?.profile?.ui_locale);
    setGuardLocaleRef(locale);
  }, [session, data?.profile?.ui_locale]);

  return null;
}

export function guardLocale() {
  return getGuardLocaleRef();
}
