import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { EventFormPage } from "@/features/family-core/calendar/event-form-page";
import { LoadingState } from "@shared/ui/common/States";

const searchSchema = z.object({
  date: z.string().optional(),
});

export const Route = createFileRoute("/lich-gia-dinh_/them")({
  validateSearch: searchSchema,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  head: () => ({ meta: [{ title: "Thêm sự kiện — STOS Life" }] }),
  component: AddEventRoute,
});

function AddEventRoute() {
  const { date } = Route.useSearch();
  const { familyId, isLoading } = useFamilyContext();
  if (isLoading || !familyId) return <LoadingState />;
  return <EventFormPage familyId={familyId} defaultDate={date} />;
}
