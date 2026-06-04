import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listFamilyEvents } from "@/api/family-events";
import { EventFormPage } from "@/features/family-core/calendar/event-form-page";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { MobileShell } from "@shared/ui/mobile/MobileShell";

export const Route = createFileRoute("/lich-gia-dinh_/sua/$eventId")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  head: () => ({ meta: [{ title: "Sửa sự kiện — STOS Life" }] }),
  component: EditEventRoute,
});

function EditEventRoute() {
  const { eventId } = Route.useParams();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const q = useQuery({
    queryKey: ["family-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const row = q.data?.find((e) => e.id === eventId);

  if (famLoading || q.isLoading) return <LoadingState />;
  if (!familyId || !row) {
    return (
      <MobileShell>
        <EmptyState title="Không tìm thấy sự kiện" />
      </MobileShell>
    );
  }
  return <EventFormPage familyId={familyId} row={row} />;
}
