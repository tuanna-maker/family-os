import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listTrips } from "@/api/trips";
import { TripFormPage } from "@/features/family-core/travel/trip-form-page";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/du-lich_/sua/$tripId")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Sửa chuyến đi — STOS Life" }] }),
  component: EditTripRoute,
});

function EditTripRoute() {
  const { tripId } = Route.useParams();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const q = useQuery({
    queryKey: ["family-trips", familyId],
    queryFn: () => listTrips({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const trip = q.data?.find((t) => t.id === tripId);

  if (famLoading || q.isLoading) return <LoadingState />;
  if (!familyId || !trip) {
    return (
      <MobileShell>
        <EmptyState title="Không tìm thấy chuyến đi" />
      </MobileShell>
    );
  }
  return <TripFormPage familyId={familyId} trip={trip} />;
}
