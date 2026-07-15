import { redirect } from "@tanstack/react-router";
import { supabase } from "@shared/supabase/client";

export { getMyContext, requireUser, type MyContext, type AppRole } from "@shared/supabase/auth";

/** Redirect anonymous users to /login (client-only; mobile has no SSR session). */
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
