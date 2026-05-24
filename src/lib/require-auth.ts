import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared route guard: redirect anonymous users to /login before any
 * auth-protected server function call. Skips SSR (no session available)
 * and relies on client-side session hydration.
 */
export async function requireAuth(opts?: { location?: { pathname: string } }) {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({
      to: "/login",
      search: opts?.location?.pathname
        ? { redirect: opts.location.pathname }
        : undefined,
    });
  }
  return data.session;
}
