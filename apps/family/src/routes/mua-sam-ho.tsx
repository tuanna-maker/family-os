import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@shared/supabase/client";
import { ShoppingAssistLive } from "@/features/family-core/shopping/ShoppingAssistLive";

export const Route = createFileRoute("/mua-sam-ho")({
  head: () => ({ meta: [{ title: "Mua sắm hộ — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: ShoppingAssistLive,
});
