import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    let prevUserId: string | null | undefined = undefined;
    const debug = import.meta.env.DEV || localStorage.getItem("auth:debug") === "1";
    const log = (event: string, s: Session | null, extra: Record<string, unknown> = {}) => {
      if (!debug) return;
      const entry = {
        t: new Date().toISOString(),
        event,
        userId: s?.user?.id ?? null,
        email: s?.user?.email ?? null,
        expiresAt: s?.expires_at ? new Date(s.expires_at * 1000).toISOString() : null,
        ...extra,
      };
      // eslint-disable-next-line no-console
      console.log(
        `%c[auth]%c ${event}`,
        "background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600",
        "color:#2563eb;font-weight:600",
        entry,
      );
      // Lưu vào buffer để vẽ biểu đồ / xem lại trong devtools
      const w = window as unknown as { __authEvents?: typeof entry[] };
      w.__authEvents = w.__authEvents ?? [];
      w.__authEvents.push(entry);
      if (w.__authEvents.length > 200) w.__authEvents.shift();
      window.dispatchEvent(new CustomEvent("auth:event", { detail: entry }));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const nextUserId = s?.user?.id ?? null;
      const changed = prevUserId !== undefined && prevUserId !== nextUserId;
      log(event, s, { prevUserId, nextUserId, willInvalidate: changed });
      if (changed) {
        router.invalidate();
        qc.invalidateQueries();
      }
      prevUserId = nextUserId;
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      log("BOOTSTRAP_SESSION", data.session);
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);


  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
